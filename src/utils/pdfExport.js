import html2pdf from 'html2pdf.js';
export { html2pdf };

/**
 * Trigger native high-fidelity vector PDF print with print stylesheet
 */
export function printToPdf(documentTitle = 'Document') {
  const originalTitle = document.title;
  document.title = documentTitle;
  
  setTimeout(() => {
    window.print();
    document.title = originalTitle;
  }, 100);
}

/**
 * Direct PDF file generation and download with publication-grade
 * typography, high contrast, even spacing, and no awkward page voids.
 */
export async function downloadDirectPdf(element, filename = 'document.pdf') {
  if (!element) return;

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // 1. Create a dedicated off-screen staging wrapper
  // This completely isolates the export from the screen size, split view, or mobile viewport.
  const stagingWrapper = document.createElement('div');
  stagingWrapper.id = 'pdf-render-staging-wrapper';
  stagingWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: -9999px;
    width: 750px;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    z-index: -9999;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    pointer-events: none;
    opacity: 1;
  `;

  // 2. Clone the element deeply
  const clone = element.cloneNode(true);
  clone.id = 'preview-paper-pdf-clone';
  clone.classList.add('exporting-pdf');

  // Strip contentEditable from clone so no cursor or edit outlines are captured
  clone.removeAttribute('contenteditable');
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

  // Clean any zero-width spaces from text nodes in the clone
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    if (textNode.nodeValue.includes('\u200B')) {
      textNode.nodeValue = textNode.nodeValue.replace(/\u200B/g, '');
    }
  }

  // 3. Transfer rendered SVG dimensions (Mermaid diagrams) from live DOM to clone
  const liveSvgs = element.querySelectorAll('svg');
  const cloneSvgs = clone.querySelectorAll('svg');
  liveSvgs.forEach((liveSvg, idx) => {
    const cloneSvg = cloneSvgs[idx];
    if (cloneSvg) {
      const rect = liveSvg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        cloneSvg.setAttribute('width', String(Math.round(rect.width)));
        cloneSvg.setAttribute('height', String(Math.round(rect.height)));
        cloneSvg.style.width = `${Math.round(rect.width)}px`;
        cloneSvg.style.maxWidth = '100%';
        cloneSvg.style.height = 'auto';
      }
    }
  });

  // 4. Remove UI-only controls from clone (copy code buttons, toggle buttons, no-print elements)
  clone.querySelectorAll('button, .copy-code-btn, .mermaid-toggle-btn, .anchor-link, .no-print').forEach(el => el.remove());

  // 5. Exclude comments completely from the downloaded PDF
  // A. Clean elements with .annotated-comment or [data-comment]
  const commentElements = clone.querySelectorAll('.annotated-comment, [data-comment]');
  commentElements.forEach(el => {
    const bg = el.style.backgroundColor;
    const hasHighlightColor = bg && 
      bg !== 'rgb(241, 245, 249)' && 
      bg !== '#f1f5f9' && 
      bg !== 'rgb(51, 65, 85)' && 
      bg !== '#334155' && 
      bg !== 'rgb(33, 38, 45)' && 
      bg !== '#21262d' && 
      bg !== 'rgb(30, 41, 59)' && 
      bg !== '#1e293b' && 
      bg !== 'transparent' &&
      bg !== '';
    const isHighlighted = el.classList.contains('annotated-mark') || hasHighlightColor;

    if (isHighlighted) {
      // Keep highlight background, but completely strip all comment behavior & styling
      el.classList.remove('annotated-comment');
      el.removeAttribute('data-comment');
      el.removeAttribute('title');
      el.style.border = 'none';
      el.style.borderBottom = 'none';
      el.style.cursor = 'inherit';
    } else {
      // It was purely a comment annotation without a highlight - unwrap into plain text
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    }
  });

  // B. Also clean any remaining mark elements that might have default comment backgrounds without a real highlight
  clone.querySelectorAll('mark').forEach(m => {
    const bg = m.style.backgroundColor;
    const isCommentBg = !bg || 
      bg === '#f1f5f9' || bg === 'rgb(241, 245, 249)' || 
      bg === '#334155' || bg === 'rgb(51, 65, 85)' || 
      bg === '#21262d' || bg === 'rgb(33, 38, 45)' || 
      bg === '#1e293b' || bg === 'rgb(30, 41, 59)' || 
      bg === 'transparent';
    if (!m.classList.contains('annotated-mark') && isCommentBg) {
      const parent = m.parentNode;
      if (parent) {
        while (m.firstChild) {
          parent.insertBefore(m.firstChild, m);
        }
        parent.removeChild(m);
      }
    }
  });

  // 6. Highlight and underline styling
  formatHighlightsForPdf(clone);

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  try {
    // 5. Ensure all images inside clone are resolved before capturing
    const images = clone.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    // Reflow delay to ensure fonts and layout settle
    await new Promise(resolve => setTimeout(resolve, 150));

    // 6. Re-check highlights after layout settle and apply pre-pagination
    formatHighlightsForPdf(clone);

    // CSS page height for A4 (750px width, 10mm margins on all 4 sides):
    // Printable width = 190mm, printable height = 277mm -> ratio = 277/190 = 1.45789...
    // Canvas page height at 2x scale = Math.floor(1500 * (277/190)) = 2186px
    // CSS page height = 2186 / 2 = 1093px
    paginatePdfClone(clone, 1093);

    // Short reflow wait after pagination spacers
    await new Promise(resolve => setTimeout(resolve, 50));

    // 7. Production-grade html2pdf configuration
    const opt = {
      margin: [10, 10, 10, 10], // 10mm clean margins for standard A4
      filename: safeName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // 2x high-DPI retina sharpness
        useCORS: true,
        letterRendering: false, // CRITICAL: false prevents overlapping and scrambled text
        backgroundColor: '#ffffff',
        logging: false,
        width: 750,
        windowWidth: 750,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      // Disable html2pdf's buggy scroll-dependent pagebreak plugin since
      // we perform exact mathematical pre-pagination above
      pagebreak: { mode: [] }
    };

    await html2pdf().set(opt).from(clone).save();
    return true;
  } catch (error) {
    console.error('Direct PDF export error, falling back to native vector print:', error);
    printToPdf(filename.replace(/\.pdf$/, ''));
    return false;
  } finally {
    // 7. Always remove the staging container from DOM
    stagingWrapper.remove();
  }
}

/**
 * Download raw markdown string as a .md file
 */
export function downloadMarkdown(content, filename = 'document.md') {
  const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export standalone styled HTML file
 */
export function downloadHtml(renderedHtml, title = 'Document') {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 10px; overflow-x: auto; }
    code { font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    th { background: #f1f5f9; }
    blockquote { border-left: 4px solid #3b82f6; margin: 0; padding-left: 16px; color: #475569; }
    .markdown-alert { padding: 14px; border-radius: 8px; margin: 16px 0; border-left: 4px solid; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format mark and underline elements for PDF export to achieve vertical centering
 * without shifting or disturbing text line breaks.
 */
export function formatHighlightsForPdf(clone) {
  if (!clone) return;

  clone.querySelectorAll('mark, .annotated-mark').forEach(mark => {
    const bg = mark.style.backgroundColor || window.getComputedStyle(mark).backgroundColor || '#fef08a';
    const color = mark.style.color || window.getComputedStyle(mark).color || '#0f172a';
    const rects = mark.getClientRects();

    if (rects.length > 1) {
      // Multi-line highlight: wraps cleanly across lines with box-decoration-break
      mark.classList.add('pdf-multiline');
      mark.style.display = 'inline';
      mark.style.padding = '3px 4px 1px 4px';
      mark.style.borderRadius = '3px';
      mark.style.boxDecorationBreak = 'clone';
      mark.style.webkitBoxDecorationBreak = 'clone';
      mark.style.verticalAlign = 'baseline';
      mark.style.lineHeight = 'inherit';
      mark.style.backgroundColor = bg;
      mark.style.color = color;
    } else {
      // Single-line highlight: inline-block with vertical-align: -2px perfectly centers the text vertically inside the box
      mark.style.display = 'inline-block';
      mark.style.verticalAlign = '-2px';
      mark.style.lineHeight = '1.25';
      mark.style.padding = '1px 4px';
      mark.style.borderRadius = '3px';
      mark.style.backgroundColor = bg;
      mark.style.color = color;
    }
  });

  clone.querySelectorAll('u, [style*="text-decoration: underline"], [style*="text-decoration:underline"]').forEach(u => {
    u.style.display = 'inline';
    u.style.lineHeight = 'inherit';
    u.style.verticalAlign = 'baseline';
    u.style.textDecoration = 'underline';
    u.style.textUnderlineOffset = '2.5px';
    u.style.textDecorationThickness = '1.5px';
    u.style.textDecorationSkipInk = 'none';
  });
}

/**
 * Split a paragraph, list item, or blockquote cleanly between lines at boundaryY
 * so that no line is horizontally cut across pages.
 */
function splitElementBetweenLines(element, boundaryY, cloneTop) {
  const range = document.createRange();
  let cutFound = false;

  function findLineCut(node) {
    if (cutFound) return null;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent.length;
      for (let i = 0; i < len; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        const charBottom = r.bottom - cloneTop;
        if (charBottom >= boundaryY - 4) {
          // Found character that reaches or crosses boundaryY
          // Walk backward to find the beginning of this line
          const lineTop = r.top;
          let lineStart = i;
          while (lineStart > 0) {
            range.setStart(node, lineStart - 1);
            range.setEnd(node, lineStart);
            const prevR = range.getBoundingClientRect();
            if (Math.abs(prevR.top - lineTop) > 4) break;
            lineStart--;
          }
          cutFound = true;
          return { node, offset: lineStart };
        }
      }
    } else {
      for (const child of node.childNodes) {
        const res = findLineCut(child);
        if (res) return res;
      }
    }
    return null;
  }

  const cut = findLineCut(element);
  if (cut && (cut.offset > 0 || cut.node !== element.firstChild)) {
    const cutRange = document.createRange();
    cutRange.setStart(cut.node, cut.offset);
    cutRange.setEndAfter(element.lastChild);

    const extractedFragment = cutRange.extractContents();

    const secondBlock = element.cloneNode(false);
    secondBlock.style.marginTop = '0px';
    secondBlock.appendChild(extractedFragment);

    const p1Bottom = element.getBoundingClientRect().bottom - cloneTop;
    const spacerHeight = boundaryY - p1Bottom;

    const spacer = document.createElement('div');
    spacer.className = 'pdf-pagebreak-spacer';
    spacer.style.display = 'block';
    spacer.style.height = `${Math.max(0, spacerHeight)}px`;
    spacer.style.margin = '0';
    spacer.style.padding = '0';
    spacer.style.border = 'none';
    spacer.style.background = 'transparent';

    element.parentNode.insertBefore(spacer, element.nextSibling);
    element.parentNode.insertBefore(secondBlock, spacer.nextSibling);
  } else {
    // Fallback: push entire element to next page
    const r = element.getBoundingClientRect();
    const spacerHeight = boundaryY - (r.top - cloneTop);
    const spacer = document.createElement('div');
    spacer.className = 'pdf-pagebreak-spacer';
    spacer.style.display = 'block';
    spacer.style.height = `${Math.max(0, spacerHeight)}px`;
    spacer.style.margin = '0';
    spacer.style.padding = '0';
    spacer.style.border = 'none';
    spacer.style.background = 'transparent';
    element.parentNode.insertBefore(spacer, element);
  }
}

/**
 * Intelligent DOM pre-pagination for PDF export.
 * Traverses content blocks, detects page break boundary intersections,
 * protects orphan headings, and inserts precise spacers so that NO line is sliced in half.
 */
export function paginatePdfClone(container, pageHeight = 1093) {
  if (!container) return;

  const cloneTop = container.getBoundingClientRect().top;
  let pageIndex = 1;
  const maxPages = 50;

  while (pageIndex < maxPages) {
    const boundaryY = pageIndex * pageHeight;
    const containerBottom = container.getBoundingClientRect().bottom - cloneTop;
    if (boundaryY >= containerBottom - 10) break;

    const blocks = Array.from(container.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, li, blockquote, .code-block-wrapper, .mermaid-container, .markdown-alert, .table-container, table, tr, figure, img, .katex-display'
    ));

    let crossingBlock = null;

    for (const block of blocks) {
      if (block.classList.contains('pdf-pagebreak-spacer') || block.closest('.pdf-pagebreak-spacer')) continue;

      const r = block.getBoundingClientRect();
      if (r.height === 0) continue;

      const bTop = r.top - cloneTop;
      const bBottom = r.bottom - cloneTop;

      const isHeading = /^H[1-6]$/.test(block.tagName);
      // Orphan heading prevention: if heading starts within 85px of boundary, push heading to next page
      if (isHeading && bTop < boundaryY && (boundaryY - bTop < 85 || bBottom >= boundaryY)) {
        crossingBlock = block;
        break;
      }

      if (bTop < boundaryY && bBottom > boundaryY) {
        if (block.tagName === 'TABLE' || block.classList.contains('table-container')) continue;
        crossingBlock = block;
        break;
      }
    }

    if (!crossingBlock) {
      pageIndex++;
      continue;
    }

    const blockRect = crossingBlock.getBoundingClientRect();
    const blockTop = blockRect.top - cloneTop;
    const isHeading = /^H[1-6]$/.test(crossingBlock.tagName);
    const isAtomic = isHeading || crossingBlock.matches('.code-block-wrapper, .mermaid-container, .markdown-alert, figure, img, .katex-display');
    const availableHeight = boundaryY - blockTop;

    if (crossingBlock.tagName === 'TR') {
      const spacerHeight = boundaryY - blockTop;
      const spacerTr = document.createElement('tr');
      spacerTr.className = 'pdf-pagebreak-spacer';
      spacerTr.style.border = 'none';
      const td = document.createElement('td');
      td.colSpan = 100;
      td.style.height = `${Math.max(0, spacerHeight)}px`;
      td.style.border = 'none';
      td.style.padding = '0';
      td.style.margin = '0';
      td.style.background = 'transparent';
      spacerTr.appendChild(td);
      crossingBlock.parentNode.insertBefore(spacerTr, crossingBlock);
    } else if (crossingBlock.tagName === 'LI') {
      if (availableHeight < 55 || blockRect.height < 60) {
        const spacerHeight = boundaryY - blockTop;
        const spacerLi = document.createElement('li');
        spacerLi.className = 'pdf-pagebreak-spacer';
        spacerLi.style.listStyle = 'none';
        spacerLi.style.height = `${Math.max(0, spacerHeight)}px`;
        spacerLi.style.border = 'none';
        spacerLi.style.padding = '0';
        spacerLi.style.margin = '0';
        crossingBlock.parentNode.insertBefore(spacerLi, crossingBlock);
      } else {
        splitElementBetweenLines(crossingBlock, boundaryY, cloneTop);
      }
    } else if (isAtomic || availableHeight < 55) {
      const spacerHeight = boundaryY - blockTop;
      const spacer = document.createElement('div');
      spacer.className = 'pdf-pagebreak-spacer';
      spacer.style.display = 'block';
      spacer.style.height = `${Math.max(0, spacerHeight)}px`;
      spacer.style.margin = '0';
      spacer.style.padding = '0';
      spacer.style.border = 'none';
      spacer.style.background = 'transparent';
      crossingBlock.parentNode.insertBefore(spacer, crossingBlock);
    } else if (crossingBlock.tagName === 'P' || crossingBlock.tagName === 'BLOCKQUOTE') {
      splitElementBetweenLines(crossingBlock, boundaryY, cloneTop);
    } else {
      const spacerHeight = boundaryY - blockTop;
      const spacer = document.createElement('div');
      spacer.className = 'pdf-pagebreak-spacer';
      spacer.style.display = 'block';
      spacer.style.height = `${Math.max(0, spacerHeight)}px`;
      spacer.style.margin = '0';
      spacer.style.padding = '0';
      spacer.style.border = 'none';
      spacer.style.background = 'transparent';
      crossingBlock.parentNode.insertBefore(spacer, crossingBlock);
    }

    pageIndex++;
  }
}

/**
 * Exports PowerPoint slides to a multi-page presentation PDF
 * with one slide cleanly rendered per page.
 */
export async function downloadPresentationPdf(element, filename = 'presentation.pdf') {
  if (!element) return;

  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const stagingWrapper = document.createElement('div');
  stagingWrapper.id = 'pdf-presentation-staging-wrapper';
  stagingWrapper.style.cssText = `
    position: absolute;
    top: 0;
    left: -9999px;
    width: 900px;
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    z-index: -9999;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    pointer-events: none;
    opacity: 1;
  `;

  const clone = element.cloneNode(true);
  clone.removeAttribute('contenteditable');
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));

  // Clean any zero-width spaces
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    if (textNode.nodeValue.includes('\u200B')) {
      textNode.nodeValue = textNode.nodeValue.replace(/\u200B/g, '');
    }
  }

  // Format slide cards for page breaks
  const slides = clone.querySelectorAll('.pptx-slide-card');
  slides.forEach((slide, idx) => {
    slide.style.boxShadow = 'none';
    slide.style.border = '1px solid #e2e8f0';
    slide.style.borderRadius = '8px';
    slide.style.marginBottom = '20px';
    slide.style.pageBreakInside = 'avoid';
    if (idx < slides.length - 1) {
      slide.style.pageBreakAfter = 'always';
    }
  });

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  const opt = {
    margin: [10, 10, 10, 10],
    filename: safeName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(stagingWrapper).save();
  } catch (err) {
    console.error('Presentation PDF generation failed:', err);
  } finally {
    if (stagingWrapper.parentNode) {
      stagingWrapper.parentNode.removeChild(stagingWrapper);
    }
  }
}

