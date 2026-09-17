import React from 'react';
import { FileCode, UploadCloud } from 'lucide-react';

export default function MarkdownEditor({ content, onChange, onDropFile }) {
  const lineCount = content.split('\n').length;

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onDropFile(file.name, event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div 
      id="editor-panel"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col h-[calc(100vh-4rem)] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-text transition-colors flex-1 w-full min-w-0"
    >
      <div className="h-10 px-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 select-none">
        <div className="flex items-center gap-2 font-mono">
          <FileCode className="w-4 h-4 text-blue-500" />
          <span className="truncate">Markdown Source</span>
        </div>
        <div className="text-[11px] text-slate-400">
          <span>{lineCount} lines</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        {/* Line Numbers gutter - compact on mobile */}
        <div className="w-8 sm:w-11 shrink-0 py-3 sm:py-4 bg-slate-50/80 dark:bg-slate-950/40 text-slate-400 text-right pr-1.5 sm:pr-2.5 font-mono text-[10px] sm:text-xs select-none border-r border-slate-100 dark:border-slate-800/60 overflow-hidden leading-6">
          {Array.from({ length: Math.min(lineCount, 500) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
          {lineCount > 500 && <div>...</div>}
        </div>

        {/* Textarea */}
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type or paste Markdown here, or drag & drop a .md file..."
          className="flex-1 p-3 sm:p-4 bg-transparent outline-none resize-none font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-6 overflow-y-auto selection:bg-blue-500 selection:text-white"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
