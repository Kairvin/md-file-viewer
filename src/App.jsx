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
import PdfViewer from './components/PdfViewer';
import { parseMarkdown } from './utils/markdownParser';
import { SAMPLE_MARKDOWN } from './utils/sampleDocument';
import { parseDocxFile, SAMPLE_WORD_HTML } from './utils/docxParser';
import { parsePptxFile, SAMPLE_PRESENTATION_SLIDES } from './utils/pptxParser';
import { parsePdfToHtml, SAMPLE_PDF_HTML } from './utils/pdfParser';
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
    return localStorage.getItem('md_active_tool') || 'markdown';
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

  // PDF Viewer library state
  const [pdfFiles, setPdfFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('pdf_files_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'sample-pdf-report',
        name: 'Sample-Systems-Brief.pdf',
        format: 'pdf',
        numPages: 2,
        updatedAt: Date.now()
      }
    ];
  });

  const [activePdfId, setActivePdfId] = useState(() => {
    return localStorage.getItem('pdf_active_id') || 'sample-pdf-report';
  });

  const [pdfData, setPdfData] = useState(() => {
    try {
      const saved = localStorage.getItem('pdf_active_doc');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'sample-pdf-report',
      fileName: 'Sample-Systems-Brief.pdf',
      html: SAMPLE_PDF_HTML,
      numPages: 2,
      totalWords: 380,
      fileUrl: ''
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

  useEffect(() => {
    localStorage.setItem('pdf_active_id', activePdfId);
  }, [activePdfId]);

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
    const handleKeyDown = (e) => {
      // Toggle sidebar with Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setShowFileSidebar(prev => !prev);
      }
      // Toggle fullscreen with F or F11 (when not typing in textarea or input)
      if ((e.key === 'F' || e.key === 'f') && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      // Save / Export
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        if (viewMode === 'playground') return;
        e.preventDefault();
        downloadMarkdown(content, fileName);
      }
      // Print to PDF
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        printToPdf(fileName.replace(/\.md$/, ''));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen, content, fileName, viewMode]);

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

  // Open PDF (.pdf) file
  const handleOpenPdfFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const fileUrl = URL.createObjectURL(file);
      const pdfId = 'pdf-' + Date.now();

      // Extract PDF into semantic Markdown-like HTML
      const parsed = await parsePdfToHtml(file, file.name);

      const newDoc = {
        id: pdfId,
        name: file.name,
        html: parsed.html,
        numPages: parsed.numPages,
        totalWords: parsed.totalWords,
        fileUrl,
        format: 'pdf',
        updatedAt: Date.now()
      };

      await setStorageItem('documents', pdfId, newDoc);

      const newMeta = {
        id: pdfId,
        name: file.name,
        format: 'pdf',
        numPages: parsed.numPages,
        updatedAt: Date.now(),
      };

      setPdfFiles(prev => {
        const next = [newMeta, ...prev.filter(f => f.name !== file.name)];
        try { localStorage.setItem('pdf_files_library', JSON.stringify(next)); } catch {}
        return next;
      });

      setActivePdfId(pdfId);
      try { localStorage.setItem('pdf_active_id', pdfId); } catch {}

      const activeObj = {
        id: pdfId,
        fileName: file.name,
        html: parsed.html,
        numPages: parsed.numPages,
        totalWords: parsed.totalWords,
        fileUrl
      };
      setPdfData(activeObj);
      try { localStorage.setItem('pdf_active_doc', JSON.stringify(activeObj)); } catch {}

      setActiveTool('pdf');
      showInAppAlert(`Loaded PDF "${file.name}" with ${parsed.numPages} pages into Playground.`, 'PDF Ready', 'info');
    } catch (err) {
      console.error('Error opening PDF file:', err);
      showInAppAlert(err.message || 'Error opening PDF file.', 'PDF File Error', 'danger');
    }
  }, []);

  // Select PDF Document from library (Reopens existing PDF without Mac file picker)
  const handleSelectPdfFile = useCallback(async (pdfId) => {
    setActiveTool('pdf');
    setActivePdfId(pdfId);
    try { localStorage.setItem('pdf_active_id', pdfId); } catch {}

    // Special handling for sample PDF report
    if (pdfId === 'sample-pdf-report') {
      try {
        const savedDraft = await getPlaygroundDraft('pdf_draft_Sample-Systems-Brief.pdf');
        const draftHtml = typeof savedDraft === 'string' ? savedDraft : savedDraft?.html;
        const sampleDoc = {
          id: 'sample-pdf-report',
          fileName: 'Sample-Systems-Brief.pdf',
          html: (draftHtml && draftHtml.trim().length > 0) ? draftHtml : SAMPLE_PDF_HTML,
          numPages: 2,
          totalWords: 380,
          fileUrl: ''
        };
        setPdfData(sampleDoc);
        try { localStorage.setItem('pdf_active_doc', JSON.stringify(sampleDoc)); } catch {}
        return;
      } catch (e) {
        console.warn('Could not read sample PDF draft:', e);
      }
      const sampleDoc = {
        id: 'sample-pdf-report',
        fileName: 'Sample-Systems-Brief.pdf',
        html: SAMPLE_PDF_HTML,
        numPages: 2,
        totalWords: 380,
        fileUrl: ''
      };
      setPdfData(sampleDoc);
      try { localStorage.setItem('pdf_active_doc', JSON.stringify(sampleDoc)); } catch {}
      return;
    }

    const fileMeta = pdfFiles.find(f => f.id === pdfId || f.name === pdfId);
    if (!fileMeta) return;

    // 1. Check if draft exists in IndexedDB
    try {
      const savedDraft = await getPlaygroundDraft(`pdf_draft_${fileMeta.name}`);
      const draftHtml = typeof savedDraft === 'string' ? savedDraft : savedDraft?.html;
      if (draftHtml && draftHtml.trim().length > 0) {
        const docObj = {
          id: fileMeta.id,
          fileName: fileMeta.name,
          html: draftHtml,
          numPages: fileMeta.numPages || 1,
          totalWords: fileMeta.totalWords || 0,
          fileUrl: pdfData.fileName === fileMeta.name ? pdfData.fileUrl : ''
        };
        setPdfData(docObj);
        try { localStorage.setItem('pdf_active_doc', JSON.stringify(docObj)); } catch {}
        return;
      }
    } catch (e) {
      console.warn('Could not read PDF draft from IndexedDB:', e);
    }

    // 2. Read stored document from IndexedDB
    try {
      const stored = await getStorageItem('documents', pdfId);
      if (stored) {
        const docObj = {
          id: stored.id,
          fileName: stored.name || fileMeta.name,
          html: stored.html || '',
          numPages: stored.numPages || fileMeta.numPages || 1,
          totalWords: stored.totalWords || 0,
          fileUrl: stored.fileUrl || (pdfData.fileName === fileMeta.name ? pdfData.fileUrl : '')
        };
        setPdfData(docObj);
        try { localStorage.setItem('pdf_active_doc', JSON.stringify(docObj)); } catch {}
        return;
      }
    } catch (e) {
      console.warn('Could not read PDF from documents store:', e);
    }

    // 3. Fallback: if already loaded in memory
    if (pdfData.fileName === fileMeta.name && pdfData.html) {
      return;
    }

    // 4. Default fallback
    setPdfData({
      id: fileMeta.id,
      fileName: fileMeta.name,
      html: '',
      numPages: fileMeta.numPages || 1,
      totalWords: 0,
      fileUrl: ''
    });
  }, [pdfFiles, pdfData]);

  // Load Sample PDF Doc
  const handleLoadSamplePdf = useCallback(() => {
    setActiveTool('pdf');
    setActivePdfId('sample-pdf-report');
    setPdfFiles(prev => {
      if (prev.some(f => f.id === 'sample-pdf-report')) return prev;
      const next = [
        {
          id: 'sample-pdf-report',
          name: 'Sample-Systems-Brief.pdf',
          format: 'pdf',
          numPages: 2,
          updatedAt: Date.now()
        },
        ...prev
      ];
      try { localStorage.setItem('pdf_files_library', JSON.stringify(next)); } catch {}
      return next;
    });

    const sample = {
      id: 'sample-pdf-report',
      fileName: 'Sample-Systems-Brief.pdf',
      html: SAMPLE_PDF_HTML,
      numPages: 2,
      totalWords: 380,
      fileUrl: ''
    };
    setPdfData(sample);
    try { localStorage.setItem('pdf_active_doc', JSON.stringify(sample)); } catch {}
  }, []);

  // Rename PDF Document
  const handleRenamePdfFile = useCallback(async (pdfId, newName) => {
    setPdfFiles(prev => {
      const next = prev.map(f => f.id === pdfId ? { ...f, name: newName, updatedAt: Date.now() } : f);
      try { localStorage.setItem('pdf_files_library', JSON.stringify(next)); } catch {}
      return next;
    });
    const stored = await getStorageItem('documents', pdfId);
    if (stored) {
      await setStorageItem('documents', pdfId, { ...stored, name: newName });
    }
    if (activePdfId === pdfId || pdfData.fileName === newName) {
      setPdfData(prev => ({ ...prev, fileName: newName }));
    }
  }, [activePdfId, pdfData.fileName]);

  // Delete PDF Document from library
  const handleDeletePdfFile = useCallback((pdfId) => {
    const pdfToDelete = pdfFiles.find(f => f.id === pdfId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove PDF Document',
      fileName: pdfToDelete?.name || 'Document.pdf',
      message: 'Are you sure you want to remove this PDF from your workspace files?',
      confirmLabel: 'Remove File',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        let remaining = [];
        setPdfFiles(prev => {
          remaining = prev.filter(f => f.id !== pdfId);
          try { localStorage.setItem('pdf_files_library', JSON.stringify(remaining)); } catch {}
          return remaining;
        });

        await removeStorageItem('documents', pdfId);
        if (pdfToDelete) {
          await clearPlaygroundDraft(`pdf_draft_${pdfToDelete.name}`);
        }

        if (activePdfId === pdfId || pdfData.fileName === pdfToDelete?.name) {
          if (remaining.length > 0) {
            handleSelectPdfFile(remaining[0].id);
          } else {
            setActivePdfId('');
            setPdfData({ fileName: '', html: '', fileUrl: '' });
            try { localStorage.removeItem('pdf_active_doc'); } catch {}
          }
        }
        closeConfirmModal();
      }
    });
  }, [pdfFiles, activePdfId, pdfData, handleSelectPdfFile, closeConfirmModal]);

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

  // Global file drag-and-drop router across formats (.md, .docx, .pptx, .pdf)
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
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
      } else if (lower.endsWith('.pdf')) {
        handleOpenPdfFile(file);
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
  }, [handleOpenDocxFile, handleOpenPptxFile, handleOpenPdfFile, handleOpenFile]);

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

            pdfFiles={pdfFiles}
            activePdfId={activePdfId}
            onSelectPdfFile={handleSelectPdfFile}
            onOpenPdfFile={handleOpenPdfFile}
            onDeletePdfFile={handleDeletePdfFile}
            onRenamePdfFile={handleRenamePdfFile}

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
          ) : activeTool === 'pdf' ? (
            <PdfViewer 
              fileUrl={pdfData.fileUrl}
              fileName={pdfData.fileName}
              html={pdfData.html}
              numPages={pdfData.numPages}
              totalWords={pdfData.totalWords}
              theme={theme}
              showFileSidebar={showFileSidebar}
              onToggleSidebar={() => setShowFileSidebar(prev => !prev)}
              onOpenFile={handleOpenPdfFile}
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
        onOpenPdfFile={handleOpenPdfFile}
        onLoadSampleWord={handleLoadSampleWord}
        onLoadSamplePptx={handleLoadSamplePptx}
        onLoadSamplePdf={handleLoadSamplePdf}
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
