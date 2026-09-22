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
  Folder,
  FolderOpen, 
  FolderPlus,
  PanelLeftClose,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Upload,
  Wrench,
  ListChecks,
  CheckSquare,
  Square
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

  // Folders
  folders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFileToFolder,

  // Batch deletion
  onBatchDeleteFiles,

  // Current active tool
  activeTool = 'markdown', // 'markdown' | 'word' | 'pptx'

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

  // Active category filter tab: 'all' | 'markdown' | 'word' | 'pptx'
  const [activeCategory, setActiveCategory] = useState('all');
  const [filter, setFilter] = useState('');
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_sections_collapsed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            markdown: !!parsed.markdown,
            word: !!parsed.word,
            pptx: !!parsed.pptx,
          };
        }
      }
    } catch {}
    return {
      markdown: false,
      word: false,
      pptx: false
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_sections_collapsed', JSON.stringify(collapsedSections));
    } catch (e) {
      console.warn('Failed to persist collapsed sections:', e);
    }
  }, [collapsedSections]);

  // Folder creation and organization state
  const [creatingFolderCategory, setCreatingFolderCategory] = useState(null); // 'markdown' | 'word' | 'pptx' | null
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef(null);

  const [collapsedFolders, setCollapsedFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_folders_collapsed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar_folders_collapsed', JSON.stringify(collapsedFolders));
    } catch (e) {
      console.warn('Failed to persist collapsed folders:', e);
    }
  }, [collapsedFolders]);

  // Clean up stale folder keys when folders are deleted or modified
  useEffect(() => {
    if (!folders || !Array.isArray(folders)) return;
    const currentFolderIds = new Set(folders.map(f => f.id));
    setCollapsedFolders(prev => {
      let changed = false;
      const next = {};
      for (const [id, val] of Object.entries(prev)) {
        if (currentFolderIds.has(id)) {
          next[id] = val;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [folders]);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const editFolderInputRef = useRef(null);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState(null); // { fileId, category }
  const [dragOverTarget, setDragOverTarget] = useState(null); // { type: 'folder' | 'root', id?: string, category: string }

  // Inline rename state: { category: 'markdown'|'word'|'pptx', id: string }
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef(null);

  // Batch selection state: { [`${category}:${id}`]: true }
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({});

  // Hidden file input refs
  const mdInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const pptxInputRef = useRef(null);
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

  const totalFiles = resolvedMdFiles.length + wordFiles.length + pptxFiles.length;

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const startRename = (e, category, id, currentName) => {
    e.stopPropagation();
    setEditingItem({ category, id });
    setEditName(currentName.replace(/\.(md|markdown|docx|pptx)$/i, ''));
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

  // Focus new folder input when folder creation starts
  useEffect(() => {
    if (creatingFolderCategory && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
      newFolderInputRef.current.select();
    }
  }, [creatingFolderCategory]);

  // Focus rename folder input when folder rename starts
  useEffect(() => {
    if (editingFolderId && editFolderInputRef.current) {
      editFolderInputRef.current.focus();
      editFolderInputRef.current.select();
    }
  }, [editingFolderId]);

  const handleStartCreateFolder = (category) => {
    setCollapsedSections(prev => ({ ...prev, [category]: false }));
    setCreatingFolderCategory(category);
    setNewFolderName('');
  };

  const handleSubmitCreateFolder = () => {
    if (!creatingFolderCategory) return;
    const cleanName = newFolderName.trim() || 'New Folder';
    const folderId = onCreateFolder?.(creatingFolderCategory, cleanName);
    setCreatingFolderCategory(null);
    setNewFolderName('');
    if (folderId) {
      setCollapsedFolders(prev => ({ ...prev, [folderId]: false }));
    }
  };

  const handleCancelCreateFolder = () => {
    setCreatingFolderCategory(null);
    setNewFolderName('');
  };

  const handleStartRenameFolder = (e, folder) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSubmitRenameFolder = () => {
    if (!editingFolderId) return;
    const clean = editingFolderName.trim();
    if (clean) {
      onRenameFolder?.(editingFolderId, clean);
    }
    setEditingFolderId(null);
  };

  const handleCancelRenameFolder = () => {
    setEditingFolderId(null);
  };

  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleDropOnFileOrFolder = (e, targetFolderId, targetCategory) => {
    e.preventDefault();
    e.stopPropagation();
    let item = draggedItem;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) item = JSON.parse(raw);
      } catch {}
    }
    if (!item) return;

    if (item.category !== targetCategory) {
      showInAppAlert(
        `Cannot move a ${item.category} file into a ${targetCategory} folder. Folders only accept documents of the matching format.`,
        'Category Mismatch',
        'warning'
      );
      return;
    }

    onMoveFileToFolder?.(item.fileId, targetFolderId, targetCategory);
    if (targetFolderId) {
      setCollapsedFolders(prev => ({ ...prev, [targetFolderId]: false }));
    }
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleUniversalImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.docx')) {
      onImportWordFile?.(file);
    } else if (lower.endsWith('.pptx')) {
      onImportPptxFile?.(file);
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
      showInAppAlert(`The file "${file.name}" is not supported. Please choose a .md, .docx, or .pptx file.`, 'Unsupported File', 'warning');
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

  // Batch selection helpers
  const getVisibleFiles = () => {
    const list = [];
    if (activeCategory === 'all' || activeCategory === 'markdown') {
      filteredMd.forEach(f => list.push({ category: 'markdown', id: f.id, name: f.name }));
    }
    if (activeCategory === 'all' || activeCategory === 'word') {
      filteredWord.forEach(f => list.push({ category: 'word', id: f.id, name: f.name }));
    }
    if (activeCategory === 'all' || activeCategory === 'pptx') {
      filteredPptx.forEach(f => list.push({ category: 'pptx', id: f.id, name: f.name }));
    }
    return list;
  };

  const visibleFiles = getVisibleFiles();
  const selectedCount = Object.keys(selectedFiles).length;
  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(f => selectedFiles[`${f.category}:${f.id}`]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      if (prev) setSelectedFiles({});
      return !prev;
    });
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFiles({});
  };

  const toggleSelectFile = (category, fileId) => {
    const key = `${category}:${fileId}`;
    setSelectedFiles(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedFiles(prev => {
        const next = { ...prev };
        visibleFiles.forEach(f => {
          delete next[`${f.category}:${f.id}`];
        });
        return next;
      });
    } else {
      // Select all visible
      setSelectedFiles(prev => {
        const next = { ...prev };
        visibleFiles.forEach(f => {
          next[`${f.category}:${f.id}`] = true;
        });
        return next;
      });
    }
  };

  const handleExecuteBatchDelete = () => {
    const markdownIds = [];
    const wordIds = [];
    const pptxIds = [];

    Object.keys(selectedFiles).forEach(key => {
      const [category, id] = key.split(':');
      if (category === 'markdown') markdownIds.push(id);
      else if (category === 'word') wordIds.push(id);
      else if (category === 'pptx') pptxIds.push(id);
    });

    if (markdownIds.length === 0 && wordIds.length === 0 && pptxIds.length === 0) return;

    onBatchDeleteFiles?.({ markdownIds, wordIds, pptxIds });
    setIsSelectionMode(false);
    setSelectedFiles({});
  };

  // Render a folder row with its nested files
  const renderFolderRow = (folder, folderFiles, renderCard, colorClass) => {
    const isCollapsed = !!collapsedFolders[folder.id];
    const isDragOver = dragOverTarget?.type === 'folder' && dragOverTarget?.id === folder.id;
    const isEditing = editingFolderId === folder.id;

    return (
      <div key={folder.id} className="space-y-0.5" data-testid={`folder-item-${folder.id}`}>
        <div
          onDragOver={(e) => {
            let itemCat = null;
            try {
              const raw = e.dataTransfer.getData('text/plain');
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.category) itemCat = parsed.category;
              }
            } catch {}

            if (!itemCat) {
              itemCat = draggedItem?.category;
            }

            if (itemCat === folder.category) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverTarget?.id !== folder.id) {
                setDragOverTarget({ type: 'folder', id: folder.id, category: folder.category });
              }
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverTarget?.id === folder.id) {
              setDragOverTarget(null);
            }
          }}
          onDrop={(e) => handleDropOnFileOrFolder(e, folder.id, folder.category)}
          onClick={() => toggleFolder(folder.id)}
          className={`group flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-all ${
            isDragOver
              ? 'ring-2 ring-blue-500 bg-blue-100/70 dark:bg-blue-950/60 shadow-xs'
              : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-colors"
              title={isCollapsed ? "Expand folder" : "Collapse folder"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {isCollapsed ? (
              <Folder className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
            ) : (
              <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
            )}

            {isEditing ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={editFolderInputRef}
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitRenameFolder();
                    if (e.key === 'Escape') handleCancelRenameFolder();
                  }}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSubmitRenameFolder}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold truncate flex-1">{folder.name}</span>
            )}

            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
              {folderFiles.length}
            </span>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleStartRenameFolder(e, folder)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                title="Rename Folder"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder?.(folder.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                title="Delete Folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="ml-3 pl-2.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5 py-0.5">
            {folderFiles.length === 0 ? (
              <div className="px-2 py-1 text-[10px] text-slate-400 italic">
                Folder is empty (drag files here)
              </div>
            ) : (
              folderFiles.map(file => renderCard(file, true))
            )}
          </div>
        )}
      </div>
    );
  };

  // Render inline folder creation form
  const renderInlineCreateFolder = (category, accentColor) => {
    if (creatingFolderCategory !== category) return null;
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-300/80 dark:border-slate-700/80 my-1 animate-in fade-in duration-150">
        <FolderPlus className={`w-3.5 h-3.5 shrink-0 ${accentColor}`} />
        <input
          ref={newFolderInputRef}
          type="text"
          placeholder="Folder name..."
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitCreateFolder();
            if (e.key === 'Escape') handleCancelCreateFolder();
          }}
          className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-xs text-slate-900 dark:text-white px-2 py-0.5 rounded-lg outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={handleSubmitCreateFolder}
          className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 rounded transition-colors"
          title="Create Folder"
          data-testid="submit-new-folder-btn"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancelCreateFolder}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 rounded transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Render root category dropzone
  const renderRootDropzone = (category) => {
    if (!draggedItem || draggedItem.category !== category) return null;
    const isDragOver = dragOverTarget?.type === 'root' && dragOverTarget?.category === category;
    return (
      <div
        onDragOver={(e) => {
          if (draggedItem && draggedItem.category === category) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverTarget?.type !== 'root' || dragOverTarget?.category !== category) {
              setDragOverTarget({ type: 'root', category });
            }
          }
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dragOverTarget?.type === 'root' && dragOverTarget?.category === category) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => handleDropOnFileOrFolder(e, null, category)}
        className={`border-2 border-dashed rounded-xl py-2 px-3 text-center text-[10px] font-medium transition-all my-1.5 cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20'
            : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-400'
        }`}
        data-testid={`root-dropzone-${category}`}
      >
        Drop here to move out of folder
      </div>
    );
  };

  // Render individual Markdown document item
  const renderMarkdownCard = (file, isNested = false) => {
    const isActive = activeTool === 'markdown' && file.id === resolvedActiveMdId;
    const isEditing = editingItem?.category === 'markdown' && editingItem?.id === file.id;
    const isDragging = draggedItem?.fileId === file.id;
    const isSelected = !!selectedFiles[`markdown:${file.id}`];

    return (
      <div
        key={file.id}
        role="button"
        tabIndex={0}
        draggable={!isEditing && !isSelectionMode}
        onDragStart={(e) => {
          if (isSelectionMode) return;
          e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: file.id, category: 'markdown' }));
          e.dataTransfer.effectAllowed = 'move';
          setDraggedItem({ fileId: file.id, category: 'markdown' });
        }}
        onDragEnd={() => {
          setDraggedItem(null);
          setDragOverTarget(null);
        }}
        data-testid={`document-item-${file.id}`}
        data-doc-category="markdown"
        data-in-folder={isNested ? 'true' : 'false'}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelectFile('markdown', file.id);
            return;
          }
          if (!isEditing) {
            resolvedSelectMd?.(file.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
            e.preventDefault();
            if (isSelectionMode) {
              toggleSelectFile('markdown', file.id);
              return;
            }
            resolvedSelectMd?.(file.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          isDragging ? 'opacity-40 ring-2 ring-blue-400' : ''
        } ${
          isSelected
            ? 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-medium border border-blue-400 dark:border-blue-700 shadow-2xs ring-2 ring-blue-500/30'
            : isActive
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium border border-blue-200 dark:border-blue-800 shadow-2xs ring-1 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          {isSelectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectFile('markdown', file.id);
              }}
              className="p-0.5 rounded text-blue-600 dark:text-blue-400 shrink-0"
              data-testid={`checkbox-markdown-${file.id}`}
              aria-label={isSelected ? `Deselect ${file.name}` : `Select ${file.name}`}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
              )}
            </button>
          ) : (
            <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500/70'}`} />
          )}
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
                  type="button"
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

        {!isEditing && !isSelectionMode && (
          <div className={`flex items-center gap-0.5 transition-opacity ${
            isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}>
            <button
              type="button"
              onClick={(e) => startRename(e, 'markdown', file.id, file.name)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              title="Rename"
              aria-label="Rename document"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
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
                type="button"
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
  };

  // Render individual Word document item
  const renderWordCard = (doc, isNested = false) => {
    const isActive = activeTool === 'word' && doc.id === activeWordId;
    const isEditing = editingItem?.category === 'word' && editingItem?.id === doc.id;
    const isDragging = draggedItem?.fileId === doc.id;
    const isSelected = !!selectedFiles[`word:${doc.id}`];

    return (
      <div
        key={doc.id}
        role="button"
        tabIndex={0}
        draggable={!isEditing && !isSelectionMode}
        onDragStart={(e) => {
          if (isSelectionMode) return;
          e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: doc.id, category: 'word' }));
          e.dataTransfer.effectAllowed = 'move';
          setDraggedItem({ fileId: doc.id, category: 'word' });
        }}
        onDragEnd={() => {
          setDraggedItem(null);
          setDragOverTarget(null);
        }}
        data-testid={`document-item-${doc.id}`}
        data-doc-category="word"
        data-in-folder={isNested ? 'true' : 'false'}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelectFile('word', doc.id);
            return;
          }
          if (!isEditing) {
            onSelectWordFile?.(doc.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
            e.preventDefault();
            if (isSelectionMode) {
              toggleSelectFile('word', doc.id);
              return;
            }
            onSelectWordFile?.(doc.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isDragging ? 'opacity-40 ring-2 ring-indigo-400' : ''
        } ${
          isSelected
            ? 'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100 font-medium border border-indigo-400 dark:border-indigo-700 shadow-2xs ring-2 ring-indigo-500/30'
            : isActive
              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-medium border border-indigo-200 dark:border-indigo-800 shadow-2xs ring-1 ring-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          {isSelectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectFile('word', doc.id);
              }}
              className="p-0.5 rounded text-indigo-600 dark:text-indigo-400 shrink-0"
              data-testid={`checkbox-word-${doc.id}`}
              aria-label={isSelected ? `Deselect ${doc.name}` : `Select ${doc.name}`}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
              )}
            </button>
          ) : (
            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500/70'}`} />
          )}
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
                  type="button"
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

        {!isEditing && !isSelectionMode && (
          <div className={`flex items-center gap-0.5 transition-opacity ${
            isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}>
            <button
              type="button"
              onClick={(e) => startRename(e, 'word', doc.id, doc.name)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              title="Rename"
              aria-label="Rename document"
            >
              <Pencil className="w-3 h-3" />
            </button>
            {onDeleteWordFile && (
              <button
                type="button"
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
  };

  // Render individual PowerPoint presentation item
  const renderPptxCard = (deck, isNested = false) => {
    const isActive = activeTool === 'pptx' && deck.id === activePptxId;
    const isEditing = editingItem?.category === 'pptx' && editingItem?.id === deck.id;
    const isDragging = draggedItem?.fileId === deck.id;
    const isSelected = !!selectedFiles[`pptx:${deck.id}`];

    return (
      <div
        key={deck.id}
        role="button"
        tabIndex={0}
        draggable={!isEditing && !isSelectionMode}
        onDragStart={(e) => {
          if (isSelectionMode) return;
          e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: deck.id, category: 'pptx' }));
          e.dataTransfer.effectAllowed = 'move';
          setDraggedItem({ fileId: deck.id, category: 'pptx' });
        }}
        onDragEnd={() => {
          setDraggedItem(null);
          setDragOverTarget(null);
        }}
        data-testid={`document-item-${deck.id}`}
        data-doc-category="pptx"
        data-in-folder={isNested ? 'true' : 'false'}
        onClick={() => {
          if (isSelectionMode) {
            toggleSelectFile('pptx', deck.id);
            return;
          }
          if (!isEditing) {
            onSelectPptxFile?.(deck.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
            e.preventDefault();
            if (isSelectionMode) {
              toggleSelectFile('pptx', deck.id);
              return;
            }
            onSelectPptxFile?.(deck.id);
            if (window.innerWidth < 1024) onClose?.();
          }
        }}
        className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          isDragging ? 'opacity-40 ring-2 ring-amber-400' : ''
        } ${
          isSelected
            ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 font-medium border border-amber-400 dark:border-amber-700 shadow-2xs ring-2 ring-amber-500/30'
            : isActive
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-medium border border-amber-200 dark:border-amber-800 shadow-2xs ring-1 ring-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          {isSelectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectFile('pptx', deck.id);
              }}
              className="p-0.5 rounded text-amber-600 dark:text-amber-400 shrink-0"
              data-testid={`checkbox-pptx-${deck.id}`}
              aria-label={isSelected ? `Deselect ${deck.name}` : `Select ${deck.name}`}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
              )}
            </button>
          ) : (
            <Presentation className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500/70'}`} />
          )}
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
                  type="button"
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

        {!isEditing && !isSelectionMode && (
          <div className={`flex items-center gap-0.5 transition-opacity ${
            isActive ? 'opacity-80 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}>
            <button
              type="button"
              onClick={(e) => startRename(e, 'pptx', deck.id, deck.name)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              title="Rename"
              aria-label="Rename presentation"
            >
              <Pencil className="w-3 h-3" />
            </button>
            {onDeletePptxFile && (
              <button
                type="button"
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
  };

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
          accept=".md,.markdown,.txt,.docx,.pptx" 
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

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSelectionMode}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${
                isSelectionMode
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isSelectionMode ? "Exit selection mode" : "Select files for batch deletion"}
              data-testid="toggle-selection-mode-btn"
            >
              <ListChecks className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse Sidebar (Cmd + B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-2 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
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

        {/* Selection Mode Action Bar */}
        {isSelectionMode && (
          <div className="mx-3 my-1.5 p-2.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 rounded-xl animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                data-testid="select-all-btn"
              >
                {allVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                )}
                <span>{allVisibleSelected ? 'Deselect All' : `Select All (${visibleFiles.length})`}</span>
              </button>

              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300" data-testid="selected-count-badge">
                {selectedCount} selected
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleExecuteBatchDelete}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                  selectedCount > 0
                    ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
                data-testid="batch-delete-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={cancelSelectionMode}
                className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                data-testid="cancel-selection-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Categorized Document Lists */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4 custom-scrollbar">
          
          {/* SECTION 1: MARKDOWN FILES */}
          {(activeCategory === 'all' || activeCategory === 'markdown') && (() => {
            const categoryFolders = folders.filter(f => f.category === 'markdown');
            const rootFiles = filteredMd.filter(f => !f.folderId || !categoryFolders.some(fol => fol.id === f.folderId));

            return (
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartCreateFolder('markdown')}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                      title="Create Markdown Folder"
                      aria-label="Add folder to Markdown"
                      data-testid="add-folder-markdown-btn"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
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
                </div>

                {!collapsedSections.markdown && (
                  <div className="space-y-0.5">
                    {renderInlineCreateFolder('markdown', 'text-blue-600 dark:text-blue-400')}
                    
                    {categoryFolders.map(folder => {
                      const folderFiles = filteredMd.filter(f => f.folderId === folder.id);
                      return renderFolderRow(folder, folderFiles, renderMarkdownCard, 'text-blue-500');
                    })}

                    {rootFiles.map(file => renderMarkdownCard(file, false))}

                    {categoryFolders.length === 0 && rootFiles.length === 0 && !creatingFolderCategory && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 italic">No markdown files</div>
                    )}

                    {renderRootDropzone('markdown')}
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION 2: WORD DOCUMENTS */}
          {(activeCategory === 'all' || activeCategory === 'word') && (() => {
            const categoryFolders = folders.filter(f => f.category === 'word');
            const rootFiles = filteredWord.filter(f => !f.folderId || !categoryFolders.some(fol => fol.id === f.folderId));

            return (
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartCreateFolder('word')}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                      title="Create Word Folder"
                      aria-label="Add folder to Word Docs"
                      data-testid="add-folder-word-btn"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => docxInputRef.current?.click()}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                      title="Import .docx File"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!collapsedSections.word && (
                  <div className="space-y-0.5">
                    {renderInlineCreateFolder('word', 'text-indigo-600 dark:text-indigo-400')}

                    {categoryFolders.map(folder => {
                      const folderFiles = filteredWord.filter(f => f.folderId === folder.id);
                      return renderFolderRow(folder, folderFiles, renderWordCard, 'text-indigo-500');
                    })}

                    {rootFiles.map(doc => renderWordCard(doc, false))}

                    {categoryFolders.length === 0 && rootFiles.length === 0 && !creatingFolderCategory && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 italic">No Word documents</div>
                    )}

                    {renderRootDropzone('word')}
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION 3: POWERPOINT PRESENTATIONS */}
          {(activeCategory === 'all' || activeCategory === 'pptx') && (() => {
            const categoryFolders = folders.filter(f => f.category === 'pptx');
            const rootFiles = filteredPptx.filter(f => !f.folderId || !categoryFolders.some(fol => fol.id === f.folderId));

            return (
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartCreateFolder('pptx')}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                      title="Create PowerPoint Folder"
                      aria-label="Add folder to PowerPoint"
                      data-testid="add-folder-pptx-btn"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => pptxInputRef.current?.click()}
                      className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                      title="Import .pptx File"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {!collapsedSections.pptx && (
                  <div className="space-y-0.5">
                    {renderInlineCreateFolder('pptx', 'text-amber-600 dark:text-amber-400')}

                    {categoryFolders.map(folder => {
                      const folderFiles = filteredPptx.filter(f => f.folderId === folder.id);
                      return renderFolderRow(folder, folderFiles, renderPptxCard, 'text-amber-500');
                    })}

                    {rootFiles.map(deck => renderPptxCard(deck, false))}

                    {categoryFolders.length === 0 && rootFiles.length === 0 && !creatingFolderCategory && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 italic">No PowerPoint decks</div>
                    )}

                    {renderRootDropzone('pptx')}
                  </div>
                )}
              </div>
            );
          })()}

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
