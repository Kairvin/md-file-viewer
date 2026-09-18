import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  MessageSquarePlus, 
  X, 
  Pencil, 
  Trash2, 
  Check,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function CommentPopover({
  isOpen,
  mode = 'view', // 'create' | 'view' | 'edit'
  position = { top: 0, left: 0, isAbove: false },
  comments = [],
  activeCommentIndex = 0,
  commentText = '',
  selectedText = '',
  isPlayground = false,
  onSave,
  onDelete,
  onClose,
  onChangeMode
}) {
  // Normalize comments list
  const commentsList = Array.isArray(comments) && comments.length > 0
    ? comments
    : (commentText ? [commentText] : []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [text, setText] = useState('');
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync currentIndex and text when opening or when props update
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(activeCommentIndex || 0, Math.max(0, commentsList.length - 1)));
      setCurrentIndex(validIndex);
      if (mode === 'create') {
        setText('');
      } else {
        setText(commentsList[validIndex] || '');
      }
    }
  }, [isOpen, activeCommentIndex, commentsList.length, mode]);

  // When changing currentIndex in view or edit mode, sync text
  const handleNavigate = (newIndex) => {
    if (newIndex >= 0 && newIndex < commentsList.length) {
      setCurrentIndex(newIndex);
      if (mode === 'edit') {
        setText(commentsList[newIndex] || '');
      }
    }
  };

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

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't intercept arrow keys if typing in textarea or input
      const isInput = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'edit' || (mode === 'create' && commentsList.length > 0)) {
          onChangeMode?.('view');
        } else {
          onClose();
        }
        return;
      }

      // Arrow navigation in view mode
      if (mode === 'view' && !isInput && commentsList.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNavigate(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNavigate(currentIndex + 1);
        }
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
  }, [isOpen, mode, currentIndex, commentsList.length, onClose, onChangeMode]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (mode === 'edit') {
      onSave(trimmed, currentIndex);
    } else {
      onSave(trimmed, null);
    }
  };

  const handleKeyDownInTextarea = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentCommentDisplay = commentsList[currentIndex] || '';

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
      className={`w-72 sm:w-84 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 ${
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
            {mode === 'create' 
              ? (commentsList.length > 0 ? `Add Comment #${commentsList.length + 1}` : 'Add Comment')
              : mode === 'edit' 
                ? (commentsList.length > 1 ? `Edit Comment ${currentIndex + 1} of ${commentsList.length}` : 'Edit Comment')
                : (commentsList.length > 1 ? 'Comments' : 'Comment')
            }
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Header navigation arrows (when multiple comments exist) */}
          {commentsList.length > 1 && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-1 select-none border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none text-slate-600 dark:text-slate-300 transition-colors"
                title="Previous comment (Left arrow)"
                aria-label="Previous comment"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-medium px-1 text-slate-600 dark:text-slate-300">
                {currentIndex + 1}/{commentsList.length}
              </span>
              <button
                type="button"
                onClick={() => handleNavigate(currentIndex + 1)}
                disabled={currentIndex === commentsList.length - 1}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25 disabled:pointer-events-none text-slate-600 dark:text-slate-300 transition-colors"
                title="Next comment (Right arrow)"
                aria-label="Next comment"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
            placeholder={
              mode === 'create'
                ? (commentsList.length > 0 ? `Write comment #${commentsList.length + 1}...` : "Type your comment or review note here...")
                : `Edit comment #${currentIndex + 1}...`
            }
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
                onClick={
                  mode === 'edit' || (mode === 'create' && commentsList.length > 0)
                    ? () => onChangeMode?.('view')
                    : onClose
                }
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
          {/* Within-box Navigation Arrows bar when multiple comments exist */}
          {commentsList.length > 1 && (
            <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 select-none">
              <button
                type="button"
                onClick={() => handleNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Previous comment (Left arrow)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 font-medium">
                <span className="text-slate-700 dark:text-slate-200 font-semibold">Comment {currentIndex + 1}</span>
                <span className="text-slate-400">of</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{commentsList.length}</span>
              </div>

              <button
                type="button"
                onClick={() => handleNavigate(currentIndex + 1)}
                disabled={currentIndex === commentsList.length - 1}
                className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Next comment (Right arrow)"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Comment text */}
          <div className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed py-1 max-h-48 overflow-y-auto min-h-[36px]">
            {currentCommentDisplay || <span className="italic text-slate-400">No comment text</span>}
          </div>

          {/* Playground Actions */}
          {isPlayground && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setText(commentsList[currentIndex] || '');
                    onChangeMode?.('edit');
                  }}
                  className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                  title="Edit this comment"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeMode?.('create')}
                  className="px-2 py-1 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 transition-colors font-medium"
                  title="Add another comment on this text"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add another</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDelete?.(currentIndex)}
                className="px-2 py-1 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1 transition-colors"
                title={commentsList.length > 1 ? `Delete comment ${currentIndex + 1} of ${commentsList.length}` : 'Delete comment'}
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
