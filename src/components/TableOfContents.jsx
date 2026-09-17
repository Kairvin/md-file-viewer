import React, { useState } from 'react';
import { ListTree, X, Search, ChevronRight } from 'lucide-react';

export default function TableOfContents({ toc, onClose }) {
  const [filter, setFilter] = useState('');

  const filteredToc = toc.filter(item => 
    item.text.toLowerCase().includes(filter.toLowerCase())
  );

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside 
      id="toc-drawer"
      className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col h-[calc(100vh-4rem)] sticky top-16 z-30 transition-colors"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <ListTree className="w-4 h-4 text-blue-500" />
          <span>Table of Contents</span>
          <span className="text-xs font-normal text-slate-400">({toc.length})</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Close Outline"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {toc.length > 5 && (
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter headings..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg outline-none border border-transparent focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredToc.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {toc.length === 0 ? "No headings found in document." : "No matching headings."}
          </div>
        ) : (
          filteredToc.map((item, index) => {
            const indentClass = 
              item.level === 1 ? 'font-semibold pl-2' :
              item.level === 2 ? 'pl-5 text-slate-600 dark:text-slate-300' :
              'pl-8 text-slate-500 dark:text-slate-400 text-[11px]';

            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => scrollToHeading(item.id)}
                className={`w-full text-left py-1.5 pr-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs flex items-center group ${indentClass}`}
              >
                <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 mr-1 text-blue-500 transition-opacity" />
                <span className="truncate">{item.text}</span>
              </button>
            );
          })
        )}
      </nav>
    </aside>
  );
}
