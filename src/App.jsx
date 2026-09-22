import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import MarkdownViewer from './components/MarkdownViewer';
import MarkdownEditor from './components/MarkdownEditor';
import TableOfContents from './components/TableOfContents';
import FileSidebar from './components/FileSidebar';
import ConfirmModal from './components/ConfirmModal';
import ToolsModal from './components/ToolsModal';
import WordViewer from './components/WordViewer';
import PptxViewer from './components/PptxViewer';
import { parseMarkdown } from './utils/markdownParser';
import { SAMPLE_MARKDOWN } from './utils/sampleDocument';
import { parseDocxFile, SAMPLE_WORD_HTML } from './utils/docxParser';
import { parsePptxFile, SAMPLE_PRESENTATION_SLIDES } from './utils/pptxParser';
import { showInAppAlert } from './utils/alerts';
import { printToPdf, downloadDirectPdf, downloadMarkdown, downloadHtml } from './utils/pdfExport';
import { getStorageItem, setStorageItem, removeStorageItem, getPlaygroundDraft, clearPlaygroundDraft } from './utils/storage';

// Additional templates
const TECH_TEMPLATE = `# Technical Architecture Document 📐

## Executive Summary
This document defines the high-level architecture and implementation specifications.

> [!NOTE]
> All services adhere to twelve-factor app principles and containerized deployments.

---

## 1. System Architecture Overview

\`\`\`mermaid
flowchart LR
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> ServiceA[Auth Service]
  Gateway --> ServiceB[Markdown Engine]
  ServiceB --> Cache[(Redis Cache)]
  ServiceB --> S3[(Object Store)]
\`\`\`

### Key Components

1. **Edge Router**: Reverse-proxy and SSL termination.
2. **Worker Pool**: Async rendering cluster for batch jobs.
3. **Storage Tier**: Object storage with redundant CDN distribution.

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :---: |
| \`POST\` | \`/api/v1/parse\` | Parse markdown stream | Required |
| \`POST\` | \`/api/v1/export/pdf\` | Convert to vector PDF | Required |
| \`GET\`  | \`/api/v1/health\` | Healthcheck status | Public |

---

## 3. Performance SLA

$$ latency_{p99} < 45\\text{ms}, \\quad throughput > 10{,}000\\text{ req/s} $$

> [!IMPORTANT]
> Rate limiting is strictly enforced at 100 requests per second per IP address.
`;

const NOTES_TEMPLATE = `# Meeting Notes 📝

**Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}  
**Attendees:** Team Leads, Design, Engineering  
**Objective:** Product Roadmap Alignment  

---

## 🎯 Key Decisions

- [x] Adopt modern markdown preview engine across desktop applications.
- [x] Enable 1-click vector PDF generation with automatic styling.
- [x] Provide full-screen Zen reading mode for presentations.

---

## 📋 Discussion Points

### 1. Typography & Readability
The user interface should prioritize readable font sizes, clean margins, and clear visual hierarchy.

> [!TIP]
> Keep headers concise and use bullet lists for scannable summaries.

### 2. Action Items
- [ ] Finalize theme styling presets
- [ ] Review PDF export margins on A4 paper
- [ ] Package standalone portable version for macOS
`;

const DEFAULT_FILES = [
  {
    id: 'sample-showcase',
    name: 'Showcase.md',
    content: SAMPLE_MARKDOWN,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'sample-tech',
    name: 'Technical-Architecture.md',
    content: TECH_TEMPLATE,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'sample-notes',
    name: 'Meeting-Notes.md',
    content: NOTES_TEMPLATE,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
  }
];

export default function App() {
  // Multi-file library state
  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('md_files_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading md_files_library:', e);
    }
    // Backward compatibility: preserve existing custom markdown if any
    const legacyContent = localStorage.getItem('md_preview_content');
    if (legacyContent && legacyContent.trim() && legacyContent !== SAMPLE_MARKDOWN) {
      return [
        {
          id: 'file-migrated-1',
          name: 'My-Document.md',
          content: legacyContent,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ...DEFAULT_FILES,
      ];
    }
    return DEFAULT_FILES;
  });

  const [activeFileId, setActiveFileId] = useState(() => {
    return localStorage.getItem('md_active_file_id') || 'sample-showcase';
  });

  const [showFileSidebar, setShowFileSidebar] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  const [viewMode, setViewMode] = useState(() => {
    return (typeof window !== 'undefined' && window.innerWidth < 768) ? 'preview' : 'split';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('md_preview_theme') || 'modern';
  });
  const [columnWidth, setColumnWidth] = useState(() => {
    return localStorage.getItem('md_preview_width') || '95%';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [hasPlaygroundEdits, setHasPlaygroundEdits] = useState(false);

  // Active Tool: 'markdown' | 'word' | 'pptx'
  const [activeTool, setActiveTool] = useState(() => {
    const saved = localStorage.getItem('md_active_tool');
    if (saved === 'pdf' || !saved) return 'markdown';
    return saved;
  });

  const [showToolsModal, setShowToolsModal] = useState(false);

  // Word Document library state
  const [wordFiles, setWordFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('docx_files_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'sample-word-brief',
        name: 'Sample-Executive-Brief.docx',
        format: 'docx',
        updatedAt: Date.now() - 3600000 * 2,
      }
    ];
  });
  const [activeWordId, setActiveWordId] = useState(() => {
    return localStorage.getItem('docx_active_id') || 'sample-word-brief';
  });

  const [wordData, setWordData] = useState(() => {
    try {
      const saved = localStorage.getItem('docx_active_doc');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fileName: 'Sample-Executive-Brief.docx',
      html: SAMPLE_WORD_HTML
    };
  });

  // PowerPoint Presentation library state
  const [pptxFiles, setPptxFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('pptx_files_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'sample-pptx-arch',
        name: 'Sample-Architecture-Review.pptx',
        format: 'pptx',
        slideCount: 5,
        updatedAt: Date.now() - 3600000 * 3,
      }
    ];
  });
  const [activePptxId, setActivePptxId] = useState(() => {
    return localStorage.getItem('pptx_active_id') || 'sample-pptx-arch';
  });

  const [pptxData, setPptxData] = useState(() => {
    try {
      const saved = localStorage.getItem('pptx_active_deck');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fileName: 'Sample-Architecture-Review.pptx',
      slides: SAMPLE_PRESENTATION_SLIDES
    };
  });

  // Sync active tool and active IDs to localStorage
  useEffect(() => {
    localStorage.setItem('md_active_tool', activeTool);
  }, [activeTool]);

  useEffect(() => {
    localStorage.setItem('docx_active_id', activeWordId);
  }, [activeWordId]);

  useEffect(() => {
    localStorage.setItem('pptx_active_id', activePptxId);
  }, [activePptxId]);

  // In-App Confirmation & Alert Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    fileName: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    isAlert: false,
    onConfirm: () => {},
  });

  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Listen for software in-app alert dispatches
  useEffect(() => {
    const handleAppAlert = (e) => {
      const { message, title = 'Notice', variant = 'warning', confirmLabel = 'Got it' } = e.detail || {};
      setConfirmModal({
        isOpen: true,
        title,
        message,
        fileName: '',
        confirmLabel,
        cancelLabel: '',
        isAlert: true,
        variant,
        onConfirm: closeConfirmModal,
      });
    };

    window.addEventListener('app-alert', handleAppAlert);
    return () => window.removeEventListener('app-alert', handleAppAlert);
  }, [closeConfirmModal]);

  // Sidebar folders library state
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('document_folders_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('document_folders_library', JSON.stringify(folders));
    } catch {}
  }, [folders]);

  // Folder management handlers
  const handleCreateFolder = useCallback((category, name) => {
    const folderId = `folder-${category}-${Date.now()}`;
    const newFolder = {
      id: folderId,
      name: (name && name.trim()) || 'New Folder',
      category,
      createdAt: Date.now()
    };
    setFolders(prev => [...prev, newFolder]);
    return folderId;
  }, []);

  const handleRenameFolder = useCallback((folderId, newName) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
  }, []);

  const handleDeleteFolder = useCallback((folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Folder',
      fileName: folder.name,
      message: `Are you sure you want to delete "${folder.name}"? All files inside it will be kept and moved to the main list.`,
      confirmLabel: 'Delete Folder',
      cancelLabel: 'Cancel',
      variant: 'danger',
      isAlert: false,
      onConfirm: () => {
        setFolders(prev => prev.filter(f => f.id !== folderId));
        if (folder.category === 'markdown') {
          setFiles(prev => {
            const next = prev.map(file => file.folderId === folderId ? { ...file, folderId: null } : file);
            try { localStorage.setItem('md_files_library', JSON.stringify(next)); } catch {}
            return next;
          });
        } else if (folder.category === 'word') {
          setWordFiles(prev => {
            const next = prev.map(file => file.folderId === folderId ? { ...file, folderId: null } : file);
            try { localStorage.setItem('docx_files_library', JSON.stringify(next)); } catch {}
            return next;
          });
        } else if (folder.category === 'pptx') {
          setPptxFiles(prev => {
            const next = prev.map(file => file.folderId === folderId ? { ...file, folderId: null } : file);
            try { localStorage.setItem('pptx_files_library', JSON.stringify(next)); } catch {}
            return next;
          });
        }
        closeConfirmModal();
      }
    });
  }, [folders, closeConfirmModal]);

  const handleMoveFileToFolder = useCallback((fileId, targetFolderId, category) => {
    if (category === 'markdown') {
      setFiles(prev => {
        const next = prev.map(f => f.id === fileId ? { ...f, folderId: targetFolderId } : f);
        try { localStorage.setItem('md_files_library', JSON.stringify(next)); } catch {}
        return next;
      });
    } else if (category === 'word') {
      setWordFiles(prev => {
        const next = prev.map(f => f.id === fileId ? { ...f, folderId: targetFolderId } : f);
        try { localStorage.setItem('docx_files_library', JSON.stringify(next)); } catch {}
        return next;
      });
    } else if (category === 'pptx') {
      setPptxFiles(prev => {
        const next = prev.map(f => f.id === fileId ? { ...f, folderId: targetFolderId } : f);
        try { localStorage.setItem('pptx_files_library', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, []);



  // Active file derived from state
  const activeFile = useMemo(() => {
    return files.find(f => f.id === activeFileId) || files[0] || {
      id: 'default',
      name: 'Untitled.md',
      content: '',
    };
  }, [files, activeFileId]);

  const content = activeFile.content;
  const fileName = activeFile.name;

  // Make sure activeFileId tracks a valid file
  useEffect(() => {
    if (activeFile && activeFile.id !== activeFileId) {
      setActiveFileId(activeFile.id);
    }
  }, [activeFile, activeFileId]);

  // Sync files library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('md_files_library', JSON.stringify(files));
    } catch (e) {
      console.error('Failed to sync md_files_library:', e);
    }
  }, [files]);

  // Sync active file ID to localStorage
  useEffect(() => {
    localStorage.setItem('md_active_file_id', activeFileId);
  }, [activeFileId]);

  // Sync content to localStorage for backward compatibility
  useEffect(() => {
    localStorage.setItem('md_preview_content', content);
  }, [content]);

  // Sync columnWidth to localStorage
  useEffect(() => {
    localStorage.setItem('md_preview_width', columnWidth);
  }, [columnWidth]);

  // Sync theme to localStorage and HTML root
  useEffect(() => {
    localStorage.setItem('md_preview_theme', theme);
    const root = document.documentElement;
    if (theme === 'github-dark' || theme === 'obsidian') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Automatically adapt view mode on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        setViewMode('preview');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Parse markdown into HTML, TOC, and Stats
  const { html, toc, stats } = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const isEditableElement = (el) => {
      if (!el) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.getAttribute && el.getAttribute('contenteditable') === 'true') return true;
      if (typeof el.closest === 'function') {
        if (el.closest('[contenteditable="true"]')) return true;
        if (el.closest('#preview-paper, #word-paper, .pptx-slide-editable-body, .playground-paper')) return true;
      }
      return false;
    };

    const isUserEditing = (e) => {
      if (isEditableElement(e?.target)) return true;
      if (typeof document !== 'undefined' && isEditableElement(document.activeElement)) return true;
      return false;
    };

    const handleKeyDown = (e) => {
      const isEditing = isUserEditing(e) || viewMode === 'playground';

      // Fullscreen toggle via F11 or Cmd/Ctrl+Shift+F works globally
      if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'F' || e.key === 'f'))) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Plain 'f' or 'F' toggles fullscreen ONLY in pure read-only preview mode when NOT editing
      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        activeTool === 'markdown' &&
        viewMode === 'preview' &&
        !isEditing
      ) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Toggle sidebar with Cmd/Ctrl + B (only when not editing text, so Cmd+B stays available for Bold)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        if (isEditing) {
          // Allow bold text formatting in playground / contentEditable / editor
          return;
        }
        e.preventDefault();
        setShowFileSidebar(prev => !prev);
        return;
      }

      // Exit fullscreen with Escape
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      // Save / Export
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        if (viewMode === 'playground' || activeTool !== 'markdown') return;
        e.preventDefault();
        downloadMarkdown(content, fileName);
        return;
      }

      // Print to PDF (Markdown only)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        if (activeTool === 'markdown') {
          e.preventDefault();
          printToPdf(fileName.replace(/\.md$/, ''));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen, content, fileName, viewMode, activeTool]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // File mutations
  const handleContentChange = useCallback((newText) => {
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: newText, updatedAt: Date.now() } : f));
  }, [activeFile.id]);

  const handleFileNameChange = useCallback((newName) => {
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, name: newName, updatedAt: Date.now() } : f));
  }, [activeFile.id]);

  const handleSelectFile = (fileId) => {
    setActiveTool('markdown');
    if (fileId === activeFile.id) return;
    if (hasPlaygroundEdits) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes in Playground',
        fileName: activeFile.name,
        message: 'You have unsaved changes in Playground. If you switch documents now, your unsaved edits will be lost.',
        confirmLabel: 'Discard & Switch',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
        onConfirm: () => {
          setHasPlaygroundEdits(false);
          setActiveFileId(fileId);
          closeConfirmModal();
        }
      });
      return;
    }
    setActiveFileId(fileId);
  };

  const handleNewFile = () => {
    const createDoc = () => {
      const id = `file-${Date.now()}`;
      const count = files.filter(f => f.name.toLowerCase().startsWith('untitled')).length;
      const newName = count === 0 ? 'Untitled.md' : `Untitled-${count + 1}.md`;
      const initialContent = `# ${newName.replace(/\.md$/, '')}\n\nStart typing your markdown here...`;

      const newDoc = {
        id,
        name: newName,
        content: initialContent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setFiles(prev => [newDoc, ...prev]);
      setActiveFileId(id);
      setHasPlaygroundEdits(false);
      if (viewMode === 'preview') {
        setViewMode('split');
      }
    };

    if (hasPlaygroundEdits) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes in Playground',
        fileName: activeFile.name,
        message: 'You have unsaved changes in Playground. If you create a new document now, your unsaved edits will be lost.',
        confirmLabel: 'Discard & Create',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
        onConfirm: () => {
          closeConfirmModal();
          createDoc();
        }
      });
      return;
    }
    createDoc();
  };

  const handleRenameFile = (fileId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const formatted = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: formatted, updatedAt: Date.now() } : f));
  };

  const handleDeleteFile = (fileId) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Document',
      fileName: fileToDelete.name,
      message: 'Are you sure you want to delete this document? This action cannot be undone and will permanently remove all drafts, notes, and annotations for this file.',
      confirmLabel: 'Delete File',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        try {
          localStorage.removeItem(`md_playground_saved_${fileToDelete.name}`);
        } catch (e) {}

        const remaining = files.filter(f => f.id !== fileId);
        setFiles(remaining);

        if (activeFileId === fileId) {
          if (remaining.length > 0) {
            setActiveFileId(remaining[0].id);
          } else {
            const fallbackId = `file-${Date.now()}`;
            const fallbackDoc = {
              id: fallbackId,
              name: 'Untitled.md',
              content: '# Untitled\n\nStart typing your markdown here...',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setFiles([fallbackDoc]);
            setActiveFileId(fallbackId);
          }
        }
        closeConfirmModal();
      }
    });
  };

  const handleOpenFile = (name, text) => {
    const openDoc = () => {
      const formattedName = name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown') ? name : `${name}.md`;
      const existing = files.find(f => f.name.toLowerCase() === formattedName.toLowerCase());
      if (existing) {
        setFiles(prev => prev.map(f => f.id === existing.id ? { ...f, content: text, updatedAt: Date.now() } : f));
        setActiveFileId(existing.id);
      } else {
        const id = `file-${Date.now()}`;
        const newDoc = {
          id,
          name: formattedName,
          content: text,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setFiles(prev => [newDoc, ...prev]);
        setActiveFileId(id);
      }
      setHasPlaygroundEdits(false);
    };

    if (hasPlaygroundEdits) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes in Playground',
        fileName: activeFile.name,
        message: 'You have unsaved changes in Playground. Opening another file without saving will discard your edits.',
        confirmLabel: 'Discard & Open',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
        onConfirm: () => {
          closeConfirmModal();
          openDoc();
        }
      });
      return;
    }
    openDoc();
  };

  const handleLoadSample = (type) => {
    const loadSample = () => {
      setHasPlaygroundEdits(false);
      let targetId = '';
      let targetName = '';
      let targetContent = '';

      if (type === 'showcase') {
        targetId = 'sample-showcase';
        targetName = 'Showcase.md';
        targetContent = SAMPLE_MARKDOWN;
      } else if (type === 'tech') {
        targetId = 'sample-tech';
        targetName = 'Technical-Architecture.md';
        targetContent = TECH_TEMPLATE;
      } else if (type === 'notes') {
        targetId = 'sample-notes';
        targetName = 'Meeting-Notes.md';
        targetContent = NOTES_TEMPLATE;
      }

      const existing = files.find(f => f.id === targetId || f.name.toLowerCase() === targetName.toLowerCase());
      if (existing) {
        setActiveFileId(existing.id);
      } else {
        const newDoc = {
          id: targetId || `sample-${Date.now()}`,
          name: targetName,
          content: targetContent,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setFiles(prev => [newDoc, ...prev]);
        setActiveFileId(newDoc.id);
      }
    };

    if (hasPlaygroundEdits) {
      setConfirmModal({
        isOpen: true,
        title: 'Unsaved Changes in Playground',
        fileName: activeFile.name,
        message: 'You have unsaved changes in Playground. Loading a starter template will discard your unsaved edits.',
        confirmLabel: 'Discard & Load',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
        onConfirm: () => {
          closeConfirmModal();
          loadSample();
        }
      });
      return;
    }
    loadSample();
  };

  // Select Word Document from library
  const handleSelectWordFile = useCallback(async (docId) => {
    setActiveTool('word');
    setActiveWordId(docId);

    if (docId === 'sample-word-brief') {
      const sample = {
        fileName: 'Sample-Executive-Brief.docx',
        html: SAMPLE_WORD_HTML
      };
      setWordData(sample);
      try { localStorage.setItem('docx_active_doc', JSON.stringify(sample)); } catch {}
      return;
    }

    try {
      const stored = await getStorageItem('documents', docId);
      if (stored && stored.html) {
        const doc = {
          fileName: stored.name || 'Document.docx',
          html: stored.html
        };
        setWordData(doc);
        try { localStorage.setItem('docx_active_doc', JSON.stringify(doc)); } catch {}
      }
    } catch (e) {
      console.error('Failed to load Word document from IndexedDB:', e);
    }
  }, []);

  // Delete Word Document from library
  const handleDeleteWordFile = useCallback((docId) => {
    const docToDelete = wordFiles.find(f => f.id === docId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Word Document',
      fileName: docToDelete?.name || 'Document.docx',
      message: 'Are you sure you want to delete this Word document? This action cannot be undone and will permanently remove all drafts and annotations.',
      confirmLabel: 'Delete File',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        let remaining = [];
        setWordFiles(prev => {
          remaining = prev.filter(f => f.id !== docId);
          try { localStorage.setItem('docx_files_library', JSON.stringify(remaining)); } catch {}
          return remaining;
        });
        await removeStorageItem('documents', docId);

        if (activeWordId === docId) {
          if (remaining.length > 0) {
            handleSelectWordFile(remaining[0].id);
          } else {
            setActiveWordId(null);
            setWordData({ fileName: '', html: '' });
            try { localStorage.removeItem('docx_active_doc'); } catch {}
          }
        }
        closeConfirmModal();
      }
    });
  }, [wordFiles, activeWordId, handleSelectWordFile, closeConfirmModal]);

  // Rename Word Document
  const handleRenameWordFile = useCallback(async (docId, newName) => {
    setWordFiles(prev => {
      const next = prev.map(f => f.id === docId ? { ...f, name: newName, updatedAt: Date.now() } : f);
      try { localStorage.setItem('docx_files_library', JSON.stringify(next)); } catch {}
      return next;
    });
    const stored = await getStorageItem('documents', docId);
    if (stored) {
      await setStorageItem('documents', docId, { ...stored, name: newName });
    }
    if (activeWordId === docId) {
      setWordData(prev => ({ ...prev, fileName: newName }));
    }
  }, [activeWordId]);

  // Open & Parse Word (.docx) file
  const handleOpenDocxFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const result = await parseDocxFile(file);
      if (result.success) {
        const docId = 'docx-' + Date.now();
        const newDoc = { id: docId, name: file.name, html: result.html, format: 'docx' };
        
        await setStorageItem('documents', docId, newDoc);

        const newMeta = {
          id: docId,
          name: file.name,
          format: 'docx',
          updatedAt: Date.now(),
        };

        setWordFiles(prev => {
          const next = [newMeta, ...prev.filter(f => f.name !== file.name)];
          try { localStorage.setItem('docx_files_library', JSON.stringify(next)); } catch {}
          return next;
        });

        setActiveWordId(docId);
        setWordData({ fileName: file.name, html: result.html });
        try { localStorage.setItem('docx_active_doc', JSON.stringify({ fileName: file.name, html: result.html })); } catch {}
        setActiveTool('word');
        showInAppAlert(`Loaded Word document "${file.name}" with ${result.stats?.words || 0} words.`, 'Word File Ready', 'info');
      } else {
        showInAppAlert(result.error || 'Failed to parse Word document.', 'Word File Error', 'danger');
      }
    } catch (err) {
      showInAppAlert(err.message || 'Error reading Word file.', 'Word File Error', 'danger');
    }
  }, []);

  // Select PowerPoint Deck from library
  const handleSelectPptxFile = useCallback(async (deckId) => {
    setActiveTool('pptx');
    setActivePptxId(deckId);

    if (deckId === 'sample-pptx-arch') {
      const sample = {
        fileName: 'Sample-Architecture-Review.pptx',
        slides: SAMPLE_PRESENTATION_SLIDES
      };
      setPptxData(sample);
      try { localStorage.setItem('pptx_active_deck', JSON.stringify(sample)); } catch {}
      return;
    }

    try {
      const stored = await getStorageItem('documents', deckId);
      if (stored && stored.slides) {
        const deck = {
          fileName: stored.name || 'Presentation.pptx',
          slides: stored.slides
        };
        setPptxData(deck);
        try { localStorage.setItem('pptx_active_deck', JSON.stringify(deck)); } catch {}
      }
    } catch (e) {
      console.error('Failed to load PowerPoint deck from IndexedDB:', e);
    }
  }, []);

  // Load Sample Word Doc
  const handleLoadSampleWord = useCallback(() => {
    setActiveTool('word');
    setActiveWordId('sample-word-brief');
    const sample = {
      fileName: 'Sample-Project-Brief.docx',
      html: SAMPLE_WORD_HTML
    };
    setWordData(sample);
    try { localStorage.setItem('docx_active_doc', JSON.stringify(sample)); } catch {}
  }, []);

  // Delete PowerPoint Deck from library
  const handleDeletePptxFile = useCallback((deckId) => {
    const deckToDelete = pptxFiles.find(f => f.id === deckId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete PowerPoint Presentation',
      fileName: deckToDelete?.name || 'Presentation.pptx',
      message: 'Are you sure you want to delete this PowerPoint deck? This action cannot be undone and will remove all cached slides.',
      confirmLabel: 'Delete Presentation',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        let remaining = [];
        setPptxFiles(prev => {
          remaining = prev.filter(f => f.id !== deckId);
          try { localStorage.setItem('pptx_files_library', JSON.stringify(remaining)); } catch {}
          return remaining;
        });
        await removeStorageItem('documents', deckId);
        if (deckToDelete) {
          await clearPlaygroundDraft('pptx_draft_' + deckToDelete.name);
        }

        if (activePptxId === deckId) {
          if (remaining.length > 0) {
            handleSelectPptxFile(remaining[0].id);
          } else {
            setActivePptxId(null);
            setPptxData({ fileName: '', slides: [] });
            try { localStorage.removeItem('pptx_active_deck'); } catch {}
          }
        }
        closeConfirmModal();
      }
    });
  }, [pptxFiles, activePptxId, handleSelectPptxFile, closeConfirmModal]);

  // Batch delete files across Markdown, Word, and PowerPoint
  const handleBatchDeleteFiles = useCallback(({ markdownIds = [], wordIds = [], pptxIds = [] }) => {
    const totalCount = markdownIds.length + wordIds.length + pptxIds.length;
    if (totalCount === 0) return;

    setConfirmModal({
      isOpen: true,
      title: `Delete ${totalCount} ${totalCount === 1 ? 'Document' : 'Documents'}`,
      fileName: `${totalCount} selected ${totalCount === 1 ? 'file' : 'files'}`,
      message: `Are you sure you want to delete ${totalCount === 1 ? 'this document' : `these ${totalCount} documents`}? This action cannot be undone and will permanently remove all drafts, notes, and annotations for these files.`,
      confirmLabel: `Delete ${totalCount} ${totalCount === 1 ? 'File' : 'Files'}`,
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        // 1. Batch delete Markdown files
        if (markdownIds.length > 0) {
          const mdSet = new Set(markdownIds);
          const filesToDelete = files.filter(f => mdSet.has(f.id));
          filesToDelete.forEach(f => {
            try {
              localStorage.removeItem(`md_playground_saved_${f.name}`);
            } catch (e) {}
          });

          const remainingMd = files.filter(f => !mdSet.has(f.id));
          if (remainingMd.length > 0) {
            setFiles(remainingMd);
            if (mdSet.has(activeFileId)) {
              setActiveFileId(remainingMd[0].id);
            }
          } else {
            const fallbackId = `file-${Date.now()}`;
            const fallbackDoc = {
              id: fallbackId,
              name: 'Untitled.md',
              content: '# Untitled\n\nStart typing your markdown here...',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setFiles([fallbackDoc]);
            setActiveFileId(fallbackId);
          }
        }

        // 2. Batch delete Word documents
        if (wordIds.length > 0) {
          const wordSet = new Set(wordIds);
          let remainingWord = [];
          setWordFiles(prev => {
            remainingWord = prev.filter(f => !wordSet.has(f.id));
            try { localStorage.setItem('docx_files_library', JSON.stringify(remainingWord)); } catch {}
            return remainingWord;
          });

          for (const docId of wordIds) {
            await removeStorageItem('documents', docId);
          }

          if (wordSet.has(activeWordId)) {
            if (remainingWord.length > 0) {
              handleSelectWordFile(remainingWord[0].id);
            } else {
              setActiveWordId(null);
              setWordData({ fileName: '', html: '' });
              try { localStorage.removeItem('docx_active_doc'); } catch {}
            }
          }
        }

        // 3. Batch delete PowerPoint decks
        if (pptxIds.length > 0) {
          const pptxSet = new Set(pptxIds);
          const decksToDelete = pptxFiles.filter(f => pptxSet.has(f.id));
          let remainingPptx = [];
          setPptxFiles(prev => {
            remainingPptx = prev.filter(f => !pptxSet.has(f.id));
            try { localStorage.setItem('pptx_files_library', JSON.stringify(remainingPptx)); } catch {}
            return remainingPptx;
          });

          for (const deckId of pptxIds) {
            await removeStorageItem('documents', deckId);
          }
          for (const deck of decksToDelete) {
            await clearPlaygroundDraft('pptx_draft_' + deck.name);
          }

          if (pptxSet.has(activePptxId)) {
            if (remainingPptx.length > 0) {
              handleSelectPptxFile(remainingPptx[0].id);
            } else {
              setActivePptxId(null);
              setPptxData({ fileName: '', slides: [] });
              try { localStorage.removeItem('pptx_active_deck'); } catch {}
            }
          }
        }

        closeConfirmModal();
      }
    });
  }, [files, activeFileId, wordFiles, activeWordId, handleSelectWordFile, pptxFiles, activePptxId, handleSelectPptxFile, closeConfirmModal]);

  // Rename PowerPoint Deck
  const handleRenamePptxFile = useCallback(async (deckId, newName) => {
    setPptxFiles(prev => {
      const next = prev.map(f => f.id === deckId ? { ...f, name: newName, updatedAt: Date.now() } : f);
      try { localStorage.setItem('pptx_files_library', JSON.stringify(next)); } catch {}
      return next;
    });
    const stored = await getStorageItem('documents', deckId);
    if (stored) {
      await setStorageItem('documents', deckId, { ...stored, name: newName });
    }
    if (activePptxId === deckId) {
      setPptxData(prev => ({ ...prev, fileName: newName }));
    }
  }, [activePptxId]);

  // Open & Parse PowerPoint (.pptx) file
  const handleOpenPptxFile = useCallback(async (file) => {
    if (!file) return;
    try {
      // Clear any prior draft for this presentation name so stale drafts never overwrite clean slides
      await clearPlaygroundDraft('pptx_draft_' + file.name);

      const result = await parsePptxFile(file);
      if (result.success) {
        const deckId = 'pptx-' + Date.now();
        const newDeck = { id: deckId, name: file.name, slides: result.slides, format: 'pptx' };

        await setStorageItem('documents', deckId, newDeck);

        const newMeta = {
          id: deckId,
          name: file.name,
          format: 'pptx',
          slideCount: result.slides?.length || 0,
          updatedAt: Date.now(),
        };

        setPptxFiles(prev => {
          const next = [newMeta, ...prev.filter(f => f.name !== file.name)];
          try { localStorage.setItem('pptx_files_library', JSON.stringify(next)); } catch {}
          return next;
        });

        setActivePptxId(deckId);
        setPptxData({ fileName: file.name, slides: result.slides });
        try { localStorage.setItem('pptx_active_deck', JSON.stringify({ fileName: file.name, slides: result.slides })); } catch {}
        setActiveTool('pptx');
        showInAppAlert(`Loaded PowerPoint presentation "${file.name}" with ${result.slides?.length || 0} slides.`, 'PowerPoint Ready', 'info');
      } else {
        showInAppAlert(result.error || 'Failed to parse PowerPoint presentation.', 'PowerPoint Error', 'danger');
      }
    } catch (err) {
      showInAppAlert(err.message || 'Error reading PowerPoint file.', 'PowerPoint Error', 'danger');
    }
  }, []);


  // Load Sample PPTX Deck
  const handleLoadSamplePptx = useCallback(() => {
    setActiveTool('pptx');
    setActivePptxId('sample-pptx-arch');
    const sample = {
      fileName: 'Sample-Architecture-Review.pptx',
      slides: SAMPLE_PRESENTATION_SLIDES
    };
    setPptxData(sample);
    try { localStorage.setItem('pptx_active_deck', JSON.stringify(sample)); } catch {}
  }, []);

  // Global file drag-and-drop router across formats (.md, .docx, .pptx)
  useEffect(() => {
    const handleDragOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDrop = (e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      e.stopPropagation();

      const droppedFiles = e.dataTransfer?.files;
      if (!droppedFiles || droppedFiles.length === 0) return;

      const file = droppedFiles[0];
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.docx')) {
        handleOpenDocxFile(file);
      } else if (lower.endsWith('.pptx')) {
        handleOpenPptxFile(file);
      } else if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setActiveTool('markdown');
          handleOpenFile(file.name, event.target.result);
        };
        reader.readAsText(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleOpenDocxFile, handleOpenPptxFile, handleOpenFile]);

  const handlePrintPdf = () => {
    printToPdf(fileName.replace(/\.md$/, ''));
  };

  const handleDirectPdfDownload = async () => {
    setIsExportingPdf(true);
    const paperElement = document.getElementById('preview-paper');
    if (paperElement) {
      await downloadDirectPdf(paperElement, fileName.replace(/\.md$/, '') + '.pdf');
    }
    setIsExportingPdf(false);
  };

  const handleExportMarkdown = () => {
    downloadMarkdown(content, fileName);
  };

  const handleExportHtml = () => {
    downloadHtml(html, fileName.replace(/\.md$/, ''));
  };

  return (
    <div id="app-container" className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      {/* Top Workspace Flex Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Universal Categorized File Sidebar */}
        {!isFullscreen && showFileSidebar && (
          <FileSidebar 
            markdownFiles={files}
            activeMarkdownId={activeFile.id}
            onSelectMarkdownFile={(id) => {
              setActiveTool('markdown');
              handleSelectFile(id);
            }}
            onNewMarkdownFile={handleNewFile}
            onRenameMarkdownFile={handleRenameFile}
            onDeleteMarkdownFile={handleDeleteFile}
            onImportMarkdownFile={handleOpenFile}

            wordFiles={wordFiles}
            activeWordId={activeWordId}
            onSelectWordFile={handleSelectWordFile}
            onImportWordFile={handleOpenDocxFile}
            onDeleteWordFile={handleDeleteWordFile}
            onRenameWordFile={handleRenameWordFile}

            pptxFiles={pptxFiles}
            activePptxId={activePptxId}
            onSelectPptxFile={handleSelectPptxFile}
            onImportPptxFile={handleOpenPptxFile}
            onDeletePptxFile={handleDeletePptxFile}
            onRenamePptxFile={handleRenamePptxFile}

            folders={folders}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveFileToFolder={handleMoveFileToFolder}
            onBatchDeleteFiles={handleBatchDeleteFiles}

            activeTool={activeTool}
            onClose={() => setShowFileSidebar(false)}
            onOpenTools={() => setShowToolsModal(true)}
          />
        )}

        {/* Center Workspace Pane */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {activeTool === 'word' ? (
            <WordViewer 
              html={wordData.html}
              fileName={wordData.fileName}
              theme={theme}
              showFileSidebar={showFileSidebar}
              onToggleSidebar={() => setShowFileSidebar(prev => !prev)}
              onOpenFile={handleOpenDocxFile}
              onLoadSampleWord={handleLoadSampleWord}
              onOpenTools={() => setShowToolsModal(true)}
            />
          ) : activeTool === 'pptx' ? (
            <PptxViewer 
              slides={pptxData.slides}
              fileName={pptxData.fileName}
              theme={theme}
              showFileSidebar={showFileSidebar}
              onToggleSidebar={() => setShowFileSidebar(prev => !prev)}
              onOpenFile={handleOpenPptxFile}
              onLoadSamplePptx={handleLoadSamplePptx}
              onOpenTools={() => setShowToolsModal(true)}
            />
          ) : (
            <>
              {/* Top Navigation Bar for Markdown */}
              {!isFullscreen && (
                <Navbar 
                  fileName={fileName}
                  setFileName={handleFileNameChange}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  theme={theme}
                  setTheme={setTheme}
                  isFullscreen={isFullscreen}
                  toggleFullscreen={toggleFullscreen}
                  showToc={showToc}
                  setShowToc={setShowToc}
                  showFileSidebar={showFileSidebar}
                  onToggleSidebar={() => setShowFileSidebar(prev => !prev)}
                  columnWidth={columnWidth}
                  setColumnWidth={setColumnWidth}
                  onNewFile={handleNewFile}
                  onOpenFile={handleOpenFile}
                  onLoadSample={handleLoadSample}
                  onPrintPdf={handlePrintPdf}
                  onDirectPdfDownload={handleDirectPdfDownload}
                  onExportMarkdown={handleExportMarkdown}
                  onExportHtml={handleExportHtml}
                  stats={stats}
                  isExportingPdf={isExportingPdf}
                  activeTool={activeTool}
                  onOpenTools={() => setShowToolsModal(true)}
                />
              )}

              {/* Main Markdown Workspace */}
              <div id="main-content" className="flex-1 flex overflow-hidden relative">
                {/* Editor Pane (when Split or Editor mode) */}
                {!isFullscreen && (viewMode === 'split' || viewMode === 'editor') && (
                  <MarkdownEditor 
                    content={content}
                    onChange={handleContentChange}
                    onDropFile={handleOpenFile}
                  />
                )}

                {/* Preview / Playground Pane (when Split, Preview, or Playground mode or Fullscreen) */}
                {(isFullscreen || viewMode === 'split' || viewMode === 'preview' || viewMode === 'playground') && (
                  <MarkdownViewer 
                    html={html}
                    fileName={fileName}
                    theme={theme}
                    setTheme={setTheme}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    columnWidth={columnWidth}
                    setColumnWidth={setColumnWidth}
                    onPrintPdf={handlePrintPdf}
                    onDirectPdfDownload={handleDirectPdfDownload}
                    onDropFile={handleOpenFile}
                    isPlayground={viewMode === 'playground'}
                    onTogglePlayground={() => setViewMode(viewMode === 'playground' ? 'preview' : 'playground')}
                    isExportingPdf={isExportingPdf}
                    onPlaygroundEditsChange={setHasPlaygroundEdits}
                  />
                )}

                {/* Table of Contents Drawer */}
                {!isFullscreen && showToc && (
                  <TableOfContents 
                    toc={toc} 
                    onClose={() => setShowToc(false)} 
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Document Tools Modal Hub */}
      <ToolsModal 
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        activeTool={activeTool}
        onSelectTool={(toolId) => {
          setActiveTool(toolId);
          setShowToolsModal(false);
        }}
        onOpenDocxFile={handleOpenDocxFile}
        onOpenPptxFile={handleOpenPptxFile}
        onOpenMarkdownFile={(file) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            setActiveTool('markdown');
            handleOpenFile(file.name, event.target.result);
          };
          reader.readAsText(file);
        }}
        onLoadSampleWord={handleLoadSampleWord}
        onLoadSamplePptx={handleLoadSamplePptx}
      />

      {/* Global In-App Confirmation / Alert Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        fileName={confirmModal.fileName}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        isAlert={confirmModal.isAlert}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}
