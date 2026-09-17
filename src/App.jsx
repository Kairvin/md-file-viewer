import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import MarkdownViewer from './components/MarkdownViewer';
import MarkdownEditor from './components/MarkdownEditor';
import TableOfContents from './components/TableOfContents';
import FileSidebar from './components/FileSidebar';
import ConfirmModal from './components/ConfirmModal';
import { parseMarkdown } from './utils/markdownParser';
import { SAMPLE_MARKDOWN } from './utils/sampleDocument';
import { printToPdf, downloadDirectPdf, downloadMarkdown, downloadHtml } from './utils/pdfExport';

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

  // In-App Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    fileName: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    onConfirm: () => {},
  });

  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
    <div id="app-container" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Navigation Bar */}
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
        />
      )}

      {/* Main Workspace */}
      <div id="main-content" className="flex-1 flex overflow-hidden relative">
        {/* Document Library Sidebar */}
        {!isFullscreen && showFileSidebar && (
          <FileSidebar 
            files={files}
            activeFileId={activeFile.id}
            onSelectFile={handleSelectFile}
            onNewFile={handleNewFile}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            onImportFile={handleOpenFile}
            onClose={() => setShowFileSidebar(false)}
          />
        )}

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

      {/* Global In-App Confirmation Alert Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        fileName={confirmModal.fileName}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}
