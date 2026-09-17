# MD Preview Pro 🚀

A high-fidelity, visually captivating Markdown workspace designed to preview `.md` files with publishing-grade aesthetics, distraction-free full screen, and vector PDF export.

---

## ⚡ How to Run

### Method 1: Double-Click Desktop Launcher (Recommended on macOS)
Simply double-click `launch.command` in Finder, or run from your terminal:
```bash
./launch.command
```
This automatically starts the local server and opens the application in your default web browser.

### Method 2: Development Mode
```bash
npm run dev
```
Then visit `http://localhost:5173`.

### Method 3: Production Build & Preview
```bash
npm run build
npm run preview
```
Or open `dist/index.html` directly in any web browser.

---

## ✨ Features

- **🎨 Publishing-Grade Typography & Aesthetics**:
  - Handcrafted proportional spacing and responsive typography.
  - 4 curated theme presets:
    - **Modern Light**: Clean slate with crisp contrast.
    - **GitHub Dark**: Developer-favorite dark mode.
    - **Editorial Sepia**: Warm, book-style reading typography.
    - **Midnight Obsidian**: Deep OLED dark mode with neon accents.
- **🖥️ Full Screen Zen Mode**:
  - Press <kbd>F</kbd> or click the **Full Screen** icon to enter distraction-free mode.
  - Strips all app chrome and toolbars.
  - Auto-hiding floating pill for font size scaling (A- / A+), column width adjustment (Compact / Standard / Wide / Full), and quick PDF export.
- **📄 High-Fidelity PDF Export**:
  - **Download PDF File**: 1-click direct client-side PDF file download.
  - **Vector Print to PDF**: Triggers the system print engine with dedicated `@media print` rules for razor-sharp vector text and page break optimization.
- **💡 GitHub-Flavored Alerts**:
  - Automatically formats `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` into colored callout cards with icons.
- **💻 Syntax-Highlighted Code Blocks**:
  - Supports JavaScript, TypeScript, Python, Bash, Rust, Go, SQL, HTML, CSS, JSON, and more.
  - 1-click **Copy Code** button with instant feedback.
- **📐 Mathematical Precision (KaTeX)**:
  - Real-time rendering for inline `$E = mc^2$` and block display math equations `$$...$$`.
- **📑 Dynamic Table of Contents (TOC)**:
  - Auto-generated outline sidebar with heading search and smooth scroll navigation.
- **📂 Flexible File Ingestion**:
  - Drag and drop `.md` or `.txt` files directly into the window.
  - Native file picker with "Open File".
  - Built-in templates (Showcase Spec, Technical Architecture, Meeting Notes).
  - Live side-by-side editing mode with synchronized preview.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>F</kbd> or <kbd>F11</kbd> | Toggle Full-Screen Zen Mode |
| <kbd>Esc</kbd> | Exit Full-Screen Zen Mode |
| <kbd>Cmd</kbd> + <kbd>P</kbd> | Print / Export to Vector PDF |
| <kbd>Cmd</kbd> + <kbd>S</kbd> | Download / Save current Markdown file |
