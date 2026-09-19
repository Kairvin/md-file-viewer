export const SAMPLE_MARKDOWN = `# MD Preview Pro 🚀
> *A high-fidelity, visually captivating Markdown workspace designed for creators, developers, and thinkers.*

---

## ⚡ Highlights & Capabilities

- [x] **Sensational Typography**: Designed with balanced spacing, rhythm, and readable typography.
- [x] **Full-Screen Zen Mode**: Distraction-free immersion for uninterrupted reading and presentation.
- [x] **One-Click Vector PDF Export**: Download crisp, presentation-ready PDFs preserving every style.
- [x] **Live Side-by-Side Editor**: Edit Markdown with real-time synchronized rendering.
- [x] **GitHub-Style Callouts**: Native support for Notes, Tips, Warnings, and Cautions.
- [x] **LaTeX Math & Syntax Highlighting**: Formulas and code blocks rendered with precision.

---

## 💡 Modern GitHub Alerts

> [!NOTE]
> This previewer automatically detects GitHub-flavored markdown alerts and renders them as beautiful callout cards.

> [!TIP]
> Press <kbd>F11</kbd> or <kbd>⌘+Shift+F</kbd> (or <kbd>F</kbd> in preview mode) to enter the distraction-free reading experience.

> [!IMPORTANT]
> To save as a clean PDF, click **Export** → **Download PDF** or **Print to PDF** for high-resolution vector output.

> [!WARNING]
> Ensure your document adheres to semantic headings so the automated Table of Contents (TOC) stays organized.

> [!CAUTION]
> Avoid including unescaped sensitive credentials in documents intended for export.

---

## 📊 Comprehensive Data Tables

| Feature | MD Preview Pro | Traditional Viewers | Notes |
| :--- | :---: | :---: | :--- |
| **Aesthetic Styling** | ✨ Luxury Grade | 📄 Basic / Raw | Handcrafted typography & spacing |
| **Full Screen Mode** | ✅ Instant Zen Mode | ⚠️ Partial | Dedicated distraction-free view |
| **95% Full Width** | ✅ 95% - 100% Spanning | ❌ Cramped Column | Maximum readability on any screen |
| **Visual Mind Maps** | ✅ Native Mermaid SVG | ❌ Raw Code Block | Interactive mind maps & flowcharts |
| **Vector PDF Export** | ✅ Zero-Fuzz Vector | ❌ Low Res or None | Crisp at 400% zoom |
| **Math Formula Support**| ✅ KaTeX Rendered | ❌ Raw LaTeX code | Instant rendering |

---

## 🗺️ Visual Mind Maps & Concept Diagrams (Mermaid)

\`\`\`mermaid
flowchart TD
  subgraph S1["Immune System & Defense Strategy"]
    Core["The Human Immune System"] --> Innate["1. Innate Immunity (0 - 12 Hours)"]
    Core --> Adaptive["2. Adaptive Immunity (Days - Weeks)"]
  end

  Innate --> Barriers["Anatomical Barriers: Skin, Mucosa"]
  Innate --> Sentinels["Phagocytes: Macrophages & Neutrophils"]
  Innate --> Soluble["Complement Cascade & Cytokines"]

  Adaptive --> Humoral["Humoral Arm (B Cells & Antibodies)"]
  Adaptive --> Cellular["Cell-Mediated Arm (CD4+ & CD8+ T Cells)"]

  Sentinels -.->|"Antigen Presentation"| Cellular
\`\`\`

---

## 💻 Syntax-Highlighted Code

### Modern JavaScript (ES Modules & Async)

\`\`\`javascript
// Fetch and parse markdown metadata asynchronously
async function loadDocument(fileUri) {
  try {
    const response = await fetch(fileUri);
    const text = await response.text();
    console.log(\`Successfully loaded \${text.length} characters.\`);
    return text;
  } catch (err) {
    console.error("Failed to load document:", err);
  }
}
\`\`\`

### Python Data Analysis

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

def generate_distribution(samples: int = 1000):
    """Generate and return Gaussian normal distribution data."""
    mu, sigma = 0, 0.1 # mean and standard deviation
    data = np.random.normal(mu, sigma, samples)
    return {"mean": np.mean(data), "std": np.std(data)}

if __name__ == "__main__":
    stats = generate_distribution(5000)
    print(f"Computed Normal Distribution: {stats}")
\`\`\`

### Bash Quickstart

\`\`\`bash
# Launch previewer on macOS
chmod +x ./launch.command
./launch.command
\`\`\`

---

## 📐 Mathematical Precision (KaTeX)

Euler's identity, frequently cited as an example of mathematical beauty:

$$e^{i\\pi} + 1 = 0$$

The standard normal probability density function:

$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)$$

You can also include inline mathematical notations such as $E = mc^2$ or $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$ smoothly in your prose.

---

## 📋 Task Planning & Checklist

- [x] Initial design and architectural layout
- [x] Responsive dark, light, sepia, and obsidian color palettes
- [x] Full-screen zen mode with floating controls
- [x] Vector PDF download and print pipeline
- [ ] Export to presentations / slide decks
- [ ] Collaborative real-time sync

---

## 🖋️ Quotes & Philosophy

> "Simplicity is prerequisite for reliability. Design is not just what it looks like and feels like. Design is how it works."
>
> — *Edsger W. Dijkstra & Steve Jobs*

---

### Shortcuts & Quick Navigation

| Action | Shortcut |
| :--- | :--- |
| **Toggle Full Screen** | <kbd>F11</kbd>, <kbd>⌘+Shift+F</kbd>, or <kbd>F</kbd> (in preview) |
| **Toggle Outline TOC** | Click Outline in top bar |
| **Switch View (Split / Preview)** | Toggle buttons in header |
| **Export to PDF** | Click **Export PDF** in header |
`;
