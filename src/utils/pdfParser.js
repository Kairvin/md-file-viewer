import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    console.warn('Could not set pdfjs workerSrc:', e);
  }
}

/**
 * Escapes characters for safe HTML output
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses a PDF file (Blob, File, or ArrayBuffer) into structured, semantic HTML
 * styled like a Markdown document, including headings, paragraphs, lists, and callouts.
 */
export async function parsePdfToHtml(fileOrBuffer, fileName = 'Document.pdf') {
  try {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else if (fileOrBuffer?.buffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer.buffer;
    } else {
      throw new Error('Unsupported PDF file input format');
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    if (numPages === 0) {
      return {
        html: `<div class="p-8 text-center text-slate-400 italic">The PDF document "${escapeHtml(fileName)}" contains no pages.</div>`,
        numPages: 0,
        totalWords: 0
      };
    }

    let allPagesHtml = [];
    let totalWordCount = 0;
    const allFontSizes = [];

    // Phase 1: Collect text items from all pages
    const rawPages = [];
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const items = (textContent.items || []).filter(item => typeof item.str === 'string' && item.str.trim().length > 0);
      rawPages.push({ pageNum, viewport, items });

      items.forEach(item => {
        const fontSize = Math.abs(item.transform?.[0] || item.transform?.[3] || item.height || 12);
        if (fontSize >= 6 && fontSize <= 72) {
          allFontSizes.push(fontSize);
        }
      });
    }

    // Determine baseline body font size (median/mode)
    let bodyFontSize = 12;
    if (allFontSizes.length > 0) {
      allFontSizes.sort((a, b) => a - b);
      bodyFontSize = allFontSizes[Math.floor(allFontSizes.length * 0.45)] || 12;
    }

    // Phase 2: Process each page into lines and semantic HTML blocks
    for (let pIdx = 0; pIdx < rawPages.length; pIdx++) {
      const { pageNum, viewport, items } = rawPages[pIdx];

      if (items.length === 0) {
        allPagesHtml.push(`
          <div class="pdf-scanned-page my-6 p-6 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
            <span>[Scanned or Graphic Page ${pageNum} with no selectable text layer]</span>
          </div>
        `);
        continue;
      }

      // Convert items to unified coordinate lines
      const positioned = items.map(item => {
        const x = item.transform[4] || 0;
        // In PDF, y is bottom-up; convert to top-down
        const y = viewport.height - (item.transform[5] || 0);
        const fontSize = Math.abs(item.transform[0] || item.transform[3] || item.height || 12);
        const fontName = item.fontName || '';
        const isBold = /bold|black|heavy/i.test(fontName);
        const isItalic = /italic|oblique/i.test(fontName);
        const str = item.str || '';

        return {
          x,
          y,
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize,
          isBold,
          isItalic,
          str
        };
      });

      // Sort top-down, then left-to-right
      positioned.sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.x - b.x;
      });

      // Cluster into lines
      const lines = [];
      let currentLine = null;

      for (const item of positioned) {
        if (!currentLine) {
          currentLine = {
            y: item.y,
            minX: item.x,
            maxX: item.x + item.width,
            fontSize: item.fontSize,
            isBold: item.isBold,
            isItalic: item.isItalic,
            parts: [item]
          };
          continue;
        }

        const yDiff = Math.abs(item.y - currentLine.y);
        const lineThreshold = Math.max(4, currentLine.fontSize * 0.45);

        if (yDiff <= lineThreshold) {
          // Same line
          currentLine.parts.push(item);
          currentLine.maxX = Math.max(currentLine.maxX, item.x + item.width);
          currentLine.fontSize = Math.max(currentLine.fontSize, item.fontSize);
          if (item.isBold) currentLine.isBold = true;
          if (item.isItalic) currentLine.isItalic = true;
        } else {
          // Next line
          lines.push(currentLine);
          currentLine = {
            y: item.y,
            minX: item.x,
            maxX: item.x + item.width,
            fontSize: item.fontSize,
            isBold: item.isBold,
            isItalic: item.isItalic,
            parts: [item]
          };
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      // Assemble text for each line with proper spacing
      const processedLines = lines.map(line => {
        let lineText = '';
        for (let i = 0; i < line.parts.length; i++) {
          const part = line.parts[i];
          if (i > 0) {
            const prev = line.parts[i - 1];
            const gap = part.x - (prev.x + prev.width);
            if (gap > 2 && !lineText.endsWith(' ') && !part.str.startsWith(' ')) {
              lineText += ' ';
            }
          }
          lineText += part.str;
        }

        const trimmed = lineText.trim();
        const words = trimmed.split(/\s+/).filter(Boolean).length;
        totalWordCount += words;

        return {
          ...line,
          text: trimmed
        };
      }).filter(l => l.text.length > 0);

      // Convert lines into HTML blocks
      let pageHtml = '';
      let currentParagraph = [];

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const joined = currentParagraph.join(' ');
          // Check for callout pattern
          if (/^(note|important|warning|caution|associated slides|course|reference|tip):/i.test(joined)) {
            pageHtml += `
              <div class="my-5 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 text-slate-800 dark:text-slate-200 text-sm leading-relaxed shadow-2xs">
                ${escapeHtml(joined)}
              </div>
            `;
          } else {
            pageHtml += `<p class="my-3 leading-relaxed text-slate-700 dark:text-slate-200 text-sm sm:text-base">${escapeHtml(joined)}</p>`;
          }
          currentParagraph = [];
        }
      };

      for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        const text = line.text;
        const isHeading1 = line.fontSize >= bodyFontSize * 1.55 || (line.fontSize >= bodyFontSize * 1.35 && line.isBold && pIdx === 0 && i === 0);
        const isHeading2 = !isHeading1 && (line.fontSize >= bodyFontSize * 1.25 || (line.fontSize >= bodyFontSize * 1.15 && line.isBold));
        const isHeading3 = !isHeading1 && !isHeading2 && (line.isBold && text.length < 80);

        // Check for bullet lists
        const isBullet = /^[•\-*–—\u2022\u25E6\u25AA\u25CF]\s+/.test(text) || /^\d+[\.\)]\s+/.test(text);

        if (isHeading1) {
          flushParagraph();
          pageHtml += `
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              ${escapeHtml(text)}
            </h1>
          `;
        } else if (isHeading2) {
          flushParagraph();
          pageHtml += `
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-3">
              ${escapeHtml(text)}
            </h2>
          `;
        } else if (isHeading3 && !isBullet) {
          flushParagraph();
          pageHtml += `
            <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-5 mb-2">
              ${escapeHtml(text)}
            </h3>
          `;
        } else if (isBullet) {
          flushParagraph();
          const cleanBulletText = text.replace(/^[•\-*–—\u2022\u25E6\u25AA\u25CF]\s+/, '').replace(/^\d+[\.\)]\s+/, '');
          pageHtml += `
            <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200">
              <span class="text-blue-500 dark:text-blue-400 font-bold select-none mt-0.5">•</span>
              <div class="flex-1">${escapeHtml(cleanBulletText)}</div>
            </div>
          `;
        } else {
          // Regular paragraph line
          currentParagraph.push(text);

          // If line ends with period/colon/question or there's a big gap to next line, flush
          const nextLine = processedLines[i + 1];
          const hasBigGap = nextLine && (nextLine.y - line.y > line.fontSize * 1.8);
          if (hasBigGap || (/[.:?!]$/.test(text) && text.length > 50)) {
            flushParagraph();
          }
        }
      }

      flushParagraph();

      // Append page container
      allPagesHtml.push(`
        <div class="pdf-page-section" data-page-number="${pageNum}">
          ${pageHtml}
        </div>
      `);

      // Page separator between pages
      if (pageNum < numPages) {
        allPagesHtml.push(`
          <div class="pdf-page-divider my-10 flex items-center justify-center gap-3 select-none text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500" contenteditable="false">
            <span class="h-px bg-slate-200 dark:border-slate-800 flex-1"></span>
            <span class="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              Page ${pageNum} of ${numPages}
            </span>
            <span class="h-px bg-slate-200 dark:border-slate-800 flex-1"></span>
          </div>
        `);
      }
    }

    const finalHtml = allPagesHtml.join('\n');

    return {
      html: finalHtml,
      numPages,
      totalWords: totalWordCount,
      arrayBuffer
    };
  } catch (err) {
    console.error('Failed to parse PDF to HTML:', err);
    throw err;
  }
}

/**
 * High-fidelity sample PDF HTML for initial state and preview
 */
export const SAMPLE_PDF_HTML = `
<div class="pdf-page-section" data-page-number="1">
  <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
    Systems Engineering &amp; High-Availability Architecture
  </h1>
  <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 font-mono">
    Document Ref: SEC-ENG-2026-V4 · Classification: Internal Engineering Review · Updated: October 2026
  </p>

  <div class="my-5 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-3">
    <span class="font-bold text-amber-600 dark:text-amber-400 select-none">Notice:</span>
    <div>
      This system blueprint document is rendered using the client-side Vector PDF parser in high-contrast Markdown paper style. You can edit text directly, select words to highlight with color swatches, add comments, and strikethrough text in Playground Mode.
    </div>
  </div>

  <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-3">
    1. Executive Summary &amp; System Objectives
  </h2>
  <p class="my-3 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    Modern high-throughput cloud environments require zero-trust perimeter enforcement, immutable logging pipelines, and fault-tolerant document processing. This document reviews the core infrastructure topology, storage partitioning strategies, and distributed failover mechanisms designed to achieve 99.999% system availability.
  </p>

  <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-3">
    2. Architectural Pillars &amp; Core Guarantees
  </h2>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-blue-500 dark:text-blue-400 font-bold select-none mt-0.5">•</span>
    <div class="flex-1"><strong>Private Client-Side Execution:</strong> All document transformations and text extractions are processed on-device with WebAssembly and Web Workers.</div>
  </div>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-blue-500 dark:text-blue-400 font-bold select-none mt-0.5">•</span>
    <div class="flex-1"><strong>Resilient IndexedDB Storage:</strong> Playground revisions, annotations, and drafts persist automatically across browser restarts without size quotas.</div>
  </div>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-blue-500 dark:text-blue-400 font-bold select-none mt-0.5">•</span>
    <div class="flex-1"><strong>Cross-Category Unified Workspace:</strong> Seamless switching between Markdown, Word documents, PowerPoint presentations, and PDF files.</div>
  </div>
</div>

<div class="pdf-page-divider my-10 flex items-center justify-center gap-3 select-none text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500" contenteditable="false">
  <span class="h-px bg-slate-200 dark:border-slate-800 flex-1"></span>
  <span class="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
    Page 1 of 2
  </span>
  <span class="h-px bg-slate-200 dark:border-slate-800 flex-1"></span>
</div>

<div class="pdf-page-section" data-page-number="2">
  <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-6 mb-3">
    3. Security Enforcement &amp; Compliance Audit
  </h2>
  <p class="my-3 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    All memory buffers and document streams are strictly partitioned per origin. Encryption keys for stored drafts remain isolated in local cryptographic storage, preventing cross-tenant leakage or unauthorized telemetry interception.
  </p>

  <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mt-5 mb-2">
    Verification Checklist:
  </h3>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-emerald-500 font-bold select-none mt-0.5">✓</span>
    <div class="flex-1">Zero external API dependencies for vector rendering or annotation serialization.</div>
  </div>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-emerald-500 font-bold select-none mt-0.5">✓</span>
    <div class="flex-1">Automatic draft recovery and rollback on browser refresh or navigation.</div>
  </div>
  <div class="flex items-start gap-2.5 my-2 ml-3 sm:ml-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
    <span class="text-emerald-500 font-bold select-none mt-0.5">✓</span>
    <div class="flex-1">Complete WCAG AAA contrast compliance across Dark Mode and Light Paper.</div>
  </div>
</div>
`;
