import React, { useState } from 'react';
import { 
  Highlighter, 
  Palette, 
  Underline as UnderlineIcon, 
  Strikethrough as StrikeIcon, 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  RotateCcw, 
  Undo2, 
  Redo2, 
  FileDown, 
  Sparkles, 
  ChevronDown,
  Info,
  Check
} from 'lucide-react';
import { HIGHLIGHT_COLORS, TEXT_COLORS } from './FloatingAnnotationBar';

export default function PlaygroundToolbar({
  onHighlight,
  onTextColor,
  onUnderline,
  onStrikethrough,
  onBold,
  onItalic,
  onClearFormat,
  onUndo,
  onRedo,
  onResetOriginal,
  onDownloadAnnotatedPdf,
  isExportingPdf,
  hasEdits
}) {
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a');
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  // Essential for contentEditable toolbar: prevent mousedown from stealing focus / collapsing selection
  const preventBlur = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const handleApplyHighlight = (color) => {
    setActiveHighlightColor(color);
    onHighlight(color);
  };

  return (
    <div 
      id="playground-toolbar"
      onMouseDown={(e) => {
        // Prevent clicking anywhere in the toolbar from losing text selection
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
          e.preventDefault();
        }
      }}
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-indigo-200 dark:border-indigo-950 px-3 sm:px-6 py-2 shadow-sm transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Mode Title & Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-500/20 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Playground & Annotator</span>
          </div>
          <span className="hidden md:inline-flex text-[11px] text-slate-400 items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Click text to edit · Select text to highlight & style</span>
          </span>
        </div>

        {/* Center: Formatting Controls */}
        <div className="flex items-center flex-wrap gap-1 sm:gap-2">
          {/* Highlighter Color Palette */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1 select-none hidden sm:inline">Highlight</span>
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={preventBlur(() => handleApplyHighlight(c.hex))}
                  style={{ backgroundColor: c.hex, borderColor: c.border }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 shadow-xs flex items-center justify-center ${
                    activeHighlightColor === c.hex ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 scale-105' : ''
                  }`}
                  title={`Highlight: ${c.name}`}
                />
              ))}
              <button
                onClick={preventBlur(() => handleApplyHighlight(null))}
                className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                title="Remove Highlight"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Text Color Picker */}
          <div className="relative">
            <button
              onClick={preventBlur(() => setShowColorDropdown(!showColorDropdown))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1"
              title="Font Color"
            >
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] hidden sm:inline font-medium">Text Color</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showColorDropdown && (
              <div 
                className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowColorDropdown(false)}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Choose Text Color</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={preventBlur(() => {
                        onTextColor(c.hex);
                        setShowColorDropdown(false);
                      })}
                      className="p-1.5 rounded-lg flex flex-col items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={c.name}
                    >
                      <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs" style={{ backgroundColor: c.hex }} />
                      <span className="text-[9px] text-slate-500 capitalize">{c.id}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={preventBlur(() => {
                    onTextColor(null);
                    setShowColorDropdown(false);
                  })}
                  className="w-full mt-1.5 text-center text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Reset to Default
                </button>
              </div>
            )}
          </div>

          {/* Underline & Strike */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={preventBlur(onUnderline)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Underline (Ctrl/Cmd + U)"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={preventBlur(onStrikethrough)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Strikethrough"
            >
              <StrikeIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={preventBlur(onBold)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Bold (Ctrl/Cmd + B)"
            >
              <BoldIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={preventBlur(onItalic)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Italic (Ctrl/Cmd + I)"
            >
              <ItalicIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* History Undo / Redo */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={preventBlur(onUndo)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Undo Edit (Ctrl/Cmd + Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={preventBlur(onRedo)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors text-xs"
              title="Redo Edit"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset to Original */}
          <button
            onClick={preventBlur(onResetOriginal)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors text-xs flex items-center gap-1"
            title="Revert document to original unmodified Markdown"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden lg:inline">Reset Original</span>
          </button>
        </div>

        {/* Right: Download Annotated PDF */}
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadAnnotatedPdf}
            disabled={isExportingPdf}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-500 via-pink-500 to-indigo-600 hover:from-red-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-pink-500/20 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            title="Download this annotated & edited document as a high-contrast PDF"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Download Annotated PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
