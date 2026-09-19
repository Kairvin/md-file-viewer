import React, { useRef } from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  FileText, 
  Download, 
  Printer, 
  FolderOpen, 
  Wrench, 
  Sparkles,
  ShieldCheck,
  Eye
} from 'lucide-react';

export default function PdfViewer({
  fileUrl,
  fileName = 'Document.pdf',
  showFileSidebar = false,
  onToggleSidebar,
  onOpenFile,
  onOpenTools
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenFile?.(file);
    }
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".pdf" 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {/* PDF Top Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Document branding & file info */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-xl transition-all flex items-center justify-center border ${
                showFileSidebar
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800'
              }`}
              title="Toggle File Sidebar (Cmd + B)"
            >
              {showFileSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 ring-1 ring-white/20 shrink-0">
            <FileText className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs tracking-tight">
                {fileName}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                .pdf
              </span>
              <span className="text-xs text-slate-400 hidden md:inline font-medium">
                · Vector PDF Viewer
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98]"
            title="Open Another PDF File"
          >
            <FolderOpen className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Open .pdf</span>
          </button>

          {onOpenTools && (
            <button
              onClick={onOpenTools}
              className="px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98]"
              title="Tools Hub (.md, .docx, .pptx, .pdf)"
            >
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Tools</span>
            </button>
          )}

          {fileUrl && (
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all active:scale-[0.98]"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 w-full h-full overflow-hidden relative bg-slate-200/70 dark:bg-slate-900">
        {fileUrl ? (
          <object 
            data={fileUrl} 
            type="application/pdf" 
            className="w-full h-full border-0 shadow-inner"
          >
            <iframe 
              src={fileUrl} 
              className="w-full h-full border-0" 
              title={fileName}
            />
          </object>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No PDF Loaded
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Choose a local PDF file from your device to view with high-fidelity vector rendering.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Choose PDF File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
