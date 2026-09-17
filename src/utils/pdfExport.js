import html2pdf from 'html2pdf.js';

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

    // 6. Production-grade html2pdf configuration
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
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: [
          '.mermaid-container', 
          '.code-block-wrapper', 
          '.markdown-alert', 
          '.table-container', 
          'figure', 
          'h1', 
          'h2', 
          'h3',
          'blockquote'
        ]
      }
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
