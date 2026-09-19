import React, { useRef } from 'react';
import { 
  X, 
  FileText, 
  FileCode, 
  Presentation, 
  Sparkles, 
  Upload, 
  Download, 
  CheckCircle2, 
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Wrench
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Document Tools Hub
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  3 Tools Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a tool to review, edit in playground, and export publication-grade PDFs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
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
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tool 1: Markdown Review Pro */}
          <div 
            className={`flex flex-col rounded-xl border p-5 transition-all ${
              activeTool === 'markdown'
                ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <FileCode className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                .md / .txt
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Markdown Review Pro
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 flex-1">
              Split editor, real-time preview, KaTeX formulas, Mermaid diagrams, in-place playground editing, and intact vector PDF generation.
            </p>

            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Split &amp; Playground Editor</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Multi-color highlighting &amp; comments</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>No-split-line PDF pagination</span>
              </li>
            </ul>

            <div className="space-y-2 mt-auto">
              <button
                onClick={() => {
                  onSelectTool('markdown');
                  onClose();
                }}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeTool === 'markdown'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{activeTool === 'markdown' ? 'Currently Active' : 'Switch to Markdown'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => mdInputRef.current?.click()}
                className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3 h-3" />
                <span>Open .md File</span>
              </button>
            </div>
          </div>

          {/* Tool 2: Word Document Reader & Playground */}
          <div 
            className={`flex flex-col rounded-xl border p-5 transition-all ${
              activeTool === 'word'
                ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                .docx
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Word to PDF &amp; Playground
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 flex-1">
              Convert Word documents into clean semantic reading format. Edit in playground, add highlights and comments, and export to publication PDF.
            </p>

            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Preserves tables, lists &amp; images</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>In-place playground editing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>1-Click publication PDF download</span>
              </li>
            </ul>

            <div className="space-y-2 mt-auto">
              <button
                onClick={() => docxInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open .docx File</span>
              </button>

              <button
                onClick={() => {
                  onLoadSampleWord();
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Try Sample Word Doc</span>
              </button>
            </div>
          </div>

          {/* Tool 3: PowerPoint to PDF & Playground */}
          <div 
            className={`flex flex-col rounded-xl border p-5 transition-all ${
              activeTool === 'pptx'
                ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-500'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Presentation className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                .pptx
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              PowerPoint to PDF &amp; Playground
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 flex-1">
              Read and review PowerPoint slides in document flow or interactive deck carousel. Edit slides in-place, annotate, and export to presentation PDF.
            </p>

            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 mb-5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Slide Deck &amp; Document Flow views</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>In-place slide text &amp; table editing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>1-Slide-per-page presentation PDF</span>
              </li>
            </ul>

            <div className="space-y-2 mt-auto">
              <button
                onClick={() => pptxInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open .pptx File</span>
              </button>

              <button
                onClick={() => {
                  onLoadSamplePptx();
                  onClose();
                }}
                className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Try Sample Presentation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Future / Coming Soon Banner */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Coming soon in next update:</span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
              Excel (.xlsx) to PDF
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              PDF to Markdown
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            All files processed 100% locally with high-capacity IndexedDB storage
          </span>
        </div>
      </div>
    </div>
  );
}
