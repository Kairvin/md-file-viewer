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

  // Store parent scroll position so we can capture from the top
  const scrollParent = element.closest('#preview-container') || element.parentElement;
  const originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
  if (scrollParent) {
    scrollParent.scrollTop = 0;
  }

  // 1. Temporarily apply high-contrast print styling directly to the live DOM element
  element.classList.add('exporting-pdf');

  // Small delay to let browser reflow styles before html2canvas captures
  await new Promise(resolve => setTimeout(resolve, 100));

  // 2. Configure html2pdf with clean margins and no empty gaps
  const opt = {
    margin: [10, 10, 10, 10], // 10mm clean margins
    filename: safeName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 660,
      windowWidth: 660,
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
      avoid: ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'tr', '.code-block-wrapper', '.mermaid-container', '.markdown-alert']
    }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (error) {
    console.error('Direct PDF export error:', error);
    printToPdf(filename.replace(/\.pdf$/, ''));
    return false;
  } finally {
    // 3. Clean up export styling and restore scroll
    element.classList.remove('exporting-pdf');
    if (scrollParent) {
      scrollParent.scrollTop = originalScrollTop;
    }
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
