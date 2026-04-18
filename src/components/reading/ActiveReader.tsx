'use client';
// src/components/reading/ActiveReader.tsx
// Full-screen reading interface. Supports PDF (via pdf.js CDN) and TXT.
// Tracks: elapsed time (starts on open, stops on close), pages visited (Set), total pages.
// On exit → fires onClose({ elapsed, pagesRead, totalPages, bookType })

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Settings, Sun, Moon,
  ZoomIn, ZoomOut, Loader2, BookOpen, Maximize2, Minimize2, Clock
} from 'lucide-react';

declare global {
  interface Window {
    pdfjsLib: any;
    html2canvas: any;
  }
}

export interface ReaderCloseData {
  elapsed: number;
  pagesRead: number;
  totalPages: number;
  bookType: 'PDF' | 'TXT' | 'EPUB';
}

interface Props {
  file: File;
  title: string;
  onClose: (data: ReaderCloseData) => void;
}

// ─── TXT Pagination ────────────────────────────────────────────────────────
function paginateTxt(text: string, charsPerPage = 2200): string[] {
  const pages: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) { pages.push(remaining); break; }
    let cut = charsPerPage;
    // break at word boundary
    while (cut > charsPerPage - 200 && remaining[cut] !== ' ' && remaining[cut] !== '\n') cut--;
    pages.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return pages;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── PDF Loader ─────────────────────────────────────────────────────────────
function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ActiveReader({ file, title, onClose }: Props) {
  // ── File state ──
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState<'PDF' | 'TXT' | 'EPUB'>('TXT');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [txtPages, setTxtPages] = useState<string[]>([]);
  const [error, setError] = useState('');

  // ── Navigation ──
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const visitedPages = useRef<Set<number>>(new Set([1]));

  // ── Timer ──
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Display settings ──
  const [warmth, setWarmth] = useState(0);       // 0–80
  const [brightness, setBrightness] = useState(100); // 60–120
  const [fontSize, setFontSize] = useState(17);  // txt only
  const [scale, setScale] = useState(1.4);       // pdf zoom
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Timer tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // ── Load file ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
          setFileType('PDF');
          await loadPdfJs();
          const arrayBuffer = await file.arrayBuffer();
          const doc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
        } else if (ext === 'txt') {
          setFileType('TXT');
          const text = await file.text();
          const pages = paginateTxt(text);
          setTxtPages(pages);
          setTotalPages(pages.length);
        } else if (ext === 'epub') {
          setFileType('EPUB');
          setError('EPUB support coming soon — please convert to PDF or TXT for now.');
        } else {
          // Try reading as TXT
          setFileType('TXT');
          try {
            const text = await file.text();
            const pages = paginateTxt(text);
            setTxtPages(pages);
            setTotalPages(pages.length);
          } catch {
            setError('Unsupported file format. Please use PDF, TXT, or EPUB.');
          }
        }
      } catch (err) {
        setError('Failed to load file. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [file]);

  // ── Render PDF page ────────────────────────────────────────────────────
  const renderPdfPage = useCallback(async (doc: any, pageNum: number, sc: number) => {
    if (!canvasRef.current || !doc) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    setRendering(true);
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error('Render error', err);
    } finally {
      setRendering(false);
    }
  }, []);

  // Re-render when page or scale changes (PDF only)
  useEffect(() => {
    if (pdfDoc && fileType === 'PDF') {
      renderPdfPage(pdfDoc, currentPage, scale);
    }
  }, [pdfDoc, currentPage, scale, fileType, renderPdfPage]);

  // ── Page navigation ────────────────────────────────────────────────────
  const goToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    visitedPages.current.add(pageNum);
  }, [totalPages]);

  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextPage(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
      if (e.key === 'Escape') setShowExitDialog(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Fullscreen ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (fullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.();
    }
  }, [fullscreen]);

  // ── Exit + save ────────────────────────────────────────────────────────
  function handleExit() {
    setRunning(false);
    setShowExitDialog(true);
  }

  function confirmExit() {
    onClose({
      elapsed,
      pagesRead: visitedPages.current.size,
      totalPages,
      bookType: fileType,
    });
  }

  // ── Warm light style ───────────────────────────────────────────────────
  const warmOverlayOpacity = warmth * 0.0035; // 0–0.28
  const brightnessFilter = `brightness(${brightness}%)`;

  // ─── Progress ──────────────────────────────────────────────────────────
  const progress = totalPages > 0 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 0;

  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 48, color: 'var(--accent4)' }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>{error}</div>
        <button className="btn" onClick={() => onClose({ elapsed: 0, pagesRead: 0, totalPages: 0, bookType: fileType })}>
          <i className="fa-solid fa-arrow-left" /> Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <div style={{ fontSize: 14, color: 'var(--text3)' }}>Loading {file.name}…</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-body)',
        filter: brightnessFilter,
      }}
    >
      {/* ── Warm light overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
        background: `rgba(255, 160, 40, ${warmOverlayOpacity})`,
        transition: 'background 0.3s',
      }} />

      {/* ── Top bar ── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
        background: 'var(--surface)', borderBottom: '0.5px solid var(--border)',
        position: 'relative', zIndex: 20, flexShrink: 0,
      }}>
        <button onClick={handleExit} className="btn btn-ghost btn-icon-sm" title="Exit (Esc)">
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 13 }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <i className="fa-solid fa-book-open" style={{ fontSize: 14, color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || file.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 20, border: '0.5px solid var(--border)', flexShrink: 0 }}>
            {fileType}
          </span>
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: running ? 'var(--accent3)' : 'var(--text3)', background: 'var(--surface2)', padding: '5px 12px', borderRadius: 20, border: '0.5px solid var(--border)', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => setRunning(r => !r)} title="Click to pause/resume timer">
          <i className={`fa-solid ${running ? 'fa-circle' : 'fa-circle-pause'}`} style={{ fontSize: 9, color: running ? 'var(--accent3)' : 'var(--text3)' }} />
          {formatTime(elapsed)}
        </div>

        {/* Page counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>
          <i className="fa-regular fa-file" style={{ fontSize: 12, color: 'var(--text3)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{currentPage}</span>
          <span style={{ color: 'var(--text3)' }}>/ {totalPages}</span>
        </div>

        {/* Pages read badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent2)', background: 'rgba(55,138,221,0.08)', padding: '4px 10px', borderRadius: 20, border: '0.5px solid rgba(55,138,221,0.2)', flexShrink: 0 }}>
          <i className="fa-solid fa-check" style={{ fontSize: 10 }} />
          {visitedPages.current.size} read
        </div>

        <button onClick={() => setShowSettings(s => !s)} className="btn btn-ghost btn-icon-sm" title="Settings">
          <i className="fa-solid fa-sliders" style={{ fontSize: 13, color: showSettings ? 'var(--accent)' : 'var(--text3)' }} />
        </button>

        <button onClick={() => setFullscreen(f => !f)} className="btn btn-ghost btn-icon-sm">
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ── Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', position: 'relative', zIndex: 20, background: 'var(--surface2)', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '12px 20px', flexWrap: 'wrap' }}>
              {/* Warm light */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <i className="fa-solid fa-sun" style={{ fontSize: 13, color: '#F5A623' }} />
                <span style={{ color: 'var(--text2)', fontWeight: 500, minWidth: 72 }}>Warm light</span>
                <input type="range" min={0} max={80} step={5} value={warmth} onChange={e => setWarmth(+e.target.value)}
                  style={{ width: 100, accentColor: '#F5A623' }} />
                <i className="fa-solid fa-moon" style={{ fontSize: 12, color: '#845EF7' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28 }}>{warmth}%</span>
              </div>

              {/* Brightness */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <i className="fa-solid fa-circle-half-stroke" style={{ fontSize: 13, color: 'var(--text3)' }} />
                <span style={{ color: 'var(--text2)', fontWeight: 500, minWidth: 72 }}>Brightness</span>
                <input type="range" min={60} max={120} step={5} value={brightness} onChange={e => setBrightness(+e.target.value)}
                  style={{ width: 100, accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 28 }}>{brightness}%</span>
              </div>

              {/* Font size (TXT) or Zoom (PDF) */}
              {fileType === 'TXT' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <i className="fa-solid fa-font" style={{ fontSize: 13, color: 'var(--text3)' }} />
                  <span style={{ color: 'var(--text2)', fontWeight: 500 }}>Font size</span>
                  <button className="btn btn-icon-sm btn-ghost" onClick={() => setFontSize(f => Math.max(12, f - 1))}>
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{fontSize}</span>
                  <button className="btn btn-icon-sm btn-ghost" onClick={() => setFontSize(f => Math.min(26, f + 1))}>
                    <ZoomIn size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 13, color: 'var(--text3)' }} />
                  <span style={{ color: 'var(--text2)', fontWeight: 500 }}>Zoom</span>
                  <button className="btn btn-icon-sm btn-ghost" onClick={() => setScale(s => Math.max(0.6, +(s - 0.1).toFixed(1)))}>
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 600 }}>{Math.round(scale * 100)}%</span>
                  <button className="btn btn-icon-sm btn-ghost" onClick={() => setScale(s => Math.min(2.5, +(s + 0.1).toFixed(1)))}>
                    <ZoomIn size={13} />
                  </button>
                </div>
              )}

              {/* Preset modes */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" onClick={() => { setWarmth(0); setBrightness(100); }}
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fa-solid fa-sun" style={{ fontSize: 10 }} /> Day
                </button>
                <button className="btn btn-sm" onClick={() => { setWarmth(40); setBrightness(85); }}
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,166,35,0.1)', borderColor: 'rgba(245,166,35,0.3)', color: '#8B5E0A' }}>
                  <i className="fa-solid fa-cloud-sun" style={{ fontSize: 10 }} /> Evening
                </button>
                <button className="btn btn-sm" onClick={() => { setWarmth(70); setBrightness(70); }}
                  style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(132,94,247,0.1)', borderColor: 'rgba(132,94,247,0.3)', color: '#4A2C8A' }}>
                  <i className="fa-solid fa-moon" style={{ fontSize: 10 }} /> Night
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {fileType === 'PDF' ? (
          /* ── PDF Canvas ── */
          <div style={{ padding: '20px 0', position: 'relative' }}>
            {rendering && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', borderRadius: 4 }} />
          </div>
        ) : (
          /* ── TXT Content ── */
          <div style={{
            maxWidth: 680, width: '100%', padding: '40px 32px',
            fontSize: fontSize, lineHeight: 1.85, color: 'var(--text)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {txtPages[currentPage - 1] || ''}
          </div>
        )}
      </div>

      {/* ── Bottom navigation bar ── */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
        background: 'var(--surface)', borderTop: '0.5px solid var(--border)',
        position: 'relative', zIndex: 20, flexShrink: 0,
      }}>
        {/* Prev */}
        <button onClick={prevPage} disabled={currentPage === 1} className="btn btn-sm"
          style={{ gap: 6, opacity: currentPage === 1 ? 0.4 : 1 }}>
          <i className="fa-solid fa-chevron-left" style={{ fontSize: 11 }} /> Prev
        </button>

        {/* Progress bar + page input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              goToPage(Math.round(ratio * (totalPages - 1)) + 1);
            }}>
            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Page</span>
            <input
              type="number" min={1} max={totalPages}
              value={currentPage}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= totalPages) goToPage(v);
              }}
              style={{ width: 52, textAlign: 'center', padding: '2px 6px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '0.5px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>of {totalPages}</span>
          </div>
        </div>

        {/* Next */}
        <button onClick={nextPage} disabled={currentPage === totalPages} className="btn btn-sm btn-primary"
          style={{ gap: 6, opacity: currentPage === totalPages ? 0.4 : 1 }}>
          Next <i className="fa-solid fa-chevron-right" style={{ fontSize: 11 }} />
        </button>

        {/* Exit button */}
        <button onClick={handleExit} className="btn btn-sm"
          style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)', gap: 6, marginLeft: 8 }}>
          <i className="fa-solid fa-stop" style={{ fontSize: 11 }} /> End Session
        </button>
      </div>

      {/* ── Exit confirmation dialog ── */}
      <AnimatePresence>
        {showExitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(45,203,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-book-open-reader" style={{ fontSize: 20, color: 'var(--accent3)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-head)' }}>End reading session?</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Your progress will be saved</div>
                </div>
              </div>

              {/* Session summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { icon: 'fa-solid fa-clock', label: 'Time read', value: formatTime(elapsed), color: 'var(--accent3)' },
                  { icon: 'fa-solid fa-file-lines', label: 'Pages seen', value: `${visitedPages.current.size}`, color: 'var(--accent2)' },
                  { icon: 'fa-solid fa-book', label: 'Total pages', value: `${totalPages}`, color: 'var(--accent4)' },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 10, padding: '12px 8px', border: '0.5px solid var(--border)' }}>
                    <i className={icon} style={{ fontSize: 18, color, marginBottom: 6, display: 'block' }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--font-head)' }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setRunning(true); setShowExitDialog(false); }}>
                  <i className="fa-solid fa-play" style={{ fontSize: 12 }} /> Keep reading
                </button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmExit}>
                  <i className="fa-solid fa-floppy-disk" style={{ fontSize: 12 }} /> Save & exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}