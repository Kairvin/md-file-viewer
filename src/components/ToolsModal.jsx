import React, { useRef, useEffect } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  FileCode, 
  FileText, 
  Presentation,
  Sparkles
} from 'lucide-react';

export default function ToolsModal({
  isOpen,
  onClose,
  activeTool = 'markdown',
  onSelectTool,
  onOpenDocxFile,
  onOpenPptxFile,
  onOpenMarkdownFile,
  onOpenPdfFile,
  onLoadSampleWord,
  onLoadSamplePptx,
  onLoadSamplePdf
}) {
  const docxInputRef = useRef(null);
  const pptxInputRef = useRef(null);
  const mdInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  // Editorial Sepia typography style
  const sepiaStyle = {
    fontFamily: "'Charter', 'Merriweather', 'Georgia', serif"
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto custom-scrollbar"
      onClick={handleBackdropClick}
    >
      {/* Outer Card with Warm Ambient Sepia Canvas */}
      <div 
        className="relative w-full max-w-7xl my-auto rounded-[2.25rem] sm:rounded-[2.75rem] bg-[#FBF8EE] text-[#2D261E] border border-[#E8DFCE] shadow-[0_35px_110px_-15px_rgba(45,38,30,0.32),0_0_0_1px_rgba(232,223,206,0.6)] overflow-hidden flex flex-col transition-all max-h-[95vh]"
        style={sepiaStyle}
        role="dialog"
        aria-modal="true"
      >
        {/* Soft Golden Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/25 blur-3xl rounded-full pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100/30 blur-3xl rounded-full pointer-events-none -z-0" />

        {/* Top Header Bar */}
        <div className="relative z-10 px-6 sm:px-10 pt-6 sm:pt-8 pb-4 flex items-center justify-between gap-4 border-b border-[#EAE3D2]/70">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#232528] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#F4D35E]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-widest text-[#232528] uppercase font-sans">
                DAILY USE TOOLS
              </span>
              <span className="text-[10px] text-[#796C5E] font-medium tracking-normal">
                Multi-Format Document Intelligence Suite
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 text-xs text-[#554D40]">
            <span className="hidden sm:inline-block px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] font-semibold text-[11px] text-[#63594C] shadow-2xs">
              4 Studios Ready
            </span>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#232528] hover:bg-black text-white flex items-center justify-center transition-colors shadow-xs ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Headline */}
        <div className="relative z-10 px-6 sm:px-10 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#232528] tracking-tight">
              Document Editors
            </h1>
            <p className="text-xs sm:text-sm text-[#796C5E] mt-1 font-medium">
              Choose a studio to review, edit in playground, annotate, or export to publication-grade vector PDF.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3.5 py-1.5 rounded-full bg-white/80 border border-[#E6DECB] text-[#554D40] text-xs font-semibold shadow-2xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#528A2C]" />
              <span>100% Client-Side Engine</span>
            </span>
          </div>
        </div>

        {/* Hidden file pickers */}
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
        <input 
          type="file" 
          ref={pdfInputRef} 
          accept=".pdf" 
          className="hidden" 
          onChange={(e) => handleFileChange(e, onOpenPdfFile)} 
        />

        {/* 4 Tool Cards Grid */}
        <div className="relative z-10 px-6 sm:px-10 pb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch overflow-y-auto custom-scrollbar">
          
          {/* CARD 1: .md editor */}
          {(() => {
            const isActive = activeTool === 'markdown';
            return (
              <div className={`relative rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between transition-all ${
                isActive 
                  ? 'bg-[#232528] text-white border-2 border-[#E5C858] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(229,200,88,0.4)] scale-[1.01] z-10' 
                  : 'bg-[#F4F1E8] text-[#2D261E] border border-[#E6DECB] shadow-xs hover:shadow-md'
              }`}>
                <div>
                  {/* Header: Category + Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      <FileCode className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                      isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                    }`}>
                      Markdown
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                    isActive 
                      ? 'bg-[#3A3C40] text-[#F4D35E] border-[#52555C]' 
                      : 'bg-[#ECE5D4] text-[#63594C] border-[#E0D6C1]'
                  }`}>
                    <span>{isActive ? 'Active' : 'Available'}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#F4D35E] animate-pulse' : 'bg-[#65973A]'}`} />
                  </div>
                </div>

                  <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight mb-2 ${
                    isActive ? 'text-white' : 'text-[#232528]'
                  }`}>
                    .md editor
                  </h3>

                  {/* Subtitle / Description */}
                  <p className={`text-xs leading-relaxed mb-4 min-h-[54px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    Full-featured Markdown review & editing with KaTeX math, Mermaid diagrams, live split view, and in-place review annotations.
                  </p>

                  {/* Dotted Divider */}
                  <div className={`border-t border-dashed my-4 ${
                    isActive ? 'border-[#3A3D42]' : 'border-[#DDD5C0]'
                  }`} />

                  {/* Feature Checklist */}
                  <div className={`space-y-3 mb-6 text-xs ${
                    isActive ? 'text-[#E1E4EA]' : 'text-[#4A4237]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Live split editor & preview</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>KaTeX math formulas & LaTeX</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Mermaid diagrams & flowcharts</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>GitHub Flavored Markdown</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Color highlights & comments</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Export to vector PDF & HTML</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="space-y-2 mt-auto">
                  <button
                    onClick={() => {
                      onSelectTool('markdown');
                      onClose();
                    }}
                    className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-white hover:bg-[#F4F1EA] text-[#1F2124] shadow-md'
                        : 'bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0]'
                    }`}
                  >
                    <span>{isActive ? 'Currently Active' : 'Go to Editor'}</span>
                  </button>
                  <button
                    onClick={() => mdInputRef.current?.click()}
                    className={`w-full text-center text-[11px] underline transition-colors ${
                      isActive ? 'text-[#9FA6B2] hover:text-white' : 'text-[#796C5E] hover:text-[#232528]'
                    }`}
                  >
                    Open .md File
                  </button>
                </div>
              </div>
            );
          })()}


          {/* CARD 2: .word editor */}
          {(() => {
            const isActive = activeTool === 'word';
            return (
              <div className={`relative rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between transition-all ${
                isActive 
                  ? 'bg-[#232528] text-white border-2 border-[#E5C858] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(229,200,88,0.4)] scale-[1.01] z-10' 
                  : 'bg-[#F4F1E8] text-[#2D261E] border border-[#E6DECB] shadow-xs hover:shadow-md'
              }`}>
                <div>
                  {/* Header: Category + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500/10 text-indigo-600'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                      }`}>
                        Word Studio
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                      isActive 
                        ? 'bg-[#3A3C40] text-[#F4D35E] border-[#52555C]' 
                        : 'bg-[#ECE5D4] text-[#63594C] border-[#E0D6C1]'
                    }`}>
                      <span>{isActive ? 'Active' : 'Available'}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#F4D35E] animate-pulse' : 'bg-[#65973A]'}`} />
                    </div>
                  </div>

                  <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight mb-2 ${
                    isActive ? 'text-white' : 'text-[#232528]'
                  }`}>
                    .word editor
                  </h3>

                  {/* Subtitle / Description */}
                  <p className={`text-xs leading-relaxed mb-4 min-h-[54px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    Client-side Word (.docx) ingestion with rich styled document pagination, interactive playground, and export to PDF.
                  </p>

                  {/* Dotted Divider */}
                  <div className={`border-t border-dashed my-4 ${
                    isActive ? 'border-[#3A3D42]' : 'border-[#DDD5C0]'
                  }`} />

                  {/* Feature Checklist */}
                  <div className={`space-y-3 mb-6 text-xs ${
                    isActive ? 'text-[#E1E4EA]' : 'text-[#4A4237]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>100% Client-side .docx parsing</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Interactive Playground text editing</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Color highlights & margin notes</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Threaded review comments</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>High-capacity IndexedDB cache</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Publication-grade vector PDF export</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="space-y-2 mt-auto">
                  <button
                    onClick={() => {
                      onSelectTool('word');
                      onClose();
                    }}
                    className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-white hover:bg-[#F4F1EA] text-[#1F2124] shadow-md'
                        : 'bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0]'
                    }`}
                  >
                    <span>{isActive ? 'Currently Active' : 'Go to Editor'}</span>
                  </button>
                  <div className={`flex items-center justify-center gap-2 text-[11px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    <button
                      onClick={() => docxInputRef.current?.click()}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Open .docx
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => {
                        onLoadSampleWord();
                        onClose();
                      }}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Sample Brief
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* CARD 3: .pptx editor */}
          {(() => {
            const isActive = activeTool === 'pptx';
            return (
              <div className={`relative rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between transition-all ${
                isActive 
                  ? 'bg-[#232528] text-white border-2 border-[#E5C858] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(229,200,88,0.4)] scale-[1.01] z-10' 
                  : 'bg-[#F4F1E8] text-[#2D261E] border border-[#E6DECB] shadow-xs hover:shadow-md'
              }`}>
                <div>
                  {/* Header: Category + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        <Presentation className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                      }`}>
                        PowerPoint
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                      isActive 
                        ? 'bg-[#3A3C40] text-[#F4D35E] border-[#52555C]' 
                        : 'bg-[#ECE5D4] text-[#63594C] border-[#E0D6C1]'
                    }`}>
                      <span>{isActive ? 'Active' : 'Available'}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#F4D35E] animate-pulse' : 'bg-[#65973A]'}`} />
                    </div>
                  </div>

                  <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight mb-2 ${
                    isActive ? 'text-white' : 'text-[#232528]'
                  }`}>
                    .pptx editor
                  </h3>

                  {/* Subtitle / Description */}
                  <p className={`text-xs leading-relaxed mb-4 min-h-[54px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    Complete PowerPoint slide deck presenter with carousel deck view, continuous flow mode, and zero text duplication.
                  </p>

                  {/* Dotted Divider */}
                  <div className={`border-t border-dashed my-4 ${
                    isActive ? 'border-[#3A3D42]' : 'border-[#DDD5C0]'
                  }`} />

                  {/* Feature Checklist */}
                  <div className={`space-y-3 mb-6 text-xs ${
                    isActive ? 'text-[#E1E4EA]' : 'text-[#4A4237]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Native theme colors & fonts</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Interactive Deck & Flow modes</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Inline slide text & bullet editing</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Zero-duplication OpenXML engine</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Slide thumbnail strip & navigation</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>1-slide-per-page landscape PDF</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="space-y-2 mt-auto">
                  <button
                    onClick={() => {
                      onSelectTool('pptx');
                      onClose();
                    }}
                    className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-white hover:bg-[#F4F1EA] text-[#1F2124] shadow-md'
                        : 'bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0]'
                    }`}
                  >
                    <span>{isActive ? 'Currently Active' : 'Go to Editor'}</span>
                  </button>
                  <div className={`flex items-center justify-center gap-2 text-[11px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    <button
                      onClick={() => pptxInputRef.current?.click()}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Open .pptx
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => {
                        onLoadSamplePptx();
                        onClose();
                      }}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Sample Deck
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* CARD 4: .pdf editor */}
          {(() => {
            const isActive = activeTool === 'pdf';
            return (
              <div className={`relative rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between transition-all ${
                isActive 
                  ? 'bg-[#232528] text-white border-2 border-[#E5C858] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(229,200,88,0.4)] scale-[1.01] z-10' 
                  : 'bg-[#F4F1E8] text-[#2D261E] border border-[#E6DECB] shadow-xs hover:shadow-md'
              }`}>
                <div>
                  {/* Header: Category + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-red-500/20 text-red-400' : 'bg-red-500/10 text-red-600'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                        isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                      }`}>
                        Vector PDF
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                      isActive 
                        ? 'bg-[#3A3C40] text-[#F4D35E] border-[#52555C]' 
                        : 'bg-[#ECE5D4] text-[#63594C] border-[#E0D6C1]'
                    }`}>
                      <span>{isActive ? 'Active' : 'Available'}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#F4D35E] animate-pulse' : 'bg-[#65973A]'}`} />
                    </div>
                  </div>

                  <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight mb-2 ${
                    isActive ? 'text-white' : 'text-[#232528]'
                  }`}>
                    .pdf editor
                  </h3>

                  {/* Subtitle / Description */}
                  <p className={`text-xs leading-relaxed mb-4 min-h-[54px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    High-fidelity vector PDF reader, inspector, and page navigator with 100% private client-side vector rendering.
                  </p>

                  {/* Dotted Divider */}
                  <div className={`border-t border-dashed my-4 ${
                    isActive ? 'border-[#3A3D42]' : 'border-[#DDD5C0]'
                  }`} />

                  {/* Feature Checklist */}
                  <div className={`space-y-3 mb-6 text-xs ${
                    isActive ? 'text-[#E1E4EA]' : 'text-[#4A4237]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Markdown-style reading paper</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Universal playground & annotations</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>In-place text editing & highlights</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Threaded comments & popovers</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>100% Private local rendering</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#65973A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Direct vector PDF download</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="space-y-2 mt-auto">
                  <button
                    onClick={() => {
                      onSelectTool('pdf');
                      onClose();
                    }}
                    className={`w-full py-3 px-5 rounded-full font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-white hover:bg-[#F4F1EA] text-[#1F2124] shadow-md'
                        : 'bg-white hover:bg-[#EFE9DA] text-[#232528] border border-[#DDD5C0]'
                    }`}
                  >
                    <span>{isActive ? 'Currently Active' : 'Go to Editor'}</span>
                  </button>
                  <div className={`flex items-center justify-center gap-2 text-[11px] ${
                    isActive ? 'text-[#9FA6B2]' : 'text-[#796C5E]'
                  }`}>
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Open .pdf
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => {
                        onLoadSamplePdf?.();
                        onClose();
                      }}
                      className={`underline transition-colors ${
                        isActive ? 'hover:text-white' : 'hover:text-[#232528]'
                      }`}
                    >
                      Sample Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Subtle Footer Note */}
        <div className="relative z-10 px-8 py-3.5 bg-[#F2ECE0]/60 border-t border-[#EAE3D2] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#6B5E4E]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#528A2C]" />
            <span>100% Client-Side Engine · IndexedDB Persistence · Zero Cloud Uploads</span>
          </div>
          <div className="flex items-center gap-2 text-[#857766]">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#DDD5C0] font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
