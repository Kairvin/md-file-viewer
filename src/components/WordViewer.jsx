import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  PenTool, 
  Eye, 
  RotateCcw, 
  Save, 
  Check, 
  Upload, 
  Sparkles, 
  Wrench,
  Clock,
  BookOpen
} from 'lucide-react';
import PlaygroundToolbar from './PlaygroundToolbar';
import FloatingAnnotationBar from './FloatingAnnotationBar';
import CommentPopover from './CommentPopover';
import ConfirmModal from './ConfirmModal';
import { 
  applyFormattingToRange, 
  unwrapFormattingInRange, 
  trimRangeToText,
  parseComments,
  setCommentsOnElement,
  cleanupEmptyAnnotationsInDom,
  consolidateMarks
} from './MarkdownViewer';
import { downloadDirectPdf, printToPdf } from '../utils/pdfExport';
import { savePlaygroundDraft, getPlaygroundDraft, clearPlaygroundDraft } from '../utils/storage';

export default function WordViewer({
  html,
  fileName = 'Document.docx',
  theme = 'modern',
  onOpenFile,
  onLoadSampleWord,
  onOpenTools
}) {
  const [isPlayground, setIsPlayground] = useState(true);
  const [activeHtml, setActiveHtml] = useState(html);
  const [hasEdits, setHasEdits] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Annotation & Comment Popover states
  const [selectionBox, setSelectionBox] = useState({ top: 0, left: 0, visible: false });
  const [commentPopover, setCommentPopover] = useState({
    isOpen: false,
    mode: 'view',
    top: 0,
    left: 0,
    isAbove: false,
    text: '',
    selectedText: '',
    targetElement: null,
    comments: [],
    activeCommentIndex: 0
  });

  // History stack for Undo / Redo
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const historyStackRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const paperRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const inputDebounceTimerRef = useRef(null);

  // Calculate word count and reading time
  const plainText = (activeHtml || '').replace(/<[^>]+>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  const draftKey = `word_draft_${fileName}`;

  // Load saved draft from IndexedDB when opening document
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedDraft = await getPlaygroundDraft(draftKey);
        if (isMounted) {
          if (savedDraft && typeof savedDraft === 'string' && savedDraft.trim().length > 0) {
            setActiveHtml(savedDraft);
          } else {
            setActiveHtml(html);
          }
        }
      } catch {
        if (isMounted) setActiveHtml(html);
      }
    })();
    return () => { isMounted = false; };
  }, [html, draftKey]);

  // Push history snapshot for Undo/Redo
  const pushHistorySnapshot = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.word-document-body');
    if (!body) return;

    const currentHtml = body.innerHTML;
    const stack = historyStackRef.current;
    const idx = historyIndexRef.current;

    if (idx >= 0 && stack[idx] === currentHtml) return;

    const nextStack = stack.slice(0, idx + 1);
    nextStack.push(currentHtml);
    if (nextStack.length > 40) nextStack.shift();

    historyStackRef.current = nextStack;
    historyIndexRef.current = nextStack.length - 1;
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: false
    });
  }, []);

  // Save Playground draft to IndexedDB
  const handleSavePlayground = useCallback(async (showIndicator = true) => {
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.word-document-body');
    if (!body) return;

    try {
      const cleanHtml = body.innerHTML.replace(/\u200B/g, '');
      await savePlaygroundDraft(draftKey, cleanHtml);
      setHasEdits(false);
      if (showIndicator) {
        setIsJustSaved(true);
        setTimeout(() => setIsJustSaved(false), 2200);
      }
    } catch (err) {
      console.error('Failed to save Word playground draft:', err);
    }
  }, [draftKey]);

  const triggerAutoSave = useCallback((showIndicator = true, delay = 1000) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSavePlayground(showIndicator);
    }, delay);
  }, [handleSavePlayground]);

  // Handle typing input inside paper
  const handleContentInput = () => {
    setHasEdits(true);
    if (inputDebounceTimerRef.current) clearTimeout(inputDebounceTimerRef.current);
    inputDebounceTimerRef.current = setTimeout(() => {
      pushHistorySnapshot();
    }, 350);
    triggerAutoSave(true, 1200);
  };

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevHtml = historyStackRef.current[historyIndexRef.current];
      const paper = paperRef.current;
      if (paper) {
        const body = paper.querySelector('.word-document-body');
        if (body) {
          body.innerHTML = prevHtml;
          setHasEdits(true);
          triggerAutoSave(true, 1500);
        }
      }
      setHistoryState({
        canUndo: historyIndexRef.current > 0,
        canRedo: historyIndexRef.current < historyStackRef.current.length - 1
      });
    }
  }, [triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextHtml = historyStackRef.current[historyIndexRef.current];
      const paper = paperRef.current;
      if (paper) {
        const body = paper.querySelector('.word-document-body');
        if (body) {
          body.innerHTML = nextHtml;
          setHasEdits(true);
          triggerAutoSave(true, 1500);
        }
      }
      setHistoryState({
        canUndo: true,
        canRedo: historyIndexRef.current < historyStackRef.current.length - 1
      });
    }
  }, [triggerAutoSave]);

  // Caret boundary exit on ArrowRight / ArrowLeft
  const exitMarkBoundary = useCallback((forward = true) => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;

    const paper = paperRef.current;
    if (!paper) return false;

    const isAnnotationElement = (el) => {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
      return (
        el.tagName === 'MARK' ||
        el.classList?.contains('annotated-mark') ||
        el.classList?.contains('annotated-comment') ||
        el.classList?.contains('annotated-color') ||
        el.hasAttribute('data-comment')
      );
    };

    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    let targetAnnotation = null;
    while (el && el !== paper && !el.classList?.contains('word-document-body')) {
      if (isAnnotationElement(el)) {
        targetAnnotation = el;
      }
      el = el.parentElement;
    }

    if (!targetAnnotation || !paper.contains(targetAnnotation)) return false;

    if (forward) {
      let isAtEnd = false;
      if (node.nodeType === Node.TEXT_NODE) {
        if (offset === node.nodeValue.length) {
          let curr = node;
          let hasFollowing = false;
          while (curr && curr !== targetAnnotation) {
            if (curr.nextSibling) {
              hasFollowing = true;
              break;
            }
            curr = curr.parentNode;
          }
          if (!hasFollowing) isAtEnd = true;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node === targetAnnotation && offset === targetAnnotation.childNodes.length) {
          isAtEnd = true;
        }
      }

      if (isAtEnd) {
        const parent = targetAnnotation.parentNode;
        if (!parent) return false;

        let next = targetAnnotation.nextSibling;
        let zwspNode = null;
        if (next && next.nodeType === Node.TEXT_NODE && next.nodeValue.startsWith('\u200B')) {
          zwspNode = next;
        } else {
          zwspNode = document.createTextNode('\u200B');
          parent.insertBefore(zwspNode, next);
        }

        const newRange = document.createRange();
        newRange.setStart(zwspNode, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
      }
    } else {
      let isAtStart = false;
      if (node.nodeType === Node.TEXT_NODE) {
        if (offset === 0) {
          let curr = node;
          let hasPreceding = false;
          while (curr && curr !== targetAnnotation) {
            if (curr.previousSibling) {
              hasPreceding = true;
              break;
            }
            curr = curr.parentNode;
          }
          if (!hasPreceding) isAtStart = true;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node === targetAnnotation && offset === 0) {
          isAtStart = true;
        }
      }

      if (isAtStart) {
        const parent = targetAnnotation.parentNode;
        if (!parent) return false;

        let prev = targetAnnotation.previousSibling;
        let zwspNode = null;
        if (prev && prev.nodeType === Node.TEXT_NODE && prev.nodeValue.endsWith('\u200B')) {
          zwspNode = prev;
        } else {
          zwspNode = document.createTextNode('\u200B');
          parent.insertBefore(zwspNode, targetAnnotation);
        }

        const newRange = document.createRange();
        newRange.setStart(zwspNode, zwspNode.nodeValue.length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
      }
    }
    return false;
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Exit formatting boundary on ArrowRight / ArrowLeft
      if (isPlayground && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput && paperRef.current && paperRef.current.contains(target)) {
          if (e.key === 'ArrowRight') {
            if (exitMarkBoundary(true)) {
              e.preventDefault();
              return;
            }
          } else if (e.key === 'ArrowLeft') {
            if (exitMarkBoundary(false)) {
              e.preventDefault();
              return;
            }
          }
        }
      }

      // Save shortcut
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSavePlayground();
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayground, handleSavePlayground, handleUndo, handleRedo, exitMarkBoundary]);

  // Highlight Formatter
  const handleHighlight = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);

    const paper = paperRef.current;
    if (!paper) return;

    const trimmed = trimRangeToText(paper, range);
    if (!trimmed) return;

    setHasEdits(true);

    if (!color) {
      unwrapFormattingInRange(paper, trimmed, { type: 'highlight' });
      setSelectionBox(prev => ({ ...prev, visible: false }));
      pushHistorySnapshot();
      triggerAutoSave(true, 300);
      return;
    }

    const created = applyFormattingToRange(paper, trimmed, { type: 'highlight', color });
    const valid = (created || []).filter(el => paper.contains(el));
    if (valid.length > 0) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const r = document.createRange();
        r.setStartBefore(valid[0]);
        r.setEndAfter(valid[valid.length - 1]);
        sel.addRange(r);
      }
    }

    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleTextColor = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    const paper = paperRef.current;
    if (!paper) return;
    const trimmed = trimRangeToText(paper, selection.getRangeAt(0));
    if (!trimmed) return;

    setHasEdits(true);
    applyFormattingToRange(paper, trimmed, { type: 'color', color });
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleClearFormat = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    const paper = paperRef.current;
    if (!paper) return;
    const trimmed = trimRangeToText(paper, selection.getRangeAt(0));
    if (!trimmed) return;

    unwrapFormattingInRange(paper, trimmed, { type: 'all' });
    setSelectionBox(prev => ({ ...prev, visible: false }));
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  // Comments
  const handleOpenAddComment = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);

    const paper = paperRef.current;
    if (!paper || !paper.contains(range.commonAncestorContainer)) return;

    savedRangeRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    const isAbove = rect.bottom + 250 > window.innerHeight;

    setCommentPopover({
      isOpen: true,
      mode: 'create',
      top: isAbove ? rect.top - 10 : rect.bottom + 10,
      left: Math.max(20, Math.min(rect.left, window.innerWidth - 380)),
      isAbove,
      text: '',
      selectedText: range.toString().trim(),
      targetElement: null,
      comments: [],
      activeCommentIndex: 0
    });
    setSelectionBox(prev => ({ ...prev, visible: false }));
  };

  const handleSaveComment = (commentVal) => {
    const textVal = (commentVal || '').trim();
    if (!textVal) return;

    const paper = paperRef.current;
    const range = savedRangeRef.current;
    if (!paper || !range) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const trimmed = trimRangeToText(paper, range);
    if (!trimmed) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
      return;
    }

    try {
      const created = applyFormattingToRange(paper, trimmed, {
        type: 'comment',
        commentText: textVal
      });

      pushHistorySnapshot();
      triggerAutoSave(true, 50);

      const primary = created[0];
      if (primary) {
        setCommentPopover(prev => ({
          ...prev,
          mode: 'view',
          comments: parseComments(primary),
          activeCommentIndex: 0,
          text: textVal,
          targetElement: primary
        }));
      } else {
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
      }
    } catch {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    }
  };

  // PDF Export
  const handleDirectPdfDownload = async () => {
    setIsExportingPdf(true);
    const paper = paperRef.current;
    if (paper) {
      await downloadDirectPdf(paper, fileName.replace(/\.docx?$/i, '') + '.pdf');
    }
    setIsExportingPdf(false);
  };

  const handlePrintPdf = () => {
    printToPdf(fileName.replace(/\.docx?$/i, ''));
  };

  // Reset original confirmation
  const handleConfirmReset = async () => {
    await clearPlaygroundDraft(draftKey);
    setActiveHtml(html);
    setHasEdits(false);
    setShowResetModal(false);
    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.word-document-body');
      if (body) body.innerHTML = html;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
      {/* Top Word Action Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-500/20 ring-1 ring-white/20 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {fileName}
                <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                  .docx
                </span>
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <BookOpen className="w-3 h-3" />
                  {words.toLocaleString()} words
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {readingTime} min read
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setIsPlayground(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              !isPlayground
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reading View</span>
          </button>
          <button
            onClick={() => setIsPlayground(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              isPlayground
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-500" />
            <span>Playground Mode</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".docx" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onOpenFile?.(file);
              e.target.value = '';
            }} 
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-3 rounded-xl border border-slate-200/90 dark:border-slate-700/90 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            title="Open another Word (.docx) file"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Open .docx</span>
          </button>

          <button
            onClick={onOpenTools}
            className="p-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200/90 dark:border-slate-700/90 shadow-2xs"
            title="Switch to another tool"
          >
            <div className="w-4 h-4 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wrench className="w-2.5 h-2.5" />
            </div>
            <span className="hidden sm:inline">Tools</span>
          </button>

          <button
            onClick={handleDirectPdfDownload}
            disabled={isExportingPdf}
            className="p-1.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 border border-indigo-400/30 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
            title="Download publication-grade vector PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Playground Toolbar (Active when Playground mode enabled) */}
      {isPlayground && (
        <PlaygroundToolbar 
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={() => { document.execCommand('underline'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onStrikethrough={() => { document.execCommand('strikeThrough'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onBold={() => { document.execCommand('bold'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onItalic={() => { document.execCommand('italic'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onClearFormat={handleClearFormat}
          onAddComment={handleOpenAddComment}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          onSave={handleSavePlayground}
          onResetOriginal={() => setShowResetModal(true)}
          hasEdits={hasEdits}
          isJustSaved={isJustSaved}
        />
      )}

      {/* Document Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center custom-scrollbar">
        <article
          id="preview-paper"
          ref={paperRef}
          className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-lg p-8 sm:p-14 transition-colors min-h-[800px]"
        >
          {isPlayground && (
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 select-none">
              <span className="font-semibold flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                <span>Word Playground Active: In-place text editing, highlights, and annotations enabled</span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Auto-saving to IndexedDB
              </span>
            </div>
          )}

          <div
            className="word-document-body markdown-body w-full break-words outline-none"
            contentEditable={isPlayground}
            suppressContentEditableWarning={true}
            onInput={handleContentInput}
            dangerouslySetInnerHTML={{ __html: activeHtml }}
          />
        </article>
      </div>

      {/* Floating Selection Box */}
      {selectionBox.visible && isPlayground && (
        <FloatingAnnotationBar 
          position={{ top: selectionBox.top, left: selectionBox.left }}
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={() => { document.execCommand('underline'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onStrikethrough={() => { document.execCommand('strikeThrough'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onBold={() => { document.execCommand('bold'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onItalic={() => { document.execCommand('italic'); pushHistorySnapshot(); triggerAutoSave(true, 300); }}
          onClearFormat={handleClearFormat}
          onAddComment={handleOpenAddComment}
          onClose={() => setSelectionBox(prev => ({ ...prev, visible: false }))}
        />
      )}

      {/* Comment Popover */}
      <CommentPopover 
        isOpen={commentPopover.isOpen}
        mode={commentPopover.mode}
        position={{ top: commentPopover.top, left: commentPopover.left, isAbove: commentPopover.isAbove }}
        comments={commentPopover.comments || []}
        activeCommentIndex={commentPopover.activeCommentIndex || 0}
        commentText={commentPopover.text}
        selectedText={commentPopover.selectedText}
        isPlayground={isPlayground}
        onSave={handleSaveComment}
        onClose={() => setCommentPopover(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal 
        isOpen={showResetModal}
        title="Reset Word Document"
        fileName={fileName}
        message="Are you sure you want to revert this document to its original state? All in-place edits, highlights, and annotations will be cleared."
        confirmLabel="Reset Document"
        cancelLabel="Keep Edits"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
