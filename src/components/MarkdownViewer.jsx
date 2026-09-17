import React, { useEffect, useRef, useState, useMemo } from 'react';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  Sun, 
  Moon, 
  Printer, 
  Minimize2, 
  Check, 
  Copy,
  AlignJustify,
  FileDown,
  Maximize2,
  Sparkles,
  PenTool
} from 'lucide-react';
import FloatingAnnotationBar from './FloatingAnnotationBar';
import PlaygroundToolbar from './PlaygroundToolbar';

export default function MarkdownViewer({
  html,
  theme,
  setTheme,
  isFullscreen,
  toggleFullscreen,
  columnWidth,
  setColumnWidth,
  onPrintPdf,
  onDirectPdfDownload,
  onDropFile,
  isPlayground = false,
  onTogglePlayground,
  isExportingPdf = false,
  fileName = 'Document.md',
  onPlaygroundEditsChange
}) {
  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const [fontSize, setFontSize] = useState(16); // px
  const [selectionBox, setSelectionBox] = useState({ top: 0, left: 0, visible: false });
  const [hasEdits, setHasEdits] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isJustSaved, setIsJustSaved] = useState(false);

  // Storage key for saving Playground edits per file
  const storageKey = `md_playground_saved_${fileName}`;

  // Active HTML for playground: loads saved draft if available
  const displayHtml = useMemo(() => {
    if (isPlayground && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    }
    return html;
  }, [isPlayground, storageKey, resetKey, html]);

  const hasRestoredDraft = useMemo(() => {
    if (isPlayground && typeof window !== 'undefined') {
      return Boolean(localStorage.getItem(storageKey));
    }
    return false;
  }, [isPlayground, storageKey, resetKey]);

  // Responsive width mapping: full width on mobile phones, customized on tablet/desktop
  const widthClasses = {
    '95%': 'w-full sm:w-[95%] sm:max-w-[95%] mx-auto',
    '100%': 'w-full max-w-full mx-0 px-2 sm:px-6 md:px-8',
    'wide': 'w-full sm:w-[88%] sm:max-w-7xl mx-auto',
    'standard': 'w-full sm:max-w-4xl mx-auto'
  };

  const nextWidth = () => {
    const modes = ['95%', '100%', 'wide', 'standard'];
    const idx = modes.indexOf(columnWidth);
    setColumnWidth(modes[(idx + 1) % modes.length]);
  };

  // Track selection changes to show the FloatingAnnotationBar
  useEffect(() => {
    if (!isPlayground) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const range = selection.getRangeAt(0);
      const paper = paperRef.current;
      if (!paper || !paper.contains(range.commonAncestorContainer)) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const top = rect.top - 54 < 10 ? rect.bottom + 10 : rect.top - 54;
      const left = rect.left + (rect.width / 2) - 140;

      setSelectionBox({
        top,
        left,
        visible: true
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isPlayground]);

  // Dedicated History Stack for robust Undo & Redo across typing and all formatting
  const historyStackRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const isInternalHistoryUpdateRef = useRef(false);
  const inputDebounceTimerRef = useRef(null);

  // Snapshot recording function
  const pushHistorySnapshot = (explicitHtml) => {
    if (isInternalHistoryUpdateRef.current) return;
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.markdown-body');
    if (!body) return;

    const currentHtml = explicitHtml !== undefined ? explicitHtml : body.innerHTML;
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;

    // Avoid pushing duplicate consecutive states
    if (stack.length > 0 && currentIndex >= 0 && stack[currentIndex] === currentHtml) {
      return;
    }

    const newStack = stack.slice(0, currentIndex + 1);
    newStack.push(currentHtml);
    if (newStack.length > 50) {
      newStack.shift();
    }

    historyStackRef.current = newStack;
    historyIndexRef.current = newStack.length - 1;

    setHistoryState({
      canUndo: newStack.length > 1,
      canRedo: false
    });
  };

  // Seed history stack on mount or reset
  useEffect(() => {
    const timer = setTimeout(() => {
      if (paperRef.current) {
        const body = paperRef.current.querySelector('.markdown-body');
        if (body) {
          historyStackRef.current = [body.innerHTML];
          historyIndexRef.current = 0;
          setHistoryState({ canUndo: false, canRedo: false });
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [resetKey, html]);

  // Handle typing input inside contentEditable paper with debounce
  const handleContentInput = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    if (inputDebounceTimerRef.current) clearTimeout(inputDebounceTimerRef.current);
    inputDebounceTimerRef.current = setTimeout(() => {
      pushHistorySnapshot();
    }, 350);
  };

  // Explicit Save Playground Draft
  const handleSavePlayground = () => {
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.markdown-body');
    if (!body) return;

    localStorage.setItem(storageKey, body.innerHTML);
    setHasEdits(false);
    setIsJustSaved(true);
    setTimeout(() => setIsJustSaved(false), 2200);
    onPlaygroundEditsChange?.(false);
  };

  // Format Handlers
  const handleHighlight = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    setHasEdits(true);
    onPlaygroundEditsChange?.(true);

    if (!color) {
      document.execCommand('removeFormat', false, null);
      setSelectionBox(prev => ({ ...prev, visible: false }));
      pushHistorySnapshot();
      return;
    }

    try {
      const mark = document.createElement('mark');
      mark.style.backgroundColor = color;
      mark.style.color = 'inherit';
      mark.style.padding = '0.12rem 0.35rem';
      mark.style.borderRadius = '0.25rem';
      mark.className = 'annotated-mark';
      
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection.addRange(newRange);
    } catch (e) {
      document.execCommand('hiliteColor', false, color);
    }
    pushHistorySnapshot();
  };

  const handleTextColor = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    setHasEdits(true);
    onPlaygroundEditsChange?.(true);

    if (!color) {
      document.execCommand('foreColor', false, '#0f172a');
      pushHistorySnapshot();
      return;
    }

    try {
      const span = document.createElement('span');
      span.style.color = color;
      span.className = 'annotated-color';
      
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } catch (e) {
      document.execCommand('foreColor', false, color);
    }
    pushHistorySnapshot();
  };

  const handleUnderline = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('underline', false, null);
    pushHistorySnapshot();
  };

  const handleStrikethrough = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('strikeThrough', false, null);
    pushHistorySnapshot();
  };

  const handleBold = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('bold', false, null);
    pushHistorySnapshot();
  };

  const handleItalic = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('italic', false, null);
    pushHistorySnapshot();
  };

  const handleClearFormat = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('removeFormat', false, null);
    setSelectionBox(prev => ({ ...prev, visible: false }));
    pushHistorySnapshot();
  };

  const handleUndo = () => {
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) return;

    const newIndex = currentIndex - 1;
    historyIndexRef.current = newIndex;
    const previousHtml = stack[newIndex];

    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.markdown-body');
      if (body) {
        isInternalHistoryUpdateRef.current = true;
        body.innerHTML = previousHtml;
        isInternalHistoryUpdateRef.current = false;
      }
    }

    setHistoryState({
      canUndo: newIndex > 0,
      canRedo: true
    });
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
  };

  const handleRedo = () => {
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex >= stack.length - 1) return;

    const newIndex = currentIndex + 1;
    historyIndexRef.current = newIndex;
    const nextHtml = stack[newIndex];

    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.markdown-body');
      if (body) {
        isInternalHistoryUpdateRef.current = true;
        body.innerHTML = nextHtml;
        isInternalHistoryUpdateRef.current = false;
      }
    }

    setHistoryState({
      canUndo: true,
      canRedo: newIndex < stack.length - 1
    });
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
  };

  const handleResetOriginal = () => {
    if (confirm('Revert document to original Markdown? All saved and unsaved playground edits will be cleared.')) {
      localStorage.removeItem(storageKey);
      setResetKey(prev => prev + 1);
      setHasEdits(false);
      onPlaygroundEditsChange?.(false);
      setSelectionBox({ top: 0, left: 0, visible: false });
    }
  };

  // Intercept beforeunload: ask user before reloading if there are unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPlayground && hasEdits) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in Playground. If you reload or leave, your changes will be lost. Do you wish to proceed?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlayground, hasEdits]);

  // Keyboard shortcut listener for Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, and Ctrl/Cmd+S (Save)
  useEffect(() => {
    if (!isPlayground) return;

    const handleKeyDown = (e) => {
      // Save shortcut
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleSavePlayground();
        return;
      }

      // Undo / Redo shortcuts
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayground, hasEdits]);

  // Setup click handler for copy code buttons & mermaid toggle buttons
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = async (e) => {
      // 1. Copy button
      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        const rawCode = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
        if (rawCode) {
          try {
            await navigator.clipboard.writeText(rawCode);
            const textSpan = copyBtn.querySelector('.btn-text');
            if (textSpan) {
              const original = textSpan.textContent;
              textSpan.textContent = 'Copied!';
              copyBtn.classList.add('text-emerald-400');
              setTimeout(() => {
                textSpan.textContent = original;
                copyBtn.classList.remove('text-emerald-400');
              }, 2000);
            }
          } catch (err) {
            console.error('Failed to copy code: ', err);
          }
        }
        return;
      }

      // 2. Mermaid source toggle button
      const toggleBtn = e.target.closest('.mermaid-toggle-btn');
      if (toggleBtn) {
        const parent = toggleBtn.closest('.mermaid-container');
        if (parent) {
          const sourceBlock = parent.querySelector('.mermaid-source');
          if (sourceBlock) {
            sourceBlock.classList.toggle('hidden');
          }
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [html]);

  // Render Mermaid diagrams into visual SVG mind maps & flowcharts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = theme === 'github-dark' || theme === 'obsidian';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : (theme === 'sepia' ? 'neutral' : 'default'),
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      themeVariables: isDark ? {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#3b82f6',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#60a5fa',
        lineColor: '#94a3b8',
        secondaryColor: '#6366f1',
        tertiaryColor: '#1e293b'
      } : {
        primaryColor: '#eff6ff',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b'
      }
    });

    const mermaidContainers = container.querySelectorAll('.mermaid-container');
    if (mermaidContainers.length === 0) return;

    mermaidContainers.forEach(async (el, index) => {
      const renderDiv = el.querySelector('.mermaid-render');
      if (!renderDiv) return;

      const rawCode = decodeURIComponent(el.getAttribute('data-mermaid') || '').trim();
      if (!rawCode) return;

      const uniqueId = `mermaid-chart-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode);
        renderDiv.innerHTML = svg;
        
        // Ensure SVG scales responsively on small and large viewports
        const svgEl = renderDiv.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
          svgEl.classList.add('rounded-lg', 'transition-all');
        }
      } catch (err) {
        console.warn('Mermaid render error for chart', index, err);
        renderDiv.innerHTML = `
          <div class="w-full p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono">
            <div class="font-bold flex items-center gap-1.5 mb-1.5">
              <span>⚠️ Could not render diagram visually:</span>
            </div>
            <div class="text-[11px] opacity-90 mb-2">${err?.message || 'Syntax issue in diagram'}</div>
            <pre class="p-2 sm:p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-xs leading-5"><code>${rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
        `;
      }
    });
  }, [html, theme]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && onDropFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onDropFile(file.name, event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div 
      id="preview-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex-1 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden transition-all duration-200 theme-${theme} ${
        isFullscreen ? '!h-screen !fixed !inset-0 !z-50 bg-slate-950' : 'bg-slate-100/70 dark:bg-slate-950'
      }`}
    >
      {/* Floating Zen Controls Bar in Fullscreen / Reader Mode (Mobile-Calibrated) */}
      {isFullscreen && (
        <div 
          id="zen-controls"
          className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-1.5 sm:gap-3 transition-opacity duration-300 opacity-60 hover:opacity-100 max-w-[96vw] overflow-x-auto"
        >
          <span className="text-[11px] sm:text-xs font-semibold text-slate-400 pr-1.5 sm:pr-2 border-r border-slate-700 select-none hidden xs:inline">
            Zen
          </span>

          {/* Font size */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button 
              onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono"
              title="Smaller Text (A-)"
            >
              A-
            </button>
            <span className="text-xs text-slate-400 font-mono w-5 sm:w-6 text-center">{fontSize}</span>
            <button 
              onClick={() => setFontSize(Math.min(26, fontSize + 1))}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono"
              title="Larger Text (A+)"
            >
              A+
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Width Cycle */}
          <button 
            onClick={nextWidth}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Cycle Reading Width"
          >
            <AlignJustify className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-mono">{columnWidth}</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* PDF Direct */}
          <button 
            onClick={onDirectPdfDownload}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Download PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] hidden sm:inline">PDF</span>
          </button>

          {/* Print to PDF */}
          <button 
            onClick={onPrintPdf}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Vector Print to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] hidden sm:inline">Print</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Exit Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
            title="Exit Full Screen (Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Exit</span>
          </button>
        </div>
      )}

      {/* Playground Top Control Toolbar */}
      {isPlayground && (
        <PlaygroundToolbar 
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={handleUnderline}
          onStrikethrough={handleStrikethrough}
          onBold={handleBold}
          onItalic={handleItalic}
          onClearFormat={handleClearFormat}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onResetOriginal={handleResetOriginal}
          onDownloadAnnotatedPdf={onDirectPdfDownload}
          isExportingPdf={isExportingPdf}
          hasEdits={hasEdits}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          onSave={handleSavePlayground}
          isJustSaved={isJustSaved}
        />
      )}

      {/* Floating Selection Formatting Bar */}
      {isPlayground && selectionBox.visible && (
        <FloatingAnnotationBar 
          position={selectionBox}
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={handleUnderline}
          onStrikethrough={handleStrikethrough}
          onBold={handleBold}
          onItalic={handleItalic}
          onClearFormat={handleClearFormat}
          onClose={() => setSelectionBox(prev => ({ ...prev, visible: false }))}
        />
      )}

      {/* Reader Paper Viewport - Calibrated padding for mobile/tablet */}
      <main className="py-3 sm:py-6 md:py-8 px-1.5 sm:px-4 md:px-6 flex justify-center min-h-full">
        <article 
          id="preview-paper"
          key={resetKey}
          ref={(el) => {
            containerRef.current = el;
            paperRef.current = el;
          }}
          style={{ fontSize: `${fontSize}px` }}
          className={`${widthClasses[columnWidth] || widthClasses['95%']} bg-[var(--bg-primary)] text-[var(--text-main)] rounded-xl sm:rounded-2xl border ${
            isPlayground 
              ? 'border-slate-300 dark:border-slate-700 ring-1 ring-slate-400/25 dark:ring-slate-600/30 shadow-md shadow-slate-200/50 dark:shadow-none' 
              : 'border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-200/50 dark:shadow-none'
          } p-3.5 sm:p-7 md:p-12 transition-all duration-200 max-w-full overflow-hidden relative`}
        >
          {/* Subtle Switch to Playground Banner in Preview Mode */}
          {!isPlayground && onTogglePlayground && (
            <div className="flex justify-end mb-3 no-print">
              <button
                onClick={onTogglePlayground}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs"
                title="Switch to interactive text highlighter, in-place editor, and styling tools"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Annotate & Edit in Playground</span>
              </button>
            </div>
          )}

          {/* Active Playground Mode Banner inside paper */}
          {isPlayground && (
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 no-print select-none">
              <span className="font-semibold flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-500" />
                <span>Playground Mode: Direct in-place editing & highlighting active</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {hasRestoredDraft ? 'Saved draft restored · Press Cmd+S or Save Changes to update' : 'Unsaved edits are lost on reload · Click Save Changes or press Cmd+S'}
              </span>
            </div>
          )}

          {displayHtml ? (
            <div 
              className="markdown-body w-full break-words outline-none"
              contentEditable={isPlayground}
              suppressContentEditableWarning={true}
              onInput={handleContentInput}
              dangerouslySetInnerHTML={{ __html: displayHtml }} 
            />
          ) : (
            <div className="py-20 text-center text-slate-400">
              <p className="text-base font-medium">Nothing to preview yet</p>
              <p className="text-xs mt-1">Start writing or open a Markdown (.md) file.</p>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
