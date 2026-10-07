import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Upload,
  Download,
  Image as ImageIcon,
  Type,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Layers,
  Sparkles,
  SlidersHorizontal,
  RotateCw,
  Eye,
  FileArchive,
  ArrowRight,
} from 'lucide-react';

interface ImageWatermarkToolProps {
  theme: 'dark' | 'light';
}

interface ImageItem {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}

type WatermarkMode = 'text' | 'logo';
type PlacementMode = 'grid' | 'tile' | 'custom';
type GridPos = 'top-left' | 'top-center' | 'top-right' | 'mid-left' | 'center' | 'mid-right' | 'bot-left' | 'bot-center' | 'bot-right';

export function ImageWatermarkTool({ theme }: ImageWatermarkToolProps) {
  // Images
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Watermark Mode
  const [mode, setMode] = useState<WatermarkMode>('text');

  // Text Watermark Settings
  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(48);
  const [fontBold, setFontBold] = useState<boolean>(true);
  const [fontItalic, setFontItalic] = useState<boolean>(false);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [opacity, setOpacity] = useState<number>(0.75);
  const [rotation, setRotation] = useState<number>(-30);
  const [hasShadow, setHasShadow] = useState<boolean>(true);
  const [hasBadge, setHasBadge] = useState<boolean>(false);
  const [badgeColor, setBadgeColor] = useState<string>('#000000');
  const [badgeOpacity, setBadgeOpacity] = useState<number>(0.5);

  // Placement
  const [placement, setPlacement] = useState<PlacementMode>('grid');
  const [gridPos, setGridPos] = useState<GridPos>('center');
  const [customPos, setCustomPos] = useState<{ xPercent: number; yPercent: number }>({ xPercent: 50, yPercent: 50 });
  const [tileSpacing, setTileSpacing] = useState<number>(140);

  // Logo Watermark Settings
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState<string>('');
  const [logoScale, setLogoScale] = useState<number>(25); // % of image width
  const [logoOpacity, setLogoOpacity] = useState<number>(0.8);

  // Canvas & Preview Controls
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDraggingWatermark, setIsDraggingWatermark] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');

  // Handle Image Upload
  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: Promise<ImageItem>[] = Array.from(files)
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
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600,
            });
          };
          img.onerror = () => {
            resolve({
              id: `${file.name}-${Date.now()}`,
              file,
              name: file.name,
              url,
              width: 800,
              height: 600,
            });
          };
          img.src = url;
        });
      });

    Promise.all(newItems).then((loaded) => {
      setImages((prev) => [...prev, ...loaded]);
      if (images.length === 0 && loaded.length > 0) {
        setActiveIndex(0);
      }
    });
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setLogoImg(img);
      setLogoName(file.name);
    };
    img.src = url;
  };

  // Render Watermark to a Target Canvas
  const drawWatermarkToCanvas = useCallback(
    (
      targetCanvas: HTMLCanvasElement,
      imgEl: HTMLImageElement,
      item: ImageItem
    ) => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const w = item.width;
      const h = item.height;
      targetCanvas.width = w;
      targetCanvas.height = h;

      // Draw Base Image
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(imgEl, 0, 0, w, h);

      // Draw Watermark
      ctx.save();

      // Mode: Logo
      if (mode === 'logo' && logoImg) {
        ctx.globalAlpha = logoOpacity;
        const targetLogoW = (w * logoScale) / 100;
        const aspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
        const targetLogoH = targetLogoW / aspect;

        let posX = w / 2 - targetLogoW / 2;
        let posY = h / 2 - targetLogoH / 2;

        if (placement === 'custom') {
          posX = (customPos.xPercent / 100) * w - targetLogoW / 2;
          posY = (customPos.yPercent / 100) * h - targetLogoH / 2;
        } else if (placement === 'grid') {
          const pad = Math.min(w, h) * 0.05;
          switch (gridPos) {
            case 'top-left':
              posX = pad;
              posY = pad;
              break;
            case 'top-center':
              posX = w / 2 - targetLogoW / 2;
              posY = pad;
              break;
            case 'top-right':
              posX = w - targetLogoW - pad;
              posY = pad;
              break;
            case 'mid-left':
              posX = pad;
              posY = h / 2 - targetLogoH / 2;
              break;
            case 'center':
              posX = w / 2 - targetLogoW / 2;
              posY = h / 2 - targetLogoH / 2;
              break;
            case 'mid-right':
              posX = w - targetLogoW - pad;
              posY = h / 2 - targetLogoH / 2;
              break;
            case 'bot-left':
              posX = pad;
              posY = h - targetLogoH - pad;
              break;
            case 'bot-center':
              posX = w / 2 - targetLogoW / 2;
              posY = h - targetLogoH - pad;
              break;
            case 'bot-right':
              posX = w - targetLogoW - pad;
              posY = h - targetLogoH - pad;
              break;
          }
        }

        ctx.drawImage(logoImg, posX, posY, targetLogoW, targetLogoH);
        ctx.restore();
        return;
      }

      // Mode: Text
      if (mode === 'text' && text.trim()) {
        ctx.globalAlpha = opacity;
        const fontStyleStr = `${fontItalic ? 'italic ' : ''}${fontBold ? 'bold ' : ''}`;
        ctx.font = `${fontStyleStr}${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (placement === 'tile') {
          // Repeated diagonal tile pattern
          const rad = (rotation * Math.PI) / 180;
          const stepX = tileSpacing * 1.5;
          const stepY = tileSpacing * 1.2;

          for (let x = -w; x < w * 2; x += stepX) {
            for (let y = -h; y < h * 2; y += stepY) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(rad);

              if (hasShadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
              }

              ctx.fillStyle = textColor;
              ctx.fillText(text, 0, 0);
              ctx.restore();
            }
          }
        } else {
          // Single Text Watermark (Grid or Custom)
          let posX = w / 2;
          let posY = h / 2;

          if (placement === 'custom') {
            posX = (customPos.xPercent / 100) * w;
            posY = (customPos.yPercent / 100) * h;
          } else {
            const padX = w * 0.08;
            const padY = h * 0.08;
            switch (gridPos) {
              case 'top-left':
                posX = padX + fontSize * 1.5;
                posY = padY + fontSize / 2;
                break;
              case 'top-center':
                posX = w / 2;
                posY = padY + fontSize / 2;
                break;
              case 'top-right':
                posX = w - padX - fontSize * 1.5;
                posY = padY + fontSize / 2;
                break;
              case 'mid-left':
                posX = padX + fontSize * 1.5;
                posY = h / 2;
                break;
              case 'center':
                posX = w / 2;
                posY = h / 2;
                break;
              case 'mid-right':
                posX = w - padX - fontSize * 1.5;
                posY = h / 2;
                break;
              case 'bot-left':
                posX = padX + fontSize * 1.5;
                posY = h - padY - fontSize / 2;
                break;
              case 'bot-center':
                posX = w / 2;
                posY = h - padY - fontSize / 2;
                break;
              case 'bot-right':
                posX = w - padX - fontSize * 1.5;
                posY = h - padY - fontSize / 2;
                break;
            }
          }

          ctx.translate(posX, posY);
          ctx.rotate((rotation * Math.PI) / 180);

          // Optional Background Badge Pill
          if (hasBadge) {
            const metrics = ctx.measureText(text);
            const badgeW = metrics.width + fontSize * 0.8;
            const badgeH = fontSize * 1.5;
            ctx.save();
            ctx.globalAlpha = badgeOpacity;
            ctx.fillStyle = badgeColor;
            ctx.beginPath();
            ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, fontSize * 0.3);
            ctx.fill();
            ctx.restore();
          }

          // Text Shadow
          if (hasShadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
          }

          ctx.fillStyle = textColor;
          ctx.fillText(text, 0, 0);
        }

        ctx.restore();
      }
    },
    [
      mode,
      text,
      fontFamily,
      fontSize,
      fontBold,
      fontItalic,
      textColor,
      opacity,
      rotation,
      hasShadow,
      hasBadge,
      badgeColor,
      badgeOpacity,
      placement,
      gridPos,
      customPos,
      tileSpacing,
      logoImg,
      logoScale,
      logoOpacity,
    ]
  );

  // Redraw Canvas on active image or parameter changes
  useEffect(() => {
    if (images.length === 0 || !images[activeIndex]) return;
    const currentItem = images[activeIndex];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawWatermarkToCanvas(canvas, img, currentItem);
    };
    img.src = currentItem.url;
  }, [images, activeIndex, drawWatermarkToCanvas]);

  // Canvas Click/Drag to position watermark
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (placement !== 'custom' && placement !== 'grid') {
      setPlacement('custom');
    }
    setIsDraggingWatermark(true);
    updatePositionFromMouse(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingWatermark) return;
    updatePositionFromMouse(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingWatermark(false);
  };

  const updatePositionFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
    setCustomPos({ xPercent: Math.round(xPct), yPercent: Math.round(yPct) });
    setPlacement('custom');
  };

  // Download Active Image
  const handleDownloadCurrent = () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;
    const currentItem = images[activeIndex];
    const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
    const dataUrl = canvas.toDataURL(mime, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    const baseName = currentItem.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_watermarked.${ext}`;
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

  // Batch Apply to All Images and Download ZIP
  const handleBatchDownloadZip = async () => {
    if (images.length === 0) return;
    setIsProcessingBatch(true);

    try {
      const zip = new JSZip();
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';

      // Temporary offscreen canvas
      const offCanvas = document.createElement('canvas');

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve) => {
          img.onload = () => {
            drawWatermarkToCanvas(offCanvas, img, item);
            offCanvas.toBlob((blob) => {
              if (blob) {
                const baseName = item.name.replace(/\.[^/.]+$/, '');
                zip.file(`${baseName}_watermarked.${ext}`, blob);
              }
              resolve();
            }, mime, 0.92);
          };
          img.src = item.url;
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `watermarked_images_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to generate batch zip bundle.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const removeImage = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
  };

  return (
    <div className="space-y-6">
      {/* If No Images Uploaded Yet: Drop Deck */}
      {images.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleImageUpload(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById('watermark-file-input')?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 sm:p-20 text-center glass-card transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 group ${
            theme === 'dark'
              ? 'border-white/[0.12] hover:border-pink-500/70 hover:bg-white/[0.02]'
              : 'border-slate-300 hover:border-pink-500 hover:bg-pink-50/20'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className={`font-display text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Drop Images to Watermark
            </h3>
            <p className={`text-xs max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Upload JPG, PNG, or WebP photos. Stamp custom text, copyright notices, or logo stamps with real-time interactive canvas preview.
            </p>
          </div>
          <div className="pt-2">
            <span className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-950/40 inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Browse Images</span>
            </span>
          </div>
          <input
            id="watermark-file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
          />
        </div>
      ) : (
        /* Workspace when images are loaded */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Settings Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-2xl glass-card space-y-5">
              {/* Watermark Mode Switcher */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Watermark Mode
                </span>
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setMode('text')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 font-medium cursor-pointer ${
                      mode === 'text'
                        ? theme === 'dark'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold'
                          : 'bg-white text-pink-600 border border-pink-200 font-bold shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Text</span>
                  </button>
                  <button
                    onClick={() => setMode('logo')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 font-medium cursor-pointer ${
                      mode === 'logo'
                        ? theme === 'dark'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold'
                          : 'bg-white text-pink-600 border border-pink-200 font-bold shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Logo</span>
                  </button>
                </div>
              </div>

              {/* Text Watermark Parameters */}
              {mode === 'text' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL or © Brand Name"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-pink-500/20 ${
                        theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.09] text-white focus:border-pink-500/70'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-pink-500'
                      }`}
                    />
                  </div>

                  {/* Font Family & Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Font Family
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs border ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border-white/[0.09] text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="sans-serif">Clean Sans</option>
                        <option value="serif">Classic Serif</option>
                        <option value="monospace">Tech Mono</option>
                        <option value="Impact">Bold Impact</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Size ({fontSize}px)
                        </label>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="140"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Style Toggles: Bold, Italic, Shadow, Badge */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setFontBold(!fontBold)}
                      className={`py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        fontBold
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontItalic(!fontItalic)}
                      className={`py-2 rounded-lg border text-xs italic transition-all cursor-pointer ${
                        fontItalic
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasShadow(!hasShadow)}
                      className={`py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        hasShadow
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Shadow
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasBadge(!hasBadge)}
                      className={`py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                        hasBadge
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Badge
                    </button>
                  </div>

                  {/* Text Color & Opacity */}
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 p-0.5 bg-transparent"
                        />
                        <div className="flex items-center gap-1">
                          {['#ffffff', '#000000', '#f43f5e', '#eab308', '#3b82f6'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setTextColor(c)}
                              className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Opacity ({Math.round(opacity * 100)}%)
                        </label>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Rotation Angle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Angle ({rotation}°)
                      </label>
                      <div className="flex items-center gap-1">
                        {[-45, -30, 0, 45, 90].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setRotation(deg)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              rotation === deg
                                ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                                : theme === 'dark'
                                ? 'border-white/[0.08] text-slate-400 hover:text-white'
                                : 'border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Logo Watermark Parameters */}
              {mode === 'logo' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Upload Stamp / Logo (PNG)
                    </label>
                    <label
                      className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        theme === 'dark'
                          ? 'border-white/10 hover:border-pink-500/60 bg-[#0D0F17]'
                          : 'border-slate-300 hover:border-pink-500 bg-slate-50'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-pink-400 mb-1" />
                      <span className="text-xs font-medium text-slate-400 truncate max-w-xs">
                        {logoName || 'Choose Transparent PNG Logo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {logoImg && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Logo Scale ({logoScale}% of image)
                          </label>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          value={logoScale}
                          onChange={(e) => setLogoScale(Number(e.target.value))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Logo Opacity ({Math.round(logoOpacity * 100)}%)
                          </label>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={logoOpacity}
                          onChange={(e) => setLogoOpacity(Number(e.target.value))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Placement & Position Selector */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Placement Mode
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPlacement('grid')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        placement === 'grid'
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-bold'
                          : theme === 'dark'
                          ? 'border-white/[0.08] text-slate-400'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      9-Point Grid
                    </button>
                    {mode === 'text' && (
                      <button
                        type="button"
                        onClick={() => setPlacement('tile')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          placement === 'tile'
                            ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-bold'
                            : theme === 'dark'
                            ? 'border-white/[0.08] text-slate-400'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Full Tile Pattern
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPlacement('custom')}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        placement === 'custom'
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-bold'
                          : theme === 'dark'
                          ? 'border-white/[0.08] text-slate-400'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Drag on Canvas
                    </button>
                  </div>
                </div>

                {placement === 'grid' && (
                  <div className="grid grid-cols-3 gap-1.5 max-w-[160px] mx-auto p-2 rounded-xl bg-black/10 border border-white/5">
                    {(
                      [
                        'top-left',
                        'top-center',
                        'top-right',
                        'mid-left',
                        'center',
                        'mid-right',
                        'bot-left',
                        'bot-center',
                        'bot-right',
                      ] as GridPos[]
                    ).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setGridPos(pos)}
                        className={`h-8 rounded-lg border text-[10px] font-mono transition-all cursor-pointer ${
                          gridPos === pos
                            ? 'bg-pink-500 border-pink-400 text-white shadow-md'
                            : theme === 'dark'
                            ? 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        •
                      </button>
                    ))}
                  </div>
                )}

                {placement === 'tile' && mode === 'text' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Tile Spacing</span>
                      <span className="font-mono text-pink-400">{tileSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      value={tileSpacing}
                      onChange={(e) => setTileSpacing(Number(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                  </div>
                )}

                {placement === 'custom' && (
                  <p className={`text-[11px] text-center italic ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    💡 Click or drag anywhere on the canvas preview to position your watermark freely!
                  </p>
                )}
              </div>
            </div>

            {/* Export Settings Card */}
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Output Format
                </span>
                <div
                  className={`flex items-center p-1 rounded-xl border text-xs ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setExportFormat('png')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      exportFormat === 'png'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    PNG (Crisp)
                  </button>
                  <button
                    onClick={() => setExportFormat('jpeg')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      exportFormat === 'jpeg'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : theme === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    JPG (Compact)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleDownloadCurrent}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-pink-950/40 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Watermarked Image</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className={`py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#12141D] hover:bg-[#1A1E2B] border-white/[0.08] text-slate-300'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Image'}</span>
                  </button>

                  {images.length > 1 && (
                    <button
                      onClick={handleBatchDownloadZip}
                      disabled={isProcessingBatch}
                      className="py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingBatch ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileArchive className="w-3.5 h-3.5" />
                      )}
                      <span>Batch All ({images.length})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Canvas Preview Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Stage Toolbar */}
            <div className="p-3 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-mono text-slate-400 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Photo {activeIndex + 1} of {images.length}
                </span>
                <span className="font-semibold truncate max-w-[200px] text-pink-400">
                  {images[activeIndex]?.name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({images[activeIndex]?.width}×{images[activeIndex]?.height}px)
                </span>
              </div>

              {/* Zoom & Add More */}
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

                <label className="text-xs font-semibold text-pink-500 hover:text-pink-400 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-500/20 hover:bg-pink-500/10 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
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
                className="relative shadow-2xl rounded-lg overflow-hidden cursor-crosshair inline-block"
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="max-w-full max-h-[560px] object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Multi-Image Thumbnails Carousel (If > 1 photo) */}
            {images.length > 1 && (
              <div className="p-3 rounded-2xl glass-card space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">Queue ({images.length} Photos)</span>
                  <span className="text-[11px]">Click thumbnail to inspect and preview</span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        activeIndex === idx
                          ? 'border-pink-500 ring-2 ring-pink-500/30 scale-105 shadow-md'
                          : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => removeImage(idx, e)}
                          className="p-1 rounded-full bg-red-600 text-white hover:bg-red-500"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-[9px] font-mono font-bold bg-black/60 text-white px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
