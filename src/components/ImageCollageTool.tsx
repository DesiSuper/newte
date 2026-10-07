import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  Image as ImageIcon,
  Grid3X3,
  Columns,
  LayoutGrid,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  SlidersHorizontal,
  Palette,
  RotateCcw,
  Type,
  Move,
} from 'lucide-react';

interface ImageCollageToolProps {
  theme: 'dark' | 'light';
}

interface CollagePhoto {
  id: string;
  file: File;
  name: string;
  url: string;
  imgElement?: HTMLImageElement;
}

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '3:2' | '2:3' | '4:3';
type FitMode = 'cover' | 'contain';
type CollageStyle = 'grid' | 'polaroid';

export function ImageCollageTool({ theme }: ImageCollageToolProps) {
  const [photos, setPhotos] = useState<CollagePhoto[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [layoutPreset, setLayoutPreset] = useState<string>('auto');
  const [spacing, setSpacing] = useState<number>(16);
  const [outerPadding, setOuterPadding] = useState<number>(20);
  const [borderRadius, setBorderRadius] = useState<number>(12);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [styleMode, setStyleMode] = useState<CollageStyle>('grid');

  // Optional Caption / Title
  const [hasCaption, setHasCaption] = useState<boolean>(false);
  const [captionText, setCaptionText] = useState<string>('Memories');
  const [captionColor, setCaptionColor] = useState<string>('#0f172a');
  const [captionSize, setCaptionSize] = useState<number>(36);

  // Resolution & Export
  const [exportQuality, setExportQuality] = useState<'1x' | '2x'>('2x');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [copied, setCopied] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  // Drag & Drop reorder
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Upload handler
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: Promise<CollagePhoto>[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => {
        return new Promise((resolve) => {
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              file,
              name: file.name,
              url,
              imgElement: img,
            });
          };
          img.onerror = () => {
            resolve({
              id: `${file.name}-${Date.now()}`,
              file,
              name: file.name,
              url,
            });
          };
          img.src = url;
        });
      });

    Promise.all(newPhotos).then((loaded) => {
      setPhotos((prev) => [...prev, ...loaded]);
    });
  };

  // Calculate Output Canvas Dimensions
  const getCanvasDimensions = useCallback((): { width: number; height: number } => {
    const base = exportQuality === '2x' ? 2400 : 1200;
    switch (aspectRatio) {
      case '1:1':
        return { width: base, height: base };
      case '4:5':
        return { width: base, height: Math.round((base * 5) / 4) };
      case '16:9':
        return { width: base, height: Math.round((base * 9) / 16) };
      case '9:16':
        return { width: Math.round((base * 9) / 16), height: base };
      case '3:2':
        return { width: base, height: Math.round((base * 2) / 3) };
      case '2:3':
        return { width: Math.round((base * 2) / 3), height: base };
      case '4:3':
        return { width: base, height: Math.round((base * 3) / 4) };
      default:
        return { width: base, height: base };
    }
  }, [aspectRatio, exportQuality]);

  // Compute Layout Rectangles for each photo cell
  const computeCellRects = useCallback(
    (totalW: number, totalH: number, count: number): { x: number; y: number; w: number; h: number }[] => {
      const rects: { x: number; y: number; w: number; h: number }[] = [];
      const captionH = hasCaption ? captionSize * 2.5 : 0;
      const usableX = outerPadding;
      const usableY = outerPadding + (hasCaption ? captionH : 0);
      const usableW = totalW - outerPadding * 2;
      const usableH = totalH - outerPadding * 2 - (hasCaption ? captionH : 0);

      if (count <= 0) return rects;

      if (count === 1) {
        rects.push({ x: usableX, y: usableY, w: usableW, h: usableH });
        return rects;
      }

      if (count === 2) {
        if (layoutPreset === 'stacked' || (layoutPreset === 'auto' && totalH > totalW)) {
          // 2 Rows
          const h = (usableH - spacing) / 2;
          rects.push({ x: usableX, y: usableY, w: usableW, h });
          rects.push({ x: usableX, y: usableY + h + spacing, w: usableW, h });
        } else {
          // 2 Columns (Side by Side)
          const w = (usableW - spacing) / 2;
          rects.push({ x: usableX, y: usableY, w, h: usableH });
          rects.push({ x: usableX + w + spacing, y: usableY, w, h: usableH });
        }
        return rects;
      }

      if (count === 3) {
        if (layoutPreset === 'columns') {
          const w = (usableW - spacing * 2) / 3;
          for (let i = 0; i < 3; i++) {
            rects.push({ x: usableX + i * (w + spacing), y: usableY, w, h: usableH });
          }
        } else if (layoutPreset === 'rows') {
          const h = (usableH - spacing * 2) / 3;
          for (let i = 0; i < 3; i++) {
            rects.push({ x: usableX, y: usableY + i * (h + spacing), w: usableW, h });
          }
        } else if (layoutPreset === 'hero-top') {
          const hTop = (usableH - spacing) * 0.55;
          const hBot = usableH - spacing - hTop;
          const wBot = (usableW - spacing) / 2;
          rects.push({ x: usableX, y: usableY, w: usableW, h: hTop });
          rects.push({ x: usableX, y: usableY + hTop + spacing, w: wBot, h: hBot });
          rects.push({ x: usableX + wBot + spacing, y: usableY + hTop + spacing, w: wBot, h: hBot });
        } else {
          // Default: 1 Hero Left + 2 Right Stacked
          const wHero = (usableW - spacing) * 0.6;
          const wRight = usableW - spacing - wHero;
          const hRight = (usableH - spacing) / 2;
          rects.push({ x: usableX, y: usableY, w: wHero, h: usableH });
          rects.push({ x: usableX + wHero + spacing, y: usableY, w: wRight, h: hRight });
          rects.push({ x: usableX + wHero + spacing, y: usableY + hRight + spacing, w: wRight, h: hRight });
        }
        return rects;
      }

      if (count === 4) {
        if (layoutPreset === 'hero-left') {
          const wHero = (usableW - spacing) * 0.6;
          const wRight = usableW - spacing - wHero;
          const hItem = (usableH - spacing * 2) / 3;
          rects.push({ x: usableX, y: usableY, w: wHero, h: usableH });
          rects.push({ x: usableX + wHero + spacing, y: usableY, w: wRight, h: hItem });
          rects.push({ x: usableX + wHero + spacing, y: usableY + hItem + spacing, w: wRight, h: hItem });
          rects.push({ x: usableX + wHero + spacing, y: usableY + (hItem + spacing) * 2, w: wRight, h: hItem });
        } else {
          // 2x2 Grid
          const w = (usableW - spacing) / 2;
          const h = (usableH - spacing) / 2;
          rects.push({ x: usableX, y: usableY, w, h });
          rects.push({ x: usableX + w + spacing, y: usableY, w, h });
          rects.push({ x: usableX, y: usableY + h + spacing, w, h });
          rects.push({ x: usableX + w + spacing, y: usableY + h + spacing, w, h });
        }
        return rects;
      }

      if (count === 5) {
        // 2 Top + 3 Bottom
        const hTop = (usableH - spacing) / 2;
        const hBot = hTop;
        const wTop = (usableW - spacing) / 2;
        const wBot = (usableW - spacing * 2) / 3;

        rects.push({ x: usableX, y: usableY, w: wTop, h: hTop });
        rects.push({ x: usableX + wTop + spacing, y: usableY, w: wTop, h: hTop });
        rects.push({ x: usableX, y: usableY + hTop + spacing, w: wBot, h: hBot });
        rects.push({ x: usableX + wBot + spacing, y: usableY + hTop + spacing, w: wBot, h: hBot });
        rects.push({ x: usableX + (wBot + spacing) * 2, y: usableY + hTop + spacing, w: wBot, h: hBot });
        return rects;
      }

      if (count === 6) {
        // 3x2 Grid (3 columns, 2 rows)
        const cols = 3;
        const rows = 2;
        const w = (usableW - spacing * (cols - 1)) / cols;
        const h = (usableH - spacing * (rows - 1)) / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rects.push({
              x: usableX + c * (w + spacing),
              y: usableY + r * (h + spacing),
              w,
              h,
            });
          }
        }
        return rects;
      }

      // 7 to 12 Photos: Automatic Grid
      const cols = count <= 8 ? (totalW >= totalH ? 4 : 2) : 3;
      const rows = Math.ceil(count / cols);
      const w = (usableW - spacing * (cols - 1)) / cols;
      const h = (usableH - spacing * (rows - 1)) / rows;

      for (let i = 0; i < count; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        rects.push({
          x: usableX + c * (w + spacing),
          y: usableY + r * (h + spacing),
          w,
          h,
        });
      }

      return rects;
    },
    [outerPadding, spacing, hasCaption, captionSize, layoutPreset]
  );

  // Draw Collage onto Canvas
  const renderCollage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || photos.length === 0) return;

    const { width, height } = getCanvasDimensions();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw Optional Title / Caption
    if (hasCaption && captionText.trim()) {
      ctx.save();
      ctx.fillStyle = captionColor;
      ctx.font = `bold ${captionSize * (exportQuality === '2x' ? 2 : 1)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const capY = outerPadding + (captionSize * (exportQuality === '2x' ? 2 : 1)) / 1.2;
      ctx.fillText(captionText, width / 2, capY);
      ctx.restore();
    }

    // POLAROID STYLE MODE
    if (styleMode === 'polaroid') {
      const angles = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3, -4, 2];
      const count = photos.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const cellW = (width - outerPadding * 2) / cols;
      const cellH = (height - outerPadding * 2 - (hasCaption ? captionSize * 2 : 0)) / rows;

      photos.forEach((photo, idx) => {
        if (!photo.imgElement) return;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = outerPadding + col * cellW + cellW / 2;
        const cy = outerPadding + (hasCaption ? captionSize * 2 : 0) + row * cellH + cellH / 2;
        const cardW = Math.min(cellW * 0.85, 500);
        const cardH = cardW * 1.2;
        const photoH = cardW * 0.9;
        const angle = (angles[idx % angles.length] * Math.PI) / 180;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Polaroid Drop Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 8;

        // White Card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

        // Reset Shadow for Inner Photo
        ctx.shadowColor = 'transparent';
        const innerPad = cardW * 0.06;
        const innerW = cardW - innerPad * 2;
        const innerH = photoH - innerPad;

        ctx.save();
        ctx.beginPath();
        ctx.rect(-cardW / 2 + innerPad, -cardH / 2 + innerPad, innerW, innerH);
        ctx.clip();

        // Draw Image Cover
        drawImageCover(ctx, photo.imgElement, -cardW / 2 + innerPad, -cardH / 2 + innerPad, innerW, innerH);
        ctx.restore();

        // Polaroid photo name tag
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${cardW * 0.05}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(photo.name.replace(/\.[^/.]+$/, ''), 0, cardH / 2 - innerPad * 1.2);

        ctx.restore();
      });

      return;
    }

    // REGULAR GRID MODE
    const rects = computeCellRects(width, height, photos.length);
    const scaleFactor = exportQuality === '2x' ? 2 : 1;
    const scaledRadius = borderRadius * scaleFactor;

    photos.forEach((photo, idx) => {
      const rect = rects[idx];
      if (!rect || !photo.imgElement) return;

      ctx.save();

      // Rounded rectangle clipping path
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, scaledRadius);
      ctx.clip();

      if (fitMode === 'cover') {
        drawImageCover(ctx, photo.imgElement, rect.x, rect.y, rect.w, rect.h);
      } else {
        drawImageContain(ctx, photo.imgElement, rect.x, rect.y, rect.w, rect.h);
      }

      ctx.restore();

      // Subtle border stroke around cell
      if (scaledRadius > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, scaledRadius);
        ctx.stroke();
        ctx.restore();
      }
    });
  }, [
    photos,
    getCanvasDimensions,
    bgColor,
    hasCaption,
    captionText,
    captionColor,
    captionSize,
    styleMode,
    computeCellRects,
    exportQuality,
    borderRadius,
    fitMode,
    outerPadding,
  ]);

  // Helper: Draw image with object-fit: cover
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imgRatio > targetRatio) {
      sw = img.naturalHeight * targetRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / targetRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // Helper: Draw image with object-fit: contain
  const drawImageContain = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = w / h;
    let dw = w;
    let dh = h;
    let dx = x;
    let dy = y;

    if (imgRatio > targetRatio) {
      dh = w / imgRatio;
      dy = y + (h - dh) / 2;
    } else {
      dw = h * imgRatio;
      dx = x + (w - dw) / 2;
    }

    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
  };

  // Re-render canvas when options or photos change
  useEffect(() => {
    renderCollage();
  }, [renderCollage]);

  // Download Collage
  const handleDownloadCollage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
    const dataUrl = canvas.toDataURL(mime, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `photo_collage_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }, 'image/png');
    } catch {
      alert('Unable to copy directly to clipboard. You can download the image instead.');
    }
  };

  // Reorder photos
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const updated = [...photos];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setPhotos(updated);
    setDraggedIdx(null);
  };

  const removePhoto = (idx: number) => {
    const updated = photos.filter((_, i) => i !== idx);
    setPhotos(updated);
  };

  return (
    <div className="space-y-6">
      {/* If No Photos Uploaded: Initial Upload Screen */}
      {photos.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handlePhotoUpload(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById('collage-file-input')?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 sm:p-20 text-center glass-card transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 group ${
            theme === 'dark'
              ? 'border-white/[0.12] hover:border-violet-500/70 hover:bg-white/[0.02]'
              : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50/20'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className={`font-display text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Drop 2 or More Photos for Collage
            </h3>
            <p className={`text-xs max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Create modern photo grids, side-by-side comparisons, Instagram reels/posts, or nostalgic Polaroid card collages with custom borders and spacing.
            </p>
          </div>
          <div className="pt-2">
            <span className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-950/40 inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Browse Photos (2-12)</span>
            </span>
          </div>
          <input
            id="collage-file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePhotoUpload(e.target.files)}
            className="hidden"
          />
        </div>
      ) : (
        /* Workspace when photos are selected */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customization Controls (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-2xl glass-card space-y-5">
              {/* Aspect Ratio Selector */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Canvas Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: '1:1', label: '1:1 Square' },
                      { id: '4:5', label: '4:5 IG Post' },
                      { id: '9:16', label: '9:16 Story' },
                      { id: '16:9', label: '16:9 Banner' },
                      { id: '4:3', label: '4:3 Classic' },
                      { id: '3:2', label: '3:2 Photo' },
                      { id: '2:3', label: '2:3 Poster' },
                    ] as { id: AspectRatio; label: string }[]
                  ).map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => setAspectRatio(ar.id)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        aspectRatio === ar.id
                          ? 'bg-violet-500 border-violet-400 text-white shadow-md'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {ar.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collage Style Mode: Grid vs Polaroid */}
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Collage Style
                </span>
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setStyleMode('grid')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      styleMode === 'grid'
                        ? 'bg-violet-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    Clean Grid
                  </button>
                  <button
                    onClick={() => setStyleMode('polaroid')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      styleMode === 'polaroid'
                        ? 'bg-violet-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    Polaroid Cards
                  </button>
                </div>
              </div>

              {/* Layout Presets (For 2, 3, 4 photos) */}
              {styleMode === 'grid' && photos.length <= 4 && (
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Layout Arrangement
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLayoutPreset('auto')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                        layoutPreset === 'auto'
                          ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                          : theme === 'dark'
                          ? 'border-white/[0.08] text-slate-400'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Default Grid
                    </button>
                    {photos.length === 2 && (
                      <button
                        type="button"
                        onClick={() => setLayoutPreset('stacked')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                          layoutPreset === 'stacked'
                            ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                            : theme === 'dark'
                            ? 'border-white/[0.08] text-slate-400'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Stacked Rows
                      </button>
                    )}
                    {photos.length === 3 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setLayoutPreset('columns')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                            layoutPreset === 'columns'
                              ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                              : theme === 'dark'
                              ? 'border-white/[0.08] text-slate-400'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          3 Columns
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayoutPreset('hero-top')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                            layoutPreset === 'hero-top'
                              ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                              : theme === 'dark'
                              ? 'border-white/[0.08] text-slate-400'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          Hero Top
                        </button>
                      </>
                    )}
                    {photos.length === 4 && (
                      <button
                        type="button"
                        onClick={() => setLayoutPreset('hero-left')}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                          layoutPreset === 'hero-left'
                            ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                            : theme === 'dark'
                            ? 'border-white/[0.08] text-slate-400'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        1 Hero + 3 Strip
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Spacing, Margin & Border Radius Sliders */}
              {styleMode === 'grid' && (
                <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Photo Spacing</span>
                      <span className="font-mono text-violet-400">{spacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="48"
                      value={spacing}
                      onChange={(e) => setSpacing(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Outer Border Padding</span>
                      <span className="font-mono text-violet-400">{outerPadding}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={outerPadding}
                      onChange={(e) => setOuterPadding(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Corner Rounding</span>
                      <span className="font-mono text-violet-400">{borderRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Background Color & Image Fit */}
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Background Palette
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 p-0.5 bg-transparent"
                    />
                    <div className="flex items-center gap-1.5">
                      {[
                        { hex: '#ffffff', name: 'White' },
                        { hex: '#000000', name: 'Black' },
                        { hex: '#0f172a', name: 'Dark Navy' },
                        { hex: '#faf5ee', name: 'Warm Cream' },
                        { hex: '#fdf2f8', name: 'Rose Pastel' },
                        { hex: '#f0fdf4', name: 'Mint' },
                        { hex: '#f5f3ff', name: 'Lavender' },
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBgColor(c.hex)}
                          title={c.name}
                          className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Photo Crop Mode
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFitMode('cover')}
                      className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                        fitMode === 'cover'
                          ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                          : theme === 'dark'
                          ? 'border-white/[0.08] text-slate-400'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Fill & Crop
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitMode('contain')}
                      className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                        fitMode === 'contain'
                          ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                          : theme === 'dark'
                          ? 'border-white/[0.08] text-slate-400'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Fit Whole
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Collage Title */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Collage Title / Caption
                  </span>
                  <button
                    type="button"
                    onClick={() => setHasCaption(!hasCaption)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      hasCaption
                        ? 'bg-violet-500/20 border-violet-500 text-violet-400 font-bold'
                        : theme === 'dark'
                        ? 'border-white/[0.08] text-slate-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {hasCaption ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {hasCaption && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      placeholder="e.g. Summer Vacation 2026"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
                        theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.09] text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={captionColor}
                        onChange={(e) => setCaptionColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer"
                      />
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={captionSize}
                        onChange={(e) => setCaptionSize(Number(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Export Card */}
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Resolution Quality
                </span>
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setExportQuality('1x')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      exportQuality === '1x'
                        ? 'bg-violet-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    1x (Web)
                  </button>
                  <button
                    onClick={() => setExportQuality('2x')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      exportQuality === '2x'
                        ? 'bg-violet-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    2x (HD Print)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleDownloadCollage}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-violet-950/40 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Collage Image</span>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#12141D] hover:bg-[#1A1E2B] border-white/[0.08] text-slate-300'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Collage Canvas Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Stage Toolbar */}
            <div className="p-3 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-violet-400">{photos.length} Photos in Collage</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  (Aspect {aspectRatio} · {exportQuality === '2x' ? 'Ultra HD' : 'Standard'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-400">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-1"
                    title="Reset zoom"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>

                <label className="text-xs font-semibold text-violet-500 hover:text-violet-400 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/20 hover:bg-violet-500/10 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Canvas Viewport */}
            <div
              className={`relative rounded-2xl border overflow-auto p-4 flex items-center justify-center min-h-[460px] max-h-[620px] select-none ${
                theme === 'dark'
                  ? 'bg-[#0B0D13] border-white/[0.08] shadow-inner'
                  : 'bg-slate-100 border-slate-300'
              }`}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.1s ease-out',
                }}
                className="relative shadow-2xl rounded-xl overflow-hidden inline-block"
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[560px] object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Photo Cards Drag-to-Reorder Strip */}
            <div className="p-3.5 rounded-2xl glass-card space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Reorder Photos (Drag cards to swap order)</span>
                <span className="text-[11px] text-violet-400">Total {photos.length} / 12 photos</span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {photos.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing group ${
                      draggedIdx === idx
                        ? 'opacity-40 border-dashed border-violet-500'
                        : 'border-white/10 hover:border-violet-500/50'
                    }`}
                  >
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 cursor-pointer"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[9px] font-mono font-bold bg-black/60 text-white px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
