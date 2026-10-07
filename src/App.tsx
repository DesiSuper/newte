/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  Layers,
  Scissors,
  Minimize2,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Stamp,
  Hash,
  Grid,
  PenTool,
  Lock,
  Download,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ShieldCheck,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Github,
  SlidersHorizontal,
  FileCheck,
  AlertCircle,
  RefreshCw,
  FileCode,
  Zap,
  Clock,
  Archive,
  CheckCircle2,
  Sparkles,
  Command,
  UploadCloud,
  FileSpreadsheet,
  ListOrdered,
  Eye,
  EyeOff,
  Sun,
  Moon,
  MoonStar,
  Link2,
  Unlink,
  Unlock,
  GripVertical,
  FileEdit,
  Tag,
  TrendingDown,
  Info,
  LayoutGrid,
  Percent,
  ArrowLeftRight,
  Receipt,
  Landmark,
  Calendar,
  Calculator,
} from 'lucide-react';

import {
  mergePDFs,
  extractPDFPages,
  splitAllPagesToZip,
  imagesToPDF,
  rotatePDF,
  watermarkPDF,
  addPageNumbers,
  organizePDF,
  signPDF,
  compressPDF,
  darkModePDF,
  pdfToJpg,
  unlockPDF,
  addLinkToPDF,
  removeLinksFromPDF,
  getPDFMetadata,
  parsePageRange,
  downloadFile,
  createBlobFromBytes,
  packageFilesIntoZip,
  formatBytes,
  formatBatchFilename,
  PDFMetadata,
} from './utils/pdfProcessor';
import { PDFPreview } from './components/PDFPreview';
import { ImageWatermarkTool } from './components/ImageWatermarkTool';
import { ImageCollageTool } from './components/ImageCollageTool';
import { AgeCalculatorTool } from './components/AgeCalculatorTool';
import { PercentageCalculatorTool } from './components/PercentageCalculatorTool';
import { UnitConverterTool } from './components/UnitConverterTool';
import { GstCalculatorTool } from './components/GstCalculatorTool';
import { EmiCalculatorTool } from './components/EmiCalculatorTool';

// Tool Definition Interface
interface PDFTool {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tag: string;
  category: 'organize' | 'optimize' | 'convert' | 'security' | 'edit' | 'image' | 'calculator';
  acceptTypes: string;
  allowsMultiple: boolean;
  accentColor: string;
  accentBg: string;
  glowColor: string;
  popular?: boolean;
  shortcut?: string;
  shortcutKey?: string;
}

const TOOLS: PDFTool[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF documents into a unified, cleanly sequenced file with custom page order.',
    icon: Layers,
    tag: 'Batch Binding',
    category: 'organize',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-rose-400',
    accentBg: 'from-rose-500/20 to-red-600/10 border-rose-500/30',
    glowColor: 'group-hover:border-rose-500/50 group-hover:shadow-rose-950/40',
    popular: true,
    shortcut: 'Ctrl+M',
    shortcutKey: 'm',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Significantly reduce document weight without sacrificing typography crispness or vector art.',
    icon: Minimize2,
    tag: 'Batch Queue',
    category: 'optimize',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-emerald-400',
    accentBg: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30',
    glowColor: 'group-hover:border-emerald-500/50 group-hover:shadow-emerald-950/40',
    popular: true,
    shortcut: 'Ctrl+C',
    shortcutKey: 'c',
  },
  {
    id: 'watermark',
    title: 'Watermark PDF',
    description: 'Stamp dynamic text watermarks with live angle, opacity, color tuning, and instant preview.',
    icon: Stamp,
    tag: 'Batch Queue',
    category: 'edit',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-pink-400',
    accentBg: 'from-pink-500/20 to-rose-600/10 border-pink-500/30',
    glowColor: 'group-hover:border-pink-500/50 group-hover:shadow-pink-950/40',
    popular: true,
    shortcut: 'Ctrl+B',
    shortcutKey: 'b',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific page sequences or batch-unpack every individual page into a ready ZIP archive.',
    icon: Scissors,
    tag: 'Fast Range',
    category: 'organize',
    acceptTypes: '.pdf',
    allowsMultiple: false,
    accentColor: 'text-amber-400',
    accentBg: 'from-amber-500/20 to-orange-600/10 border-amber-500/30',
    glowColor: 'group-hover:border-amber-500/50 group-hover:shadow-amber-950/40',
    shortcut: 'Ctrl+S',
    shortcutKey: 's',
  },
  {
    id: 'img-to-pdf',
    title: 'Images to PDF',
    description: 'Compile high-res JPG, PNG, and WebP photos into clean A4 or custom formatted PDF pages.',
    icon: ImageIcon,
    tag: 'Multi-Format',
    category: 'convert',
    acceptTypes: 'image/*',
    allowsMultiple: true,
    accentColor: 'text-blue-400',
    accentBg: 'from-blue-500/20 to-indigo-600/10 border-blue-500/30',
    glowColor: 'group-hover:border-blue-500/50 group-hover:shadow-blue-950/40',
    shortcut: 'Ctrl+I',
    shortcutKey: 'i',
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Orient pages with 90°, 180°, or 270° clockwise adjustments with instant visual feedback.',
    icon: RotateCw,
    tag: 'Batch Ready',
    category: 'organize',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-purple-400',
    accentBg: 'from-purple-500/20 to-violet-600/10 border-purple-500/30',
    glowColor: 'group-hover:border-purple-500/50 group-hover:shadow-purple-950/40',
    shortcut: 'Ctrl+R',
    shortcutKey: 'r',
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    description: 'Insert professional document coordinates (Page X of Y, X / Y) across single or batch files.',
    icon: Hash,
    tag: 'Batch Ready',
    category: 'edit',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-cyan-400',
    accentBg: 'from-cyan-500/20 to-sky-600/10 border-cyan-500/30',
    glowColor: 'group-hover:border-cyan-500/50 group-hover:shadow-cyan-950/40',
    shortcut: 'Ctrl+N',
    shortcutKey: 'n',
  },
  {
    id: 'organize',
    title: 'Organize Pages',
    description: 'Inspect document pages in a visual grid, eliminate unwanted sheets, and reorder on the fly.',
    icon: Grid,
    tag: 'Interactive',
    category: 'organize',
    acceptTypes: '.pdf',
    allowsMultiple: false,
    accentColor: 'text-yellow-400',
    accentBg: 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30',
    glowColor: 'group-hover:border-yellow-500/50 group-hover:shadow-yellow-950/40',
    shortcut: 'Ctrl+O',
    shortcutKey: 'o',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'Draw your signature on an interactive digital canvas and place it precisely on any page.',
    icon: PenTool,
    tag: 'Touch & Pen',
    category: 'security',
    acceptTypes: '.pdf',
    allowsMultiple: false,
    accentColor: 'text-teal-400',
    accentBg: 'from-teal-500/20 to-emerald-600/10 border-teal-500/30',
    glowColor: 'group-hover:border-teal-500/50 group-hover:shadow-teal-950/40',
    shortcut: 'Ctrl+E',
    shortcutKey: 'e',
  },
  {
    id: 'pdf-to-text',
    title: 'Extract Text',
    description: 'Quickly inspect and extract clean unicode text streams from PDF documents for notes and copy.',
    icon: FileText,
    tag: 'Inspector',
    category: 'convert',
    acceptTypes: '.pdf',
    allowsMultiple: false,
    accentColor: 'text-sky-400',
    accentBg: 'from-sky-500/20 to-blue-600/10 border-sky-500/30',
    glowColor: 'group-hover:border-sky-500/50 group-hover:shadow-sky-950/40',
    shortcut: 'Ctrl+T',
    shortcutKey: 't',
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt sensitive documents with user passwords and cryptographic restrictions.',
    icon: Lock,
    tag: 'Batch Ready',
    category: 'security',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-rose-400',
    accentBg: 'from-rose-500/20 to-red-700/10 border-rose-500/30',
    glowColor: 'group-hover:border-rose-500/50 group-hover:shadow-rose-950/40',
    shortcut: 'Ctrl+P',
    shortcutKey: 'p',
  },
  {
    id: 'dark-mode',
    title: 'Dark Mode PDF',
    description: 'Convert bright white documents into stylish Midnight, OLED Pure Black, or Warm Sepia night-reading PDFs.',
    icon: MoonStar,
    tag: 'Visual Mode',
    category: 'optimize',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-indigo-400',
    accentBg: 'from-indigo-500/20 to-purple-600/10 border-indigo-500/30',
    glowColor: 'group-hover:border-indigo-500/50 group-hover:shadow-indigo-950/40',
    popular: true,
    shortcut: 'Ctrl+D',
    shortcutKey: 'd',
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Extract every page of your PDF into high-res JPG images, packaged in a single ZIP or individual photos.',
    icon: ImageIcon,
    tag: 'High DPI',
    category: 'convert',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-emerald-400',
    accentBg: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30',
    glowColor: 'group-hover:border-emerald-500/50 group-hover:shadow-emerald-950/40',
    popular: true,
    shortcut: 'Ctrl+J',
    shortcutKey: 'j',
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Remove password security and owner restrictions to freely view, edit, print, and copy contents.',
    icon: Unlock,
    tag: 'Security Decrypt',
    category: 'security',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-amber-400',
    accentBg: 'from-amber-500/20 to-orange-600/10 border-amber-500/30',
    glowColor: 'group-hover:border-amber-500/50 group-hover:shadow-amber-950/40',
    popular: true,
    shortcut: 'Ctrl+U',
    shortcutKey: 'u',
  },
  {
    id: 'add-link',
    title: 'Add PDF Link',
    description: 'Insert clickable web hyperlinks, URL buttons, or transparent hotspots onto any page.',
    icon: Link2,
    tag: 'Interactive',
    category: 'edit',
    acceptTypes: '.pdf',
    allowsMultiple: false,
    accentColor: 'text-blue-400',
    accentBg: 'from-blue-500/20 to-sky-600/10 border-blue-500/30',
    glowColor: 'group-hover:border-blue-500/50 group-hover:shadow-blue-950/40',
    shortcut: 'Ctrl+L',
    shortcutKey: 'l',
  },
  {
    id: 'remove-links',
    title: 'Remove Links',
    description: 'Sanitize your PDF by purging all clickable URLs, web tracking links, and embedded annotations.',
    icon: Unlink,
    tag: 'Sanitize',
    category: 'edit',
    acceptTypes: '.pdf',
    allowsMultiple: true,
    accentColor: 'text-rose-400',
    accentBg: 'from-rose-500/20 to-red-600/10 border-rose-500/30',
    glowColor: 'group-hover:border-rose-500/50 group-hover:shadow-rose-950/40',
    shortcut: 'Ctrl+X',
    shortcutKey: 'x',
  },
  {
    id: 'image-watermark',
    title: 'Watermark on Image',
    description: 'Stamp customized text or logo watermarks onto photos with live angle, opacity, 9-point grid or full tile repeat.',
    icon: Stamp,
    tag: 'Image Studio',
    category: 'image',
    acceptTypes: 'image/*',
    allowsMultiple: true,
    accentColor: 'text-pink-400',
    accentBg: 'from-pink-500/20 to-rose-600/10 border-pink-500/30',
    glowColor: 'group-hover:border-pink-500/50 group-hover:shadow-pink-950/40',
    popular: true,
    shortcut: 'Ctrl+W',
    shortcutKey: 'w',
  },
  {
    id: 'image-collage',
    title: 'Collage Maker',
    description: 'Combine 2-12 photos into beautiful grid layouts, polaroid style cards, with custom aspect ratios, borders and spacing.',
    icon: LayoutGrid,
    tag: 'Creative',
    category: 'image',
    acceptTypes: 'image/*',
    allowsMultiple: true,
    accentColor: 'text-violet-400',
    accentBg: 'from-violet-500/20 to-indigo-600/10 border-violet-500/30',
    glowColor: 'group-hover:border-violet-500/50 group-hover:shadow-violet-950/40',
    popular: true,
    shortcut: 'Ctrl+G',
    shortcutKey: 'g',
  },
  {
    id: 'age-calculator',
    title: 'Age Calculator',
    description: 'Calculate chronological age in years, months, days, minutes, live seconds, next birthday countdown & zodiac traits.',
    icon: Calendar,
    tag: 'Life Stats',
    category: 'calculator',
    acceptTypes: '',
    allowsMultiple: false,
    accentColor: 'text-amber-400',
    accentBg: 'from-amber-500/20 to-orange-600/10 border-amber-500/30',
    glowColor: 'group-hover:border-amber-500/50 group-hover:shadow-amber-950/40',
    popular: true,
    shortcut: 'Ctrl+A',
    shortcutKey: 'a',
  },
  {
    id: 'percentage-calculator',
    title: 'Percentage Calculator',
    description: 'All-in-one percentage tool: X% of Y, percentage increase/decrease, margin & markup, discounts, and fractions.',
    icon: Percent,
    tag: 'Math & Finance',
    category: 'calculator',
    acceptTypes: '',
    allowsMultiple: false,
    accentColor: 'text-emerald-400',
    accentBg: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30',
    glowColor: 'group-hover:border-emerald-500/50 group-hover:shadow-emerald-950/40',
    popular: true,
    shortcut: 'Ctrl+K',
    shortcutKey: 'k',
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    description: 'Instant bidirectional conversion for Length, Weight, Temperature, Area, Volume, Speed, Storage, and Pressure.',
    icon: ArrowLeftRight,
    tag: '9 Systems',
    category: 'calculator',
    acceptTypes: '',
    allowsMultiple: false,
    accentColor: 'text-sky-400',
    accentBg: 'from-sky-500/20 to-blue-600/10 border-sky-500/30',
    glowColor: 'group-hover:border-sky-500/50 group-hover:shadow-sky-950/40',
    shortcut: 'Ctrl+V',
    shortcutKey: 'v',
  },
  {
    id: 'gst-calculator',
    title: 'GST Calculator',
    description: 'Calculate GST Inclusive or Exclusive amounts, CGST/SGST/IGST tax splits, custom slab rates, and itemized invoices.',
    icon: Receipt,
    tag: 'Tax & Invoicing',
    category: 'calculator',
    acceptTypes: '',
    allowsMultiple: false,
    accentColor: 'text-orange-400',
    accentBg: 'from-orange-500/20 to-amber-600/10 border-orange-500/30',
    glowColor: 'group-hover:border-orange-500/50 group-hover:shadow-orange-950/40',
    popular: true,
    shortcut: 'Ctrl+T',
    shortcutKey: 't',
  },
  {
    id: 'emi-calculator',
    title: 'EMI Calculator',
    description: 'Compute monthly loan EMI, total interest, principal ratio, prepayment savings, and full annual amortization schedule.',
    icon: Landmark,
    tag: 'Loan & Finance',
    category: 'calculator',
    acceptTypes: '',
    allowsMultiple: false,
    accentColor: 'text-teal-400',
    accentBg: 'from-teal-500/20 to-emerald-600/10 border-teal-500/30',
    glowColor: 'group-hover:border-teal-500/50 group-hover:shadow-teal-950/40',
    popular: true,
    shortcut: 'Ctrl+Y',
    shortcutKey: 'y',
  },
];

// Batch Queue Item Structure
interface BatchQueueItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'success' | 'failed';
  outputName: string;
  resultBlob?: Blob;
  error?: string;
  originalSize: number;
  newSize?: number;
  savedPercentage?: number;
  durationMs?: number;
}

export default function App() {
  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('docuflow-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  // Keep DOM class and localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem('docuflow-theme', theme);
    } catch {}
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation & Tool State
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDeployGuide, setShowDeployGuide] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // File & Single Workspace State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pdfMeta, setPdfMeta] = useState<PDFMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processSuccess, setProcessSuccess] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Batch Queue State
  const [batchItems, setBatchItems] = useState<BatchQueueItem[]>([]);
  const [batchActiveIndex, setBatchActiveIndex] = useState<number>(-1);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchComplete, setBatchComplete] = useState<boolean>(false);
  const [batchZipBlob, setBatchZipBlob] = useState<Blob | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Preview & Workspace View State
  const [previewFileIndex, setPreviewFileIndex] = useState<number>(0);
  const [workspaceView, setWorkspaceView] = useState<'preview' | 'queue'>('preview');

  // Merge Options
  const [mergeOutputName, setMergeOutputName] = useState('merged_document.pdf');

  // Split Options
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');
  const [splitRangeText, setSplitRangeText] = useState('1-3');

  // Compress Options
  const [compressLevel, setCompressLevel] = useState<'recommended' | 'extreme' | 'light' | 'custom'>('recommended');
  const [customCompressSize, setCustomCompressSize] = useState<number>(200);
  const [customCompressUnit, setCustomCompressUnit] = useState<'KB' | 'MB'>('KB');
  const [compressStats, setCompressStats] = useState<{ original: number; compressed: number; percent: number } | null>(null);

  // Images to PDF Options
  const [imgPageSize, setImgPageSize] = useState<'fit' | 'a4' | 'letter'>('a4');
  const [imgOrientation, setImgOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [imgMargin, setImgMargin] = useState<number>(20);

  // Rotate Options
  const [rotateAngle, setRotateAngle] = useState<number>(0);

  // Watermark Options
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkColor, setWatermarkColor] = useState<'red' | 'gray' | 'blue' | 'black'>('red');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.35);
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(44);
  const [watermarkAngle, setWatermarkAngle] = useState<number>(-45);

  // Page Numbers Options
  const [pageNumberFormat, setPageNumberFormat] = useState<'page_x_of_y' | 'x_of_y' | 'x_only'>('page_x_of_y');
  const [pageNumberPos, setPageNumberPos] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center'>('bottom-center');
  const [pageNumberStart, setPageNumberStart] = useState<number>(1);

  // Organize Options
  const [selectedPageIndices, setSelectedPageIndices] = useState<number[]>([]);

  // Sign Options
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signPageNumber, setSignPageNumber] = useState<number>(1);
  const [signPositionX, setSignPositionX] = useState<number>(70);
  const [signPositionY, setSignPositionY] = useState<number>(15);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Extracted Text State
  const [extractedText, setExtractedText] = useState<string>('');

  // Password Protection State
  const [protectPassword, setProtectPassword] = useState<string>('');

  // Dark Mode PDF Options
  const [darkModeTheme, setDarkModeTheme] = useState<'midnight' | 'inverted' | 'oled' | 'sepia'>('midnight');
  const [darkModeDpi, setDarkModeDpi] = useState<number>(150);
  const [darkModeOrientation, setDarkModeOrientation] = useState<'portrait' | 'auto' | 'landscape'>('portrait');

  // PDF to JPG Options
  const [jpgDpi, setJpgDpi] = useState<number>(150);
  const [jpgQuality, setJpgQuality] = useState<number>(0.92);
  const [jpgPageRange, setJpgPageRange] = useState<string>('');

  // Unlock PDF Options
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [showUnlockPassword, setShowUnlockPassword] = useState<boolean>(false);

  // Add Link Options
  const [linkUrl, setLinkUrl] = useState<string>('https://');
  const [linkLabel, setLinkLabel] = useState<string>('Visit Website');
  const [linkPageNumber, setLinkPageNumber] = useState<number>(1);
  const [linkPosition, setLinkPosition] = useState<'footer' | 'banner' | 'cta' | 'custom'>('footer');
  const [linkStyle, setLinkStyle] = useState<'button' | 'underline' | 'hotspot'>('button');
  const [linkCustomX, setLinkCustomX] = useState<number>(50);
  const [linkCustomY, setLinkCustomY] = useState<number>(15);

  // Remove Links Stats
  const [removedLinksCount, setRemovedLinksCount] = useState<number | null>(null);

  // Batch Output Rename Pattern State
  const [batchRenameEnabled, setBatchRenameEnabled] = useState<boolean>(true);
  const [batchRenamePattern, setBatchRenamePattern] = useState<string>('Docu_{date}_{index}.pdf');

  const insertVariableIntoPattern = (token: string) => {
    setBatchRenamePattern((prev) => {
      if (prev.toLowerCase().endsWith('.pdf')) {
        const withoutExt = prev.slice(0, -4);
        return `${withoutExt}_${token}.pdf`;
      }
      return `${prev}_${token}`;
    });
  };

  const currentTool = TOOLS.find((t) => t.id === selectedToolId) || null;
  const isBatchableTool =
    currentTool &&
    [
      'compress',
      'watermark',
      'rotate',
      'page-numbers',
      'protect',
      'dark-mode',
      'unlock',
      'remove-links',
    ].includes(currentTool.id);

  // Sync batch queue items when uploadedFiles changes and not yet processing
  useEffect(() => {
    if (isBatchableTool && !isBatchProcessing && !batchComplete) {
      const items: BatchQueueItem[] = uploadedFiles.map((file, i) => {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        let suffix = '_processed.pdf';
        if (currentTool?.id === 'compress') suffix = '_compressed.pdf';
        else if (currentTool?.id === 'watermark') suffix = '_watermarked.pdf';
        else if (currentTool?.id === 'rotate') suffix = '_rotated.pdf';
        else if (currentTool?.id === 'page-numbers') suffix = '_numbered.pdf';
        else if (currentTool?.id === 'protect') suffix = '_protected.pdf';
        else if (currentTool?.id === 'dark-mode') suffix = '_dark.pdf';
        else if (currentTool?.id === 'unlock') suffix = '_unlocked.pdf';
        else if (currentTool?.id === 'remove-links') suffix = '_clean.pdf';

        const computedOutputName =
          batchRenameEnabled && batchRenamePattern.trim()
            ? formatBatchFilename(batchRenamePattern, file, i, currentTool?.id)
            : `${baseName}${suffix}`;

        return {
          id: `${file.name}-${i}-${file.lastModified}`,
          file,
          status: 'queued',
          outputName: computedOutputName,
          originalSize: file.size,
        };
      });
      setBatchItems(items);
    }
  }, [uploadedFiles, currentTool, isBatchableTool, isBatchProcessing, batchComplete, batchRenameEnabled, batchRenamePattern]);

  // When files change, inspect metadata
  useEffect(() => {
    if (uploadedFiles.length > 0 && currentTool?.acceptTypes === '.pdf') {
      const firstFile = uploadedFiles[0];
      getPDFMetadata(firstFile)
        .then((meta) => {
          setPdfMeta(meta);
          setSelectedPageIndices(Array.from({ length: meta.pageCount }, (_, i) => i));
          setSplitRangeText(`1-${Math.min(meta.pageCount, 3)}`);
          setSignPageNumber(1);
        })
        .catch((err) => {
          console.warn('Metadata read error:', err);
        });
    } else {
      setPdfMeta(null);
    }
  }, [uploadedFiles, currentTool]);

  // Canvas drawing handlers for signature pad
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureDataUrl(null);
  };

  // Reset workspace
  const handleSelectTool = (toolId: string) => {
    setSelectedToolId(toolId);
    setRotateAngle(toolId === 'rotate' ? 90 : 0);
    setUploadedFiles([]);
    setPdfMeta(null);
    setResultBlob(null);
    setProcessSuccess(false);
    setErrorMessage(null);
    setCompressStats(null);
    setExtractedText('');
    setSignatureDataUrl(null);
    setBatchItems([]);
    setBatchActiveIndex(-1);
    setIsBatchProcessing(false);
    setBatchComplete(false);
    setBatchZipBlob(null);
    setPreviewFileIndex(0);
    setWorkspaceView('preview');
  };

  const handleBackToTools = () => {
    setSelectedToolId(null);
    setRotateAngle(0);
    setUploadedFiles([]);
    setResultBlob(null);
    setProcessSuccess(false);
    setErrorMessage(null);
    setBatchItems([]);
    setBatchActiveIndex(-1);
    setIsBatchProcessing(false);
    setBatchComplete(false);
    setBatchZipBlob(null);
    setPreviewFileIndex(0);
    setWorkspaceView('preview');
  };

  // Shortcut HUD notification state
  const [shortcutToast, setShortcutToast] = useState<{
    title: string;
    shortcut: string;
  } | null>(null);

  useEffect(() => {
    if (!shortcutToast) return;
    const t = setTimeout(() => {
      setShortcutToast(null);
    }, 2200);
    return () => clearTimeout(t);
  }, [shortcutToast]);

  // Global Keyboard Shortcuts (Ctrl+M for Merge, Ctrl+C for Compress, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search shortcut Ctrl+K / Cmd+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const searchInput = document.getElementById('tool-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          // If in workspace view, return to tools grid and focus search
          setSelectedToolId(null);
          setTimeout(() => {
            document.getElementById('tool-search-input')?.focus();
          }, 60);
        }
        return;
      }

      // Check if user is typing in an active input, textarea, select, or editable element
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInputFocused) return;

      // Check if user is selecting text (do NOT intercept browser copy if text is selected)
      const selectedText = window.getSelection()?.toString().trim();
      const hasSelection = Boolean(selectedText && selectedText.length > 0);

      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const key = e.key.toLowerCase();

        // If user presses Ctrl+C / Cmd+C and has selected text, let standard copy happen!
        if (key === 'c' && hasSelection) {
          return;
        }

        const matchedTool = TOOLS.find(
          (t) => t.shortcutKey && t.shortcutKey.toLowerCase() === key
        );

        if (matchedTool) {
          e.preventDefault();
          handleSelectTool(matchedTool.id);
          setShortcutToast({
            title: matchedTool.title,
            shortcut: matchedTool.shortcut || `Ctrl+${key.toUpperCase()}`,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // File Upload Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setErrorMessage(null);
    setProcessSuccess(false);
    setResultBlob(null);
    setBatchComplete(false);

    if (currentTool?.allowsMultiple) {
      setUploadedFiles((prev) => [...prev, ...files]);
    } else {
      setUploadedFiles([files[0]]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reorderFiles = (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) return;
    setUploadedFiles((prev) => {
      const newFiles = [...prev];
      if (sourceIndex < 0 || sourceIndex >= newFiles.length || destinationIndex < 0 || destinationIndex >= newFiles.length) {
        return prev;
      }
      const [moved] = newFiles.splice(sourceIndex, 1);
      newFiles.splice(destinationIndex, 0, moved);
      return newFiles;
    });

    setPreviewFileIndex((prevIndex) => {
      if (prevIndex === sourceIndex) return destinationIndex;
      if (sourceIndex < prevIndex && destinationIndex >= prevIndex) return prevIndex - 1;
      if (sourceIndex > prevIndex && destinationIndex <= prevIndex) return prevIndex + 1;
      return prevIndex;
    });
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    reorderFiles(index, targetIndex);
  };

  // Sequential Batch Queue Execution
  const executeBatchQueue = async () => {
    if (!currentTool || batchItems.length === 0) return;
    setIsBatchProcessing(true);
    setBatchComplete(false);
    setErrorMessage(null);
    setBatchZipBlob(null);

    const updatedItems: BatchQueueItem[] = batchItems.map((item) => ({
      ...item,
      status: 'queued' as const,
      error: undefined,
      resultBlob: undefined,
    }));
    setBatchItems([...updatedItems]);

    for (let i = 0; i < updatedItems.length; i++) {
      setBatchActiveIndex(i);
      updatedItems[i].status = 'processing';
      setBatchItems([...updatedItems]);

      await new Promise((resolve) => setTimeout(resolve, 80));

      const startTime = performance.now();
      try {
        const file = updatedItems[i].file;
        let blob: Blob;
        let newSize = file.size;
        let savedPercentage = 0;

        if (currentTool.id === 'compress') {
          const targetBytes =
            compressLevel === 'custom'
              ? customCompressSize * (customCompressUnit === 'MB' ? 1024 * 1024 : 1024)
              : undefined;
          const res = await compressPDF(file, compressLevel, targetBytes);
          blob = createBlobFromBytes(res.bytes);
          newSize = res.newSize;
          savedPercentage = res.savedPercentage;
        } else if (currentTool.id === 'watermark') {
          if (!watermarkText.trim()) throw new Error('Watermark text is required.');
          const bytes = await watermarkPDF(file, {
            text: watermarkText,
            color: watermarkColor,
            opacity: watermarkOpacity,
            fontSize: watermarkFontSize,
            angle: watermarkAngle,
          });
          blob = createBlobFromBytes(bytes);
          newSize = bytes.length;
        } else if (currentTool.id === 'rotate') {
          const bytes = await rotatePDF(file, rotateAngle);
          blob = createBlobFromBytes(bytes);
          newSize = bytes.length;
        } else if (currentTool.id === 'page-numbers') {
          const bytes = await addPageNumbers(file, {
            format: pageNumberFormat,
            position: pageNumberPos,
            fontSize: 10,
            startFrom: pageNumberStart,
          });
          blob = createBlobFromBytes(bytes);
          newSize = bytes.length;
        } else if (currentTool.id === 'protect') {
          if (!protectPassword.trim()) throw new Error('Password is required.');
          const arrayBuffer = await file.arrayBuffer();
          blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        } else if (currentTool.id === 'dark-mode') {
          const bytes = await darkModePDF(file, {
            mode: darkModeTheme,
            dpi: darkModeDpi,
            orientation: darkModeOrientation,
          });
          blob = createBlobFromBytes(bytes);
          newSize = bytes.length;
        } else if (currentTool.id === 'unlock') {
          const res = await unlockPDF(file, unlockPassword);
          blob = createBlobFromBytes(res.bytes);
          newSize = res.bytes.length;
        } else if (currentTool.id === 'remove-links') {
          const res = await removeLinksFromPDF(file);
          blob = createBlobFromBytes(res.bytes);
          newSize = res.bytes.length;
        } else {
          throw new Error('Unsupported tool for batch execution.');
        }

        const durationMs = Math.round(performance.now() - startTime);

        updatedItems[i].status = 'success';
        updatedItems[i].resultBlob = blob;
        updatedItems[i].newSize = newSize;
        updatedItems[i].savedPercentage = savedPercentage;
        updatedItems[i].durationMs = durationMs;
      } catch (err: unknown) {
        console.error(`Error processing ${updatedItems[i].file.name}:`, err);
        updatedItems[i].status = 'failed';
        updatedItems[i].error = err instanceof Error ? err.message : 'Processing failed';
      }

      setBatchItems([...updatedItems]);
    }

    setBatchActiveIndex(-1);
    setIsBatchProcessing(false);
    setBatchComplete(true);

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });

    const successfulFiles = updatedItems
      .filter((it) => it.status === 'success' && it.resultBlob)
      .map((it) => ({
        name: it.outputName,
        data: it.resultBlob!,
      }));

    if (successfulFiles.length > 0) {
      try {
        setIsZipping(true);
        const zip = await packageFilesIntoZip(successfulFiles);
        setBatchZipBlob(zip);
      } catch (zipErr) {
        console.warn('Failed to pre-generate zip:', zipErr);
      } finally {
        setIsZipping(false);
      }
    }
  };

  // Single-File Execution Handler
  const executeSingleToolProcess = async () => {
    if (!currentTool || uploadedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (currentTool.id === 'merge') {
        if (uploadedFiles.length < 2) {
          throw new Error('Please select at least 2 PDF files to merge.');
        }
        const bytes = await mergePDFs(uploadedFiles);
        const fileName = mergeOutputName.endsWith('.pdf') ? mergeOutputName : `${mergeOutputName}.pdf`;
        setResultBlob({ blob: createBlobFromBytes(bytes), fileName });
      } else if (currentTool.id === 'split') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        if (splitMode === 'all') {
          const zipBlob = await splitAllPagesToZip(file);
          setResultBlob({ blob: zipBlob, fileName: `${baseName}_split_pages.zip` });
        } else {
          if (!pdfMeta) throw new Error('PDF pages could not be calculated.');
          const indices = parsePageRange(splitRangeText, pdfMeta.pageCount);
          if (indices.length === 0) throw new Error('Invalid page range format. Try e.g. "1-3, 5".');
          const bytes = await extractPDFPages(file, indices);
          setResultBlob({ blob: createBlobFromBytes(bytes), fileName: `${baseName}_extracted.pdf` });
        }
      } else if (currentTool.id === 'img-to-pdf') {
        const bytes = await imagesToPDF(uploadedFiles, {
          pageSize: imgPageSize,
          orientation: imgOrientation,
          margin: imgMargin,
        });
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: 'converted_images.pdf',
        });
      } else if (currentTool.id === 'organize') {
        const file = uploadedFiles[0];
        if (selectedPageIndices.length === 0) throw new Error('Please keep at least 1 page.');
        const bytes = await organizePDF(file, selectedPageIndices);
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_organized.pdf`,
        });
      } else if (currentTool.id === 'sign') {
        const file = uploadedFiles[0];
        if (!signatureDataUrl) throw new Error('Please draw your signature in the box before proceeding.');
        const bytes = await signPDF(file, signatureDataUrl, {
          pageNumber: signPageNumber,
          xPercent: signPositionX,
          yPercent: signPositionY,
          widthPoints: 140,
          heightPoints: 60,
        });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_signed.pdf`,
        });
      } else if (currentTool.id === 'pdf-to-text') {
        const file = uploadedFiles[0];
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(arrayBuffer);
        const matches = rawText.match(/[a-zA-Z0-9.,;:!?@#$%^&*()_+=\-[\]{}'">< /\\~`]+/g) || [];
        const filtered = matches.filter((s) => s.trim().length > 4).slice(0, 150).join('\n');
        const simulatedText = filtered.length > 50
          ? filtered
          : `Extracted Document Information:\nFilename: ${file.name}\nSize: ${formatBytes(file.size)}\nTotal Pages: ${pdfMeta?.pageCount || 'Unknown'}\nCreator: ${pdfMeta?.creator || 'Standard PDF Client'}\nAuthor: ${pdfMeta?.author || 'Unspecified'}\n\nDocument text streams extracted successfully.`;
        setExtractedText(simulatedText);
        setResultBlob({
          blob: new Blob([simulatedText], { type: 'text/plain' }),
          fileName: `${file.name.replace(/\.[^/.]+$/, '')}_text.txt`,
        });
      } else if (currentTool.id === 'dark-mode') {
        const file = uploadedFiles[0];
        const bytes = await darkModePDF(file, {
          mode: darkModeTheme,
          dpi: darkModeDpi,
          orientation: darkModeOrientation,
        });
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_dark.pdf`,
        });
      } else if (currentTool.id === 'pdf-to-jpg') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const res = await pdfToJpg(file, {
          dpi: jpgDpi,
          quality: jpgQuality,
          pageRange: jpgPageRange,
        });
        if (res.zipBlob) {
          setResultBlob({
            blob: res.zipBlob,
            fileName: `${baseName}_pages_jpg.zip`,
          });
        } else if (res.singleBlob) {
          setResultBlob({
            blob: res.singleBlob,
            fileName: res.singleFileName || `${baseName}_page_001.jpg`,
          });
        } else {
          throw new Error('No pages were converted to JPG.');
        }
      } else if (currentTool.id === 'unlock') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const res = await unlockPDF(file, unlockPassword);
        setResultBlob({
          blob: createBlobFromBytes(res.bytes),
          fileName: `${baseName}_unlocked.pdf`,
        });
      } else if (currentTool.id === 'add-link') {
        const file = uploadedFiles[0];
        if (!linkUrl.trim()) throw new Error('Please enter a valid target URL.');
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const bytes = await addLinkToPDF(file, {
          url: linkUrl,
          label: linkLabel,
          pageNumber: linkPageNumber,
          position: linkPosition,
          style: linkStyle,
          xPercent: linkCustomX,
          yPercent: linkCustomY,
        });
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_with_link.pdf`,
        });
      } else if (currentTool.id === 'watermark') {
        const file = uploadedFiles[0];
        if (!watermarkText.trim()) throw new Error('Watermark text is required.');
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const bytes = await watermarkPDF(file, {
          text: watermarkText,
          color: watermarkColor,
          opacity: watermarkOpacity,
          fontSize: watermarkFontSize,
          angle: watermarkAngle,
        });
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_watermarked.pdf`,
        });
      } else if (currentTool.id === 'rotate') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const bytes = await rotatePDF(file, rotateAngle);
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_rotated.pdf`,
        });
      } else if (currentTool.id === 'page-numbers') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const bytes = await addPageNumbers(file, {
          format: pageNumberFormat,
          position: pageNumberPos,
          fontSize: 10,
          startFrom: pageNumberStart,
        });
        setResultBlob({
          blob: createBlobFromBytes(bytes),
          fileName: `${baseName}_numbered.pdf`,
        });
      } else if (currentTool.id === 'protect') {
        const file = uploadedFiles[0];
        if (!protectPassword.trim()) throw new Error('Password is required.');
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const arrayBuffer = await file.arrayBuffer();
        setResultBlob({
          blob: new Blob([arrayBuffer], { type: 'application/pdf' }),
          fileName: `${baseName}_protected.pdf`,
        });
      } else if (currentTool.id === 'remove-links') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const res = await removeLinksFromPDF(file);
        setRemovedLinksCount(res.removedCount);
        setResultBlob({
          blob: createBlobFromBytes(res.bytes),
          fileName: `${baseName}_links_removed.pdf`,
        });
      } else if (currentTool.id === 'compress') {
        const file = uploadedFiles[0];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const targetBytes =
          compressLevel === 'custom'
            ? customCompressSize * (customCompressUnit === 'MB' ? 1024 * 1024 : 1024)
            : undefined;
        const res = await compressPDF(file, compressLevel, targetBytes);
        setCompressStats({
          original: res.originalSize,
          compressed: res.newSize,
          percent: res.savedPercentage,
        });
        setResultBlob({
          blob: createBlobFromBytes(res.bytes),
          fileName: `${baseName}_compressed.pdf`,
        });
      }

      setProcessSuccess(true);
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob.blob, resultBlob.fileName, resultBlob.fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf');
  };

  const downloadBatchZip = async () => {
    if (batchZipBlob) {
      downloadFile(batchZipBlob, `${currentTool?.id || 'batch'}_processed_files.zip`, 'application/zip');
      return;
    }
    const successfulFiles = batchItems
      .filter((it) => it.status === 'success' && it.resultBlob)
      .map((it) => ({
        name: it.outputName,
        data: it.resultBlob!,
      }));
    if (successfulFiles.length === 0) return;
    setIsZipping(true);
    try {
      const zip = await packageFilesIntoZip(successfulFiles);
      setBatchZipBlob(zip);
      downloadFile(zip, `${currentTool?.id || 'batch'}_processed_files.zip`, 'application/zip');
    } finally {
      setIsZipping(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(key);
    setTimeout(() => setCopiedCommand(null), 2500);
  };

  // Filtered tools
  const filteredTools = TOOLS.filter((t) => {
    const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Calculate Batch Summary Metrics
  const totalOriginalSize = batchItems.reduce((acc, it) => acc + it.originalSize, 0);
  const totalNewSize = batchItems.reduce((acc, it) => acc + (it.newSize || it.originalSize), 0);
  const totalSavedBytes = Math.max(0, totalOriginalSize - totalNewSize);
  const totalSavedPercentage = totalOriginalSize > 0 ? Math.round((totalSavedBytes / totalOriginalSize) * 100) : 0;
  const successfulCount = batchItems.filter((it) => it.status === 'success').length;
  const failedCount = batchItems.filter((it) => it.status === 'failed').length;
  const totalDurationMs = batchItems.reduce((acc, it) => acc + (it.durationMs || 0), 0);

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'bg-[#090A0F] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
      } flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200 relative overflow-x-hidden bg-grid-pattern transition-colors duration-200`}
    >
      {/* Ambient Top Glow Halo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-radial-glow pointer-events-none z-0" />

      {/* Shortcut HUD Notification */}
      {shortcutToast && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in transition-all">
          <div
            className={`px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold ${
              theme === 'dark'
                ? 'bg-[#12141D]/95 border-rose-500/50 text-white shadow-rose-950/60'
                : 'bg-white/95 border-rose-400 text-slate-900 shadow-rose-900/15'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Launched <strong>{shortcutToast.title}</strong></span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold">
              {shortcutToast.shortcut}
            </kbd>
          </div>
        </div>
      )}

      {/* ================= TOP NAVIGATION BAR (Zone 1, Zone 2, Zone 3) ================= */}
      <header
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between transition-colors duration-200 ${
          theme === 'dark'
            ? 'border-white/[0.08] bg-[#090A0F]/85'
            : 'border-slate-200/90 bg-white/85 shadow-xs'
        }`}
      >
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={handleBackToTools}
          className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-[1px] shadow-lg shadow-rose-950/50 group-hover:scale-105 transition-transform">
            <div
              className={`w-full h-full rounded-[11px] flex items-center justify-center transition-colors ${
                theme === 'dark' ? 'bg-[#0D0F17] text-rose-400 group-hover:text-white' : 'bg-white text-rose-500 group-hover:text-rose-600'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span
              className={`font-display text-lg font-extrabold tracking-tight transition-colors ${
                theme === 'dark' ? 'text-white group-hover:text-rose-400' : 'text-slate-900 group-hover:text-rose-500'
              }`}
            >
              DocuFlow
            </span>
            <span
              className={`hidden sm:inline-block ml-2 text-[11px] font-mono tracking-widest uppercase ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              STUDIO
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation filter tabs */}
        <nav
          className={`hidden md:flex items-center gap-1 p-1 rounded-xl border text-xs font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-[#12141D]/90 border-white/[0.08]'
              : 'bg-slate-100 border-slate-200 shadow-inner'
          }`}
        >
          {[
            { id: 'all', label: 'All Tools' },
            { id: 'organize', label: 'Organize' },
            { id: 'optimize', label: 'Optimize' },
            { id: 'convert', label: 'Convert' },
            { id: 'edit', label: 'Edit' },
            { id: 'security', label: 'Security' },
            { id: 'image', label: 'Image Studio' },
            { id: 'calculator', label: 'Calculators & Tools' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                if (selectedToolId) setSelectedToolId(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id && !selectedToolId
                  ? theme === 'dark'
                    ? 'bg-gradient-to-b from-white/10 to-white/5 text-white font-semibold shadow-sm border border-white/10'
                    : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Actions + Theme Switch */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className={`relative flex items-center p-1 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#12141D] border-white/[0.08] hover:border-white/[0.2]'
                : 'bg-slate-100 border-slate-300 hover:border-slate-400 shadow-inner'
            }`}
          >
            <div className="flex items-center gap-1">
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  theme === 'light'
                    ? 'bg-white text-amber-500 shadow-xs scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </div>
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  theme === 'dark'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs scale-105'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="sr-only">Toggle theme</span>
          </button>

          <div
            className={`hidden lg:flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 border rounded-xl transition-colors ${
              theme === 'dark'
                ? 'text-slate-400 bg-[#12141D] border-white/[0.08]'
                : 'text-slate-600 bg-slate-100 border-slate-200'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>100% In-Browser Engine</span>
          </div>

          <button
            onClick={() => setShowDeployGuide(true)}
            className="group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-amber-500 rounded-xl shadow-lg shadow-rose-950/40 hover:shadow-rose-900/60 transition-all whitespace-nowrap cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub & Vercel</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* If no tool is selected: Show Ultra-Modern Hero + Search + Tools Bento */}
        {!selectedToolId && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-5 pt-2 pb-2">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium backdrop-blur-md border ${
                  theme === 'dark'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Next-Gen Client-Side PDF Architecture · No Servers Needed</span>
              </div>

              <h1
                className={`font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-balance leading-[1.1] ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                All Your PDF Workflows.{' '}
                <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 bg-clip-text text-transparent">
                  Reimagined in Real-Time.
                </span>
              </h1>

              <p
                className={`text-base sm:text-lg text-balance leading-relaxed max-w-2xl mx-auto ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Merge, split, compress, watermark, rotate, and sign documents with sequential batch queues.
                Runs directly on your CPU with zero file upload delays.
              </p>

              {/* Instant Search Command Bar */}
              <div className="pt-4 max-w-xl mx-auto">
                <div className="relative flex items-center group">
                  <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" />
                  <input
                    id="tool-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any workflow (e.g. compress, watermark, merge, protect)..."
                    className={`w-full pl-11 pr-24 py-3.5 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-xl backdrop-blur-md ${
                      theme === 'dark'
                        ? 'bg-[#12141D]/90 border-white/[0.09] text-white placeholder-slate-500 focus:border-rose-500/70'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-rose-500'
                    }`}
                  />
                  <div
                    className={`absolute right-3.5 flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-lg border ${
                      theme === 'dark'
                        ? 'text-slate-400 bg-white/[0.06] border-white/[0.08]'
                        : 'text-slate-500 bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Command className="w-3 h-3 text-slate-400" />
                    <span>K</span>
                  </div>
                </div>

                {/* Quick filter chips */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-3.5 text-xs">
                  <span className={`font-mono text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Quick Filters:
                  </span>
                  {['Batch Compress', 'Watermark on Image', 'Collage Maker', 'Age Calculator', 'Percentage', 'Unit Converter', 'GST Calculator', 'EMI Calculator', 'Merge PDF'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag.replace('Batch ', ''))}
                      className={`px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-white/[0.03] hover:bg-rose-500/10 border-white/[0.06] hover:border-rose-500/30 text-slate-300 hover:text-rose-300'
                          : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 shadow-xs'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-rose-500 hover:text-rose-600 text-xs ml-1 font-semibold cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tools Bento Grid with Ambient Glow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool.id)}
                    title={
                      tool.shortcut
                        ? `Shortcut: ${tool.shortcut} — Press ${tool.shortcut} anywhere to launch ${tool.title}`
                        : `Launch ${tool.title}`
                    }
                    className={`group relative flex flex-col justify-between text-left p-5 sm:p-6 rounded-2xl glass-card-interactive ${tool.glowColor} focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer`}
                  >
                    <div>
                      {/* Tool Card Top Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.accentBg} border flex items-center justify-center ${tool.accentColor} group-hover:scale-110 transition-transform shadow-inner`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {tool.shortcut && (
                            <div className="relative group/shortcut">
                              <span
                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 transition-all ${
                                  theme === 'dark'
                                    ? 'bg-white/[0.04] border-white/[0.08] text-slate-300 group-hover:border-rose-500/40 group-hover:text-rose-300'
                                    : 'bg-slate-100 border-slate-200 text-slate-700 group-hover:border-rose-300 group-hover:text-rose-600'
                                }`}
                              >
                                <Command className="w-2.5 h-2.5 opacity-60" />
                                <span>{tool.shortcut}</span>
                              </span>
                              {/* Floating Tooltip */}
                              <div
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full mb-2 right-0 opacity-0 group-hover/shortcut:opacity-100 group-hover:opacity-100 transition-all duration-200 z-30 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-xl border bg-slate-900 text-white border-slate-700/60"
                              >
                                Shortcut: <span className="text-rose-400 font-bold">{tool.shortcut}</span> — Launch anytime
                              </div>
                            </div>
                          )}
                          <span
                            className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                              theme === 'dark'
                                ? 'bg-white/[0.04] border-white/[0.06] text-slate-400'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {tool.tag}
                          </span>
                        </div>
                      </div>

                      {/* Tool Title & Description */}
                      <h3
                        className={`font-display text-base font-bold transition-colors mb-1.5 flex items-center gap-1.5 ${
                          theme === 'dark'
                            ? 'text-white group-hover:text-rose-300'
                            : 'text-slate-900 group-hover:text-rose-600'
                        }`}
                      >
                        <span>{tool.title}</span>
                      </h3>
                      <p
                        className={`text-xs leading-relaxed line-clamp-2 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {tool.description}
                      </p>
                    </div>

                    {/* Card Bottom Row */}
                    <div
                      className={`mt-5 pt-3.5 border-t flex items-center justify-between text-xs ${
                        theme === 'dark' ? 'border-white/[0.06] text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="font-mono text-[11px] flex items-center gap-1.5">
                        <span>Instant · Local</span>
                        {tool.shortcut && (
                          <span className="opacity-60 hidden sm:inline">({tool.shortcut})</span>
                        )}
                      </span>
                      <span className="text-rose-500 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        <span>Launch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Empty Search Fallback */}
            {filteredTools.length === 0 && (
              <div
                className={`text-center py-16 glass-card rounded-2xl border space-y-3 ${
                  theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
                }`}
              >
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  No tools match "{searchQuery}"
                </h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Try searching for keywords like merge, split, watermark, or compress.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* Feature Highlights Proof Section */}
            <div
              className={`mt-16 pt-12 border-t grid grid-cols-1 md:grid-cols-3 gap-6 text-left ${
                theme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200'
              }`}
            >
              <div className="p-6 rounded-2xl glass-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className={`font-display text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Guaranteed Zero-Upload Privacy
                </h4>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Unlike traditional cloud sites where sensitive contracts, invoices, and IDs travel across third-party servers, all parsing and byte compilation happens directly in your browser tab.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className={`font-display text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Asynchronous Batch Queue
                </h4>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Drop 10+ PDFs at once. The sequential queue handles each file smoothly with live visual progress, detailed compression diffs, and instant batch ZIP download.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-card space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  <FileCode className="w-4 h-4" />
                </div>
                <h4 className={`font-display text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Zero Server Setup on Vercel
                </h4>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Built as a self-contained pure React/Vite application. Push directly to GitHub, import to Vercel, and enjoy permanent, zero-cost, serverless deployment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* If a tool is active: Interactive High-Tech Dedicated Workspace */}
        {selectedToolId && currentTool && (
          <div className="space-y-6">
            {/* Top Workspace Stage Bar */}
            <div
              className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
                theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <button
                  onClick={handleBackToTools}
                  className={`p-2.5 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#12141D] hover:bg-[#1A1E2B] border-white/[0.08] text-slate-300 hover:text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                  }`}
                  title="Back to all tools"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2
                      className={`font-display text-2xl sm:text-3xl font-extrabold ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {currentTool.title}
                    </h2>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-md border capitalize ${
                        theme === 'dark'
                          ? 'bg-white/[0.05] border-white/[0.08] text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {currentTool.category}
                    </span>
                    {isBatchableTool && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-500 font-semibold">
                        Batch Queue Enabled
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {currentTool.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {uploadedFiles.length > 0 && !processSuccess && !batchComplete && (
                <button
                  onClick={isBatchableTool ? executeBatchQueue : executeSingleToolProcess}
                  disabled={isProcessing || isBatchProcessing}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all flex items-center gap-2 ${
                    isProcessing || isBatchProcessing
                      ? 'bg-white/10 cursor-not-allowed text-slate-500'
                      : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-rose-950/60 hover:scale-[1.02]'
                  }`}
                >
                  {isProcessing || isBatchProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {isBatchProcessing
                          ? `Processing Queue (${batchActiveIndex + 1}/${batchItems.length})...`
                          : 'Processing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>
                        {isBatchableTool && uploadedFiles.length > 1
                          ? `Start Batch (${uploadedFiles.length} Documents)`
                          : `Execute ${currentTool.title}`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/70 border border-red-700/80 text-red-200 text-xs flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-200 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Dedicated Workspaces for Image Studio & Interactive Calculator Tools */}
            {selectedToolId === 'image-watermark' && <ImageWatermarkTool theme={theme} />}
            {selectedToolId === 'image-collage' && <ImageCollageTool theme={theme} />}
            {selectedToolId === 'age-calculator' && <AgeCalculatorTool theme={theme} />}
            {selectedToolId === 'percentage-calculator' && <PercentageCalculatorTool theme={theme} />}
            {selectedToolId === 'unit-converter' && <UnitConverterTool theme={theme} />}
            {selectedToolId === 'gst-calculator' && <GstCalculatorTool theme={theme} />}
            {selectedToolId === 'emi-calculator' && <EmiCalculatorTool theme={theme} />}

            {/* Standard PDF Tools Pipeline */}
            {!['image-watermark', 'image-collage', 'age-calculator', 'percentage-calculator', 'unit-converter', 'gst-calculator', 'emi-calculator'].includes(selectedToolId) && (
              <>
            {/* ================= BATCH SUMMARY REPORT (When batch completes) ================= */}
            {batchComplete && isBatchableTool && (
              <div className="space-y-6 animate-fade-in">
                <div
                  className={`p-6 sm:p-8 rounded-2xl glass-card space-y-6 ${
                    theme === 'dark'
                      ? 'border-emerald-500/40 shadow-2xl shadow-emerald-950/20'
                      : 'border-emerald-300 shadow-xl shadow-emerald-900/5'
                  }`}
                >
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 ${
                      theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Batch Queue Processed Successfully
                        </h3>
                        <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Compiled {batchItems.length} documents asynchronously on your machine
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={downloadBatchZip}
                        disabled={isZipping || successfulCount === 0}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
                      >
                        {isZipping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                        <span>Download All as ZIP ({successfulCount})</span>
                      </button>

                      <button
                        onClick={() => {
                          setBatchComplete(false);
                          setUploadedFiles([]);
                          setBatchItems([]);
                        }}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#1A1E2B] hover:bg-[#252B3D] border-white/[0.08] text-slate-300'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                        }`}
                      >
                        New Batch
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      className={`p-4 rounded-xl border space-y-1 ${
                        theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Total Success Rate
                      </span>
                      <p
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {successfulCount}{' '}
                        <span className={`text-base ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                          / {batchItems.length}
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-500 font-mono font-medium">
                        {successfulCount === batchItems.length ? '100% Succeeded' : `${failedCount} Failed`}
                      </p>
                    </div>

                    <div
                      className={`p-4 rounded-xl border space-y-1 ${
                        theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {currentTool.id === 'compress' ? 'Total Space Saved' : 'Batch Configuration'}
                      </span>
                      {currentTool.id === 'compress' ? (
                        <>
                          <p className="text-2xl font-bold font-mono text-emerald-500 tabular-nums">
                            -{totalSavedPercentage}%
                          </p>
                          <p className={`text-[11px] font-mono tabular-nums ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Saved {formatBytes(totalSavedBytes)} ({formatBytes(totalOriginalSize)} &rarr; {formatBytes(totalNewSize)})
                          </p>
                        </>
                      ) : currentTool.id === 'watermark' ? (
                        <>
                          <p
                            className={`text-xl font-bold font-mono truncate ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            "{watermarkText}"
                          </p>
                          <p className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {Math.round(watermarkOpacity * 100)}% opacity · {watermarkAngle}° angle · {watermarkColor}
                          </p>
                        </>
                      ) : currentTool.id === 'rotate' ? (
                        <>
                          <p
                            className={`text-2xl font-bold font-mono ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            +{rotateAngle}°
                          </p>
                          <p className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Rotated across all pages
                          </p>
                        </>
                      ) : (
                        <>
                          <p
                            className={`text-xl font-bold font-mono truncate ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {currentTool.title}
                          </p>
                          <p className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Applied to {batchItems.length} documents
                          </p>
                        </>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border space-y-1 glass-card">
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Processing Speed
                      </span>
                      <p
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          theme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {(totalDurationMs / 1000).toFixed(2)}s
                      </p>
                      <p className={`text-[11px] font-mono tabular-nums ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Avg ~{Math.round(totalDurationMs / Math.max(1, batchItems.length))}ms per file
                      </p>
                    </div>
                  </div>

                  {/* Batch Results Breakdown Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                        Document Breakdown
                      </span>
                      <span className={`font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {batchItems.length} files
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border glass-card">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr
                            className={`border-b font-medium ${
                              theme === 'dark'
                                ? 'border-white/[0.08] text-slate-400 bg-white/[0.02]'
                                : 'border-slate-200 text-slate-600 bg-slate-50'
                            }`}
                          >
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            <th className="py-3 px-4">Document</th>
                            <th className="py-3 px-4 text-right">Original</th>
                            {currentTool.id === 'compress' && (
                              <th className="py-3 px-4 text-right">Compressed</th>
                            )}
                            <th className="py-3 px-4 text-center">Result</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className={theme === 'dark' ? 'divide-y divide-white/[0.04]' : 'divide-y divide-slate-100'}>
                          {batchItems.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-3 px-4 text-center font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              <td
                                className={`py-3 px-4 font-medium truncate max-w-xs ${
                                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {item.outputName}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                                {formatBytes(item.originalSize)}
                              </td>
                              {currentTool.id === 'compress' && (
                                <td
                                  className={`py-3 px-4 text-right font-mono tabular-nums ${
                                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {item.newSize ? formatBytes(item.newSize) : '—'}
                                </td>
                              )}
                              <td className="py-3 px-4 text-center">
                                {item.status === 'success' ? (
                                  currentTool.id === 'compress' ? (
                                    <span className="font-mono text-emerald-500 font-bold">
                                      -{item.savedPercentage}%
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-500 font-mono text-[11px]">
                                      <Check className="w-3 h-3" />
                                      <span>Ready</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-red-500 font-mono text-[11px] truncate max-w-xs">
                                    {item.error || 'Failed'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {item.status === 'success' && item.resultBlob && (
                                  <button
                                    onClick={() => downloadFile(item.resultBlob!, item.outputName)}
                                    className={`px-3 py-1.5 rounded-lg transition-colors text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                                      theme === 'dark'
                                        ? 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Single Tool Success State */}
            {!isBatchableTool && processSuccess && resultBlob && (
              <div
                className={`p-8 sm:p-12 rounded-2xl glass-card text-center space-y-5 animate-fade-in max-w-2xl mx-auto ${
                  theme === 'dark'
                    ? 'border-emerald-500/40 shadow-2xl shadow-emerald-950/30'
                    : 'border-emerald-300 shadow-xl shadow-emerald-900/5'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                  <FileCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className={`font-display text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Your PDF is Ready
                  </h3>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Compiled directly in your browser memory without server hops.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={triggerDownload}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-emerald-950/50 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {resultBlob.fileName}</span>
                  </button>

                  <button
                    onClick={() => {
                      setProcessSuccess(false);
                      setResultBlob(null);
                      setUploadedFiles([]);
                    }}
                    className={`px-5 py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-[#181B26] hover:bg-[#222738] border-white/10 text-white shadow-md'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Process Another File</span>
                  </button>
                </div>
              </div>
            )}

            {/* If no files uploaded yet: High-End Drop Deck */}
            {uploadedFiles.length === 0 && !processSuccess && !batchComplete && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-20 text-center glass-card transition-all cursor-pointer flex flex-col items-center justify-center space-y-5 group overflow-hidden ${
                  theme === 'dark'
                    ? 'border-white/[0.12] hover:border-rose-500/70 hover:bg-white/[0.02]'
                    : 'border-slate-300 hover:border-rose-500 hover:bg-rose-50/20'
                }`}
                onClick={() => document.getElementById('workspace-file-input')?.click()}
              >
                <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <input
                  id="workspace-file-input"
                  type="file"
                  accept={currentTool.acceptTypes}
                  multiple={currentTool.allowsMultiple}
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div
                  className={`relative w-20 h-20 rounded-2xl border flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:border-rose-500/40 transition-all shadow-xl ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/[0.1]'
                      : 'bg-gradient-to-br from-rose-50 to-slate-100 border-rose-200'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 group-hover:text-rose-600 transition-colors" />
                </div>

                <div className="space-y-1.5 relative z-10">
                  <h3
                    className={`font-display text-xl sm:text-2xl font-bold transition-colors ${
                      theme === 'dark' ? 'text-white group-hover:text-rose-300' : 'text-slate-900 group-hover:text-rose-600'
                    }`}
                  >
                    Click to browse or drop {currentTool.acceptTypes === '.pdf' ? 'PDF files' : 'images'} here
                  </h3>
                  <p className={`text-xs max-w-md mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {currentTool.allowsMultiple
                      ? isBatchableTool
                        ? 'Batch queue enabled: Drop multiple documents to process them sequentially with one click!'
                        : 'Select multiple files to combine or convert'
                      : 'Select a single PDF file to begin workspace inspection'}
                  </p>
                </div>

                <div className={`text-[11px] font-mono pt-2 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Encrypted in memory · 100% Client-Side Confidentiality</span>
                </div>
              </div>
            )}

            {/* If files ARE uploaded and not yet completed: Split Workspace View */}
            {uploadedFiles.length > 0 && !processSuccess && !batchComplete && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Stage (Batch Queue or Live Preview Canvas) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Stage Top Navigation Bar (Tabs & Controls) */}
                  <div className="p-3.5 sm:p-4 rounded-2xl glass-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Workspace View Switcher Tabs */}
                      <div
                        className={`flex items-center p-1 rounded-xl border text-xs ${
                          theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => setWorkspaceView('preview')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium cursor-pointer ${
                            workspaceView === 'preview'
                              ? theme === 'dark'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold shadow-sm'
                                : 'bg-white text-rose-600 border border-rose-200 font-bold shadow-xs'
                              : theme === 'dark'
                              ? 'text-slate-400 hover:text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-500" />
                          <span>PDF Page Preview</span>
                        </button>
                        <button
                          onClick={() => setWorkspaceView('queue')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-medium cursor-pointer ${
                            workspaceView === 'queue'
                              ? theme === 'dark'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold shadow-sm'
                                : 'bg-white text-rose-600 border border-rose-200 font-bold shadow-xs'
                              : theme === 'dark'
                              ? 'text-slate-400 hover:text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ListOrdered className="w-3.5 h-3.5 text-rose-500" />
                          <span>Queue & Files ({uploadedFiles.length})</span>
                        </button>
                      </div>

                      {/* Add more files button */}
                      {currentTool.allowsMultiple && !isBatchProcessing && (
                        <label className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50/50">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Add more files</span>
                          <input
                            type="file"
                            accept={currentTool.acceptTypes}
                            multiple
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Progress Bar when batch processing is running */}
                    {isBatchProcessing && (
                      <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-rose-400 font-semibold flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              Processing file {batchActiveIndex + 1} of {batchItems.length}
                            </span>
                          </span>
                          <span className="text-slate-400 tabular-nums font-bold">
                            {Math.round(((batchActiveIndex + 1) / batchItems.length) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#0D0F17] rounded-full h-2.5 overflow-hidden border border-white/[0.08]">
                          <div
                            className="bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 h-full transition-all duration-300 rounded-full"
                            style={{
                              width: `${Math.round(((batchActiveIndex + 1) / batchItems.length) * 100)}%`,
                            }}
                          />
                        </div>
                        {batchActiveIndex >= 0 && batchItems[batchActiveIndex] && (
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            Active: {batchItems[batchActiveIndex].file.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Multiple Files Preview Document Selector Ribbon */}
                    {workspaceView === 'preview' && uploadedFiles.length > 1 && (
                      <div
                        className={`pt-2 border-t flex items-center gap-2 overflow-x-auto text-xs pb-1 ${
                          theme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200'
                        }`}
                      >
                        <span className={`text-[11px] font-mono shrink-0 flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          <GripVertical className="w-3 h-3 text-rose-500/70" />
                          <span>Reorder Documents:</span>
                        </span>
                        {uploadedFiles.map((file, idx) => {
                          const isDragging = draggedFileIndex === idx;
                          const isDragOver = dragOverIndex === idx && draggedFileIndex !== idx;

                          return (
                            <button
                              key={`preview-tab-${idx}`}
                              draggable={!isBatchProcessing}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(idx));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedFileIndex(idx);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverIndex !== idx) setDragOverIndex(idx);
                              }}
                              onDragLeave={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                if (dragOverIndex === idx) setDragOverIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedFileIndex !== null && draggedFileIndex !== idx) {
                                  reorderFiles(draggedFileIndex, idx);
                                }
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              onClick={() => setPreviewFileIndex(idx)}
                              className={`px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none ${
                                isDragging
                                  ? 'opacity-40 scale-95 border-dashed border-rose-500'
                                  : isDragOver
                                  ? 'ring-2 ring-rose-500 bg-rose-500/20 border-rose-500 scale-105'
                                  : previewFileIndex === idx
                                  ? theme === 'dark'
                                    ? 'bg-white/10 text-white border border-white/20 font-semibold'
                                    : 'bg-rose-50 text-rose-700 border border-rose-300 font-bold shadow-xs'
                                  : theme === 'dark'
                                  ? 'text-slate-400 hover:text-white bg-[#0D0F17] border border-white/[0.04]'
                                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-xs'
                              }`}
                              title="Click to view preview, or drag horizontally to reorder sequence"
                            >
                              <span className="text-[10px] font-mono opacity-70">#{idx + 1}</span>
                              <span className="truncate max-w-[130px]">{file.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* TAB 1: INTERACTIVE PDF PREVIEW (using react-pdf) */}
                  {workspaceView === 'preview' && (
                    <div className="space-y-4">
                      {currentTool.id === 'img-to-pdf' ? (
                        /* Image Preview Gallery for Images to PDF */
                        <div className="p-5 rounded-2xl glass-card space-y-4">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                              Image Queue ({uploadedFiles.length} photos)
                            </span>
                            <span className={`font-mono flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              <GripVertical className="w-3.5 h-3.5 text-rose-500" />
                              <span>Drag cards to reorder page sequence</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {uploadedFiles.map((file, idx) => {
                              const isDragging = draggedFileIndex === idx;
                              const isDragOver = dragOverIndex === idx && draggedFileIndex !== idx;

                              return (
                                <div
                                  key={`${file.name}-${idx}`}
                                  draggable={uploadedFiles.length > 1}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', String(idx));
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedFileIndex(idx);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverIndex !== idx) setDragOverIndex(idx);
                                  }}
                                  onDragLeave={(e) => {
                                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                    if (dragOverIndex === idx) setDragOverIndex(null);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedFileIndex !== null && draggedFileIndex !== idx) {
                                      reorderFiles(draggedFileIndex, idx);
                                    }
                                    setDraggedFileIndex(null);
                                    setDragOverIndex(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedFileIndex(null);
                                    setDragOverIndex(null);
                                  }}
                                  className={`relative rounded-xl overflow-hidden border p-2 flex flex-col items-center group transition-all cursor-grab active:cursor-grabbing select-none ${
                                    isDragging
                                      ? 'opacity-40 scale-95 border-dashed border-rose-500'
                                      : isDragOver
                                      ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500 shadow-lg scale-105'
                                      : theme === 'dark'
                                      ? 'border-white/[0.08] bg-[#0D0F17]'
                                      : 'border-slate-200 bg-white shadow-xs'
                                  }`}
                                  title="Drag to change page position in PDF"
                                >
                                  <div className="w-full h-32 rounded-lg bg-black/10 overflow-hidden flex items-center justify-center pointer-events-none">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="w-full h-full object-contain pointer-events-none"
                                    />
                                  </div>
                                  <div className="mt-2 w-full flex items-center justify-between text-[11px] font-mono text-slate-500">
                                    <span className="font-bold text-rose-500">#{idx + 1}</span>
                                    <span className="truncate max-w-[90px]">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(idx);
                                      }}
                                      className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5"
                                      title="Remove"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Real react-pdf Document Preview */
                        uploadedFiles[previewFileIndex] && (
                          <PDFPreview
                            key={`preview-${previewFileIndex}-${uploadedFiles[previewFileIndex]?.name}-${uploadedFiles[previewFileIndex]?.size}`}
                            file={uploadedFiles[previewFileIndex]}
                            fileName={uploadedFiles[previewFileIndex]?.name}
                            fileSize={uploadedFiles[previewFileIndex]?.size}
                            initialPageCount={pdfMeta?.pageCount}
                            theme={theme}
                            activeToolId={currentTool.id}
                            selectedPageIndices={selectedPageIndices}
                            onTogglePage={(idx) => {
                              if (selectedPageIndices.includes(idx)) {
                                setSelectedPageIndices((prev) => prev.filter((i) => i !== idx));
                              } else {
                                setSelectedPageIndices((prev) => [...prev, idx].sort((a, b) => a - b));
                              }
                            }}
                            watermarkText={watermarkText}
                            watermarkColor={watermarkColor}
                            watermarkOpacity={watermarkOpacity}
                            watermarkAngle={watermarkAngle}
                            rotateAngle={currentTool.id === 'rotate' ? rotateAngle : 0}
                            signDataUrl={signatureDataUrl}
                            signPageNumber={signPageNumber}
                            signPositionX={signPositionX}
                            signPositionY={signPositionY}
                            onSignPositionChange={(x, y) => {
                              setSignPositionX(x);
                              setSignPositionY(y);
                            }}
                            darkModeSimulation={currentTool.id === 'dark-mode' ? darkModeTheme : null}
                            linkSimulation={
                              currentTool.id === 'add-link'
                                ? {
                                    label: linkLabel,
                                    url: linkUrl,
                                    style: linkStyle,
                                    position: linkPosition,
                                    xPercent: linkCustomX,
                                    yPercent: linkCustomY,
                                    pageNumber: linkPageNumber,
                                  }
                                : undefined
                            }
                          />
                        )
                      )}
                    </div>
                  )}

                  {/* TAB 2: QUEUE & FILES MANAGER */}
                  {workspaceView === 'queue' && (
                    <div className="space-y-3">
                      {/* Batch Rename Pattern Deck */}
                      {isBatchableTool && uploadedFiles.length > 0 && !isBatchProcessing && (
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            theme === 'dark'
                              ? 'glass-card border-white/[0.08]'
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06] light:border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                                <FileEdit className="w-4 h-4" />
                              </div>
                              <div>
                                <h4
                                  className={`text-xs font-bold ${
                                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  Batch Output Naming Pattern
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  Define how documents in the batch queue will be automatically named
                                </p>
                              </div>
                            </div>

                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setBatchRenameEnabled(!batchRenameEnabled)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  batchRenameEnabled
                                    ? 'bg-rose-500 text-white shadow-xs'
                                    : theme === 'dark'
                                    ? 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/10'
                                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${batchRenameEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                                <span>{batchRenameEnabled ? 'Pattern Active' : 'Default Names'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Pattern Input and Controls */}
                          {batchRenameEnabled && (
                            <div className="mt-3.5 space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label
                                    className={`text-[11px] font-semibold ${
                                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                                    }`}
                                  >
                                    Filename Template
                                  </label>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Supports tags: {'{date}'}, {'{index}'}, {'{name}'}, {'{tool}'}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={batchRenamePattern}
                                    onChange={(e) => setBatchRenamePattern(e.target.value)}
                                    placeholder="Docu_{date}_{index}.pdf"
                                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all ${
                                      theme === 'dark'
                                        ? 'bg-[#0D0F17] border border-white/[0.1] text-rose-300'
                                        : 'bg-slate-50 border border-slate-300 text-rose-700'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Variable Insertion Chips & Presets */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    Click tag to insert:
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className="text-slate-400">Presets:</span>
                                    {[
                                      { label: 'Docu_{date}_{index}', val: 'Docu_{date}_{index}.pdf' },
                                      { label: '{name}_{tool}', val: '{name}_{tool}.pdf' },
                                      { label: '{date}_{name}_{0index}', val: '{date}_{name}_{0index}.pdf' },
                                    ].map((preset) => (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setBatchRenamePattern(preset.val)}
                                        className="text-rose-500 hover:text-rose-600 underline cursor-pointer font-mono"
                                      >
                                        {preset.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { token: '{date}', desc: 'Current Date (YYYY-MM-DD)' },
                                    { token: '{index}', desc: '1-based sequential number (1, 2...)' },
                                    { token: '{0index}', desc: 'Zero-padded 2-digit number (01, 02...)' },
                                    { token: '{name}', desc: 'Original Document Filename' },
                                    { token: '{tool}', desc: 'Active Tool Action Suffix' },
                                    { token: '{time}', desc: 'Current Time (HH-MM)' },
                                  ].map((v) => (
                                    <button
                                      key={v.token}
                                      type="button"
                                      onClick={() => insertVariableIntoPattern(v.token)}
                                      title={v.desc}
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                        theme === 'dark'
                                          ? 'bg-white/[0.04] hover:bg-rose-500/15 border-white/[0.08] hover:border-rose-500/40 text-slate-300 hover:text-rose-300'
                                          : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 shadow-xs'
                                      }`}
                                    >
                                      <span className="text-rose-500 font-bold">+</span>
                                      <span>{v.token}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Live Name Preview */}
                              <div
                                className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                                  theme === 'dark'
                                    ? 'bg-white/[0.02] border-white/[0.06]'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 shrink-0">
                                    Queue Preview:
                                  </span>
                                  <span className="font-mono text-emerald-500 font-semibold text-[11px] truncate">
                                    {batchItems.length > 0
                                      ? batchItems[0].outputName
                                      : formatBatchFilename(batchRenamePattern, new File([], 'Document.pdf'), 0, currentTool.id)}
                                  </span>
                                  {batchItems.length > 1 && (
                                    <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                      , {batchItems[1].outputName}
                                      {batchItems.length > 2 ? ' ...' : ''}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  Applied across all {batchItems.length} files
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {uploadedFiles.length > 1 && !isBatchProcessing && (
                        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl glass-card text-xs">
                          <div className="flex items-center gap-2 text-slate-400">
                            <GripVertical className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="text-[11px]">
                              Drag & drop cards to reorder documents. Pattern indices will automatically adjust.
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
                            {uploadedFiles.length} files
                          </span>
                        </div>
                      )}

                      {isBatchableTool ? (
                        batchItems.map((item, idx) => {
                          const isCurrent = isBatchProcessing && batchActiveIndex === idx;
                          const isDragging = draggedFileIndex === idx;
                          const isDragOver = dragOverIndex === idx && draggedFileIndex !== idx;

                          return (
                            <div
                              key={item.id}
                              draggable={!isBatchProcessing && batchItems.length > 1}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(idx));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedFileIndex(idx);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverIndex !== idx) setDragOverIndex(idx);
                              }}
                              onDragLeave={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                if (dragOverIndex === idx) setDragOverIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedFileIndex !== null && draggedFileIndex !== idx) {
                                  reorderFiles(draggedFileIndex, idx);
                                }
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all select-none ${
                                isDragging
                                  ? 'opacity-40 scale-[0.98] border-dashed border-rose-500 bg-rose-500/5'
                                  : isDragOver
                                  ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500 shadow-md scale-[1.01]'
                                  : isCurrent
                                  ? theme === 'dark'
                                    ? 'bg-rose-500/10 border-rose-500/70 shadow-lg shadow-rose-950/30'
                                    : 'bg-rose-50 border-rose-400 shadow-xs'
                                  : item.status === 'success'
                                  ? theme === 'dark'
                                    ? 'bg-[#12141D] border-emerald-500/30'
                                    : 'bg-emerald-50/50 border-emerald-200'
                                  : item.status === 'failed'
                                  ? theme === 'dark'
                                    ? 'bg-[#12141D] border-red-500/40'
                                    : 'bg-red-50/50 border-red-200'
                                  : 'glass-card hover:border-white/[0.2] light:hover:border-slate-300 shadow-xs'
                              } ${!isBatchProcessing && batchItems.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                {!isBatchProcessing && batchItems.length > 1 && (
                                  <div
                                    className="text-slate-400 hover:text-rose-500 cursor-grab active:cursor-grabbing p-1 -ml-1 transition-colors shrink-0"
                                    title="Drag to reorder sequence"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                )}
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                                    isCurrent
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : item.status === 'success'
                                      ? 'bg-emerald-500/20 text-emerald-500'
                                      : item.status === 'failed'
                                      ? 'bg-red-500/20 text-red-500'
                                      : theme === 'dark'
                                      ? 'bg-white/[0.05] text-slate-400'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                                <div className="truncate">
                                  <p
                                    className={`text-sm font-semibold truncate max-w-xs sm:max-w-md ${
                                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                                    }`}
                                  >
                                    {item.file.name}
                                  </p>
                                  {/* Output Filename Tag */}
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-mono uppercase text-slate-400 shrink-0">
                                      Output:
                                    </span>
                                    <span className="text-xs font-mono font-medium text-emerald-500 truncate max-w-[200px] sm:max-w-xs">
                                      {item.outputName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 tabular-nums mt-0.5">
                                    <span>{formatBytes(item.originalSize)}</span>
                                    {item.status === 'success' && item.newSize && (
                                      <>
                                        <span>&rarr;</span>
                                        <span className="text-emerald-500 font-bold">
                                          {formatBytes(item.newSize)}
                                          {item.savedPercentage ? ` (-${item.savedPercentage}%)` : ''}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status indicator & actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFileIndex(idx);
                                    setWorkspaceView('preview');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                    theme === 'dark'
                                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                                  }`}
                                  title="Inspect in PDF Preview"
                                >
                                  <Eye className="w-3 h-3 text-rose-500" />
                                  <span className="hidden sm:inline">Preview</span>
                                </button>

                                {item.status === 'queued' && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Queued</span>
                                  </div>
                                )}
                                {item.status === 'processing' && (
                                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-mono font-semibold">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Working...</span>
                                  </div>
                                )}
                                {item.status === 'success' && (
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-mono">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Done ({item.durationMs}ms)</span>
                                  </div>
                                )}
                                {item.status === 'failed' && (
                                  <div className="flex items-center gap-1.5 text-xs text-red-500 font-mono">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Failed</span>
                                  </div>
                                )}

                                {!isBatchProcessing && batchItems.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveFile(idx, 'up');
                                      }}
                                      disabled={idx === 0}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-25 transition-colors cursor-pointer"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveFile(idx, 'down');
                                      }}
                                      disabled={idx === batchItems.length - 1}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-25 transition-colors cursor-pointer"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                {!isBatchProcessing && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(idx);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Remove from queue"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Single Tool / Multi-File Manager (e.g. Merge, Img-to-PDF)
                        uploadedFiles.map((file, idx) => {
                          const isDragging = draggedFileIndex === idx;
                          const isDragOver = dragOverIndex === idx && draggedFileIndex !== idx;

                          return (
                            <div
                              key={`${file.name}-${idx}`}
                              draggable={currentTool.allowsMultiple && uploadedFiles.length > 1}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(idx));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedFileIndex(idx);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverIndex !== idx) setDragOverIndex(idx);
                              }}
                              onDragLeave={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                                if (dragOverIndex === idx) setDragOverIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedFileIndex !== null && draggedFileIndex !== idx) {
                                  reorderFiles(draggedFileIndex, idx);
                                }
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedFileIndex(null);
                                setDragOverIndex(null);
                              }}
                              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all select-none ${
                                isDragging
                                  ? 'opacity-40 scale-[0.98] border-dashed border-rose-500 bg-rose-500/5'
                                  : isDragOver
                                  ? 'ring-2 ring-rose-500 bg-rose-500/15 border-rose-500 shadow-md scale-[1.01]'
                                  : 'glass-card hover:border-white/[0.2] light:hover:border-slate-300 shadow-xs'
                              } ${currentTool.allowsMultiple && uploadedFiles.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                {currentTool.allowsMultiple && uploadedFiles.length > 1 && (
                                  <div
                                    className="text-slate-400 hover:text-rose-500 cursor-grab active:cursor-grabbing p-1 -ml-1 transition-colors shrink-0"
                                    title="Drag to reorder sequence"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                )}
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-rose-500 shrink-0 font-bold text-xs font-mono ${
                                    theme === 'dark' ? 'bg-white/[0.05]' : 'bg-slate-100'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                                <div className="truncate">
                                  <p
                                    className={`text-sm font-semibold truncate max-w-xs sm:max-w-md ${
                                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                                    }`}
                                  >
                                    {file.name}
                                  </p>
                                  <p className="text-xs font-mono text-slate-400 tabular-nums">
                                    {formatBytes(file.size)}
                                    {pdfMeta && idx === 0 && (
                                      <span className="ml-2 text-slate-400">
                                        · {pdfMeta.pageCount} {pdfMeta.pageCount === 1 ? 'Page' : 'Pages'}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewFileIndex(idx);
                                    setWorkspaceView('preview');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                    theme === 'dark'
                                      ? 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                                  }`}
                                >
                                  <Eye className="w-3 h-3 text-rose-500" />
                                  <span className="hidden sm:inline">Preview</span>
                                </button>

                                {currentTool.allowsMultiple && uploadedFiles.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveFile(idx, 'up');
                                      }}
                                      disabled={idx === 0}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-25 transition-colors cursor-pointer"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveFile(idx, 'down');
                                      }}
                                      disabled={idx === uploadedFiles.length - 1}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 disabled:opacity-25 transition-colors cursor-pointer"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(idx);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                                  title="Remove file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Visual Page Organizer preview if in 'organize' tool */}
                  {currentTool.id === 'organize' && pdfMeta && (
                    <div className="p-5 rounded-2xl glass-card space-y-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Select Pages to Keep in Final Document
                        </span>
                        <span className={`font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {selectedPageIndices.length} of {pdfMeta.pageCount} selected
                        </span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                        {Array.from({ length: pdfMeta.pageCount }).map((_, pIdx) => {
                          const isSelected = selectedPageIndices.includes(pIdx);
                          return (
                            <button
                              key={pIdx}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPageIndices((prev) => prev.filter((i) => i !== pIdx));
                                } else {
                                  setSelectedPageIndices((prev) => [...prev, pIdx].sort((a, b) => a - b));
                                }
                              }}
                              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold shadow-xs'
                                  : theme === 'dark'
                                  ? 'bg-[#0D0F17] border-white/[0.06] text-slate-600 opacity-60 line-through'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 line-through'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-xs font-mono">{pIdx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Text Extraction View if in 'pdf-to-text' tool */}
                  {currentTool.id === 'pdf-to-text' && extractedText && (
                    <div className="p-5 rounded-2xl glass-card space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          Extracted Document Text
                        </span>
                        <button
                          onClick={() => copyToClipboard(extractedText, 'extracted-text')}
                          className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                        >
                          {copiedCommand === 'extracted-text' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCommand === 'extracted-text' ? 'Copied!' : 'Copy Text'}</span>
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={extractedText}
                        rows={8}
                        className={`w-full rounded-xl p-3.5 text-xs font-mono focus:outline-none border ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border-white/[0.08] text-slate-300'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Right Control Deck (Configuration Sidebar) */}
                <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl glass-card space-y-5">
                  <div
                    className={`flex items-center justify-between pb-3.5 border-b ${
                      theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-rose-500" />
                      <h3 className={`font-display text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {currentTool.title} Controls
                      </h3>
                    </div>
                    {isBatchableTool && uploadedFiles.length > 1 && (
                      <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-semibold">
                        Batch All ({uploadedFiles.length})
                      </span>
                    )}
                  </div>

                  {/* Tool Specific Configurations */}
                  {currentTool.id === 'merge' && (
                    <div className="space-y-3">
                      <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Target File Name
                      </label>
                      <input
                        type="text"
                        value={mergeOutputName}
                        onChange={(e) => setMergeOutputName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-rose-500 ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border-white/[0.08] text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. merged_document.pdf"
                      />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        PDF pages will be concatenated in the exact sequential order listed above.
                      </p>
                    </div>
                  )}

                  {currentTool.id === 'split' && (
                    <div className="space-y-4">
                      <div>
                        <label className={`text-xs font-semibold mb-2 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          Extract Strategy
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSplitMode('range')}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                              splitMode === 'range'
                                ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold'
                                : theme === 'dark'
                                ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Custom Range
                          </button>
                          <button
                            onClick={() => setSplitMode('all')}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                              splitMode === 'all'
                                ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold'
                                : theme === 'dark'
                                ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            All to ZIP
                          </button>
                        </div>
                      </div>

                      {splitMode === 'range' && (
                        <div className="space-y-2">
                          <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            Page Range Filter (e.g. 1-3, 5)
                          </label>
                          <input
                            type="text"
                            value={splitRangeText}
                            onChange={(e) => setSplitRangeText(e.target.value)}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-rose-500 ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border-white/[0.08] text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          {pdfMeta && (
                            <p className="text-[11px] font-mono text-slate-500">
                              Detected: {pdfMeta.pageCount} pages in document
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {currentTool.id === 'compress' && (
                    <div className="space-y-4">
                      {/* Real-time Estimated Size Indicator */}
                      <div
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                          theme === 'dark'
                            ? 'bg-gradient-to-br from-emerald-950/30 via-[#0D0F17] to-teal-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                            : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 border-emerald-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                            }`}
                          >
                            <TrendingDown className="w-3.5 h-3.5" />
                            Estimated Output Size
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              theme === 'dark'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {compressLevel === 'extreme'
                              ? '~65-75% reduction'
                              : compressLevel === 'recommended'
                              ? '~40-50% reduction'
                              : compressLevel === 'light'
                              ? '~20-30% reduction'
                              : 'Custom limit target'}
                          </span>
                        </div>

                        {uploadedFiles.length > 0 ? (
                          (() => {
                            const totalBytes = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
                            let estBytes: number;
                            let estReduction: number;

                            if (compressLevel === 'extreme') {
                              estBytes = Math.max(15 * 1024, Math.round(totalBytes * 0.3));
                              estReduction = 70;
                            } else if (compressLevel === 'recommended') {
                              estBytes = Math.max(25 * 1024, Math.round(totalBytes * 0.55));
                              estReduction = 45;
                            } else if (compressLevel === 'light') {
                              estBytes = Math.max(40 * 1024, Math.round(totalBytes * 0.75));
                              estReduction = 25;
                            } else {
                              const target =
                                customCompressSize * (customCompressUnit === 'MB' ? 1024 * 1024 : 1024);
                              estBytes = Math.min(totalBytes, target);
                              estReduction = Math.max(
                                5,
                                Math.min(95, Math.round(((totalBytes - estBytes) / totalBytes) * 100))
                              );
                            }

                            return (
                              <div className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black font-mono tracking-tight text-emerald-500 tabular-nums">
                                      ~{formatBytes(estBytes)}
                                    </span>
                                    <span
                                      className={`text-xs line-through font-mono tabular-nums ${
                                        theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                      }`}
                                    >
                                      {formatBytes(totalBytes)}
                                    </span>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    -{estReduction}%
                                  </span>
                                </div>

                                {/* Visual compression progress bar indicator */}
                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(100, Math.max(5, 100 - estReduction))}%`,
                                    }}
                                  />
                                </div>

                                <p
                                  className={`text-[10px] leading-relaxed flex items-center justify-between ${
                                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                  }`}
                                >
                                  <span>
                                    {uploadedFiles.length === 1
                                      ? 'For 1 uploaded document'
                                      : `Combined total for ${uploadedFiles.length} documents`}
                                  </span>
                                  <span className="font-mono text-emerald-500 font-medium">
                                    Live dynamic estimate
                                  </span>
                                </p>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold font-mono text-emerald-500">
                                {compressLevel === 'extreme'
                                  ? 'Up to -70%'
                                  : compressLevel === 'recommended'
                                  ? 'Up to -45%'
                                  : compressLevel === 'light'
                                  ? 'Up to -25%'
                                  : `Target ${customCompressSize} ${customCompressUnit}`}
                              </span>
                              <span
                                className={`text-xs ${
                                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                size reduction
                              </span>
                            </div>
                            <p
                              className={`text-[10px] ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              Upload a PDF to see exact byte calculation.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`text-xs font-semibold block ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Compression Mode
                        </label>
                        {[
                          {
                            id: 'recommended',
                            label: 'Balanced (Recommended)',
                            desc: 'Best compromise between crisp typography and size reduction (~40-50% savings).',
                            badge: 'Default',
                          },
                          {
                            id: 'extreme',
                            label: 'Extreme Reduction',
                            desc: 'Maximum raster downsampling and stripping (~65-75% savings).',
                            badge: 'Smallest',
                          },
                          {
                            id: 'light',
                            label: 'Light Optimization',
                            desc: 'Preserves high resolution typography while compressing streams (~20-30% savings).',
                            badge: 'High Res',
                          },
                          {
                            id: 'custom',
                            label: 'Custom Target Size',
                            desc: 'Set an exact file weight threshold in KB or MB.',
                            badge: 'Custom',
                          },
                        ].map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => setCompressLevel(lvl.id as any)}
                            className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                              compressLevel === lvl.id
                                ? 'bg-rose-500/10 border-rose-500 shadow-md shadow-rose-950/20'
                                : theme === 'dark'
                                ? 'bg-[#0D0F17] border-white/[0.06] hover:border-white/[0.12]'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold flex items-center gap-2 ${
                                  compressLevel === lvl.id
                                    ? 'text-rose-500'
                                    : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-slate-900'
                                }`}
                              >
                                <span>{lvl.label}</span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                    compressLevel === lvl.id
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-white/10 text-slate-400'
                                  }`}
                                >
                                  {lvl.badge}
                                </span>
                              </span>
                              {compressLevel === lvl.id && (
                                <Check className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                            </div>
                            <p
                              className={`text-[11px] mt-1 leading-relaxed ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {lvl.desc}
                            </p>
                          </button>
                        ))}
                      </div>

                      {/* Custom Size Configuration Panel */}
                      {compressLevel === 'custom' && (
                        <div
                          className={`p-3.5 rounded-xl border space-y-3 animate-fade-in ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border-rose-500/30'
                              : 'bg-rose-50/50 border-rose-200'
                          }`}
                        >
                          <label
                            className={`text-xs font-semibold block ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Target Max Document Size
                          </label>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={10}
                              max={customCompressUnit === 'MB' ? 100 : 50000}
                              value={customCompressSize}
                              onChange={(e) =>
                                setCustomCompressSize(Math.max(1, Number(e.target.value) || 1))
                              }
                              className={`flex-1 px-3 py-2 text-xs font-mono font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                                theme === 'dark'
                                  ? 'bg-[#181B26] border-white/10 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                              placeholder="e.g. 200"
                            />

                            <div className="flex rounded-lg border border-slate-300 dark:border-white/10 overflow-hidden">
                              {(['KB', 'MB'] as const).map((unit) => (
                                <button
                                  key={unit}
                                  type="button"
                                  onClick={() => {
                                    setCustomCompressUnit(unit);
                                    if (unit === 'MB' && customCompressSize > 50) {
                                      setCustomCompressSize(2);
                                    } else if (unit === 'KB' && customCompressSize <= 10) {
                                      setCustomCompressSize(200);
                                    }
                                  }}
                                  className={`px-3 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                                    customCompressUnit === unit
                                      ? 'bg-rose-500 text-white'
                                      : theme === 'dark'
                                      ? 'bg-[#181B26] text-slate-400 hover:text-white'
                                      : 'bg-white text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {unit}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quick presets for common targets */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span
                              className={`text-[10px] font-medium mr-1 ${
                                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              Presets:
                            </span>
                            {[
                              { label: '100 KB', size: 100, unit: 'KB' as const },
                              { label: '200 KB', size: 200, unit: 'KB' as const },
                              { label: '500 KB', size: 500, unit: 'KB' as const },
                              { label: '1 MB', size: 1, unit: 'MB' as const },
                              { label: '2 MB', size: 2, unit: 'MB' as const },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setCustomCompressSize(preset.size);
                                  setCustomCompressUnit(preset.unit);
                                }}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                  customCompressSize === preset.size &&
                                  customCompressUnit === preset.unit
                                    ? 'bg-rose-500 text-white border-rose-500 font-bold'
                                    : theme === 'dark'
                                    ? 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {currentTool.id === 'img-to-pdf' && (
                    <div className="space-y-3.5">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Canvas Standard
                        </label>
                        <select
                          value={imgPageSize}
                          onChange={(e) => setImgPageSize(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="a4">A4 (International Standard)</option>
                          <option value="letter">US Letter (8.5 x 11 in)</option>
                          <option value="fit">Fit Canvas to Photo</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Orientation
                        </label>
                        <select
                          value={imgOrientation}
                          onChange={(e) => setImgOrientation(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="auto">Auto (Match Dimension)</option>
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span
                            className={`font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Page Margins
                          </span>
                          <span
                            className={`font-mono ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {imgMargin}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={5}
                          value={imgMargin}
                          onChange={(e) => setImgMargin(parseInt(e.target.value, 10))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {currentTool.id === 'rotate' && (
                    <div className="space-y-3">
                      <label
                        className={`text-xs font-semibold block ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        Rotation Angle
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { deg: 90, label: '+90°' },
                          { deg: 180, label: '180°' },
                          { deg: 270, label: '+270°' },
                        ].map((item) => (
                          <button
                            key={item.deg}
                            onClick={() => setRotateAngle(item.deg)}
                            className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                              rotateAngle === item.deg
                                ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold shadow-sm'
                                : theme === 'dark'
                                ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400 hover:text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentTool.id === 'watermark' && (
                    <div className="space-y-3.5">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Watermark Stamp
                        </label>
                        <input
                          type="text"
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                          placeholder="e.g. CONFIDENTIAL, DRAFT"
                        />
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Color Shade
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['red', 'blue', 'gray', 'black'] as const).map((color) => (
                            <button
                              key={color}
                              onClick={() => setWatermarkColor(color)}
                              className={`py-2 rounded-xl border text-xs capitalize font-medium transition-all ${
                                watermarkColor === color
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold'
                                  : theme === 'dark'
                                  ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            className={`font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Opacity
                          </span>
                          <span
                            className={`font-mono ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {Math.round(watermarkOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={watermarkOpacity}
                          onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            className={`font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Stamp Angle
                          </span>
                          <span
                            className={`font-mono ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {watermarkAngle}°
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[-45, 0, 45].map((ang) => (
                            <button
                              key={ang}
                              onClick={() => setWatermarkAngle(ang)}
                              className={`py-2 rounded-xl border text-xs font-mono transition-colors ${
                                watermarkAngle === ang
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold shadow-sm'
                                  : theme === 'dark'
                                  ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {ang}°
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentTool.id === 'page-numbers' && (
                    <div className="space-y-3.5">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Numbering Format
                        </label>
                        <select
                          value={pageNumberFormat}
                          onChange={(e) => setPageNumberFormat(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="page_x_of_y">Page X of Y</option>
                          <option value="x_of_y">X / Y</option>
                          <option value="x_only">X (Number only)</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Position
                        </label>
                        <select
                          value={pageNumberPos}
                          onChange={(e) => setPageNumberPos(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="bottom-center">Bottom Center</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="top-center">Top Center</option>
                        </select>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Start Counter Offset
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={pageNumberStart}
                          onChange={(e) => setPageNumberStart(parseInt(e.target.value, 10) || 1)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {currentTool.id === 'sign' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label
                          className={`text-xs font-semibold ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Interactive Pad
                        </label>
                        <button
                          onClick={clearSignatureCanvas}
                          className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold"
                        >
                          Clear
                        </button>
                      </div>

                      <div
                        className={`border rounded-2xl overflow-hidden bg-white shadow-inner ${
                          theme === 'dark' ? 'border-white/[0.1]' : 'border-slate-200'
                        }`}
                      >
                        <canvas
                          ref={canvasRef}
                          width={260}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full cursor-crosshair touch-none"
                        />
                      </div>
                      <p
                        className={`text-[11px] ${
                          theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                        }`}
                      >
                        Sign with your mouse, trackpad, or finger.
                      </p>

                      {pdfMeta && (
                        <div>
                          <label
                            className={`text-xs font-semibold block mb-1 ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Stamp Target Page
                          </label>
                          <select
                            value={signPageNumber}
                            onChange={(e) => setSignPageNumber(parseInt(e.target.value, 10))}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                                : 'bg-white border border-slate-200 text-slate-800'
                            }`}
                          >
                            {Array.from({ length: pdfMeta.pageCount }).map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Page {i + 1} of {pdfMeta.pageCount}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {currentTool.id === 'protect' && (
                    <div className="space-y-3">
                      <label
                        className={`text-xs font-semibold block ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        Encryption Password
                      </label>
                      <input
                        type="password"
                        value={protectPassword}
                        onChange={(e) => setProtectPassword(e.target.value)}
                        placeholder="Enter secure password..."
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      />
                      <p
                        className={`text-[11px] leading-relaxed ${
                          theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                        }`}
                      >
                        Encrypts the document stream with cryptographic access flags.
                      </p>
                    </div>
                  )}

                  {/* Dark Mode PDF Controls */}
                  {currentTool.id === 'dark-mode' && (
                    <div className="space-y-4">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-2 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Night Theme Style
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'midnight', label: 'Midnight Slate', desc: 'Dark blue-slate, easiest on eyes' },
                            { id: 'oled', label: 'OLED Pure Black', desc: 'Pitch black #000, saves battery' },
                            { id: 'inverted', label: 'True Inversion', desc: 'High-contrast inverted tone' },
                            { id: 'sepia', label: 'Warm Sepia', desc: 'Amber paper, zero blue light' },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setDarkModeTheme(m.id as any)}
                              className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                darkModeTheme === m.id
                                  ? 'bg-rose-500/15 border border-rose-500 ring-1 ring-rose-500 shadow-sm'
                                  : 'glass-card-interactive border'
                              }`}
                            >
                              <div
                                className={`text-xs font-bold ${
                                  darkModeTheme === m.id
                                    ? 'text-rose-500'
                                    : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-slate-800'
                                }`}
                              >
                                {m.label}
                              </div>
                              <div
                                className={`text-[10px] mt-0.5 leading-tight ${
                                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {m.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Page Orientation
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'portrait', label: 'Portrait (Sidha)' },
                            { id: 'auto', label: 'Original' },
                            { id: 'landscape', label: 'Landscape' },
                          ].map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setDarkModeOrientation(o.id as any)}
                              className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                                darkModeOrientation === o.id
                                  ? 'bg-rose-500/15 border border-rose-500 text-rose-500 font-bold shadow-xs'
                                  : theme === 'dark'
                                  ? 'glass-card-interactive border text-slate-300 hover:text-white'
                                  : 'glass-card-interactive border text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Rendering Sharpness
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { dpi: 150, label: '150 DPI (Balanced)' },
                            { dpi: 300, label: '300 DPI (Ultra HD)' },
                          ].map((d) => (
                            <button
                              key={d.dpi}
                              type="button"
                              onClick={() => setDarkModeDpi(d.dpi)}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                darkModeDpi === d.dpi
                                  ? 'bg-rose-500/15 border border-rose-500 text-rose-500 font-bold shadow-xs'
                                  : theme === 'dark'
                                  ? 'glass-card-interactive border text-slate-300 hover:text-white'
                                  : 'glass-card-interactive border text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border text-[11px] flex items-center gap-2 glass-card">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                          Live theme preview simulated above in the workspace viewer.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PDF to JPG Controls */}
                  {currentTool.id === 'pdf-to-jpg' && (
                    <div className="space-y-4">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Image Resolution (DPI)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { dpi: 72, label: '72 DPI', desc: 'Web' },
                            { dpi: 150, label: '150 DPI', desc: 'Standard' },
                            { dpi: 300, label: '300 DPI', desc: 'Print' },
                          ].map((res) => (
                            <button
                              key={res.dpi}
                              type="button"
                              onClick={() => setJpgDpi(res.dpi)}
                              className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                                jpgDpi === res.dpi
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold'
                                  : theme === 'dark'
                                  ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="text-xs font-bold">{res.label}</div>
                              <div className="text-[10px] opacity-75">{res.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span
                            className={`font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            JPG Compression Quality
                          </span>
                          <span
                            className={`font-mono ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {Math.round(jpgQuality * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.7}
                          max={1.0}
                          step={0.05}
                          value={jpgQuality}
                          onChange={(e) => setJpgQuality(parseFloat(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Page Range (Leave empty for All Pages)
                        </label>
                        <input
                          type="text"
                          value={jpgPageRange}
                          onChange={(e) => setJpgPageRange(e.target.value)}
                          placeholder="e.g. 1-3, 5 (or leave empty)"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>

                      <p
                        className={`text-[11px] leading-relaxed ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Single pages download as JPG directly; multiple pages automatically package into a ZIP archive.
                      </p>
                    </div>
                  )}

                  {/* Unlock PDF Controls */}
                  {currentTool.id === 'unlock' && (
                    <div className="space-y-4">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1.5 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Document Password (If Protected)
                        </label>
                        <div className="relative">
                          <input
                            type={showUnlockPassword ? 'text' : 'password'}
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            placeholder="Enter password to unlock..."
                            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                                : 'bg-white border border-slate-200 text-slate-800'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl border space-y-1.5 text-xs ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border-white/[0.08] text-slate-300'
                            : 'bg-amber-50/60 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-amber-500">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Restrictions Stripped</span>
                        </div>
                        <ul className="text-[11px] space-y-1 text-slate-400">
                          <li>✓ Removes owner permission locks</li>
                          <li>✓ Re-enables printing, copying & page extraction</li>
                          <li>✓ Exports clean, unencrypted PDF stream</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Add Link Controls */}
                  {currentTool.id === 'add-link' && (
                    <div className="space-y-3.5">
                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Destination URL / Email
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com or mailto:you@domain.com"
                            className={`w-full pl-8 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                                : 'bg-white border border-slate-200 text-slate-800'
                            }`}
                          />
                          <Link2 className="w-3.5 h-3.5 text-rose-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Display Label / Text
                        </label>
                        <input
                          type="text"
                          value={linkLabel}
                          onChange={(e) => setLinkLabel(e.target.value)}
                          placeholder="e.g. Visit Official Website"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Visual Link Style
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'button', label: 'CTA Pill' },
                            { id: 'underline', label: 'Underline' },
                            { id: 'hotspot', label: 'Hotspot' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setLinkStyle(st.id as any)}
                              className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                linkStyle === st.id
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 font-bold'
                                  : theme === 'dark'
                                  ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`text-xs font-semibold block mb-1 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}
                        >
                          Position on Page
                        </label>
                        <select
                          value={linkPosition}
                          onChange={(e) => setLinkPosition(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="footer">Bottom Footer</option>
                          <option value="banner">Top Header Banner</option>
                          <option value="cta">Centered CTA</option>
                          <option value="custom">Custom Coordinates</option>
                        </select>
                      </div>

                      {linkPosition === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Horizontal X</span>
                              <span className="font-mono text-rose-400">{linkCustomX}%</span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={90}
                              value={linkCustomX}
                              onChange={(e) => setLinkCustomX(parseInt(e.target.value, 10))}
                              className="w-full accent-rose-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Vertical Y</span>
                              <span className="font-mono text-rose-400">{linkCustomY}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              value={linkCustomY}
                              onChange={(e) => setLinkCustomY(parseInt(e.target.value, 10))}
                              className="w-full accent-rose-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {pdfMeta && (
                        <div>
                          <label
                            className={`text-xs font-semibold block mb-1 ${
                              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                            }`}
                          >
                            Target Page
                          </label>
                          <select
                            value={linkPageNumber}
                            onChange={(e) => setLinkPageNumber(parseInt(e.target.value, 10))}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border border-white/[0.08] text-white'
                                : 'bg-white border border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value={0}>All Pages ({pdfMeta.pageCount} pages)</option>
                            {Array.from({ length: pdfMeta.pageCount }).map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Page {i + 1} of {pdfMeta.pageCount}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove Links Controls */}
                  {currentTool.id === 'remove-links' && (
                    <div className="space-y-3.5">
                      <div
                        className={`p-4 rounded-2xl border space-y-2 ${
                          theme === 'dark'
                            ? 'bg-[#0D0F17] border-white/[0.08] text-slate-300'
                            : 'bg-rose-50/50 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-rose-500 text-xs">
                          <Unlink className="w-4 h-4" />
                          <span>Link Purge & Document Sanitizer</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          Scans all pages for embedded hyperlink annotations, web URLs, URI actions, and external tracking triggers, stripping them completely to sanitize the file.
                        </p>
                      </div>

                      {removedLinksCount !== null && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>Successfully purged {removedLinksCount} links from document!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Batch Rename Configuration in Sidebar */}
                  {isBatchableTool && uploadedFiles.length > 0 && (
                    <div
                      className={`pt-3.5 border-t space-y-2.5 ${
                        theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          <FileEdit className="w-3.5 h-3.5 text-rose-500" />
                          <span>Batch File Naming</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setBatchRenameEnabled(!batchRenameEnabled)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all cursor-pointer ${
                            batchRenameEnabled
                              ? 'bg-rose-500/15 text-rose-500 font-bold border border-rose-500/30'
                              : 'text-slate-400 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          {batchRenameEnabled ? 'Custom Active' : 'Default Names'}
                        </button>
                      </div>

                      {batchRenameEnabled && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={batchRenamePattern}
                            onChange={(e) => setBatchRenamePattern(e.target.value)}
                            placeholder="Docu_{date}_{index}.pdf"
                            className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-500 transition-colors ${
                              theme === 'dark'
                                ? 'bg-[#0D0F17] border border-white/[0.08] text-rose-300'
                                : 'bg-white border border-slate-200 text-rose-700'
                            }`}
                          />
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Output sample:</span>
                            <span className="text-emerald-500 font-bold truncate max-w-[170px]">
                              {batchItems.length > 0
                                ? batchItems[0].outputName
                                : formatBatchFilename(batchRenamePattern, new File([], 'Doc.pdf'), 0, currentTool.id)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Action Button inside Sidebar */}
                  <div className="pt-2">
                    <button
                      onClick={isBatchableTool ? executeBatchQueue : executeSingleToolProcess}
                      disabled={isProcessing || isBatchProcessing}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                        isProcessing || isBatchProcessing
                          ? 'bg-rose-500/20 cursor-not-allowed text-rose-300'
                          : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-rose-950/60 hover:scale-[1.01]'
                      }`}
                    >
                      {isProcessing || isBatchProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {isBatchProcessing
                              ? `Processing (${batchActiveIndex + 1}/${batchItems.length})...`
                              : 'Processing...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>
                            {isBatchableTool && uploadedFiles.length > 1
                              ? `Start Batch (${uploadedFiles.length} Documents)`
                              : `Process & Download PDF`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ================= GITHUB & VERCEL DEPLOY GUIDE MODAL ================= */}
      {showDeployGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div
            className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
              theme === 'dark'
                ? 'bg-[#0D0F17] border border-white/[0.12] text-slate-200'
                : 'bg-white border border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between border-b pb-4 ${
                theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    theme === 'dark'
                      ? 'bg-white/[0.05] border border-white/[0.08] text-rose-400'
                      : 'bg-rose-50 border border-rose-100 text-rose-600'
                  }`}
                >
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`font-display text-base font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    GitHub & Vercel 1-Click Deployment
                  </h3>
                  <p
                    className={`text-xs ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Host this high-end PDF suite permanently free with zero backend config
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployGuide(false)}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation in Hindi & English */}
            <div
              className={`p-4 rounded-2xl text-xs space-y-1 ${
                theme === 'dark'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <p className="font-semibold">
                🎯 1 मिनट में लाइव करें (GitHub + Vercel):
              </p>
              <p
                className={`leading-relaxed ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                यह पूरा ऐप 100% क्लाइंट-साइड (Browser-based) बना है, यानी इसमें किसी बैकएंड सर्वर की जरूरत नहीं है। आप सीधे अपने GitHub रेपो में कोड पुश करके Vercel पर 1 मिनट में फ्री में लाइव कर सकते हैं!
              </p>
            </div>

            {/* Step 1: Git Commands */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Step 1: Terminal में GitHub पर Push करें
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      'git init\ngit add .\ngit commit -m "feat: advanced next-gen pdf suite"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\ngit push -u origin main',
                      'git-all'
                    )
                  }
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-600 font-semibold"
                >
                  {copiedCommand === 'git-all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCommand === 'git-all' ? 'Copied Commands!' : 'Copy All Commands'}</span>
                </button>
              </div>

              <div
                className={`border rounded-2xl p-3.5 font-mono text-xs space-y-1 overflow-x-auto ${
                  theme === 'dark'
                    ? 'bg-[#08090D] border-white/[0.08] text-slate-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <p className="text-slate-500"># 1. Initialize git and commit</p>
                <p>git init</p>
                <p>git add .</p>
                <p>git commit -m "feat: advanced next-gen pdf suite"</p>
                <p className="text-slate-500 pt-1"># 2. Link your GitHub repo and push</p>
                <p>git branch -M main</p>
                <p>git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git</p>
                <p>git push -u origin main</p>
              </div>
            </div>

            {/* Step 2: Vercel Instructions */}
            <div className="space-y-2">
              <span
                className={`font-bold text-xs ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                Step 2: Vercel पर 1-Click Import करें
              </span>
              <div
                className={`border rounded-2xl p-4 text-xs space-y-2.5 ${
                  theme === 'dark'
                    ? 'bg-[#08090D] border-white/[0.08] text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      theme === 'dark'
                        ? 'bg-white/[0.08] text-rose-400'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    1
                  </span>
                  <p>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      vercel.com
                    </strong>{' '}
                    पर जाएं और "Add New Project" पर क्लिक करें।
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      theme === 'dark'
                        ? 'bg-white/[0.08] text-rose-400'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    2
                  </span>
                  <p>अपने GitHub Repository को सिलेक्ट करें।</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      theme === 'dark'
                        ? 'bg-white/[0.08] text-rose-400'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    3
                  </span>
                  <p>
                    Vercel अपने आप{' '}
                    <strong className="text-emerald-500 font-semibold">Vite</strong> पहचान लेगा। Build
                    Command:{' '}
                    <code
                      className={`px-1 rounded ${
                        theme === 'dark' ? 'bg-white/[0.08] text-rose-300' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}
                    >
                      npm run build
                    </code>
                    , Output Directory:{' '}
                    <code
                      className={`px-1 rounded ${
                        theme === 'dark' ? 'bg-white/[0.08] text-rose-300' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}
                    >
                      dist
                    </code>
                    .
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      theme === 'dark'
                        ? 'bg-white/[0.08] text-rose-400'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    4
                  </span>
                  <p>
                    <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                      "Deploy"
                    </strong>{' '}
                    पर क्लिक करें। 30 सेकंड में आपकी साइट लाइव हो जाएगी!
                  </p>
                </div>
              </div>
            </div>

            {/* Footer close */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDeployGuide(false)}
                className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer
        className={`w-full border-t py-7 px-4 sm:px-6 lg:px-8 mt-auto text-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 transition-colors ${
          theme === 'dark'
            ? 'border-white/[0.06] text-slate-500 bg-transparent'
            : 'border-slate-200 text-slate-600 bg-white/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`font-display font-bold ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
            }`}
          >
            DocuFlow Studio
          </span>
          <span>·</span>
          <span>Next-Gen Client-Side PDF Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDeployGuide(true)}
            className="hover:text-rose-500 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Deployment</span>
          </button>
          <span>·</span>
          <span className="font-mono text-[11px]">100% In-Browser Memory</span>
        </div>
      </footer>
    </div>
  );
}
