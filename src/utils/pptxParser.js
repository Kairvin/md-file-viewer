import JSZip from 'jszip';

/**
 * Bulletproof text deduplication helper
 * Detects and collapses duplicated strings like "SyllabusSyllabus" or "Phrase Phrase"
 */
export function deduplicateText(str) {
  if (!str || typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (trimmed.length < 4) return str;

  // 1. Direct character-level repetition (2x, 3x, 4x)
  for (let k = 2; k <= 4; k++) {
    if (trimmed.length % k === 0) {
      const chunkLen = trimmed.length / k;
      const chunk = trimmed.slice(0, chunkLen);
      if (chunk.repeat(k) === trimmed) {
        return chunk;
      }
    }
  }

  // 2. Word-level repetition (e.g. "Basics of Cell Basics of Cell")
  const words = trimmed.split(/\s+/);
  for (let k = 2; k <= 4; k++) {
    if (words.length >= k && words.length % k === 0) {
      const chunkLen = words.length / k;
      const chunk1 = words.slice(0, chunkLen).join(' ');
      const chunk2 = words.slice(chunkLen, 2 * chunkLen).join(' ');
      if (chunk1.toLowerCase() === chunk2.toLowerCase()) {
        return words.slice(0, chunkLen).join(' ');
      }
    }
  }

  return str;
}

/**
 * Deduplicates consecutive runs, repeated sequences of runs, and total concatenated runs
 */
export function deduplicateRuns(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return [];
  let sanitized = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (!r) continue;
    const cleanText = deduplicateText(r.text || '');
    if (!cleanText && !r.isBreak) continue;

    // Skip consecutive duplicate runs
    if (sanitized.length > 0) {
      const prev = sanitized[sanitized.length - 1];
      const prevNorm = (prev.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const currNorm = cleanText.replace(/\s+/g, ' ').trim().toLowerCase();
      if (prevNorm && currNorm && prevNorm === currNorm) {
        continue;
      }
    }
    sanitized.push({ ...r, text: cleanText });
  }

  // Check if the whole array of runs was duplicated [A, B, A, B]
  if (sanitized.length >= 2 && sanitized.length % 2 === 0) {
    const half = sanitized.length / 2;
    const firstHalf = sanitized.slice(0, half).map(r => r.text).join('').trim();
    const secondHalf = sanitized.slice(half).map(r => r.text).join('').trim();
    if (firstHalf && firstHalf === secondHalf) {
      sanitized = sanitized.slice(0, half);
    }
  }

  // Check if the total concatenated text is duplicated across runs
  const fullText = sanitized.map(r => r.text || '').join('');
  const cleanFull = deduplicateText(fullText);
  if (cleanFull && cleanFull.length < fullText.length) {
    const truncated = [];
    let remChars = cleanFull.length;
    for (const r of sanitized) {
      if (remChars <= 0) break;
      const rLen = (r.text || '').length;
      if (rLen <= remChars) {
        truncated.push(r);
        remChars -= rLen;
      } else {
        truncated.push({ ...r, text: r.text.slice(0, remChars) });
        remChars = 0;
        break;
      }
    }
    return truncated;
  }

  return sanitized;
}

/**
 * Helper to resolve colors from OpenXML color elements
 */
function extractColorFromElement(fillEl, themeColors = {}) {
  if (!fillEl) return undefined;
  
  // 1. Direct srgbClr (Hex)
  const srgb = fillEl.querySelector('a\\:srgbClr, srgbClr');
  if (srgb) {
    const val = srgb.getAttribute('val');
    if (val) return `#${val}`;
  }

  // 2. Theme schemeClr
  const scheme = fillEl.querySelector('a\\:schemeClr, schemeClr');
  if (scheme) {
    const val = scheme.getAttribute('val');
    if (val) {
      if (themeColors[val]) return themeColors[val];
      // Standard fallback mappings
      if (val === 'tx1') return themeColors.dk1 || '#0f172a';
      if (val === 'tx2') return themeColors.dk2 || '#334155';
      if (val === 'bg1') return themeColors.lt1 || '#ffffff';
      if (val === 'bg2') return themeColors.lt2 || '#f8fafc';
      if (val.startsWith('accent')) return themeColors[val] || '#3b82f6';
    }
  }

  // 3. System color sysClr
  const sys = fillEl.querySelector('a\\:sysClr, sysClr');
  if (sys) {
    const lastClr = sys.getAttribute('lastClr');
    if (lastClr) return `#${lastClr}`;
  }

  return undefined;
}

/**
 * Parses theme1.xml to extract theme colors and font definitions
 */
async function parsePptxTheme(zip, parser) {
  const theme = {
    colors: {
      dk1: '#000000',
      lt1: '#ffffff',
      dk2: '#1f497d',
      lt2: '#eeece1',
      accent1: '#4f81bd',
      accent2: '#c0504d',
      accent3: '#9bbb59',
      accent4: '#8064a2',
      accent5: '#4bacc6',
      accent6: '#f79646',
      hlink: '#0000ff',
      folHlink: '#800080',
    },
    fonts: {
      major: 'Plus Jakarta Sans, sans-serif',
      minor: 'Plus Jakarta Sans, sans-serif',
    }
  };

  try {
    const themeStr = await zip.file('ppt/theme/theme1.xml')?.async('text');
    if (!themeStr) return theme;

    const themeDoc = parser.parseFromString(themeStr, 'application/xml');
    
    // Parse color scheme
    const clrScheme = themeDoc.querySelector('a\\:clrScheme, clrScheme');
    if (clrScheme) {
      for (const child of Array.from(clrScheme.children)) {
        const key = child.tagName.replace(/^.*:/, '');
        const clr = extractColorFromElement(child, {});
        if (clr) {
          theme.colors[key] = clr;
        }
      }
    }

    // Parse font scheme
    const majorFont = themeDoc.querySelector('a\\:majorFont a\\:latin, majorFont latin');
    if (majorFont) {
      const typeface = majorFont.getAttribute('typeface');
      if (typeface) theme.fonts.major = typeface;
    }

    const minorFont = themeDoc.querySelector('a\\:minorFont a\\:latin, minorFont latin');
    if (minorFont) {
      const typeface = minorFont.getAttribute('typeface');
      if (typeface) theme.fonts.minor = typeface;
    }
  } catch (e) {
    console.warn('Could not parse ppt/theme/theme1.xml:', e);
  }

  return theme;
}

/**
 * Parses a PowerPoint (.pptx) file (Blob / ArrayBuffer) using JSZip and DOMParser.
 * Extracts structured slide objects with titles, body paragraphs, bullet points,
 * tables, embedded images, and theme-resolved colors and fonts.
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

    // Parse presentation theme for color schemes and typography
    const theme = await parsePptxTheme(zip, parser);

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
      let titleRuns = [];
      let titleFontFamily = undefined;
      let titleColor = undefined;
      let titleAlign = undefined;

      let subtitle = '';
      let subtitleRuns = [];
      let subtitleFontFamily = undefined;
      let subtitleColor = undefined;
      let subtitleAlign = undefined;

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
          
          // Alignment
          const algnAttr = pPr?.getAttribute('algn');
          const align = algnAttr === 'ctr' ? 'center' : algnAttr === 'r' ? 'right' : algnAttr === 'just' ? 'justify' : 'left';

          // Bullet detection
          const hasBuNone = !!pPr?.querySelector('a\\:buNone, buNone');
          const buCharEl = pPr?.querySelector('a\\:buChar, buChar');
          const bulletChar = buCharEl?.getAttribute('char') || null;
          const buAutoNum = !!pPr?.querySelector('a\\:buAutoNum, buAutoNum');
          const buClrEl = pPr?.querySelector('a\\:buClr, buClr');
          const bulletColor = extractColorFromElement(buClrEl, theme.colors);

          // By default, body paragraphs have bullets unless buNone is present
          let hasBullet = false;
          if (!hasBuNone && phType !== 'title' && phType !== 'ctrTitle' && phType !== 'subTitle') {
            if (bulletChar || buAutoNum || phType === 'body' || level > 0) {
              hasBullet = true;
            }
          }

          // Extract runs by iterating DIRECT CHILDREN of pEl (Prevents duplicate text matching)
          const runs = [];
          for (const child of Array.from(pEl.children)) {
            const tagName = child.tagName.toLowerCase().replace(/^.*:/, '');

            if (tagName === 'r') {
              // Standard text run
              const tEl = child.querySelector('a\\:t, t');
              if (!tEl) continue;
              const text = tEl.textContent || '';
              if (!text) continue;

              const rPr = child.querySelector('a\\:rPr, rPr');
              const bold = rPr?.getAttribute('b') === '1' || rPr?.getAttribute('b') === 'true';
              const italic = rPr?.getAttribute('i') === '1' || rPr?.getAttribute('i') === 'true';
              const underline = rPr?.getAttribute('u') === 'sng' || rPr?.getAttribute('u') === '1';
              const strike = rPr?.getAttribute('strike') === 'sngStrike';

              // Font size in pt
              const szAttr = rPr?.getAttribute('sz');
              const fontSize = szAttr ? `${Math.round(parseInt(szAttr, 10) / 100)}pt` : undefined;

              // Typeface
              let fontFamily = undefined;
              const latinEl = rPr?.querySelector('a\\:latin, latin');
              const eaEl = rPr?.querySelector('a\\:ea, ea');
              const csEl = rPr?.querySelector('a\\:cs, cs');
              const rawTypeface = latinEl?.getAttribute('typeface') || eaEl?.getAttribute('typeface') || csEl?.getAttribute('typeface');
              if (rawTypeface) {
                if (rawTypeface.startsWith('+mj')) fontFamily = theme.fonts.major;
                else if (rawTypeface.startsWith('+mn')) fontFamily = theme.fonts.minor;
                else fontFamily = rawTypeface;
              }

              // Color
              const color = extractColorFromElement(rPr, theme.colors);

              runs.push({
                text,
                bold,
                italic,
                underline,
                strike,
                fontSize,
                fontFamily,
                color,
              });
            } else if (tagName === 'fld') {
              // Field tag (like slide number)
              const tEl = child.querySelector('a\\:t, t');
              if (tEl && tEl.textContent) {
                runs.push({ text: tEl.textContent, bold: false, italic: false });
              }
            } else if (tagName === 'br') {
              runs.push({ text: '\n', isBreak: true });
            } else if (tagName === 't') {
              // Rare direct <a:t> child
              if (child.textContent) {
                runs.push({ text: child.textContent, bold: false, italic: false });
              }
            }
          }

          if (runs.length > 0) {
            paragraphs.push({
              level,
              align,
              hasBullet,
              bulletChar,
              bulletColor,
              runs
            });
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
            titleRuns = paragraphs[0]?.runs || [];
            titleFontFamily = titleRuns[0]?.fontFamily;
            titleColor = titleRuns[0]?.color;
            titleAlign = paragraphs[0]?.align;
          } else {
            textBlocks.push({ type: 'header', paragraphs, rawText: combinedText });
          }
        } else if (phType === 'subTitle') {
          if (!subtitle) {
            subtitle = combinedText;
            subtitleRuns = paragraphs[0]?.runs || [];
            subtitleFontFamily = subtitleRuns[0]?.fontFamily;
            subtitleColor = subtitleRuns[0]?.color;
            subtitleAlign = paragraphs[0]?.align;
          } else {
            textBlocks.push({ type: 'body', paragraphs, rawText: combinedText });
          }
        } else {
          // If no title was detected yet, the very first short prominent text might be the title
          if (!title && combinedText.length < 80 && !combinedText.includes('\n')) {
            title = combinedText;
            titleRuns = paragraphs[0]?.runs || [];
            titleFontFamily = titleRuns[0]?.fontFamily;
            titleColor = titleRuns[0]?.color;
            titleAlign = paragraphs[0]?.align;
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

      // Bulletproof deduplication pass for each slide
      const cleanTitle = deduplicateText(title);
      const cleanSubtitle = deduplicateText(subtitle);
      const cleanTitleRuns = deduplicateRuns(titleRuns);
      const cleanSubtitleRuns = deduplicateRuns(subtitleRuns);
      const cleanTextBlocks = textBlocks.map(block => ({
        ...block,
        rawText: deduplicateText(block.rawText),
        paragraphs: block.paragraphs?.map(p => ({
          ...p,
          runs: deduplicateRuns(p.runs)
        }))
      }));

      slides.push({
        id: `slide-${i + 1}`,
        slideNumber: i + 1,
        title: cleanTitle,
        titleRuns: cleanTitleRuns,
        titleFontFamily,
        titleColor,
        titleAlign,
        subtitle: cleanSubtitle,
        subtitleRuns: cleanSubtitleRuns,
        subtitleFontFamily,
        subtitleColor,
        subtitleAlign,
        textBlocks: cleanTextBlocks,
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
