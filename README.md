# MD Review Pro 🚀

> **A modern, publication-grade Markdown previewer, reviewer, and annotation studio with in-place playground editing, inline comments, text highlighting, and pixel-perfect PDF export.**

[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald)](LICENSE)

---

## 📖 Overview

**MD Review Pro** is designed for writers, engineers, and reviewers who need more than a basic Markdown renderer. It bridges the gap between raw text editing and final publication by offering an interactive **Playground** where you can highlight text, add inline review comments with popovers, tweak content in-place, and export flawless, high-contrast PDFs with zero margin-clipping or page slicing.

---

## ✨ Features

- **🎨 Executive Publishing Typography**:
  - Precision proportional scale, responsive font sizing, and refined slate color palette.
  - **4 Handcrafted Themes**:
    - `Modern Light`: Clean slate aesthetic inspired by Linear and Stripe.
    - `GitHub Dark`: Deep developer-favorite dark theme.
    - `Editorial Sepia`: Warm book-style reading typography.
    - `Midnight Obsidian`: High-contrast OLED dark theme with glowing accents.

- **💬 Inline Comments & Contextual Popovers**:
  - Select any text to attach a review comment or note.
  - Clean vector speech-bubble indicator seamlessly harmonized with highlighted text (no clunky double-boxes or cartoon emojis).
  - Click any commented text to open an interactive popover to view, edit, or delete notes.

- **🖍️ Multi-Color Text Highlighter & Formatting**:
  - 6 publication-grade pastel swatches (Sunny Yellow, Mint Green, Sky Blue, Blossom Pink, Sunset Orange, Lavender Violet).
  - 6 text color options, Underline, Strikethrough, Bold, and Italic.
  - Floating contextual selection bar that appears right above your cursor.

- **🔄 Dedicated DOM History Stack (Undo & Redo)**:
  - Robust history stack capturing typing, formatting, highlights, and comments.
  - Full keyboard shortcuts: <kbd>Ctrl/Cmd + Z</kbd> and <kbd>Ctrl/Cmd + Shift + Z</kbd> / <kbd>Ctrl/Cmd + Y</kbd>.

- **🛡️ Reload Protection & Draft Auto-Save**:
  - Native browser `beforeunload` intercept warns if you try to reload or navigate away with unsaved playground edits.
  - One-click **"Save Changes"** (<kbd>Ctrl/Cmd + S</kbd>) saves your annotated draft to browser `localStorage` per document and restores it automatically.

- **📄 Flawless High-Fidelity PDF Export**:
  - Calibrated 660px A4 capture width with zero right-margin cutoffs.
  - Intelligent block-level page breaks (`break-inside: avoid`) preventing sentences from horizontally slicing across page boundaries.
  - Highlights, comments, colors, and Mermaid diagrams are preserved with high contrast on pure white.

- **📊 Visual Diagrams & Math**:
  - **Mermaid.js**: Interactive mind maps, flowcharts, and sequence diagrams with source toggle.
  - **KaTeX**: Fast, crisp rendering of inline `$E=mc^2$` and block display math equations `$$...$$`.
  - **GitHub Alerts**: Styled callouts for `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, and `> [!CAUTION]`.
  - **Code Syntax Highlighting**: Highlight.js with macOS-style window chrome and one-click code copy.

- **📱 Fully Responsive Design**:
  - Adapts across desktop, tablet, and mobile devices.
  - Slide-over outline drawer for Table of Contents on small screens.
  - Immersive **Full-Screen Zen Mode** (<kbd>F</kbd> / <kbd>F11</kbd>).

---

## ⚡ Quick Start

### 1. Run Development Server
```bash
git clone https://github.com/your-username/md-review-pro.git
cd md-review-pro
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. macOS 1-Click Launcher
Double-click `launch.command` in Finder or execute:
```bash
./launch.command
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl/Cmd</kbd> + <kbd>S</kbd> | Save Playground Draft / Export Markdown |
| <kbd>Ctrl/Cmd</kbd> + <kbd>P</kbd> | Vector Print to PDF |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd> | Undo last edit/highlight/comment |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |
| <kbd>F</kbd> or <kbd>F11</kbd> | Toggle Full-Screen Zen Mode |
| <kbd>Esc</kbd> | Exit Full-Screen or close popovers |

---

## 📄 License
MIT License. Created by Kairvin Kukkar.
