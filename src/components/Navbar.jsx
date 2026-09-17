import React, { useState, useRef } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Plus, 
  Download, 
  Maximize2, 
  Minimize2, 
  Columns, 
  Eye, 
  Edit3, 
  ListTree, 
  Sun, 
  Moon, 
  Palette, 
  Printer, 
  FileDown,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export default function Navbar({
  fileName,
  setFileName,
  viewMode,
  setViewMode,
  theme,
  setTheme,
  isFullscreen,
  toggleFullscreen,
  showToc,
  setShowToc,
  columnWidth,
  setColumnWidth,
  onNewFile,
  onOpenFile,
  onLoadSample,
  onPrintPdf,
  onDirectPdfDownload,
  onExportMarkdown,
  onExportHtml,
  stats,
  isExportingPdf
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showWidthMenu, setShowWidthMenu] = useState(false);
  const fileInputRef = useRef(null);

  const widthOptions = [
    { id: '95%', label: '95% Width', tag: 'Default' },
    { id: '100%', label: '100% Full Width', tag: 'Max' },
    { id: 'wide', label: '88% Wide', tag: '' },
    { id: 'standard', label: 'Centered Standard', tag: '' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onOpenFile(file.name, event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const themes = [
    { id: 'modern', name: 'Modern Light', icon: '☀️' },
    { id: 'github-dark', name: 'GitHub Dark', icon: '🌙' },
    { id: 'sepia', name: 'Editorial Sepia', icon: '📜' },
    { id: 'obsidian', name: 'Midnight Obsidian', icon: '🌌' },
  ];

  return (
    <header id="navbar" className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between transition-colors">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".md,.markdown,.txt" 
        className="hidden" 
      />

      {/* Left: Branding & File Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="font-semibold text-sm bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-colors max-w-[200px] truncate"
              title="Click to rename"
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hidden md:inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              <span>{stats.words} words</span>
              <span>·</span>
              <span>{stats.readTime} min read</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center: File actions & View Mode Toggles */}
      <div className="flex items-center gap-1.5">
        {/* Document Actions */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mr-2">
          <button
            onClick={onNewFile}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
            title="New Document"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">New</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
            title="Open Local Markdown File"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden lg:inline">Open</span>
          </button>

          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
              title="Starter Templates"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplatesMenu && (
              <div 
                className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowTemplatesMenu(false)}
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Templates</div>
                <button onClick={() => onLoadSample('showcase')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between">
                  <span>Full Showcase Spec</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 rounded">Popular</span>
                </button>
                <button onClick={() => onLoadSample('tech')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Technical Architecture
                </button>
                <button onClick={() => onLoadSample('notes')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                  Meeting Notes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View mode segmented switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'preview' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Preview Only"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'split' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Split View (Editor + Live Preview)"
          >
            <Columns className="w-4 h-4" />
            <span className="hidden sm:inline">Split</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'editor' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Editor Only"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Editor</span>
          </button>
        </div>
      </div>

      {/* Right: TOC, Theme, Fullscreen & PDF Export */}
      <div className="flex items-center gap-2">
        {/* Table of Contents Toggle */}
        <button
          onClick={() => setShowToc(!showToc)}
          className={`p-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5 ${
            showToc 
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
          title="Toggle Outline / Table of Contents"
        >
          <ListTree className="w-4 h-4" />
          <span className="hidden xl:inline">Outline</span>
        </button>

        {/* Theme Picker */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all text-xs font-medium flex items-center gap-1"
            title="Change Visual Theme"
          >
            <Palette className="w-4 h-4 text-indigo-500" />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {showThemeMenu && (
            <div 
              className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50"
              onClick={() => setShowThemeMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Themes</div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    theme === t.id ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </span>
                  {theme === t.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Width Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWidthMenu(!showWidthMenu)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all text-xs font-medium flex items-center gap-1.5"
            title="Preview Width (95% / 100% / Standard)"
          >
            <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">{columnWidth}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {showWidthMenu && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowWidthMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reading Width</div>
              {widthOptions.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setColumnWidth(w.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    columnWidth === w.id ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{w.label}</span>
                  {w.tag && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                      {w.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5 ${
            isFullscreen 
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
          title={isFullscreen ? "Exit Full Screen (Esc or F)" : "Full Screen Zen Mode (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="hidden lg:inline">{isFullscreen ? "Exit Zen" : "Full Screen"}</span>
        </button>

        {/* PDF & Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExportingPdf}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Download & Export Options"
          >
            {isExportingPdf ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {showExportMenu && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowExportMenu(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">PDF Options</div>
              <button
                onClick={onDirectPdfDownload}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-2.5 transition-colors"
              >
                <div className="p-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <FileDown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">Download PDF File</div>
                  <div className="text-[10px] text-slate-400">Direct one-click .pdf download</div>
                </div>
              </button>

              <button
                onClick={onPrintPdf}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-2.5 transition-colors"
              >
                <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">Vector Print to PDF</div>
                  <div className="text-[10px] text-slate-400">High-res system print dialog</div>
                </div>
              </button>

              <div className="my-1.5 border-t border-slate-200 dark:border-slate-800" />
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Other Formats</div>

              <button
                onClick={onExportMarkdown}
                className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Download Markdown (.md)</span>
              </button>

              <button
                onClick={onExportHtml}
                className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Standalone HTML</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
