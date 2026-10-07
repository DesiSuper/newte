import React, { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid3X3,
  FileText,
  RotateCw,
  Eye,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { formatBytes } from '../utils/pdfProcessor';

// Configure pdfjs worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFPreviewProps {
  file: File | Blob;
  fileName?: string;
  fileSize?: number;
  initialPageCount?: number;
  theme?: 'dark' | 'light';
  // Optional tool-specific interactions
  activeToolId?: string;
  selectedPageIndices?: number[]; // 0-indexed for organize
  onTogglePage?: (pageIndex: number) => void;
  // Watermark overlay simulation
  watermarkText?: string;
  watermarkColor?: 'red' | 'blue' | 'gray' | 'black';
  watermarkOpacity?: number;
  watermarkAngle?: number;
  // Rotate angle simulation
  rotateAngle?: number;
  // Sign placement simulation
  signDataUrl?: string | null;
  signPageNumber?: number;
  signPositionX?: number; // 0-100%
  signPositionY?: number; // 0-100%
  onSignPositionChange?: (x: number, y: number) => void;
  // Dark mode simulation
  darkModeSimulation?: 'midnight' | 'inverted' | 'oled' | 'sepia' | null;
  darkModeOrientation?: 'portrait' | 'auto' | 'landscape';
  darkModeRotationOffset?: number;
  // Link simulation
  linkSimulation?: {
    label: string;
    url: string;
    style: 'button' | 'underline' | 'hotspot';
    position: 'footer' | 'banner' | 'cta' | 'custom';
    xPercent: number;
    yPercent: number;
    pageNumber: number;
  };
  className?: string;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  file,
  fileName,
  fileSize,
  initialPageCount,
  theme = 'dark',
  activeToolId,
  selectedPageIndices,
  onTogglePage,
  watermarkText,
  watermarkColor = 'red',
  watermarkOpacity = 0.35,
  watermarkAngle = -45,
  rotateAngle = 0,
  signDataUrl,
  signPageNumber = 1,
  signPositionX = 70,
  signPositionY = 15,
  onSignPositionChange,
  darkModeSimulation,
  linkSimulation,
  className = '',
}) => {
  const [numPages, setNumPages] = useState<number>(initialPageCount || 1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [manualRotation, setManualRotation] = useState<number>(0);

  // Effective rotation: only apply rotateAngle if in 'rotate' tool; otherwise natural orientation (0) + optional manual preview rotation
  const effectiveRotation =
    ((activeToolId === 'rotate' ? (rotateAngle || 0) : 0) + manualRotation) % 360;

  // Generate object URL for file
  useEffect(() => {
    let url: string | null = null;
    try {
      url = URL.createObjectURL(file);
      setPdfDataUrl(url);
      setIsLoading(true);
      setLoadError(null);
      setManualRotation(0);
    } catch (err) {
      setLoadError('Failed to create preview URL');
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    if (currentPage > numPages) {
      setCurrentPage(1);
    }
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('Error loading PDF:', err);
    setLoadError(err.message || 'Failed to render PDF preview.');
    setIsLoading(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.5));
  const handleZoomReset = () => setScale(1.0);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages));

  // Color mapping for watermark preview
  const watermarkHex = useMemo(() => {
    switch (watermarkColor) {
      case 'red':
        return '#dc2626';
      case 'blue':
        return '#2563eb';
      case 'black':
        return '#000000';
      case 'gray':
      default:
        return '#64748b';
    }
  }, [watermarkColor]);

  // Compute live dark mode CSS filter
  const darkModeFilter = useMemo(() => {
    if (activeToolId !== 'dark-mode' || !darkModeSimulation) return undefined;
    if (darkModeSimulation === 'inverted') return 'invert(1) hue-rotate(180deg) contrast(1.1)';
    if (darkModeSimulation === 'oled') return 'invert(1) contrast(1.3) brightness(0.9)';
    if (darkModeSimulation === 'sepia') return 'sepia(0.85) contrast(0.95) brightness(0.92)';
    return 'invert(0.92) hue-rotate(180deg) brightness(0.9) contrast(1.15)';
  }, [activeToolId, darkModeSimulation]);

  // Click on single page stage to reposition signature
  const handlePageStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeToolId !== 'sign' || !onSignPositionChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    // Y percent from bottom for PDF coordinate consistency
    const yPct = Math.round(((rect.bottom - e.clientY) / rect.height) * 100);
    onSignPositionChange(Math.max(5, Math.min(90, xPct)), Math.max(5, Math.min(90, yPct)));
  };

  return (
    <div
      className={`rounded-2xl glass-card overflow-hidden flex flex-col transition-all ${className}`}
    >
      {/* Top Preview Control Bar */}
      <div
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 transition-colors"
        style={{
          backgroundColor: 'var(--bar-bg)',
          borderColor: 'var(--bar-border)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold truncate max-w-[200px] sm:max-w-xs ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {fileName || (file instanceof File ? file.name : 'Document Preview')}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  theme === 'dark' ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {numPages} {numPages === 1 ? 'Page' : 'Pages'}
              </span>
            </div>
            {fileSize && (
              <span className="text-[11px] font-mono text-slate-400">
                {formatBytes(fileSize)}
              </span>
            )}
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Grid vs Single Page Mode */}
          <div
            className="flex items-center p-1 rounded-xl border text-xs"
            style={{
              backgroundColor: 'var(--subpanel-bg)',
              borderColor: 'var(--bar-border)',
            }}
          >
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'single'
                  ? theme === 'dark'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'bg-white text-slate-900 font-semibold shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Single Page View"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Page</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? theme === 'dark'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'bg-white text-slate-900 font-semibold shadow-xs'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Thumbnail View"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div
            className="flex items-center rounded-xl border px-1 py-0.5"
            style={{
              backgroundColor: 'var(--subpanel-bg)',
              borderColor: 'var(--bar-border)',
            }}
          >
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
                theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className={`px-2 py-0.5 text-[11px] font-mono transition-colors ${
                theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900 font-semibold'
              }`}
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 2.0}
              className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
                theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Rotate Preview Orientation */}
          <button
            type="button"
            onClick={() => setManualRotation((prev) => (prev + 90) % 360)}
            className={`p-1.5 px-2.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              manualRotation !== 0
                ? 'bg-rose-500/15 border-rose-500 text-rose-500 font-bold'
                : 'glass-card-interactive text-slate-400 hover:text-white'
            }`}
            title="Rotate Preview Orientation (+90°)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[10px]">
              {effectiveRotation !== 0 ? `${effectiveRotation}°` : 'Rotate'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Preview Stage Area */}
      <div
        className="relative min-h-[420px] max-h-[640px] overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start transition-colors"
        style={{
          backgroundColor: 'var(--stage-bg)',
        }}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm space-y-3 ${
              theme === 'dark' ? 'bg-[#07080C]/80' : 'bg-white/80'
            }`}
          >
            <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
            <p className={`text-xs font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Rendering high-resolution PDF preview...
            </p>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="p-8 text-center space-y-3 max-w-md mx-auto my-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Preview Rendering Unavailable</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {loadError}. Your document can still be processed normally with the action button below.
            </p>
          </div>
        )}

        {/* PDF Document Container */}
        {pdfDataUrl && (
          <Document
            file={pdfDataUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col items-center"
          >
            {/* SINGLE PAGE VIEW */}
            {viewMode === 'single' && (
              <div
                className="relative cursor-default select-none shadow-2xl rounded-lg overflow-hidden border border-white/[0.15] bg-white transition-transform"
                onClick={handlePageStageClick}
              >
                <div style={darkModeFilter ? { filter: darkModeFilter } : undefined} className="transition-all">
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    rotate={effectiveRotation}
                    className="shadow-md"
                  />
                </div>

                {/* Live Watermark Overlay Simulation */}
                {activeToolId === 'watermark' && watermarkText && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <span
                      style={{
                        transform: `rotate(${watermarkAngle}deg)`,
                        color: watermarkHex,
                        opacity: watermarkOpacity,
                        fontSize: `${Math.round(36 * scale)}px`,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        userSelect: 'none',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {watermarkText}
                    </span>
                  </div>
                )}

                {/* Live Link Simulation Overlay */}
                {activeToolId === 'add-link' &&
                  linkSimulation &&
                  (linkSimulation.pageNumber === 0 || currentPage === linkSimulation.pageNumber) && (
                    <div
                      className={`absolute pointer-events-none select-none transition-all flex items-center justify-center ${
                        linkSimulation.position === 'footer'
                          ? 'bottom-6 left-1/2 -translate-x-1/2'
                          : linkSimulation.position === 'banner'
                          ? 'top-6 left-1/2 -translate-x-1/2'
                          : linkSimulation.position === 'cta'
                          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                          : 'transform -translate-x-1/2 translate-y-1/2'
                      }`}
                      style={
                        linkSimulation.position === 'custom'
                          ? {
                              left: `${linkSimulation.xPercent}%`,
                              bottom: `${linkSimulation.yPercent}%`,
                            }
                          : undefined
                      }
                    >
                      {linkSimulation.style === 'button' ? (
                        <div className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 border border-rose-400/50">
                          <span>{linkSimulation.label || linkSimulation.url}</span>
                          <span className="text-[10px] opacity-75 font-mono">↗</span>
                        </div>
                      ) : linkSimulation.style === 'underline' ? (
                        <div className="text-blue-500 font-bold text-xs underline decoration-blue-500 decoration-1 underline-offset-2 flex items-center gap-1">
                          <span>{linkSimulation.label || linkSimulation.url}</span>
                          <span className="text-[10px]">↗</span>
                        </div>
                      ) : (
                        <div className="px-4 py-2 border-2 border-dashed border-blue-500 bg-blue-500/15 rounded text-[11px] font-mono text-blue-300">
                          Hotspot: {linkSimulation.url}
                        </div>
                      )}
                    </div>
                  )}

                {/* Live Signature Stamp Simulation */}
                {activeToolId === 'sign' && signDataUrl && currentPage === signPageNumber && (
                  <div
                    className="absolute pointer-events-none transform -translate-x-1/2 translate-y-1/2 p-1 border-2 border-dashed border-rose-500 bg-rose-500/10 rounded-md shadow-lg"
                    style={{
                      left: `${signPositionX}%`,
                      bottom: `${signPositionY}%`,
                      width: `${Math.round(130 * scale)}px`,
                      height: `${Math.round(55 * scale)}px`,
                    }}
                  >
                    <img
                      src={signDataUrl}
                      alt="Signature Stamp"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute -top-5 left-0 text-[10px] font-mono text-rose-300 bg-rose-950/80 px-1 rounded whitespace-nowrap">
                      Sign Stamp
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GRID THUMBNAILS VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl">
                {Array.from({ length: numPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = currentPage === pageNum;
                  const isSelected = selectedPageIndices ? selectedPageIndices.includes(idx) : true;

                  return (
                    <div
                      key={`thumb-${pageNum}`}
                      className={`relative flex flex-col items-center p-2 rounded-xl transition-all border group ${
                        isCurrent
                          ? 'bg-rose-500/10 border-rose-500/80 shadow-md ring-1 ring-rose-500/50'
                          : isSelected
                          ? theme === 'dark'
                            ? 'bg-[#12141D] border-white/[0.08] hover:border-white/[0.2]'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.04] opacity-50'
                          : 'bg-slate-100 border-slate-200 opacity-50'
                      }`}
                    >
                      {/* Thumbnail wrapper */}
                      <div
                        className="relative rounded overflow-hidden cursor-pointer shadow-sm bg-white"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          setViewMode('single');
                        }}
                      >
                        <div style={darkModeFilter ? { filter: darkModeFilter } : undefined}>
                          <Page
                            pageNumber={pageNum}
                            width={150}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            rotate={effectiveRotation}
                          />
                        </div>

                        {/* If in organize mode: checkmark or remove badge */}
                        {activeToolId === 'organize' && onTogglePage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePage(idx);
                            }}
                            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                              isSelected
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-red-950 text-red-400 border border-red-700 hover:bg-red-900'
                            }`}
                            title={isSelected ? 'Keep Page' : 'Removed Page'}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {/* Page Label */}
                      <div
                        className={`mt-2 flex items-center justify-between w-full px-1 text-[11px] font-mono ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        <span>Page {pageNum}</span>
                        {activeToolId === 'organize' && (
                          <span className={isSelected ? 'text-emerald-400' : 'text-red-400 line-through'}>
                            {isSelected ? 'Keep' : 'Drop'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Document>
        )}
      </div>

      {/* Bottom Paging Bar (Visible in Single Mode) */}
      {viewMode === 'single' && (
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bar-bg)',
            borderColor: 'var(--bar-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed glass-card-interactive"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono tabular-nums text-slate-400">
              Page{' '}
              <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                {currentPage}
              </strong>{' '}
              of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed glass-card-interactive"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
            {activeToolId === 'sign' ? (
              <span className="text-rose-500 font-medium">Tip: Click anywhere on document to place signature</span>
            ) : activeToolId === 'watermark' ? (
              <span>Live watermark preview active</span>
            ) : activeToolId === 'dark-mode' ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Dark theme simulated preview
              </span>
            ) : (
              <span>Document loaded in browser memory</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
