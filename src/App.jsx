import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/Navbar';
import MarkdownViewer from './components/MarkdownViewer';
import MarkdownEditor from './components/MarkdownEditor';
import TableOfContents from './components/TableOfContents';
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

export default function App() {
  const [content, setContent] = useState(() => {
    return localStorage.getItem('md_preview_content') || SAMPLE_MARKDOWN;
  });
  const [fileName, setFileName] = useState('Showcase.md');
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

  // Sync content to localStorage
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
      // Toggle fullscreen with F or F11 (when not typing in textarea)
      if ((e.key === 'F' || e.key === 'f') && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      // Save / Export
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
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
  }, [isFullscreen, toggleFullscreen, content, fileName]);

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

  // Action handlers
  const handleNewFile = () => {
    if (confirm('Create a new blank document? Any unsaved edits will be cleared.')) {
      setContent('# Untitled Document\n\nStart typing your markdown here...');
      setFileName('Untitled.md');
      setViewMode('split');
    }
  };

  const handleOpenFile = (name, text) => {
    setContent(text);
    setFileName(name);
  };

  const handleLoadSample = (type) => {
    if (type === 'showcase') {
      setContent(SAMPLE_MARKDOWN);
      setFileName('Showcase.md');
    } else if (type === 'tech') {
      setContent(TECH_TEMPLATE);
      setFileName('Technical-Architecture.md');
    } else if (type === 'notes') {
      setContent(NOTES_TEMPLATE);
      setFileName('Meeting-Notes.md');
    }
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
          setFileName={setFileName}
          viewMode={viewMode}
          setViewMode={setViewMode}
          theme={theme}
          setTheme={setTheme}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          showToc={showToc}
          setShowToc={setShowToc}
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
        {/* Editor Pane (when Split or Editor mode) */}
        {!isFullscreen && (viewMode === 'split' || viewMode === 'editor') && (
          <MarkdownEditor 
            content={content}
            onChange={setContent}
            onDropFile={handleOpenFile}
          />
        )}

        {/* Preview / Playground Pane (when Split, Preview, or Playground mode or Fullscreen) */}
        {(isFullscreen || viewMode === 'split' || viewMode === 'preview' || viewMode === 'playground') && (
          <MarkdownViewer 
            html={html}
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
    </div>
  );
}
