import React, { useEffect, useRef, useState } from 'react';
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
  Maximize2
} from 'lucide-react';

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
  onDropFile
}) {
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(16); // px

  // Width mapping: defaults to 95% or 100% as requested
  const widthClasses = {
    '95%': 'w-[95%] max-w-[95%] mx-auto',
    '100%': 'w-full max-w-full mx-0 px-4 sm:px-8',
    'wide': 'w-[88%] max-w-7xl mx-auto',
    'standard': 'max-w-4xl mx-auto'
  };

  const nextWidth = () => {
    const modes = ['95%', '100%', 'wide', 'standard'];
    const idx = modes.indexOf(columnWidth);
    setColumnWidth(modes[(idx + 1) % modes.length]);
  };

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

    // Initialize mermaid with current visual theme
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
        
        // Ensure SVG scales responsively to the wide container
        const svgEl = renderDiv.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
          svgEl.classList.add('rounded-lg', 'transition-all');
        }
      } catch (err) {
        console.warn('Mermaid render error for chart', index, err);
        renderDiv.innerHTML = `
          <div class="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono">
            <div class="font-bold flex items-center gap-1.5 mb-1.5">
              <span>⚠️ Could not render diagram visually:</span>
            </div>
            <div class="text-[11px] opacity-90 mb-2">${err?.message || 'Syntax issue in diagram'}</div>
            <pre class="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-xs leading-5"><code>${rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
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
      {/* Floating Zen Controls Bar in Fullscreen / Reader Mode */}
      {isFullscreen && (
        <div 
          id="zen-controls"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 transition-opacity duration-300 opacity-40 hover:opacity-100"
        >
          <span className="text-xs font-semibold text-slate-400 pr-2 border-r border-slate-700 select-none">
            Zen Mode
          </span>

          {/* Font size */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setFontSize(Math.max(13, fontSize - 1))}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono"
              title="Smaller Text (A-)"
            >
              A-
            </button>
            <span className="text-xs text-slate-400 font-mono w-6 text-center">{fontSize}</span>
            <button 
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
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
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
            title="Cycle Reading Width (95% / 100% / Wide / Standard)"
          >
            <AlignJustify className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium font-mono">{columnWidth}</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* PDF Direct */}
          <button 
            onClick={onDirectPdfDownload}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Download PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px]">PDF</span>
          </button>

          {/* Print to PDF */}
          <button 
            onClick={onPrintPdf}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Vector Print to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px]">Print</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Exit Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
            title="Exit Full Screen (Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Exit</span>
          </button>
        </div>
      )}

      {/* Reader Paper Viewport */}
      <main className="py-6 px-2 sm:px-4 md:px-6 flex justify-center min-h-full">
        <article 
          id="preview-paper"
          ref={containerRef}
          style={{ fontSize: `${fontSize}px` }}
          className={`${widthClasses[columnWidth] || widthClasses['95%']} bg-[var(--bg-primary)] text-[var(--text-main)] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-10 md:p-12 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all duration-200`}
        >
          {html ? (
            <div 
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: html }} 
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
