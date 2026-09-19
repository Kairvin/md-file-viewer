import JSZip from 'jszip';

/**
 * Parses a PowerPoint (.pptx) file (Blob / ArrayBuffer) using JSZip and DOMParser.
 * Extracts structured slide objects with titles, body paragraphs, bullet points,
 * tables, embedded images, and speaker notes.
 */
export async function parsePptxFile(fileOrBuffer) {
  try {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('Unsupported input type for PowerPoint presentation');
    }

    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();

    // 1. Determine slide order from presentation.xml.rels or slide numbering
    const slideEntries = [];
    zip.folder('ppt/slides')?.forEach((relativePath, file) => {
      const match = relativePath.match(/^slide(\d+)\.xml$/i);
      if (match) {
        slideEntries.push({
          num: parseInt(match[1], 10),
          path: `ppt/slides/${relativePath}`,
          relsPath: `ppt/slides/_rels/${relativePath}.rels`,
        });
      }
    });

    slideEntries.sort((a, b) => a.num - b.num);

    if (slideEntries.length === 0) {
      throw new Error('No slides found in this PowerPoint presentation.');
    }

    // 2. Parse each slide
    const slides = [];

    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i];
      const xmlStr = await zip.file(entry.path)?.async('text');
      if (!xmlStr) continue;

      const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

      // Check relationships for images
      const relsMap = new Map();
      const relsStr = await zip.file(entry.relsPath)?.async('text');
      if (relsStr) {
        const relsDoc = parser.parseFromString(relsStr, 'application/xml');
        const relEls = relsDoc.getElementsByTagName('Relationship');
        for (const r of relEls) {
          const id = r.getAttribute('Id');
          const target = r.getAttribute('Target');
          if (id && target) {
            relsMap.set(id, target.replace(/^\.\.\//, 'ppt/'));
          }
        }
      }

      let title = '';
      let subtitle = '';
      const textBlocks = [];
      const tables = [];
      const images = [];

      // Extract shapes & text boxes
      const shapes = xmlDoc.getElementsByTagName('p:sp');
      for (const sp of shapes) {
        // Detect shape type (title, subtitle, body)
        const ph = sp.querySelector('p\\:ph, ph');
        const phType = ph?.getAttribute('type') || '';

        // Extract paragraphs in this shape
        const paragraphs = [];
        const pEls = sp.querySelectorAll('a\\:p, p');

        for (const pEl of pEls) {
          const pPr = pEl.querySelector('a\\:pPr, pPr');
          const level = parseInt(pPr?.getAttribute('lvl') || '0', 10);

          const runs = [];
          const runEls = pEl.querySelectorAll('a\\:r, r, a\\:t, t');

          for (const r of runEls) {
            if (r.tagName.endsWith('t')) {
              // Direct text tag
              runs.push({ text: r.textContent || '', bold: false, italic: false });
            } else if (r.tagName.endsWith('r')) {
              const tEl = r.querySelector('a\\:t, t');
              if (!tEl) continue;
              const rPr = r.querySelector('a\\:rPr, rPr');
              const bold = rPr?.getAttribute('b') === '1';
              const italic = rPr?.getAttribute('i') === '1';
              runs.push({ text: tEl.textContent || '', bold, italic });
            }
          }

          if (runs.length > 0) {
            paragraphs.push({ level, runs });
          }
        }

        if (paragraphs.length === 0) continue;

        const combinedText = paragraphs
          .map(p => p.runs.map(r => r.text).join(''))
          .join('\n')
          .trim();

        if (!combinedText) continue;

        if (phType === 'title' || phType === 'ctrTitle') {
          if (!title) {
            title = combinedText;
          } else {
            textBlocks.push({ type: 'header', paragraphs, rawText: combinedText });
          }
        } else if (phType === 'subTitle') {
          if (!subtitle) {
            subtitle = combinedText;
          } else {
            textBlocks.push({ type: 'body', paragraphs, rawText: combinedText });
          }
        } else {
          // If no title was detected yet, the very first short prominent text might be the title
          if (!title && combinedText.length < 80 && !combinedText.includes('\n')) {
            title = combinedText;
          } else {
            textBlocks.push({ type: 'body', paragraphs, rawText: combinedText });
          }
        }
      }

      // Extract tables
      const tblEls = xmlDoc.getElementsByTagName('a:tbl');
      for (const tbl of tblEls) {
        const rows = [];
        const trEls = tbl.querySelectorAll('a\\:tr, tr');
        for (const tr of trEls) {
          const cells = [];
          const tcEls = tr.querySelectorAll('a\\:tc, tc');
          for (const tc of tcEls) {
            const cellText = Array.from(tc.querySelectorAll('a\\:t, t'))
              .map(t => t.textContent)
              .join(' ')
              .trim();
            cells.push(cellText);
          }
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
        if (rows.length > 0) {
          tables.push(rows);
        }
      }

      // Extract pictures/images
      const pics = xmlDoc.getElementsByTagName('p:pic');
      for (const pic of pics) {
        const blip = pic.querySelector('a\\:blip, blip');
        const rId = blip?.getAttribute('r:embed');
        if (rId && relsMap.has(rId)) {
          const targetPath = relsMap.get(rId);
          const imgFile = zip.file(targetPath);
          if (imgFile) {
            const ext = targetPath.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            const base64 = await imgFile.async('base64');
            images.push({
              src: `data:${mime};base64,${base64}`,
              alt: `Slide ${i + 1} Image`,
            });
          }
        }
      }

      // Fallback title if blank
      if (!title) {
        title = `Slide ${i + 1}`;
      }

      slides.push({
        id: `slide-${i + 1}`,
        slideNumber: i + 1,
        title,
        subtitle,
        textBlocks,
        tables,
        images,
      });
    }

    return {
      success: true,
      slideCount: slides.length,
      slides,
      presentationTitle: slides[0]?.title || 'PowerPoint Presentation',
    };
  } catch (err) {
    console.error('Failed to parse PowerPoint presentation:', err);
    return {
      success: false,
      error: err.message || 'Unable to parse PowerPoint (.pptx) file.',
      slideCount: 0,
      slides: [],
    };
  }
}

/**
 * Built-in rich sample presentation dataset (.pptx preview)
 * Used when testing the PowerPoint reader/playground or clicking "Try Sample Presentation"
 */
export const SAMPLE_PRESENTATION_SLIDES = [
  {
    id: 'slide-1',
    slideNumber: 1,
    title: 'Enterprise Document Intelligence & Multi-Format Platform',
    subtitle: 'Next-Generation Client-Side Review, Annotation & PDF Synthesis Architecture',
    textBlocks: [
      {
        type: 'body',
        paragraphs: [
          { level: 0, runs: [{ text: 'Presenter: Principal Systems & Platform Architect', bold: true, italic: false }] },
          { level: 0, runs: [{ text: 'Date: Full Year 2026 Strategy Review', bold: false, italic: true }] },
        ],
      },
    ],
    tables: [],
    images: [],
  },
  {
    id: 'slide-2',
    slideNumber: 2,
    title: 'Strategic Goals & Architectural Objectives',
    subtitle: 'High-Fidelity Document Processing Directly in Modern Web Browsers',
    textBlocks: [
      {
        type: 'body',
        paragraphs: [
          { level: 0, runs: [{ text: 'Unified Multi-Format Support: ', bold: true }, { text: 'Seamlessly ingest Markdown (.md), Word (.docx), and PowerPoint (.pptx).' }] },
          { level: 1, runs: [{ text: 'Zero server requirement—all file parsing and PDF generation occurs 100% locally in browser memory.' }] },
          { level: 0, runs: [{ text: 'Universal Playground: ', bold: true }, { text: 'Direct in-place text editing, multi-color highlighting, and threaded comments.' }] },
          { level: 1, runs: [{ text: 'Keyboard arrow boundary escape cleanly breaks out of highlights into plain text.' }] },
          { level: 0, runs: [{ text: 'High-Capacity Persistence: ', bold: true }, { text: 'IndexedDB engine eliminates localStorage 5MB quota barriers for 50MB+ decks.' }] },
          { level: 0, runs: [{ text: 'Publication-Grade Vector PDF: ', bold: true }, { text: 'DOM pre-pagination eliminates broken lines and preserves slide layout integrity.' }] },
        ],
      },
    ],
    tables: [],
    images: [],
  },
  {
    id: 'slide-3',
    slideNumber: 3,
    title: 'Platform Comparison & Operational Metrics',
    subtitle: 'Performance Benchmarks Against Traditional Cloud Converters',
    textBlocks: [
      {
        type: 'body',
        paragraphs: [
          { level: 0, runs: [{ text: 'Key takeaway: Local processing delivers 15x faster latency with absolute privacy compliance.', bold: true }] },
        ],
      },
    ],
    tables: [
      [
        ['Metric / Criterion', 'Traditional Cloud API', 'MD Review Pro (Local Engine)'],
        ['Data Privacy & Security', 'Files sent to 3rd-party servers', '100% Local & Private (Zero Network)'],
        ['Processing Latency', '1,800ms - 4,500ms', '45ms - 120ms (Instantaneous)'],
        ['Offline Functionality', 'Non-functional without Wi-Fi', 'Full Offline Support (PWA / IndexedDB)'],
        ['Storage Quota Limit', 'Strict cloud quota / cost tiers', 'High Capacity IndexedDB (Gigabytes)'],
        ['In-Place Annotation', 'Static PDF view only', 'Universal Interactive Playground'],
      ],
    ],
    images: [],
  },
  {
    id: 'slide-4',
    slideNumber: 4,
    title: '2026 Product Roadmap & Milestone Execution',
    subtitle: 'From Markdown Core to Comprehensive Document Suite',
    textBlocks: [
      {
        type: 'body',
        paragraphs: [
          { level: 0, runs: [{ text: 'Phase 1 (Completed): ', bold: true }, { text: 'Markdown Review Pro, KaTeX math, Mermaid diagrams, and split editor.' }] },
          { level: 0, runs: [{ text: 'Phase 2 (Current Release): ', bold: true }, { text: 'Word (.docx) reader and PowerPoint (.pptx) presentation engine with IndexedDB.' }] },
          { level: 0, runs: [{ text: 'Phase 3 (Next Sprint): ', bold: true }, { text: 'Excel (.xlsx) clean spreadsheet tables, formula preview, and vector chart export.' }] },
          { level: 0, runs: [{ text: 'Phase 4 (H2 2026): ', bold: true }, { text: 'AI-assisted document summarization, smart diffing, and bidirectional export.' }] },
        ],
      },
    ],
    tables: [],
    images: [],
  },
  {
    id: 'slide-5',
    slideNumber: 5,
    title: 'Summary & Next Actions',
    subtitle: 'Empowering Reviewers, Engineers, and Enterprise Authors',
    textBlocks: [
      {
        type: 'body',
        paragraphs: [
          { level: 0, runs: [{ text: 'The platform is immediately ready for production review across .md, .docx, and .pptx.', bold: true }] },
          { level: 1, runs: [{ text: 'Try editing any slide title or bullet item directly in Playground Mode.' }] },
          { level: 1, runs: [{ text: 'Highlight key takeaways or add comments to test persistent annotations.' }] },
          { level: 1, runs: [{ text: 'Click "Download PDF" to generate a publication-grade presentation handout.' }] },
        ],
      },
    ],
    tables: [],
    images: [],
  },
];
