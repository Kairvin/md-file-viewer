import React, { useRef } from 'react';
import { 
  X, 
  FileText, 
  FileCode, 
  Presentation, 
  Sparkles, 
  Upload, 
  Check, 
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Wrench,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function ToolsModal({
  isOpen,
  onClose,
  activeTool = 'markdown',
  onSelectTool,
  onOpenDocxFile,
  onOpenPptxFile,
  onOpenMarkdownFile,
  onLoadSampleWord,
  onLoadSamplePptx
}) {
  const docxInputRef = useRef(null);
  const pptxInputRef = useRef(null);
  const mdInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e, handler) => {
    const file = e.target.files?.[0];
    if (file) {
      handler(file);
      onClose();
    }
    e.target.value = '';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.18),0_10px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col max-h-[90vh] transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-36 bg-gradient-to-b from-blue-500/15 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-950 flex items-center justify-center shadow-md shadow-slate-900/15 dark:shadow-white/10 ring-1 ring-black/5 dark:ring-white/20 shrink-0">
              <Wrench className="w-5 h-5 text-blue-400 dark:text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Document Tools Hub
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  3 Tools Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-normal">
                Choose a specialized reader, annotate in playground, and export publication-grade PDFs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="group p-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2"
            title="Close (Esc)"
          >
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              Esc
            </kbd>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden inputs */}
        <input 
          type="file" 
          ref={docxInputRef} 
          accept=".docx" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenDocxFile)} 
        />
        <input 
          type="file" 
          ref={pptxInputRef} 
          accept=".pptx" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenPptxFile)} 
        />
        <input 
          type="file" 
          ref={mdInputRef} 
          accept=".md,.markdown,.txt" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenMarkdownFile)} 
        />

        {/* Tools Grid */}
        <div className="p-6 sm:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 custom-scrollbar">
          {/* Tool 1: Markdown Review Pro */}
          <div 
            className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 group border overflow-hidden ${
              activeTool === 'markdown'
                ? 'border-blue-500/90 dark:border-blue-500/80 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 ring-2 ring-blue-500/30 shadow-[0_12px_36px_-10px_rgba(59,130,246,0.2)]'
                : 'border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {/* Top Rim Gradient Accent */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 transition-opacity ${activeTool === 'markdown' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

            {activeTool === 'markdown' && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Active
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                <FileCode className="w-6 h-6" />
              </div>
              {activeTool !== 'markdown' && (
                <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                  .md · .txt
                </span>
              )}
            </div>

            <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
              Markdown Review Pro
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed min-h-[50px]">
              Split editor, real-time preview, KaTeX formulas, Mermaid diagrams, in-place playground editing, and intact vector PDF generation.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Split editor &amp; real-time preview</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">KaTeX math &amp; Mermaid diagrams</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">In-place playground editing</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Intact vector PDF generation</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-auto">
              <button
                onClick={() => {
                  onSelectTool('markdown');
                  onClose();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  activeTool === 'markdown'
                    ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {activeTool === 'markdown' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Currently Active</span>
                  </>
                ) : (
                  <>
                    <span>Switch to Markdown</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                onClick={() => mdInputRef.current?.click()}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Open .md File</span>
              </button>
            </div>
          </div>

          {/* Tool 2: Word to PDF & Playground */}
          <div 
            className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 group border overflow-hidden ${
              activeTool === 'word'
                ? 'border-indigo-500/90 dark:border-indigo-500/80 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/25 dark:via-slate-900 dark:to-slate-900 ring-2 ring-indigo-500/30 shadow-[0_12px_36px_-10px_rgba(99,102,241,0.2)]'
                : 'border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {/* Top Rim Gradient Accent */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 transition-opacity ${activeTool === 'word' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

            {activeTool === 'word' && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Active
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                <FileText className="w-6 h-6" />
              </div>
              {activeTool !== 'word' && (
                <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                  .docx
                </span>
              )}
            </div>

            <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
              Word to PDF &amp; Playground
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed min-h-[50px]">
              Convert Word documents into clean semantic reading format. Edit in playground, add highlights and comments, and export to publication PDF.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Semantic .docx structure &amp; formatting</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Preserves tables, lists &amp; styled text</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">In-place playground review &amp; edits</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">1-Click publication PDF export</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-auto">
              <button
                onClick={() => docxInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open .docx File</span>
              </button>

              <button
                onClick={() => {
                  onLoadSampleWord();
                  onClose();
                }}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Try Sample Word Doc</span>
              </button>
            </div>
          </div>

          {/* Tool 3: PowerPoint to PDF & Playground */}
          <div 
            className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 group border overflow-hidden ${
              activeTool === 'pptx'
                ? 'border-amber-500/90 dark:border-amber-500/80 bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/25 dark:via-slate-900 dark:to-slate-900 ring-2 ring-amber-500/30 shadow-[0_12px_36px_-10px_rgba(245,158,11,0.2)]'
                : 'border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {/* Top Rim Gradient Accent */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-opacity ${activeTool === 'pptx' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

            {activeTool === 'pptx' && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Active
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-white/20">
                <Presentation className="w-6 h-6" />
              </div>
              {activeTool !== 'pptx' && (
                <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                  .pptx
                </span>
              )}
            </div>

            <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
              PowerPoint to PDF &amp; Playground
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed min-h-[50px]">
              Read and review PowerPoint slides in document flow or interactive deck carousel. Edit slides in-place, annotate, and export to presentation PDF.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">16:9 Deck &amp; document flow modes</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Slide text, table &amp; card editing</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Playground highlight &amp; comment engine</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">1-Slide-per-page landscape PDF</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-auto">
              <button
                onClick={() => pptxInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-orange-500/25 border border-amber-400/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open .pptx File</span>
              </button>

              <button
                onClick={() => {
                  onLoadSamplePptx();
                  onClose();
                }}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Try Sample Presentation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Production Footer Banner */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Roadmap:</span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center gap-1.5 font-medium shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel (.xlsx) to PDF</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 flex items-center gap-1.5 font-medium shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>PDF to Markdown</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px]">100% Client-Side Engine · IndexedDB Storage · Zero Uploads</span>
          </div>
        </div>
      </div>
    </div>
  );
}
