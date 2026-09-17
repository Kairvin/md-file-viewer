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
  ChevronDown,
  Menu,
  X,
  AlignJustify
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    <header id="navbar" className="h-14 sm:h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-2 sm:px-4 flex items-center justify-between transition-colors">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".md,.markdown,.txt" 
        className="hidden" 
      />

      {/* Left: Branding & File Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <input 
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="font-semibold text-xs sm:text-sm bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-colors max-w-[110px] sm:max-w-[160px] md:max-w-[200px] truncate"
              title="Click to rename"
            />
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden lg:inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
              <span>{stats.words} words</span>
              <span>·</span>
              <span>{stats.readTime} min read</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center: View Mode segmented switch */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Desktop Document Actions */}
        <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mr-1.5">
          <button
            onClick={onNewFile}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
            title="New Document"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
            title="Open Local Markdown File"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>

          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all text-xs font-medium flex items-center gap-1"
              title="Starter Templates"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {showTemplatesMenu && (
              <div 
                className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50"
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

        {/* View Mode Segmented Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'preview' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Preview Mode"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          
          {/* Split view: visible on tablet/desktop (>= 768px) */}
          <button
            onClick={() => setViewMode('split')}
            className={`hidden md:flex p-1.5 rounded-lg text-xs font-medium items-center gap-1 transition-all ${
              viewMode === 'split' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Split View"
          >
            <Columns className="w-4 h-4" />
            <span>Split</span>
          </button>

          <button
            onClick={() => setViewMode('editor')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'editor' 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Editor Mode"
          >
            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Editor</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Table of Contents Toggle */}
        <button
          onClick={() => setShowToc(!showToc)}
          className={`p-1.5 sm:p-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5 ${
            showToc 
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
          title="Toggle Table of Contents"
        >
          <ListTree className="w-4 h-4" />
          <span className="hidden 2xl:inline">Outline</span>
        </button>

        {/* Desktop Theme Picker */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all text-xs font-medium flex items-center gap-1"
            title="Visual Theme"
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

        {/* Desktop Width Selector */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowWidthMenu(!showWidthMenu)}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all text-xs font-medium flex items-center gap-1.5"
            title="Preview Width"
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

        {/* Desktop Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`hidden sm:flex p-2 rounded-xl border transition-all text-xs font-medium items-center gap-1.5 ${
            isFullscreen 
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
          title={isFullscreen ? "Exit Full Screen" : "Full Screen Zen Mode"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="hidden xl:inline">{isFullscreen ? "Exit Zen" : "Full Screen"}</span>
        </button>

        {/* PDF & Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExportingPdf}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 transition-all text-xs font-semibold flex items-center gap-1 active:scale-95 disabled:opacity-50"
            title="Download & Export Options"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span>Export</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
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
                  <div className="text-[10px] text-slate-400">High-res vector print dialog</div>
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

        {/* Mobile & Tablet Overflow Menu Button */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="lg:hidden p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="More options"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Drawer / Slide-Over Modal */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-full duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Preferences & Actions</span>
                </span>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Actions */}
              <div className="mt-4 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Document</div>
                <button
                  onClick={() => { onNewFile(); setShowMobileMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-2.5 text-slate-700 dark:text-slate-200"
                >
                  <Plus className="w-4 h-4 text-blue-500" />
                  <span>New Blank File</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-2.5 text-slate-700 dark:text-slate-200"
                >
                  <FolderOpen className="w-4 h-4 text-indigo-500" />
                  <span>Open Local Markdown File</span>
                </button>
                <button
                  onClick={() => { toggleFullscreen(); setShowMobileMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-2.5 text-slate-700 dark:text-slate-200"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-500" /> : <Maximize2 className="w-4 h-4 text-amber-500" />}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen Zen Mode"}</span>
                </button>
              </div>

              {/* Theme Picker */}
              <div className="mt-5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Theme Preset</div>
                <div className="grid grid-cols-2 gap-2">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setShowMobileMenu(false); }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        theme === t.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reading Width */}
              <div className="mt-5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Reading Width</div>
                <div className="grid grid-cols-2 gap-2">
                  {widthOptions.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => { setColumnWidth(w.id); setShowMobileMenu(false); }}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                        columnWidth === w.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="mt-5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">Templates</div>
                <div className="space-y-1">
                  <button
                    onClick={() => { onLoadSample('showcase'); setShowMobileMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <span>Full Feature Showcase</span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">Popular</span>
                  </button>
                  <button
                    onClick={() => { onLoadSample('tech'); setShowMobileMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Technical Architecture
                  </button>
                  <button
                    onClick={() => { onLoadSample('notes'); setShowMobileMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Meeting Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{stats.words} words · {stats.readTime} min read</span>
              <span>v1.0</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
