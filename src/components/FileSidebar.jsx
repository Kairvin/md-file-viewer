import React, { useState, useEffect, useRef } from 'react';
import { 
  Files, 
  FileText, 
  FileCode,
  Presentation,
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Download, 
  FolderOpen, 
  PanelLeftClose,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Upload,
  Wrench
} from 'lucide-react';
import { downloadMarkdown } from '../utils/pdfExport';
import { showInAppAlert } from '../utils/alerts';

export default function FileSidebar({
  // Markdown documents
  markdownFiles = [],
  activeMarkdownId,
  onSelectMarkdownFile,
  onNewMarkdownFile,
  onRenameMarkdownFile,
  onDeleteMarkdownFile,
  onImportMarkdownFile,

  // Word documents
  wordFiles = [],
  activeWordId,
  onSelectWordFile,
  onImportWordFile,
  onDeleteWordFile,
  onRenameWordFile,

  // PowerPoint presentations
  pptxFiles = [],
  activePptxId,
  onSelectPptxFile,
  onImportPptxFile,
  onDeletePptxFile,
  onRenamePptxFile,

  // PDF documents
  pdfFiles = [],
  activePdfId,
  onSelectPdfFile,
  onOpenPdfFile,
  onDeletePdfFile,
  onRenamePdfFile,

  // Current active tool
  activeTool = 'markdown', // 'markdown' | 'word' | 'pptx' | 'pdf'

  // Backward compatibility fallback props
  files = [],
  activeFileId,
  onSelectFile,
  onNewFile,
  onRenameFile,
  onDeleteFile,
  onImportFile,

  // General controls
  onClose,
  onOpenTools
}) {
  // Normalize markdown files if using legacy props
  const resolvedMdFiles = markdownFiles.length > 0 ? markdownFiles : files;
  const resolvedActiveMdId = activeMarkdownId || activeFileId;
  const resolvedSelectMd = onSelectMarkdownFile || onSelectFile;
  const resolvedNewMd = onNewMarkdownFile || onNewFile;
  const resolvedRenameMd = onRenameMarkdownFile || onRenameFile;
  const resolvedDeleteMd = onDeleteMarkdownFile || onDeleteFile;
  const resolvedImportMd = onImportMarkdownFile || onImportFile;

  // Active category filter tab: 'all' | 'markdown' | 'word' | 'pptx' | 'pdf'
  const [activeCategory, setActiveCategory] = useState('all');
  const [filter, setFilter] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({
    markdown: false,
    word: false,
    pptx: false,
    pdf: false
  });

  // Inline rename state: { category: 'markdown'|'word'|'pptx', id: string }
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef(null);

  // Hidden file input refs
  const mdInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const pptxInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const anyInputRef = useRef(null);

  // Close on Escape on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingItem && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItem]);

  const totalFiles = resolvedMdFiles.length + wordFiles.length + pptxFiles.length + pdfFiles.length;

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const startRename = (e, category, id, currentName) => {
    e.stopPropagation();
    setEditingItem({ category, id });
    setEditName(currentName.replace(/\.(md|markdown|docx|pptx|pdf)$/i, ''));
  };

  const submitRename = () => {
    if (!editingItem) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      showInAppAlert('Document name cannot be empty. Please enter a valid name.', 'Invalid Name', 'warning');
      setEditingItem(null);
      return;
    }

    if (editingItem.category === 'markdown') {
      resolvedRenameMd?.(editingItem.id, `${cleanName}.md`);
    } else if (editingItem.category === 'word') {
      onRenameWordFile?.(editingItem.id, `${cleanName}.docx`);
    } else if (editingItem.category === 'pptx') {
      onRenamePptxFile?.(editingItem.id, `${cleanName}.pptx`);
    } else if (editingItem.category === 'pdf') {
      onRenamePdfFile?.(editingItem.id, `${cleanName}.pdf`);
    }

    setEditingItem(null);
  };

  const handleKeyDownRename = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingItem(null);
    }
  };

  const handleUniversalImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.docx')) {
      onImportWordFile?.(file);
    } else if (lower.endsWith('.pptx')) {
      onImportPptxFile?.(file);
    } else if (lower.endsWith('.pdf')) {
      onOpenPdfFile?.(file);
    } else if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolvedImportMd?.(file.name, event.target.result);
      };
      reader.onerror = () => {
        showInAppAlert(`Failed to read "${file.name}".`, 'File Read Error', 'danger');
      };
      reader.readAsText(file);
    } else {
      showInAppAlert(`The file "${file.name}" is not supported. Please choose a .md, .docx, .pptx, or .pdf file.`, 'Unsupported File', 'warning');
    }
    e.target.value = '';
  };

  const formatWordCount = (content = '') => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return `${words.toLocaleString()} words`;
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter lists by search query
  const query = filter.toLowerCase().trim();
  const filteredMd = resolvedMdFiles.filter(f => !query || f.name.toLowerCase().includes(query));
  const filteredWord = wordFiles.filter(f => !query || f.name.toLowerCase().includes(query));
  const filteredPptx = pptxFiles.filter(f => !query || f.name.toLowerCase().includes(query));
  const filteredPdf = pdfFiles.filter(f => !query || f.name.toLowerCase().includes(query));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside 
        id="file-sidebar"
        className="fixed lg:static top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 xl:w-72 shrink-0 border-r border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col h-full shadow-2xl lg:shadow-none transition-all duration-200 select-none animate-in slide-in-from-left-full lg:animate-none"
      >
        {/* Hidden inputs */}
        <input 
          type="file" 
          ref={anyInputRef} 
          onChange={handleUniversalImport} 
          accept=".md,.markdown,.txt,.docx,.pptx,.pdf" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={docxInputRef} 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportWordFile?.(f);
            e.target.value = '';
          }} 
          accept=".docx" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={pptxInputRef} 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportPptxFile?.(f);
            e.target.value = '';
          }} 
          accept=".pptx" 
          className="hidden" 
        />
        <input 
          type="file" 
          ref={pdfInputRef} 
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onOpenPdfFile?.(f);
            e.target.value = '';
          }} 
          accept=".pdf" 
          className="hidden" 
        />

        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Files className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white">Workspace Files</span>
            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {totalFiles}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar (Cmd + B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-2 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60">
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              data-testid="category-tab-all"
              onClick={() => setActiveCategory('all')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all text-center ${
                activeCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              data-testid="category-tab-markdown"
              onClick={() => setActiveCategory('markdown')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-0.5 ${
                activeCategory === 'markdown'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Markdown Files"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              .md
            </button>
            <button
              data-testid="category-tab-word"
              onClick={() => setActiveCategory('word')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-0.5 ${
                activeCategory === 'word'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Word Documents"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              .docx
            </button>
            <button
              data-testid="category-tab-pptx"
              onClick={() => setActiveCategory('pptx')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-0.5 ${
                activeCategory === 'pptx'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="PowerPoint Presentations"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              .pptx
            </button>
            <button
              data-testid="category-tab-pdf"
              onClick={() => setActiveCategory('pdf')}
              className={`py-1 text-[10px] font-bold rounded-lg transition-all text-center flex items-center justify-center gap-0.5 ${
                activeCategory === 'pdf'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="PDF Documents"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              .pdf
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search across formats..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none border border-transparent focus:border-slate-300 dark:focus:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
            />
            {filter && (
              <button 
                onClick={() => setFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Categorized Document Lists */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4 custom-scrollbar">
          
          {/* SECTION 1: MARKDOWN FILES */}
          {(activeCategory === 'all' || activeCategory === 'markdown') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <button 
                  onClick={() => toggleSection('markdown')}
                  className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {collapsedSections.markdown ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-extrabold">
                    <FileCode className="w-3.5 h-3.5" />
                    Markdown
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">
                    ({filteredMd.length})
                  </span>
                </button>

                <button
                  onClick={() => {
                    resolvedNewMd?.();
                    if (window.innerWidth < 1024) onClose?.();
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                  title="New .md Document"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {!collapsedSections.markdown && (
                <div className="space-y-0.5">
                  {filteredMd.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-slate-400 italic">No markdown files</div>
                  ) : (
                    filteredMd.map((file) => {
                      const isActive = activeTool === 'markdown' && file.id === resolvedActiveMdId;
                      const isEditing = editingItem?.category === 'markdown' && editingItem?.id === file.id;

                      return (
                        <div
                          key={file.id}
                          role="button"
                          tabIndex={0}
                          data-testid={`document-item-${file.id}`}
                          data-doc-category="markdown"
                          onClick={() => {
                            if (!isEditing) {
                              resolvedSelectMd?.(file.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
                              e.preventDefault();
                              resolvedSelectMd?.(file.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium border border-blue-200 dark:border-blue-800 shadow-2xs ring-1 ring-blue-500/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                            <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500/70'}`} />
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={handleKeyDownRename}
                                    className="w-full text-xs bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={submitRename}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs truncate font-medium">{file.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                                    <span>{formatWordCount(file.content)}</span>
                                    <span>·</span>
                                    <span>{formatRelativeTime(file.updatedAt)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className={`flex items-center gap-0.5 transition-opacity ${
                              isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                            }`}>
                              <button
                                onClick={(e) => startRename(e, 'markdown', file.id, file.name)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                title="Rename"
                                aria-label="Rename document"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadMarkdown(file.content, file.name);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                title="Download"
                                aria-label="Download document"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              {resolvedDeleteMd && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resolvedDeleteMd(file.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete Document"
                                  aria-label="Delete document"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: WORD DOCUMENTS */}
          {(activeCategory === 'all' || activeCategory === 'word') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <button 
                  onClick={() => toggleSection('word')}
                  className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {collapsedSections.word ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-extrabold">
                    <FileText className="w-3.5 h-3.5" />
                    Word Docs
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">
                    ({filteredWord.length})
                  </span>
                </button>

                <button
                  onClick={() => docxInputRef.current?.click()}
                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                  title="Import .docx File"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>

              {!collapsedSections.word && (
                <div className="space-y-0.5">
                  {filteredWord.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-slate-400 italic">No Word documents</div>
                  ) : (
                    filteredWord.map((doc) => {
                      const isActive = activeTool === 'word' && doc.id === activeWordId;
                      const isEditing = editingItem?.category === 'word' && editingItem?.id === doc.id;

                      return (
                        <div
                          key={doc.id}
                          role="button"
                          tabIndex={0}
                          data-testid={`document-item-${doc.id}`}
                          data-doc-category="word"
                          onClick={() => {
                            if (!isEditing) {
                              onSelectWordFile?.(doc.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
                              e.preventDefault();
                              onSelectWordFile?.(doc.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-medium border border-indigo-200 dark:border-indigo-800 shadow-2xs ring-1 ring-indigo-500/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500/70'}`} />
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={handleKeyDownRename}
                                    className="w-full text-xs bg-white dark:bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={submitRename}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs truncate font-medium">{doc.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                                    <span>.docx</span>
                                    <span>·</span>
                                    <span>{formatRelativeTime(doc.updatedAt)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className={`flex items-center gap-0.5 transition-opacity ${
                              isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                            }`}>
                              <button
                                onClick={(e) => startRename(e, 'word', doc.id, doc.name)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                title="Rename"
                                aria-label="Rename document"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              {onDeleteWordFile && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteWordFile(doc.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete Document"
                                  aria-label="Delete document"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: POWERPOINT PRESENTATIONS */}
          {(activeCategory === 'all' || activeCategory === 'pptx') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <button 
                  onClick={() => toggleSection('pptx')}
                  className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {collapsedSections.pptx ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold">
                    <Presentation className="w-3.5 h-3.5" />
                    PowerPoint Decks
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-normal">
                    ({filteredPptx.length})
                  </span>
                </button>

                <button
                  onClick={() => pptxInputRef.current?.click()}
                  className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                  title="Import .pptx File"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>

              {!collapsedSections.pptx && (
                <div className="space-y-0.5">
                  {filteredPptx.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-slate-400 italic">No PowerPoint decks</div>
                  ) : (
                    filteredPptx.map((deck) => {
                      const isActive = activeTool === 'pptx' && deck.id === activePptxId;
                      const isEditing = editingItem?.category === 'pptx' && editingItem?.id === deck.id;

                      return (
                        <div
                          key={deck.id}
                          role="button"
                          tabIndex={0}
                          data-testid={`document-item-${deck.id}`}
                          data-doc-category="pptx"
                          onClick={() => {
                            if (!isEditing) {
                              onSelectPptxFile?.(deck.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
                              e.preventDefault();
                              onSelectPptxFile?.(deck.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            isActive
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-medium border border-amber-200 dark:border-amber-800 shadow-2xs ring-1 ring-amber-500/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                            <Presentation className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500/70'}`} />
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={handleKeyDownRename}
                                    className="w-full text-xs bg-white dark:bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={submitRename}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs truncate font-medium">{deck.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                                    <span>{deck.slideCount || '?'} Slides</span>
                                    <span>·</span>
                                    <span>{formatRelativeTime(deck.updatedAt)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className={`flex items-center gap-0.5 transition-opacity ${
                              isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                            }`}>
                              <button
                                onClick={(e) => startRename(e, 'pptx', deck.id, deck.name)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                title="Rename"
                                aria-label="Rename presentation"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              {onDeletePptxFile && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePptxFile(deck.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Delete Presentation"
                                  aria-label="Delete presentation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: PDF DOCUMENTS */}
          {(activeCategory === 'all' || activeCategory === 'pdf') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-slate-400 dark:text-slate-500">
                <button
                  onClick={() => toggleSection('pdf')}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {collapsedSections.pdf ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span className="text-red-600 dark:text-red-400 font-extrabold">PDF</span>
                  <span>({filteredPdf.length})</span>
                </button>

                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-red-600 transition-colors"
                  title="Open PDF File"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {!collapsedSections.pdf && (
                <div className="space-y-0.5">
                  {filteredPdf.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                      {filter ? 'No matching PDF files' : 'No PDF files opened yet'}
                    </div>
                  ) : (
                    filteredPdf.map(file => {
                      const isPdfActive = activeTool === 'pdf' && (activePdfId === file.id || activePdfId === file.name);
                      const isEditing = editingItem?.category === 'pdf' && editingItem?.id === file.id;

                      return (
                        <div
                          key={file.id}
                          role="button"
                          tabIndex={0}
                          data-testid={`document-item-${file.id}`}
                          data-doc-category="pdf"
                          onClick={() => {
                            if (!isEditing) {
                              onSelectPdfFile?.(file.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
                              e.preventDefault();
                              onSelectPdfFile?.(file.id);
                              if (window.innerWidth < 1024) onClose?.();
                            }
                          }}
                          className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                            isPdfActive
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 font-medium border border-red-200 dark:border-red-800 shadow-2xs ring-1 ring-red-500/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                            <FileText className={`w-3.5 h-3.5 shrink-0 ${isPdfActive ? 'text-red-600 dark:text-red-400' : 'text-red-500/70'}`} />
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={handleKeyDownRename}
                                    className="w-full text-xs bg-white dark:bg-slate-900 border border-red-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={submitRename}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs truncate font-medium">{file.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                                    {file.numPages && <span>{file.numPages} {file.numPages === 1 ? 'Page' : 'Pages'} · </span>}
                                    <span>{formatRelativeTime(file.updatedAt)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!isEditing && (
                            <div className={`flex items-center gap-0.5 transition-opacity ${
                              isPdfActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                            }`}>
                              {onRenamePdfFile && (
                                <button
                                  onClick={(e) => startRename(e, 'pdf', file.id, file.name)}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                                  title="Rename"
                                  aria-label="Rename PDF"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {onDeletePdfFile && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePdfFile(file.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  title="Remove PDF"
                                  aria-label="Remove PDF"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col gap-2">
          <button
            onClick={() => anyInputRef.current?.click()}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-[0.98]"
            title="Import any file (.md, .docx, .pptx) from your computer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Open from Computer</span>
          </button>

          {onOpenTools && (
            <button
              onClick={() => {
                onOpenTools();
                if (window.innerWidth < 1024) onClose?.();
              }}
              className="w-full py-1.5 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Wrench className="w-3 h-3" />
              <span>Tools Hub</span>
            </button>
          )}

          <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
            100% Client-Side · IndexedDB Persistence
          </div>
        </div>
      </aside>
    </>
  );
}
