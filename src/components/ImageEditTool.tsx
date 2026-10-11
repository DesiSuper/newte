import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Download,
  Trash2,
  Plus,
  Lock,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  X,
} from 'lucide-react';

interface ImageEditToolProps {
  theme: 'dark' | 'light';
}

interface Item {
  id: string;
  file: File;
  name: string;
  url: string;
  width: number;
  height: number;
}

type Tab = 'size' | 'percent' | 'social';
type FormatOpt = 'original' | 'jpeg' | 'png' | 'webp';
type RotateOpt = 'none' | 'cw' | 'ccw' | '180' | 'fh' | 'fv';
type ColourOpt = 'original' | 'grayscale' | 'sepia' | 'invert' | 'bw';

interface Settings {
  tab: Tab;
  width: string;
  height: string;
  lock: boolean;
  lastEdited: 'width' | 'height';
  percent: number;
  socialId: string;
  socialFit: 'cover' | 'contain';
  format: FormatOpt;
  quality: number;
  cropRatio: string;
  minKB: string;
  maxKB: string;
  dpi: string;
  rotate: RotateOpt;
  colour: ColourOpt;
}

const SOCIAL_PRESETS: { id: string; label: string; w: number; h: number }[] = [
  { id: 'ig-post', label: 'Instagram Post (1:1)', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'Instagram Portrait (4:5)', w: 1080, h: 1350 },
  { id: 'ig-story', label: 'Instagram / WhatsApp Story', w: 1080, h: 1920 },
  { id: 'fb-post', label: 'Facebook Post', w: 1200, h: 630 },
  { id: 'fb-cover', label: 'Facebook Cover', w: 820, h: 312 },
  { id: 'x-post', label: 'X (Twitter) Post', w: 1600, h: 900 },
  { id: 'x-header', label: 'X (Twitter) Header', w: 1500, h: 500 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', w: 1280, h: 720 },
  { id: 'yt-banner', label: 'YouTube Channel Banner', w: 2560, h: 1440 },
  { id: 'li-banner', label: 'LinkedIn Banner', w: 1584, h: 396 },
  { id: 'li-post', label: 'LinkedIn Post', w: 1200, h: 627 },
  { id: 'pin', label: 'Pinterest Pin (2:3)', w: 1000, h: 1500 },
  { id: 'dp', label: 'Profile Picture (Square)', w: 500, h: 500 },
];

const DEFAULTS: Settings = {
  tab: 'size',
  width: '',
  height: '',
  lock: true,
  lastEdited: 'width',
  percent: 50,
  socialId: 'ig-post',
  socialFit: 'cover',
  format: 'original',
  quality: 85,
  cropRatio: '',
  minKB: '',
  maxKB: '',
  dpi: '',
  rotate: 'none',
  colour: 'original',
};

/* ---------------- helpers ---------------- */

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function parseRatio(str: string): number | null {
  const t = str.trim();
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)\s*[:/xX]\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    return a > 0 && b > 0 ? a / b : null;
  }
  const n = parseFloat(t);
  return n > 0 && isFinite(n) ? n : null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, q?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
      mime,
      q
    );
  });
}

function rotatedDims(w: number, h: number, r: RotateOpt) {
  return r === 'cw' || r === 'ccw' ? { w: h, h: w } : { w, h };
}

function resolveMime(file: File, fmt: FormatOpt): { mime: string; ext: string } {
  if (fmt === 'jpeg') return { mime: 'image/jpeg', ext: 'jpg' };
  if (fmt === 'png') return { mime: 'image/png', ext: 'png' };
  if (fmt === 'webp') return { mime: 'image/webp', ext: 'webp' };
  if (file.type === 'image/jpeg') return { mime: 'image/jpeg', ext: 'jpg' };
  if (file.type === 'image/webp') return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/png', ext: 'png' };
}

/** Write DPI into the JPEG JFIF header (insert header if missing). */
async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return blob;
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const hasJfif =
    buf[2] === 0xff && buf[3] === 0xe0 && buf[6] === 0x4a && buf[7] === 0x46 && buf[8] === 0x49 && buf[9] === 0x46;
  if (hasJfif) {
    buf[13] = 1;
    buf[14] = d >> 8;
    buf[15] = d & 255;
    buf[16] = d >> 8;
    buf[17] = d & 255;
    return new Blob([buf], { type: 'image/jpeg' });
  }
  const header = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    d >> 8, d & 255, d >> 8, d & 255, 0x00, 0x00,
  ]);
  return new Blob([buf.subarray(0, 2), header, buf.subarray(2)], { type: 'image/jpeg' });
}

function applyColour(canvas: HTMLCanvasElement, mode: ColourOpt) {
  if (mode === 'original') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    if (mode === 'grayscale') {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      p[i] = p[i + 1] = p[i + 2] = y;
    } else if (mode === 'bw') {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const v = y > 128 ? 255 : 0;
      p[i] = p[i + 1] = p[i + 2] = v;
    } else if (mode === 'sepia') {
      p[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
      p[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
      p[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    } else if (mode === 'invert') {
      p[i] = 255 - r;
      p[i + 1] = 255 - g;
      p[i + 2] = 255 - b;
    }
  }
  ctx.putImageData(data, 0, 0);
}

/** Step 1: apply rotate / flip, return a new canvas */
function rotateCanvas(img: HTMLImageElement, r: RotateOpt): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const { w, h } = rotatedDims(img.naturalWidth, img.naturalHeight, r);
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.save();
  if (r === 'cw') {
    ctx.translate(w, 0);
    ctx.rotate(Math.PI / 2);
  } else if (r === 'ccw') {
    ctx.translate(0, h);
    ctx.rotate(-Math.PI / 2);
  } else if (r === '180') {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
  } else if (r === 'fh') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  } else if (r === 'fv') {
    ctx.translate(0, h);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  return c;
}

/** Centre-crop a rectangle of the source to a given ratio */
function cropRect(w: number, h: number, ratio: number) {
  const cur = w / h;
  if (Math.abs(cur - ratio) < 0.0001) return { sx: 0, sy: 0, sw: w, sh: h };
  if (cur > ratio) {
    const sw = Math.round(h * ratio);
    return { sx: Math.round((w - sw) / 2), sy: 0, sw, sh: h };
  }
  const sh = Math.round(w / ratio);
  return { sx: 0, sy: Math.round((h - sh) / 2), sw: w, sh };
}

function computeTarget(srcW: number, srcH: number, s: Settings): { w: number; h: number } {
  if (s.tab === 'percent') {
    const k = Math.max(1, s.percent) / 100;
    return { w: Math.max(1, Math.round(srcW * k)), h: Math.max(1, Math.round(srcH * k)) };
  }
  if (s.tab === 'social') {
    const p = SOCIAL_PRESETS.find((x) => x.id === s.socialId) || SOCIAL_PRESETS[0];
    return { w: p.w, h: p.h };
  }
  const w = parseInt(s.width, 10) || 0;
  const h = parseInt(s.height, 10) || 0;
  if (!w && !h) return { w: srcW, h: srcH };
  if (w && !h) return { w, h: Math.max(1, Math.round((srcH * w) / srcW)) };
  if (h && !w) return { w: Math.max(1, Math.round((srcW * h) / srcH)), h };
  if (s.lock) {
    const k = Math.min(w / srcW, h / srcH);
    return { w: Math.max(1, Math.round(srcW * k)), h: Math.max(1, Math.round(srcH * k)) };
  }
  return { w, h };
}

interface Result {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
}

async function processImage(item: Item, s: Settings): Promise<Result> {
  const img = await loadImage(item.url);
  const { mime, ext } = resolveMime(item.file, s.format);
  const lossy = mime === 'image/jpeg' || mime === 'image/webp';

  const rotated = rotateCanvas(img, s.rotate);

  // Decide source crop
  let crop = { sx: 0, sy: 0, sw: rotated.width, sh: rotated.height };
  let target: { w: number; h: number };

  if (s.tab === 'social') {
    const p = SOCIAL_PRESETS.find((x) => x.id === s.socialId) || SOCIAL_PRESETS[0];
    target = { w: p.w, h: p.h };
    if (s.socialFit === 'cover') crop = cropRect(rotated.width, rotated.height, p.w / p.h);
  } else {
    const ratio = parseRatio(s.cropRatio);
    if (ratio) crop = cropRect(rotated.width, rotated.height, ratio);
    target = computeTarget(crop.sw, crop.sh, s);
  }

  const draw = (scale: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(target.w * scale));
    c.height = Math.max(1, Math.round(target.h * scale));
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (mime === 'image/jpeg' || (s.tab === 'social' && s.socialFit === 'contain')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    if (s.tab === 'social' && s.socialFit === 'contain') {
      const k = Math.min(c.width / crop.sw, c.height / crop.sh);
      const dw = crop.sw * k;
      const dh = crop.sh * k;
      ctx.drawImage(rotated, crop.sx, crop.sy, crop.sw, crop.sh, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(rotated, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, c.width, c.height);
    }
    applyColour(c, s.colour);
    return c;
  };

  const minBytes = (parseFloat(s.minKB) || 0) * 1024;
  const maxBytes = (parseFloat(s.maxKB) || 0) * 1024;
  const baseQ = Math.max(0.05, Math.min(1, s.quality / 100));

  let canvas = draw(1);
  let blob: Blob;

  if (!lossy) {
    blob = await canvasToBlob(canvas, mime);
    // PNG cannot be compressed by quality: shrink dimensions if a max size is requested
    if (maxBytes) {
      let scale = 1;
      let tries = 0;
      while (blob.size > maxBytes && tries < 10) {
        scale *= 0.85;
        canvas = draw(scale);
        blob = await canvasToBlob(canvas, mime);
        tries++;
      }
    }
  } else if (maxBytes) {
    // find highest quality under max; if impossible, shrink dimensions
    let scale = 1;
    let found: Blob | null = null;
    for (let attempt = 0; attempt < 8 && !found; attempt++) {
      canvas = scale === 1 ? canvas : draw(scale);
      const lowest = await canvasToBlob(canvas, mime, 0.05);
      if (lowest.size > maxBytes) {
        scale *= 0.85;
        continue;
      }
      let lo = 0.05;
      let hi = 1;
      let best = lowest;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const b = await canvasToBlob(canvas, mime, mid);
        if (b.size <= maxBytes) {
          best = b;
          lo = mid;
        } else hi = mid;
      }
      found = best;
    }
    blob = found || (await canvasToBlob(canvas, mime, 0.05));
  } else {
    blob = await canvasToBlob(canvas, mime, baseQ);
    if (minBytes && blob.size < minBytes) {
      // raise quality towards 100% to get closer to the minimum
      const top = await canvasToBlob(canvas, mime, 1);
      if (top.size >= minBytes) {
        let lo = baseQ;
        let hi = 1;
        let best = top;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          const b = await canvasToBlob(canvas, mime, mid);
          if (b.size >= minBytes) {
            best = b;
            hi = mid;
          } else lo = mid;
        }
        blob = best;
      } else {
        blob = top;
      }
    }
  }

  if (mime === 'image/jpeg' && parseInt(s.dpi, 10) > 0) {
    blob = await setJpegDpi(blob, parseInt(s.dpi, 10));
  }

  // Still under the minimum? Append harmless trailing bytes (JPG / PNG only).
  if (minBytes && blob.size < minBytes && (mime === 'image/jpeg' || mime === 'image/png')) {
    const pad = Math.ceil(minBytes - blob.size);
    blob = new Blob([blob, new Uint8Array(pad)], { type: mime });
  }

  return { blob, width: canvas.width, height: canvas.height, ext };
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------- component ---------------- */

export function ImageEditTool({ theme }: ImageEditToolProps) {
  const dark = theme === 'dark';
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [advOpen, setAdvOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number; size: number } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewToken = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const upd = (patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch }));

  const activeItem = items[Math.min(active, items.length - 1)];

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      setError('Please choose image files (JPG, PNG, WebP, GIF, BMP).');
      return;
    }
    setError(null);
    const added: Item[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImage(url);
        added.push({
          id: Math.random().toString(36).slice(2),
          file: f,
          name: f.name,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        URL.revokeObjectURL(url);
      }
    }
    if (added.length) setItems((prev) => [...prev, ...added]);
    else setError('Could not read the selected image(s).');
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
    setActive(0);
  };

  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    setActive(0);
    setPreview(null);
  };

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  // Keep the height/width field in sync with the lock (based on the active image)
  const onWidthChange = (v: string) => {
    const clean = v.replace(/[^0-9]/g, '');
    const patch: Partial<Settings> = { width: clean, lastEdited: 'width' };
    if (s.lock && activeItem && clean) {
      const d = rotatedDims(activeItem.width, activeItem.height, s.rotate);
      patch.height = String(Math.max(1, Math.round((d.h * parseInt(clean, 10)) / d.w)));
    } else if (s.lock && !clean) {
      patch.height = '';
    }
    upd(patch);
  };
  const onHeightChange = (v: string) => {
    const clean = v.replace(/[^0-9]/g, '');
    const patch: Partial<Settings> = { height: clean, lastEdited: 'height' };
    if (s.lock && activeItem && clean) {
      const d = rotatedDims(activeItem.width, activeItem.height, s.rotate);
      patch.width = String(Math.max(1, Math.round((d.w * parseInt(clean, 10)) / d.h)));
    } else if (s.lock && !clean) {
      patch.width = '';
    }
    upd(patch);
  };

  // Live preview of the active image
  useEffect(() => {
    if (!activeItem) {
      setPreview(null);
      return;
    }
    const token = ++previewToken.current;
    setPreviewBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await processImage(activeItem, s);
        if (token !== previewToken.current) return;
        const url = URL.createObjectURL(r.blob);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { url, width: r.width, height: r.height, size: r.blob.size };
        });
        setError(null);
      } catch (e: any) {
        if (token === previewToken.current) setError(e?.message || 'Preview failed');
      } finally {
        if (token === previewToken.current) setPreviewBusy(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, s]);

  const exportAll = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const outputs: { name: string; blob: Blob }[] = [];
      const used = new Set<string>();
      for (let i = 0; i < items.length; i++) {
        setProgress(`Processing ${i + 1} / ${items.length}…`);
        const r = await processImage(items[i], s);
        const base = items[i].name.replace(/\.[^/.]+$/, '');
        let name = `${base}_edited.${r.ext}`;
        let n = 2;
        while (used.has(name)) name = `${base}_edited_${n++}.${r.ext}`;
        used.add(name);
        outputs.push({ name, blob: r.blob });
      }
      if (outputs.length === 1) {
        triggerDownload(outputs[0].blob, outputs[0].name);
      } else {
        const zip = new JSZip();
        outputs.forEach((o) => zip.file(o.name, o.blob));
        const zb = await zip.generateAsync({ type: 'blob' });
        triggerDownload(zb, 'edited_images.zip');
      }
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  /* ---------- styles ---------- */
  const panel = dark ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-white border-slate-200';
  const label = `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`;
  const input = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition focus:ring-2 focus:ring-violet-500/50 ${
    dark
      ? 'bg-white/[0.04] border-white/[0.1] text-white placeholder-slate-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
  }`;
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const heading = dark ? 'text-white' : 'text-slate-900';
  const tabBtn = (on: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-semibold transition ${
      on
        ? dark
          ? 'bg-violet-500/20 text-violet-300 shadow'
          : 'bg-white text-violet-700 shadow'
        : dark
        ? 'text-slate-400 hover:text-slate-200'
        : 'text-slate-500 hover:text-slate-800'
    }`;

  const ratioInvalid = s.cropRatio.trim() !== '' && parseRatio(s.cropRatio) === null;
  const lossyOut = (() => {
    if (!activeItem) return true;
    const m = resolveMime(activeItem.file, s.format).mime;
    return m !== 'image/png';
  })();
  const jpgOut = activeItem ? resolveMime(activeItem.file, s.format).mime === 'image/jpeg' : s.format === 'jpeg';

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-5 animate-fade-in">
      {/* ================= SETTINGS PANEL ================= */}
      <div className={`rounded-2xl border p-5 space-y-5 lg:max-h-[78vh] lg:overflow-y-auto ${panel}`}>
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-violet-500">YOURX STUDIO</p>
          <h3 className={`font-display text-2xl font-bold ${heading}`}>Image Edit</h3>
          <p className={`text-sm ${muted}`}>Resize, crop, target KB, DPI &amp; format — one workspace.</p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
          <button className={tabBtn(s.tab === 'size')} onClick={() => upd({ tab: 'size' })}>By size</button>
          <button className={tabBtn(s.tab === 'percent')} onClick={() => upd({ tab: 'percent' })}>Percentage</button>
          <button className={tabBtn(s.tab === 'social')} onClick={() => upd({ tab: 'social' })}>Social media</button>
        </div>

        {s.tab === 'size' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Width (px)</label>
                <input
                  className={input}
                  inputMode="numeric"
                  placeholder="Original"
                  value={s.width}
                  onChange={(e) => onWidthChange(e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Height (px)</label>
                <input
                  className={input}
                  inputMode="numeric"
                  placeholder="Original"
                  value={s.height}
                  onChange={(e) => onHeightChange(e.target.value)}
                />
              </div>
            </div>
            <label className={`flex items-center gap-2.5 text-sm cursor-pointer ${heading}`}>
              <input
                type="checkbox"
                checked={s.lock}
                onChange={(e) => upd({ lock: e.target.checked })}
                className="w-4 h-4 accent-violet-600"
              />
              Lock aspect ratio
            </label>
            <p className={`text-xs ${muted}`}>Leave both fields empty to keep original dimensions.</p>
          </div>
        )}

        {s.tab === 'percent' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={`${label} mb-0`}>Scale</label>
              <span className="text-sm font-bold text-violet-500">{s.percent}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              value={s.percent}
              onChange={(e) => upd({ percent: parseInt(e.target.value, 10) })}
              className="w-full accent-violet-600"
            />
            <div className="flex gap-2 flex-wrap">
              {[25, 50, 75, 100, 150, 200].map((p) => (
                <button
                  key={p}
                  onClick={() => upd({ percent: p })}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                    s.percent === p
                      ? 'bg-violet-600 text-white border-violet-600'
                      : dark
                      ? 'border-white/[0.1] text-slate-300 hover:bg-white/[0.06]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}

        {s.tab === 'social' && (
          <div className="space-y-3">
            <div>
              <label className={label}>Platform preset</label>
              <select className={input} value={s.socialId} onChange={(e) => upd({ socialId: e.target.value })}>
                {SOCIAL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.w}×{p.h}
                  </option>
                ))}
              </select>
            </div>
            <div className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
              <button className={tabBtn(s.socialFit === 'cover')} onClick={() => upd({ socialFit: 'cover' })}>
                Fill &amp; crop
              </button>
              <button className={tabBtn(s.socialFit === 'contain')} onClick={() => upd({ socialFit: 'contain' })}>
                Fit (white bars)
              </button>
            </div>
          </div>
        )}

        <div className={`h-px ${dark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

        {/* Export settings */}
        <div className="space-y-4">
          <h4 className={`font-display text-lg font-bold ${heading}`}>Export settings</h4>
          <div>
            <label className={label}>Save image as</label>
            <select className={input} value={s.format} onChange={(e) => upd({ format: e.target.value as FormatOpt })}>
              <option value="original">Original format</option>
              <option value="jpeg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className={`rounded-xl p-4 ${dark ? 'bg-white/[0.04]' : 'bg-violet-50/60'} ${!lossyOut ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${heading}`}>Image quality</span>
              <span className="text-sm font-bold text-violet-500">{s.quality}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={s.quality}
              disabled={!lossyOut}
              onChange={(e) => upd({ quality: parseInt(e.target.value, 10) })}
              className="w-full accent-violet-600"
            />
            {!lossyOut && <p className={`text-xs mt-1 ${muted}`}>PNG is lossless — quality applies to JPG / WebP.</p>}
          </div>
        </div>

        {/* Advanced options */}
        <div>
          <button
            onClick={() => setAdvOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-violet-500 hover:text-violet-400"
          >
            Advanced options {advOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {advOpen && (
            <div className="space-y-4 mt-4">
              <div>
                <label className={label}>Crop ratio (optional)</label>
                <input
                  className={`${input} ${ratioInvalid ? '!border-red-500' : ''} ${s.tab === 'social' ? 'opacity-50' : ''}`}
                  placeholder="e.g. 4:5"
                  value={s.cropRatio}
                  disabled={s.tab === 'social'}
                  onChange={(e) => upd({ cropRatio: e.target.value })}
                />
                {ratioInvalid && <p className="text-xs text-red-500 mt-1">Use a format like 4:5, 16:9 or 1.5</p>}
                {s.tab === 'social' && <p className={`text-xs mt-1 ${muted}`}>Social presets crop automatically.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Min size (KB)</label>
                  <input
                    className={input}
                    inputMode="numeric"
                    placeholder="optional"
                    value={s.minKB}
                    onChange={(e) => upd({ minKB: e.target.value.replace(/[^0-9.]/g, '') })}
                  />
                </div>
                <div>
                  <label className={label}>Max size (KB)</label>
                  <input
                    className={input}
                    inputMode="numeric"
                    placeholder="optional"
                    value={s.maxKB}
                    onChange={(e) => upd({ maxKB: e.target.value.replace(/[^0-9.]/g, '') })}
                  />
                </div>
              </div>
              <div>
                <label className={label}>DPI (JPG only)</label>
                <input
                  className={`${input} ${!jpgOut ? 'opacity-50' : ''}`}
                  inputMode="numeric"
                  placeholder="e.g. 300"
                  value={s.dpi}
                  disabled={!jpgOut}
                  onChange={(e) => upd({ dpi: e.target.value.replace(/[^0-9]/g, '') })}
                />
              </div>
              <div>
                <label className={label}>Rotate or flip</label>
                <select className={input} value={s.rotate} onChange={(e) => upd({ rotate: e.target.value as RotateOpt })}>
                  <option value="none">None</option>
                  <option value="cw">Rotate 90° right</option>
                  <option value="ccw">Rotate 90° left</option>
                  <option value="180">Rotate 180°</option>
                  <option value="fh">Flip horizontal</option>
                  <option value="fv">Flip vertical</option>
                </select>
              </div>
              <div>
                <label className={label}>Colour</label>
                <select className={input} value={s.colour} onChange={(e) => upd({ colour: e.target.value as ColourOpt })}>
                  <option value="original">Original</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="bw">Black &amp; white</option>
                  <option value="sepia">Sepia</option>
                  <option value="invert">Invert</option>
                </select>
              </div>
              <button
                onClick={() => setS({ ...DEFAULTS })}
                className={`text-xs font-semibold underline ${muted} hover:text-violet-500`}
              >
                Reset all settings
              </button>
            </div>
          )}
        </div>

        {/* Export button */}
        <div className="sticky bottom-0 pt-3 -mx-1 px-1">
          <p className={`text-center text-xs mb-2 ${muted}`}>
            {items.length ? `${items.length} image${items.length > 1 ? 's' : ''} ready` : 'Add images to get started'}
          </p>
          <button
            onClick={exportAll}
            disabled={!items.length || busy || ratioInvalid}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-900/30 transition disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {busy ? progress || 'Working…' : items.length > 1 ? 'Export images (ZIP)' : 'Export image'}
          </button>
        </div>
      </div>

      {/* ================= WORKSPACE ================= */}
      <div className="space-y-4 min-w-0">
        {error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-400">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!items.length ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed min-h-[460px] flex flex-col items-center justify-center text-center p-8 transition ${
              dragOver
                ? 'border-violet-500 bg-violet-500/10'
                : dark
                ? 'border-white/[0.14] bg-white/[0.02]'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-300 to-yellow-400 flex items-center justify-center shadow-xl mb-5">
              <ImageIcon className="w-11 h-11 text-white" />
            </div>
            <h3 className={`font-display text-2xl font-bold ${heading}`}>Image Edit</h3>
            <p className={`mt-1 mb-6 ${muted}`}>Resize, crop, target KB, DPI &amp; format.</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-900/30 hover:brightness-110 transition"
            >
              Select images
            </button>
            <p className={`mt-4 text-sm ${muted}`}>or drag &amp; drop here</p>
            <div className="flex gap-2 mt-5">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${dark ? 'border-white/[0.1] text-slate-300' : 'border-slate-200 text-slate-600 bg-white'}`}>
                <Lock className="w-3.5 h-3.5" /> No upload
              </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${dark ? 'border-white/[0.1] text-slate-300' : 'border-slate-200 text-slate-600 bg-white'}`}>
                <Zap className="w-3.5 h-3.5" /> Instant
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className={`rounded-2xl border p-4 ${panel}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${heading}`}>{activeItem?.name}</p>
                  <p className={`text-xs ${muted}`}>
                    Original: {activeItem?.width}×{activeItem?.height} · {activeItem ? fmtBytes(activeItem.file.size) : ''}
                    {preview && (
                      <>
                        {'  →  '}
                        <span className="text-violet-500 font-semibold">
                          {preview.width}×{preview.height} · {fmtBytes(preview.size)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {previewBusy && <Loader2 className="w-4 h-4 animate-spin text-violet-500" />}
              </div>
              <div
                className={`rounded-xl flex items-center justify-center overflow-hidden min-h-[320px] max-h-[56vh] ${
                  dark ? 'bg-black/30' : 'bg-slate-100'
                }`}
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, rgba(128,128,128,.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,.12) 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
                {preview ? (
                  <img src={preview.url} alt="Preview" className="max-w-full max-h-[56vh] object-contain" />
                ) : (
                  <img src={activeItem?.url} alt="Original" className="max-w-full max-h-[56vh] object-contain opacity-60" />
                )}
              </div>
            </div>

            {/* Thumbnails */}
            <div className={`rounded-2xl border p-4 ${panel}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-sm font-semibold ${heading}`}>{items.length} image{items.length > 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white flex items-center gap-1 hover:brightness-110"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add more
                  </button>
                  <button
                    onClick={clearAll}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                      dark ? 'border-white/[0.1] text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {items.map((it, idx) => (
                  <div key={it.id} className="relative shrink-0 group">
                    <button
                      onClick={() => setActive(idx)}
                      className={`block w-24 h-24 rounded-xl overflow-hidden border-2 transition ${
                        idx === active ? 'border-violet-500' : dark ? 'border-white/[0.1]' : 'border-slate-200'
                      }`}
                    >
                      <img src={it.url} alt={it.name} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      aria-label="Remove image"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-90 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
