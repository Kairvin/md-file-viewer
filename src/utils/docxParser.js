import mammoth from 'mammoth';

/**
 * Converts a Word (.docx) file (Blob / ArrayBuffer) into semantic HTML
 * preserving headings, bold/italic formatting, tables, lists, and inline images.
 */
export async function parseDocxFile(fileOrBuffer) {
  try {
    let arrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      arrayBuffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error('Unsupported input type for Word document conversion');
    }

    const options = {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((imageBuffer) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`,
          };
        });
      }),
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    let html = result.value || '';

    // Calculate document statistics
    const plainText = html.replace(/<[^>]+>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    // Extract document title from first H1 or H2 if available
    let docTitle = '';
    const h1Match = html.match(/<h1\b[^>]*>(.*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      docTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
    } else {
      const h2Match = html.match(/<h2\b[^>]*>(.*?)<\/h2>/i);
      if (h2Match && h2Match[1]) {
        docTitle = h2Match[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    return {
      success: true,
      html,
      words,
      readingTime,
      title: docTitle,
      messages: result.messages || [],
    };
  } catch (err) {
    console.error('Failed to parse docx document:', err);
    return {
      success: false,
      error: err.message || 'Unable to parse Word document.',
      html: '',
      words: 0,
      readingTime: 0,
    };
  }
}

/**
 * Rich starter template for Word documents (.docx)
 * Used when testing the Word reader or when clicking "Try Sample Word Doc"
 */
export const SAMPLE_WORD_HTML = `
<h1>Executive Strategy &amp; Product Architecture Document</h1>
<p class="lead"><strong>Prepared for:</strong> Engineering, Product Leadership, and Enterprise Stakeholders<br />
<strong>Date:</strong> October 2026 &nbsp;|&nbsp; <strong>Status:</strong> Approved &nbsp;|&nbsp; <strong>Version:</strong> 2.4</p>

<hr />

<h2>1. Executive Summary</h2>
<p>This technical and strategic specification outlines the deployment of the next-generation document processing platform. The platform is designed to unify reading, interactive annotation, and multi-format conversion across <strong>Markdown (.md)</strong>, <strong>Word (.docx)</strong>, and <strong>PowerPoint (.pptx)</strong> formats with zero server dependency.</p>

<p>By leveraging client-side WebAssembly, IndexedDB high-capacity storage, and publication-grade vector PDF synthesis, the solution guarantees <strong>100% data privacy</strong> and instant offline responsiveness.</p>

<h2>2. Key Architectural Deliverables</h2>
<ul>
  <li><strong>Universal Playground Engine:</strong> In-place rich-text editing, multi-color highlights, and threaded comment popovers across all supported document formats.</li>
  <li><strong>High-Capacity IndexedDB Tier:</strong> Replaces the browser's 5MB localStorage quota to effortlessly host large enterprise files and media assets up to 100MB+.</li>
  <li><strong>Publication-Grade PDF Engine:</strong> Custom DOM pre-pagination with orphan-heading suppression, eliminating line breaks that slice text across pages.</li>
  <li><strong>Seamless Cross-Format Routing:</strong> Global drag-and-drop format detection that routes files directly to their specialized reader/playground.</li>
</ul>

<h2>3. Milestone Schedule &amp; Deliverables</h2>
<table>
  <thead>
    <tr>
      <th>Phase</th>
      <th>Milestone Name</th>
      <th>Target Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1</strong></td>
      <td>Markdown Review Pro &amp; Playground Engine</td>
      <td>Q1 2026</td>
      <td><span style="color: #10b981; font-weight: 600;">Completed</span></td>
    </tr>
    <tr>
      <td><strong>Phase 2</strong></td>
      <td>Word Document (.docx) Reader &amp; PDF Converter</td>
      <td>Q2 2026</td>
      <td><span style="color: #3b82f6; font-weight: 600;">Active / Ready</span></td>
    </tr>
    <tr>
      <td><strong>Phase 3</strong></td>
      <td>PowerPoint (.pptx) Slide Deck &amp; Document Flow</td>
      <td>Q3 2026</td>
      <td><span style="color: #3b82f6; font-weight: 600;">Active / Ready</span></td>
    </tr>
    <tr>
      <td><strong>Phase 4</strong></td>
      <td>Enterprise Spreadsheet &amp; Formula Viewer (.xlsx)</td>
      <td>Q4 2026</td>
      <td><span style="color: #64748b; font-weight: 600;">Planned</span></td>
    </tr>
  </tbody>
</table>

<h2>4. Quality Assurance &amp; Verification Principles</h2>
<p>Every document rendered within the reader must satisfy strict visual fidelity criteria:</p>
<ol>
  <li><strong>High Contrast &amp; Accessibility:</strong> Compliant with WCAG AAA typography guidelines across dark and light themes.</li>
  <li><strong>Intact Page Break Boundaries:</strong> When exported to PDF, no paragraph or table row may be sliced horizontally between pages.</li>
  <li><strong>Persistent Annotations:</strong> User comments and highlighted keywords automatically synchronize into IndexedDB and reload on demand.</li>
</ol>

<blockquote>
  <p><strong>Architecture Note:</strong> All client operations execute strictly in-memory and in local browser storage. No user documents or sensitive presentation slides are ever transmitted over external networks.</p>
</blockquote>
`;
