import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';

/**
 * Custom slugify for heading IDs
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, '-') // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

/**
 * Parse markdown and extract TOC + rendered HTML
 */
export function parseMarkdown(markdownText) {
  if (!markdownText) {
    return { 
      html: '', 
      toc: [], 
      stats: { words: 0, characters: 0, readTime: 1 } 
    };
  }

  const toc = [];

  // Calculate statistics
  const plainText = markdownText.replace(/[#*`~_\[\]()\-+>]/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const characters = markdownText.length;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const stats = { words, characters, readTime };

  // Configure marked renderer
  const renderer = new marked.Renderer();

  // Custom heading renderer to capture TOC and inject anchor links
  renderer.heading = function({ text, depth }) {
    const rawHeadingText = text.replace(/<[^>]*>/g, '');
    const id = slugify(rawHeadingText) || `heading-${toc.length + 1}`;
    
    // Save to TOC if H1, H2, or H3
    if (depth <= 3) {
      toc.push({
        id,
        text: rawHeadingText,
        level: depth
      });
    }

    return `
      <h${depth} id="${id}" class="heading-anchor group relative scroll-mt-20">
        <a href="#${id}" class="anchor-link opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -left-6 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 no-underline text-lg font-mono">#</a>
        ${text}
      </h${depth}>
    `;
  };

  // Custom code renderer with syntax highlighting, copy button, and Mermaid diagram support
  renderer.code = function({ text, lang }) {
    const cleanLang = (lang || '').trim().toLowerCase();

    // Dedicated handler for Mermaid Mind Maps, Flowcharts, and Diagrams
    if (cleanLang === 'mermaid') {
      const encodedRaw = encodeURIComponent(text);
      return `
        <div class="mermaid-container my-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-7 shadow-lg transition-all" data-mermaid="${encodedRaw}">
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80 text-xs select-none">
            <div class="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span class="font-semibold tracking-wide uppercase text-[11px] text-blue-600 dark:text-blue-400">Concept Map / Diagram</span>
            </div>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                class="mermaid-toggle-btn px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Toggle Source
              </button>
              <button 
                type="button" 
                class="copy-code-btn px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                data-code="${encodedRaw}"
              >
                <span class="btn-text">Copy</span>
              </button>
            </div>
          </div>
          <div class="mermaid-render flex justify-center items-center py-4 w-full overflow-x-auto min-h-[140px]">
            <div class="text-slate-400 text-xs flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              <span>Rendering concept map...</span>
            </div>
          </div>
          <div class="mermaid-source hidden mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <pre class="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto"><code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
        </div>
      `;
    }

    const validLang = cleanLang && hljs.getLanguage(cleanLang) ? cleanLang : null;
    const languageLabel = validLang ? validLang.toUpperCase() : (cleanLang ? cleanLang.toUpperCase() : 'CODE');
    
    let highlighted;
    try {
      if (validLang) {
        highlighted = hljs.highlight(text, { language: validLang, ignoreIllegals: true }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
    } catch {
      highlighted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const encodedRaw = encodeURIComponent(text);

    return `
      <div class="code-block-wrapper my-6 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-900 text-slate-100 shadow-md">
        <div class="code-header flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 text-xs font-mono select-none">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
            <span class="ml-2 font-semibold text-slate-400 tracking-wider">${languageLabel}</span>
          </div>
          <button 
            type="button"
            class="copy-code-btn px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            data-code="${encodedRaw}"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <span class="btn-text">Copy</span>
          </button>
        </div>
        <pre class="p-4 overflow-x-auto text-sm leading-relaxed font-mono"><code>${highlighted}</code></pre>
      </div>
    `;
  };

  // Custom image renderer with graceful broken-link fallback
  renderer.image = function({ href, title, text }) {
    const caption = text || title || '';
    return `
      <figure class="my-6 flex flex-col items-center">
        <img 
          src="${href}" 
          alt="${caption}" 
          title="${title || ''}" 
          class="rounded-xl max-w-full shadow-md border border-slate-200 dark:border-slate-800" 
          loading="lazy"
          onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';"
        />
        <div class="hidden items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-mono shadow-sm">
          <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span>🖼️ Image placeholder: ${caption || href}</span>
        </div>
        ${caption ? `<figcaption class="mt-2 text-xs text-slate-400 font-medium text-center">${caption}</figcaption>` : ''}
      </figure>
    `;
  };

  // Custom table renderer
  renderer.table = function({ header, rows }) {
    let headerHtml = '';
    if (header && header.length) {
      headerHtml = '<thead><tr>' + header.map(cell => {
        const alignClass = cell.align ? `text-${cell.align}` : 'text-left';
        const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
        return `<th class="px-4 py-3 ${alignClass} font-semibold border-b border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70">${content}</th>`;
      }).join('') + '</tr></thead>';
    }

    let bodyHtml = '';
    if (rows && rows.length) {
      bodyHtml = '<tbody>' + rows.map((row, idx) => {
        const rowBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/30';
        return `<tr class="${rowBg} hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">` +
          row.map(cell => {
            const alignClass = cell.align ? `text-${cell.align}` : 'text-left';
            const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
            return `<td class="px-4 py-2.5 ${alignClass} border-b border-slate-200/80 dark:border-slate-800">${content}</td>`;
          }).join('') +
          '</tr>';
      }).join('') + '</tbody>';
    }

    return `
      <div class="table-container my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table class="w-full text-sm border-collapse">
          ${headerHtml}
          ${bodyHtml}
        </table>
      </div>
    `;
  };

  // Pre-process Math & GitHub Alerts before marked parsing
  let processed = markdownText;

  // 1. Process display math: $$...$$
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      return `<div class="katex-display-wrapper my-6 overflow-x-auto py-2 text-center select-all">${rendered}</div>`;
    } catch {
      return `<div class="text-red-500 font-mono text-sm">[Math Render Error]</div>`;
    }
  });

  // 2. Process inline math: $...$ (ensure not double dollars or empty)
  processed = processed.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `$${math}$`;
    }
  });

  // 3. Process GitHub Alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
  const alertTypes = {
    NOTE: {
      title: 'Note',
      border: 'border-blue-500 dark:border-blue-400',
      bg: 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200',
      icon: '<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    },
    TIP: {
      title: 'Tip',
      border: 'border-emerald-500 dark:border-emerald-400',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200',
      icon: '<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>'
    },
    IMPORTANT: {
      title: 'Important',
      border: 'border-purple-500 dark:border-purple-400',
      bg: 'bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200',
      icon: '<svg class="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
    },
    WARNING: {
      title: 'Warning',
      border: 'border-amber-500 dark:border-amber-400',
      bg: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200',
      icon: '<svg class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
    },
    CAUTION: {
      title: 'Caution',
      border: 'border-rose-500 dark:border-rose-400',
      bg: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200',
      icon: '<svg class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    }
  };

  // Match blockquotes that start with [!TYPE]
  processed = processed.replace(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>.*\n?)*)/gim, (match, type, contentLines) => {
    const upperType = type.toUpperCase();
    const config = alertTypes[upperType] || alertTypes.NOTE;
    // Strip leading "> " from subsequent lines
    const cleanContent = contentLines.split('\n').map(line => line.replace(/^>\s?/, '')).join('\n').trim();
    const parsedBody = marked.parse(cleanContent, { gfm: true, breaks: true });
    
    return `
      <div class="markdown-alert my-5 p-4 rounded-xl border-l-4 ${config.border} ${config.bg} shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          ${config.icon}
          <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${config.badge}">${config.title}</span>
        </div>
        <div class="markdown-alert-body text-sm leading-relaxed">
          ${parsedBody}
        </div>
      </div>
    `;
  });

  // Parse remaining markdown
  const html = marked.parse(processed, {
    renderer,
    gfm: true,
    breaks: true,
    pedantic: false
  });

  return { html, toc, stats };
}
