import React, { useState, useEffect } from 'react';
import { ListTree, X, Search, ChevronRight } from 'lucide-react';

export default function TableOfContents({ toc, onClose }) {
  const [filter, setFilter] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredToc = toc.filter(item => 
    item.text.toLowerCase().includes(filter.toLowerCase())
  );

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // If mobile, close drawer after clicking
      if (window.innerWidth < 1024) {
        onClose();
      }
    }
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer: Slide-over on mobile/tablet, Sticky on desktop */}
      <aside 
        id="toc-drawer"
        className="fixed lg:sticky top-0 lg:top-16 right-0 bottom-0 z-50 w-80 max-w-[85vw] lg:w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col h-screen lg:h-[calc(100vh-4rem)] shadow-2xl lg:shadow-none transition-all duration-200 animate-in slide-in-from-right-full lg:animate-none"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <ListTree className="w-4 h-4 text-blue-500" />
            <span>Table of Contents</span>
            <span className="text-xs font-normal text-slate-400">({toc.length})</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                  className={`w-full text-left py-2 pr-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs flex items-center group active:bg-blue-100 dark:active:bg-slate-700 ${indentClass}`}
                >
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 mr-1 text-blue-500 transition-opacity" />
                  <span className="truncate">{item.text}</span>
                </button>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
}
