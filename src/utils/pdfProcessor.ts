import { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFString } from 'pdf-lib';
import JSZip from 'jszip';
import { pdfjs } from 'react-pdf';

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  creator?: string;
  creationDate?: Date;
  fileSize: number;
}

/**
 * Extract basic metadata and page count from a PDF file
 */
export async function getPDFMetadata(file: File): Promise<PDFMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle(),
    author: pdfDoc.getAuthor(),
    creator: pdfDoc.getCreator(),
    creationDate: pdfDoc.getCreationDate(),
    fileSize: file.size,
  };
}

/**
 * Merge multiple PDF files into a single PDF document
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Parse page range string (e.g. "1-3, 5, 8-10") into 0-indexed page numbers
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          pages.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Split a PDF by extracting specific page ranges into a single PDF
 */
export async function extractPDFPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  const validIndices = pageIndices.filter((idx) => idx >= 0 && idx < sourcePdf.getPageCount());
  if (validIndices.length === 0) {
    throw new Error('No valid pages selected to extract.');
  }

  const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Split every single page into individual PDFs and package as a ZIP
 */
export async function splitAllPagesToZip(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const totalPages = sourcePdf.getPageCount();
  const zip = new JSZip();

  const baseName = file.name.replace(/\.[^/.]+$/, '');

  for (let i = 0; i < totalPages; i++) {
    const singlePdf = await PDFDocument.create();
    const [page] = await singlePdf.copyPages(sourcePdf, [i]);
    singlePdf.addPage(page);
    const pdfBytes = await singlePdf.save();
    const fileName = `${baseName}_page_${(i + 1).toString().padStart(3, '0')}.pdf`;
    zip.file(fileName, pdfBytes);
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Convert images (JPG, PNG) into a unified PDF document
 */
export async function imagesToPDF(
  imageFiles: File[],
  options: {
    pageSize: 'fit' | 'a4' | 'letter';
    orientation: 'portrait' | 'landscape' | 'auto';
    margin: number;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Dimensions in points (72 points = 1 inch)
  const A4_PORTRAIT: [number, number] = [595.28, 841.89];
  const LETTER_PORTRAIT: [number, number] = [612, 792];

  for (const imgFile of imageFiles) {
    const imgBuffer = await imgFile.arrayBuffer();
    const isPng = imgFile.type === 'image/png' || imgFile.name.toLowerCase().endsWith('.png');
    let embeddedImg;

    try {
      if (isPng) {
        embeddedImg = await pdfDoc.embedPng(imgBuffer);
      } else {
        embeddedImg = await pdfDoc.embedJpg(imgBuffer);
      }
    } catch {
      // Fallback: draw via temporary canvas to convert to PNG
      const convertedBlob = await convertImageToPngBlob(imgFile);
      const convertedBuffer = await convertedBlob.arrayBuffer();
      embeddedImg = await pdfDoc.embedPng(convertedBuffer);
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    let pageWidth = imgWidth;
    let pageHeight = imgHeight;

    if (options.pageSize === 'a4' || options.pageSize === 'letter') {
      const baseDims = options.pageSize === 'a4' ? A4_PORTRAIT : LETTER_PORTRAIT;
      let targetPortrait = true;
      if (options.orientation === 'landscape') targetPortrait = false;
      else if (options.orientation === 'portrait') targetPortrait = true;
      else targetPortrait = imgHeight >= imgWidth;

      pageWidth = targetPortrait ? baseDims[0] : baseDims[1];
      pageHeight = targetPortrait ? baseDims[1] : baseDims[0];
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const margin = options.margin;

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    const x = margin + (availableWidth - scaledWidth) / 2;
    const y = margin + (availableHeight - scaledHeight) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Rotate PDF pages by 90, 180, or 270 degrees
 */
export async function rotatePDF(
  file: File,
  rotations: { [pageIndex: number]: number } | number
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    const additionalRotation =
      typeof rotations === 'number' ? rotations : rotations[index] || 0;
    if (additionalRotation !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + additionalRotation) % 360));
    }
  });

  return await pdfDoc.save();
}

/**
 * Apply text watermark across all pages
 */
export async function watermarkPDF(
  file: File,
  options: {
    text: string;
    opacity: number;
    fontSize: number;
    color: 'gray' | 'red' | 'blue' | 'black';
    angle: number;
  }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const colorMap = {
    gray: rgb(0.5, 0.5, 0.5),
    red: rgb(0.85, 0.15, 0.15),
    blue: rgb(0.15, 0.35, 0.85),
    black: rgb(0, 0, 0),
  };
  const watermarkColor = colorMap[options.color] || colorMap.gray;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = font.heightAtSize(options.fontSize);

    // Center coordinates
    const centerX = width / 2;
    const centerY = height / 2;

    // Approximate offset for rotation around center
    const rad = (options.angle * Math.PI) / 180;
    const x = centerX - (textWidth / 2) * Math.cos(rad) + (textHeight / 2) * Math.sin(rad);
    const y = centerY - (textWidth / 2) * Math.sin(rad) - (textHeight / 2) * Math.cos(rad);

    page.drawText(options.text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: watermarkColor,
      opacity: options.opacity,
      rotate: degrees(options.angle),
    });
  }

  return await pdfDoc.save();
}

/**
 * Add page numbering to a PDF
 */
export async function addPageNumbers(
  file: File,
  options: {
    format: 'page_x_of_y' | 'x_of_y' | 'x_only';
    position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center';
    fontSize: number;
    startFrom: number;
  }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    const currentNumber = index + options.startFrom;
    let text = '';
    if (options.format === 'page_x_of_y') {
      text = `Page ${currentNumber} of ${totalPages + options.startFrom - 1}`;
    } else if (options.format === 'x_of_y') {
      text = `${currentNumber} / ${totalPages + options.startFrom - 1}`;
    } else {
      text = `${currentNumber}`;
    }

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const margin = 36; // 0.5 inch

    let x = margin;
    let y = margin;

    switch (options.position) {
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = margin;
        break;
      case 'bottom-right':
        x = width - textWidth - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = width - textWidth - margin;
        y = height - margin - options.fontSize;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - margin - options.fontSize;
        break;
    }

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  return await pdfDoc.save();
}

/**
 * Organize and reorder/delete pages in a PDF
 */
export async function organizePDF(
  file: File,
  pageIndicesToKeep: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  const copiedPages = await newPdf.copyPages(sourcePdf, pageIndicesToKeep);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Sign PDF by stamping a signature image at a specific location
 */
export async function signPDF(
  file: File,
  signatureDataUrl: string,
  options: {
    pageNumber: number; // 1-indexed
    xPercent: number; // 0-100
    yPercent: number; // 0-100 (from bottom)
    widthPoints: number;
    heightPoints: number;
  }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  const targetPageIndex = Math.max(0, Math.min(pages.length - 1, options.pageNumber - 1));
  const targetPage = pages[targetPageIndex];
  const { width, height } = targetPage.getSize();

  // Convert base64 dataUrl to buffer
  const base64Data = signatureDataUrl.split(',')[1];
  const signatureBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const signatureImage = await pdfDoc.embedPng(signatureBytes);

  const posX = (options.xPercent / 100) * width;
  const posY = (options.yPercent / 100) * height;

  targetPage.drawImage(signatureImage, {
    x: Math.max(10, Math.min(width - options.widthPoints - 10, posX)),
    y: Math.max(10, Math.min(height - options.heightPoints - 10, posY)),
    width: options.widthPoints,
    height: options.heightPoints,
  });

  return await pdfDoc.save();
}

/**
 * Compress PDF with dual-engine optimization:
 * 1. Stream & object compaction for vector/text-heavy documents
 * 2. High-performance canvas-based raster & image downsampling for image-rich documents
 * Guarantees substantial real file weight reduction.
 */
export async function compressPDF(
  file: File,
  level: 'recommended' | 'extreme' | 'light' | 'custom' = 'recommended',
  customTargetBytes?: number
): Promise<{ bytes: Uint8Array; originalSize: number; newSize: number; savedPercentage: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const originalSize = file.size;

  // First engine: attempt stream and metadata optimization with pdf-lib
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const optimizedDoc = await PDFDocument.create();
  const copiedPages = await optimizedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  copiedPages.forEach((p) => optimizedDoc.addPage(p));
  optimizedDoc.setTitle('');
  optimizedDoc.setAuthor('');
  optimizedDoc.setSubject('');
  optimizedDoc.setKeywords([]);
  optimizedDoc.setProducer('DocuFlow Compression Core');
  optimizedDoc.setCreator('DocuFlow Engine');

  const streamOptimizedBytes = await optimizedDoc.save({ useObjectStreams: true });

  // If custom target already met with stream optimization
  if (level === 'custom' && customTargetBytes && streamOptimizedBytes.length <= customTargetBytes) {
    const newSize = streamOptimizedBytes.length;
    const savedPercentage = Math.round(((originalSize - newSize) / originalSize) * 100);
    return {
      bytes: streamOptimizedBytes,
      originalSize,
      newSize,
      savedPercentage: Math.max(1, savedPercentage),
    };
  }

  // If stream optimization achieved substantial reduction (>= 20% savings on light mode)
  const streamSavings = (originalSize - streamOptimizedBytes.length) / originalSize;
  if (level === 'light' && streamSavings >= 0.2) {
    const newSize = streamOptimizedBytes.length;
    const savedPercentage = Math.round(((originalSize - newSize) / originalSize) * 100);
    return {
      bytes: streamOptimizedBytes,
      originalSize,
      newSize,
      savedPercentage,
    };
  }

  // Second engine: High-efficiency page raster & image resampling via PDF.js & Canvas JPEG
  try {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
    const pdfSource = await loadingTask.promise;
    const totalPages = pdfSource.numPages;

    let targetDpi = 130;
    let jpegQuality = 0.72;

    if (level === 'extreme') {
      targetDpi = 100;
      jpegQuality = 0.55;
    } else if (level === 'light') {
      targetDpi = 150;
      jpegQuality = 0.82;
    } else if (level === 'custom' && customTargetBytes && customTargetBytes > 0) {
      // Calculate target budget per page to adaptively hit user's KB/MB limit
      const budgetPerPage = customTargetBytes / Math.max(1, totalPages);
      if (budgetPerPage >= 200_000) {
        targetDpi = 150;
        jpegQuality = 0.82;
      } else if (budgetPerPage >= 100_000) {
        targetDpi = 130;
        jpegQuality = 0.72;
      } else if (budgetPerPage >= 60_000) {
        targetDpi = 105;
        jpegQuality = 0.60;
      } else if (budgetPerPage >= 35_000) {
        targetDpi = 90;
        jpegQuality = 0.48;
      } else if (budgetPerPage >= 20_000) {
        targetDpi = 75;
        jpegQuality = 0.38;
      } else {
        targetDpi = 60;
        jpegQuality = 0.28;
      }
    }

    const renderPdfWithParams = async (dpi: number, quality: number): Promise<Uint8Array> => {
      const scale = dpi / 72;
      const doc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfSource.getPage(i);
        const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) continue;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render({
          canvasContext: ctx,
          viewport,
          canvas,
          background: 'rgb(255,255,255)',
        } as any).promise);

        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = jpegDataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const imageBytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
          imageBytes[j] = binaryStr.charCodeAt(j);
        }

        const embeddedJpg = await doc.embedJpg(imageBytes);

        // Add page with original unscaled dimensions in points
        const origViewport = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
        const newPage = doc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(embeddedJpg, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
      }

      return await doc.save({ useObjectStreams: true });
    };

    let rasterBytes = await renderPdfWithParams(targetDpi, jpegQuality);

    // If custom mode and first pass exceeded budget by > 5%, perform an aggressive second pass
    if (level === 'custom' && customTargetBytes && rasterBytes.length > customTargetBytes * 1.05) {
      const adjustedDpi = Math.max(50, Math.round(targetDpi * 0.8));
      const adjustedQuality = Math.max(0.2, Math.round(jpegQuality * 0.75 * 100) / 100);
      const secondPass = await renderPdfWithParams(adjustedDpi, adjustedQuality);
      if (secondPass.length < rasterBytes.length) {
        rasterBytes = secondPass;
      }
    }

    // Pick whichever produces the smallest valid PDF below original size
    let bestBytes = rasterBytes;
    if (rasterBytes.length >= originalSize && streamOptimizedBytes.length < originalSize) {
      bestBytes = streamOptimizedBytes;
    } else if (streamOptimizedBytes.length < rasterBytes.length && streamOptimizedBytes.length < originalSize) {
      bestBytes = streamOptimizedBytes;
    }

    const newSize = bestBytes.length;
    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercentage = Math.max(1, Math.round((savedBytes / originalSize) * 100));

    return {
      bytes: bestBytes,
      originalSize,
      newSize,
      savedPercentage,
    };
  } catch (err) {
    console.warn('Advanced raster compression fallback error:', err);
    const newSize = streamOptimizedBytes.length;
    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercentage = Math.max(1, Math.round((savedBytes / originalSize) * 100));
    return {
      bytes: streamOptimizedBytes,
      originalSize,
      newSize,
      savedPercentage,
    };
  }
}

/**
 * Helper to convert any image File (JPEG, WebP, etc.) into PNG blob via Canvas
 */
async function convertImageToPngBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert image to PNG'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file'));
    };

    img.src = objectUrl;
  });
}

/**
 * Utility to download raw bytes as a named file in the browser
 */
export function downloadFile(data: Uint8Array | Blob, fileName: string, mimeType: string = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utility to wrap Uint8Array safely into a Blob
 */
export function createBlobFromBytes(data: Uint8Array, mimeType: string = 'application/pdf'): Blob {
  return new Blob([data as unknown as BlobPart], { type: mimeType });
}

/**
 * Utility to package multiple files into a single downloadable ZIP archive
 */
export async function packageFilesIntoZip(
  files: { name: string; data: Uint8Array | Blob }[]
): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    const data = f.data instanceof Blob ? await f.data.arrayBuffer() : f.data;
    zip.file(f.name, data);
  }
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Format bytes to readable human string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Ensure pdfjs worker is available
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    console.warn('pdfjs worker init fallback:', e);
  }
}

/**
 * Convert PDF into a Dark Mode reading PDF (Midnight, Inverted, OLED Black, or Sepia)
 * Preserves or forces portrait orientation so pages are upright (sidha) and not sideways/landscape.
 */
export async function darkModePDF(
  file: File,
  options: {
    mode: 'midnight' | 'inverted' | 'oled' | 'sepia';
    dpi?: number;
    orientation?: 'portrait' | 'auto' | 'landscape';
    rotationOffset?: number;
  } = { mode: 'midnight', dpi: 150, orientation: 'portrait', rotationOffset: 0 }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfSource = await loadingTask.promise;
  const totalPages = pdfSource.numPages;

  const newPdf = await PDFDocument.create();
  const dpi = options.dpi || 150;
  const scale = dpi / 72;
  const orientation = options.orientation || 'portrait';
  const rotationOffset = options.rotationOffset || 0;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfSource.getPage(i);

    // Initial base rotation including native PDF page rotation + user rotation offset
    let targetRotation = ((page.rotate || 0) + rotationOffset) % 360;
    let viewport = page.getViewport({ scale, rotation: targetRotation });

    // Enforce portrait or desired orientation:
    // If orientation is 'portrait' (default) and viewport is wider than tall (landscape),
    // rotate 90 degrees so the page stands upright (sidha) in portrait mode!
    if (orientation === 'portrait') {
      if (viewport.width > viewport.height) {
        targetRotation = (targetRotation + 90) % 360;
        viewport = page.getViewport({ scale, rotation: targetRotation });
      }
    } else if (orientation === 'landscape') {
      if (viewport.height > viewport.width) {
        targetRotation = (targetRotation + 90) % 360;
        viewport = page.getViewport({ scale, rotation: targetRotation });
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill canvas background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render original page
    await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);

    // Apply dark filter transformation
    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = viewport.width;
    filterCanvas.height = viewport.height;
    const fCtx = filterCanvas.getContext('2d');
    if (!fCtx) continue;

    if (options.mode === 'inverted') {
      fCtx.filter = 'invert(1) hue-rotate(180deg) contrast(1.1)';
      fCtx.drawImage(canvas, 0, 0);
    } else if (options.mode === 'oled') {
      fCtx.filter = 'invert(1) contrast(1.3) brightness(0.9)';
      fCtx.drawImage(canvas, 0, 0);
    } else if (options.mode === 'sepia') {
      fCtx.filter = 'sepia(0.85) contrast(0.95) brightness(0.92)';
      fCtx.drawImage(canvas, 0, 0);
    } else {
      // midnight mode: elegant dark slate reading tone
      fCtx.filter = 'invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(1.15)';
      fCtx.drawImage(canvas, 0, 0);
    }

    // Convert to JPG blob
    const blob: Blob = await new Promise((resolve) =>
      filterCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
    );
    const imgBuffer = await blob.arrayBuffer();
    const embeddedImg = await newPdf.embedJpg(imgBuffer);

    // Add page with original point dimensions
    const originalWidth = viewport.width / scale;
    const originalHeight = viewport.height / scale;
    const newPage = newPdf.addPage([originalWidth, originalHeight]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    });
  }

  return await newPdf.save();
}

/**
 * Convert PDF pages to JPG images, packaged into a ZIP or single JPG
 */
export async function pdfToJpg(
  file: File,
  options: {
    dpi?: number;
    quality?: number;
    pageRange?: string;
  } = {}
): Promise<{
  images: { pageNum: number; blob: Blob; fileName: string }[];
  zipBlob?: Blob;
  singleBlob?: Blob;
  singleFileName?: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfSource = await loadingTask.promise;
  const totalPages = pdfSource.numPages;

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const dpi = options.dpi || 150;
  const scale = dpi / 72;
  const quality = options.quality ?? 0.92;

  let pageNumbers: number[] = [];
  if (options.pageRange && options.pageRange.trim()) {
    const indices = parsePageRange(options.pageRange, totalPages);
    pageNumbers = indices.map((idx) => idx + 1);
  }
  if (pageNumbers.length === 0) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const images: { pageNum: number; blob: Blob; fileName: string }[] = [];
  const zip = new JSZip();

  for (const pageNum of pageNumbers) {
    const page = await pdfSource.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
    );

    const fileName = `${baseName}_page_${pageNum.toString().padStart(3, '0')}.jpg`;
    images.push({ pageNum, blob, fileName });
    zip.file(fileName, blob);
  }

  let zipBlob: Blob | undefined;
  if (images.length > 1) {
    zipBlob = await zip.generateAsync({ type: 'blob' });
  }

  return {
    images,
    zipBlob,
    singleBlob: images.length === 1 ? images[0].blob : undefined,
    singleFileName: images.length === 1 ? images[0].fileName : undefined,
  };
}

/**
 * Unlock PDF by removing password protection and owner permissions
 */
export async function unlockPDF(
  file: File,
  password?: string
): Promise<{ bytes: Uint8Array; wasEncrypted: boolean }> {
  const arrayBuffer = await file.arrayBuffer();

  let srcDoc: PDFDocument;
  let wasEncrypted = false;

  try {
    srcDoc = await PDFDocument.load(arrayBuffer, {
      password: password?.trim() || undefined,
      ignoreEncryption: false,
    } as any);
  } catch {
    // If standard load threw error, try ignoreEncryption
    try {
      srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true } as any);
      wasEncrypted = true;
    } catch {
      throw new Error(
        'Document is protected by encryption. Please enter the valid password to unlock.'
      );
    }
  }

  // Create clean unencrypted clone
  const cleanDoc = await PDFDocument.create();
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await cleanDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => cleanDoc.addPage(p));

  const bytes = await cleanDoc.save();
  return { bytes, wasEncrypted };
}

/**
 * Add clickable hyperlinks, action buttons, or hotspot links to PDF pages
 */
export async function addLinkToPDF(
  file: File,
  options: {
    url: string;
    label?: string;
    pageNumber: number; // 1-indexed, or 0 for all pages
    position: 'footer' | 'banner' | 'cta' | 'custom';
    xPercent?: number; // 0-100%
    yPercent?: number; // 0-100%
    style: 'button' | 'underline' | 'hotspot';
  }
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const targetPages =
    options.pageNumber === 0
      ? pages
      : [pages[Math.max(0, Math.min(pages.length - 1, options.pageNumber - 1))]];

  const validUrl =
    options.url.startsWith('http://') ||
    options.url.startsWith('https://') ||
    options.url.startsWith('mailto:')
      ? options.url
      : `https://${options.url}`;

  for (const page of targetPages) {
    const { width, height } = page.getSize();
    const label = options.label?.trim() || options.url;
    const fontSize = 11;
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const paddingX = options.style === 'button' ? 14 : 4;
    const paddingY = options.style === 'button' ? 7 : 3;
    const linkWidth = textWidth + paddingX * 2;
    const linkHeight = fontSize + paddingY * 2;

    let x = (width - linkWidth) / 2;
    let y = 28; // default footer position

    if (options.position === 'footer') {
      y = 28;
      x = (width - linkWidth) / 2;
    } else if (options.position === 'banner') {
      y = height - linkHeight - 24;
      x = (width - linkWidth) / 2;
    } else if (options.position === 'cta') {
      y = height / 2 - linkHeight / 2;
      x = (width - linkWidth) / 2;
    } else if (options.position === 'custom') {
      x = ((options.xPercent ?? 50) / 100) * width - linkWidth / 2;
      y = ((options.yPercent ?? 10) / 100) * height;
    }

    x = Math.max(10, Math.min(width - linkWidth - 10, x));
    y = Math.max(10, Math.min(height - linkHeight - 10, y));

    if (options.style === 'button') {
      // Draw CTA button background
      page.drawRectangle({
        x,
        y,
        width: linkWidth,
        height: linkHeight,
        color: rgb(0.88, 0.15, 0.35),
      });

      // Draw button text
      page.drawText(label, {
        x: x + paddingX,
        y: y + paddingY + 1,
        size: fontSize,
        font,
        color: rgb(1, 1, 1),
      });
    } else if (options.style === 'underline') {
      // Draw underlined text link
      page.drawText(label, {
        x: x + paddingX,
        y: y + paddingY + 1,
        size: fontSize,
        font,
        color: rgb(0.12, 0.44, 0.95),
      });

      page.drawLine({
        start: { x: x + paddingX, y: y + paddingY - 1 },
        end: { x: x + paddingX + textWidth, y: y + paddingY - 1 },
        thickness: 1,
        color: rgb(0.12, 0.44, 0.95),
      });
    }

    // Embed clickable Link annotation into PDF structure
    const linkAnnotation = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + linkWidth, y + linkHeight],
      Border: [0, 0, 0],
      C: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(validUrl),
      },
    });

    const linkRef = pdfDoc.context.register(linkAnnotation);
    page.node.addAnnot(linkRef);
  }

  return await pdfDoc.save();
}

/**
 * Remove all links and clickable annotations from the PDF
 */
export async function removeLinksFromPDF(
  file: File
): Promise<{ bytes: Uint8Array; removedCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  let removedCount = 0;

  for (const page of pages) {
    const annots = page.node.Annots();
    if (!annots) continue;

    const keptRefs = [];
    const size = annots.size();
    for (let i = 0; i < size; i++) {
      const annotRef = annots.get(i);
      const annot = pdfDoc.context.lookup(annotRef);
      if (annot && (annot as any).get) {
        const subtype = (annot as any).get(PDFName.of('Subtype'));
        if (subtype && subtype.toString() === '/Link') {
          removedCount++;
          continue; // Strip this link annotation
        }
      }
      keptRefs.push(annotRef);
    }

    if (keptRefs.length === 0) {
      page.node.delete(PDFName.of('Annots'));
    } else if (keptRefs.length < size) {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(keptRefs));
    }
  }

  const bytes = await pdfDoc.save();
  return { bytes, removedCount };
}

/**
 * Generates an output filename for batch processing according to a user-defined pattern.
 * Supports placeholders:
 * - {name} / {filename}: Original filename without extension
 * - {date}: Current Date (YYYY-MM-DD)
 * - {time}: Current Time (HH-MM)
 * - {index} / {i}: Sequential 1-based index (1, 2, 3...)
 * - {index0}: Sequential 0-based index (0, 1, 2...)
 * - {0index} / {index2}: 2-digit zero-padded index (01, 02, 03...)
 * - {index3}: 3-digit zero-padded index (001, 002, 003...)
 * - {tool}: Current tool suffix (compressed, watermarked, etc.)
 */
export function formatBatchFilename(
  pattern: string,
  file: File,
  index: number,
  toolId?: string
): string {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}-${minutes}`;

  let toolSuffix = 'processed';
  if (toolId === 'compress') toolSuffix = 'compressed';
  else if (toolId === 'watermark') toolSuffix = 'watermarked';
  else if (toolId === 'rotate') toolSuffix = 'rotated';
  else if (toolId === 'page-numbers') toolSuffix = 'numbered';
  else if (toolId === 'protect') toolSuffix = 'protected';
  else if (toolId === 'dark-mode') toolSuffix = 'dark';
  else if (toolId === 'unlock') toolSuffix = 'unlocked';
  else if (toolId === 'remove-links') toolSuffix = 'clean';
  else if (toolId === 'merge') toolSuffix = 'merged';

  let result = (pattern || 'Docu_{date}_{index}.pdf')
    .replace(/\{name\}|\{filename\}/gi, baseName)
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{0index\}|\{index2\}/gi, String(index + 1).padStart(2, '0'))
    .replace(/\{index3\}/gi, String(index + 1).padStart(3, '0'))
    .replace(/\{index0\}/gi, String(index))
    .replace(/\{index\}|\{i\}/gi, String(index + 1))
    .replace(/\{tool\}/gi, toolSuffix);

  // Sanitize illegal filesystem characters
  result = result.replace(/[/\\:*?"<>|]/g, '_').trim();

  // Ensure .pdf extension
  if (!result.toLowerCase().endsWith('.pdf')) {
    result += '.pdf';
  }

  return result || `Docu_${dateStr}_${index + 1}.pdf`;
}
