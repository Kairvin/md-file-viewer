import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  MessageSquarePlus, 
  X, 
  Pencil, 
  Trash2, 
  Check,
  CornerDownLeft
} from 'lucide-react';

export default function CommentPopover({
  isOpen,
  mode = 'view', // 'create' | 'view' | 'edit'
  position = { top: 0, left: 0, isAbove: false },
  commentText = '',
  selectedText = '',
  isPlayground = false,
  onSave,
  onDelete,
  onClose,
  onChangeMode
}) {
  const [text, setText] = useState(commentText);
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync text when popover opens or mode changes
  useEffect(() => {
    setText(commentText || '');
  }, [commentText, mode, isOpen]);

  // Auto-focus textarea when entering create or edit mode
  useEffect(() => {
    if (isOpen && (mode === 'create' || mode === 'edit')) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Only close if not clicking a comment trigger
        if (!e.target.closest('.annotated-comment') && !e.target.closest('#floating-annotation-bar')) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim());
  };

  const handleKeyDownInTextarea = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      ref={popoverRef}
      id="comment-popover-box"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 70,
      }}
      className={`w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 ${
        position.isAbove ? '-translate-y-full' : ''
      }`}
    >
      {/* Caret pointing arrow */}
      <div 
        className={`absolute left-8 w-3 h-3 bg-white dark:bg-slate-900 rotate-45 transform ${
          position.isAbove 
            ? '-bottom-1.5 border-b border-r border-slate-200 dark:border-slate-800' 
            : '-top-1.5 border-t border-l border-slate-200 dark:border-slate-800'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          {mode === 'create' ? (
            <MessageSquarePlus className="w-4 h-4 text-emerald-500" />
          ) : (
            <MessageSquare className="w-4 h-4 text-blue-500" />
          )}
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            {mode === 'create' ? 'Add Comment' : mode === 'edit' ? 'Edit Comment' : 'Comment'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected text quotation preview */}
      {selectedText && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border-l-2 border-slate-300 dark:border-slate-600 italic line-clamp-2">
          "{selectedText}"
        </div>
      )}

      {/* Body: Create or Edit Mode */}
      {(mode === 'create' || mode === 'edit') && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDownInTextarea}
            placeholder="Type your comment or review note here..."
            rows={3}
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 resize-none transition-all placeholder:text-slate-400"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
              <span>Press</span>
              <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-mono border border-slate-200 dark:border-slate-700">Enter ↵</kbd>
              <span>to save</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={mode === 'edit' && onChangeMode ? () => onChangeMode('view') : onClose}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>{mode === 'create' ? 'Add' : 'Update'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Body: View Mode */}
      {mode === 'view' && (
        <div className="flex flex-col gap-2.5">
          <div className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed py-1 max-h-48 overflow-y-auto">
            {commentText}
          </div>

          {/* Playground Actions */}
          {isPlayground && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onChangeMode?.('edit')}
                className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                title="Edit Comment"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>

              <button
                onClick={onDelete}
                className="px-2 py-1 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition-colors"
                title="Delete Comment"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
