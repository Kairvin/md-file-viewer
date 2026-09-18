import React, { useState, useEffect, useRef } from 'react';
import { 
  Files, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Download, 
  FolderOpen, 
  PanelLeftClose,
  FilePlus,
  Sparkles
} from 'lucide-react';
import { downloadMarkdown } from '../utils/pdfExport';
import { showInAppAlert } from '../utils/alerts';

export default function FileSidebar({
  files = [],
  activeFileId,
  onSelectFile,
  onNewFile,
  onRenameFile,
  onDeleteFile,
  onImportFile,
  onClose
}) {
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close on Escape on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(filter.toLowerCase())
  );

  const startRename = (e, file) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditName(file.name.replace(/\.md$/, ''));
  };

  const submitRename = (fileId) => {
    if (editName.trim()) {
      onRenameFile(fileId, editName.trim());
    } else {
      showInAppAlert('Document name cannot be empty. Please enter a valid name.', 'Invalid Name', 'warning');
    }
    setEditingId(null);
  };

  const handleKeyDownRename = (e, fileId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename(fileId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isText = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt') || (file.type && file.type.startsWith('text/'));
      if (!isText) {
        showInAppAlert(`The file "${file.name}" is not a supported Markdown or text document. Please import a .md, .markdown, or .txt file.`, 'Unsupported File', 'warning');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onImportFile(file.name, event.target.result);
      };
      reader.onerror = () => {
        showInAppAlert(`Failed to read "${file.name}". Please ensure the file is accessible and try again.`, 'File Read Error', 'danger');
      };
      reader.readAsText(file);
    }
    // reset input
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

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar: Slide-in on mobile, Left pane on desktop */}
      <aside 
        id="file-sidebar"
        className="fixed lg:static top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 xl:w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 flex flex-col h-full shadow-2xl lg:shadow-none transition-all duration-200 select-none animate-in slide-in-from-left-full lg:animate-none"
      >
        {/* Hidden File Input for Importing */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport} 
          accept=".md,.markdown,.txt" 
          className="hidden" 
        />

        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Files className="w-4 h-4 text-blue-500" />
            <span>Documents</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {files.length}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar (Cmd + B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Primary CTA: New .md File */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => {
              onNewFile();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98]"
            title="Create a new Markdown file"
          >
            <Plus className="w-4 h-4" />
            <span>New .md File</span>
          </button>
        </div>

        {/* Search / Filter (shown if > 3 files) */}
        {files.length > 3 && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg outline-none border border-transparent focus:border-slate-400 dark:focus:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching files found.
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isActive = file.id === activeFileId;
              const isEditing = file.id === editingId;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectFile(file.id);
                      if (window.innerWidth < 1024) onClose();
                    }
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium border border-slate-300/80 dark:border-slate-700 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {/* Left: Icon & File Meta */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <FileText className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`} />

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input 
                            ref={editInputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => handleKeyDownRename(e, file.id)}
                            className="w-full text-xs bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 outline-none text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => submitRename(file.id)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-emerald-600"
                            title="Save Name (Enter)"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs truncate font-medium">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{formatWordCount(file.content)}</span>
                            <span>·</span>
                            <span>{formatRelativeTime(file.updatedAt)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Hover Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Rename */}
                      <button
                        onClick={(e) => startRename(e, file)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        title="Rename file"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      {/* Download */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMarkdown(file.content, file.name);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        title="Download .md file"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Delete */}
                      {files.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(file.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded"
                          title="Delete file"
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

        {/* Footer: Import & Local Storage status */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            title="Import a markdown file from your computer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Open from Computer</span>
          </button>

          <div className="text-[10px] text-center text-slate-400 dark:text-slate-500">
            Auto-saved locally in browser
          </div>
        </div>
      </aside>
    </>
  );
}
