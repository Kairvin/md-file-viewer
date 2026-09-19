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
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  FileCode,
  Layers,
  ChevronLeft,
  ChevronRight
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
  consolidateMarks
} from './MarkdownViewer';
import { downloadDirectPdf, printToPdf } from '../utils/pdfExport';
import { savePlaygroundDraft, getPlaygroundDraft, clearPlaygroundDraft } from '../utils/storage';
import { parsePdfToHtml } from '../utils/pdfParser';

export default function PdfViewer({
  fileUrl,
  fileName = 'Document.pdf',
  html: initialHtml = '',
  numPages: initialNumPages = 1,
  totalWords: initialTotalWords = 0,
  arrayBuffer: initialArrayBuffer = null,
  theme = 'modern',
  showFileSidebar = false,
  onToggleSidebar,
  onOpenFile,
  onOpenTools
}) {
  const [isPlayground, setIsPlayground] = useState(true);
  const [viewMode, setViewMode] = useState('paper'); // 'paper' (.md style) | 'canvas' (original PDF)
  const [activeHtml, setActiveHtml] = useState(initialHtml);
  const [numPages, setNumPages] = useState(initialNumPages);
  const [totalWords, setTotalWords] = useState(initialTotalWords);
  const [isLoading, setIsLoading] = useState(false);
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
  const canvasContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const inputDebounceTimerRef = useRef(null);

  const draftKey = `pdf_draft_${fileName}`;

  // Word count and reading time calculation
  const plainText = (activeHtml || '').replace(/<[^>]+>/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length || totalWords;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  // Load draft or parse PDF if HTML is not yet populated
  useEffect(() => {
    let isMounted = true;

    (async () => {
      // 1. First check IndexedDB draft for this PDF
      try {
        const savedDraft = await getPlaygroundDraft(draftKey);
        if (isMounted && savedDraft) {
          const draftHtml = typeof savedDraft === 'string' ? savedDraft : savedDraft.html;
          if (draftHtml && draftHtml.trim().length > 0) {
            setActiveHtml(draftHtml);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load PDF draft:', err);
      }

      // 2. If initialHtml provided, use it
      if (initialHtml && initialHtml.trim().length > 0) {
        if (isMounted) setActiveHtml(initialHtml);
        return;
      }

      // 3. Otherwise, parse from fileUrl or arrayBuffer
      if (fileUrl || initialArrayBuffer) {
        if (isMounted) setIsLoading(true);
        try {
          let buffer = initialArrayBuffer;
          if (!buffer && fileUrl) {
            const resp = await fetch(fileUrl);
            buffer = await resp.arrayBuffer();
          }

          if (buffer) {
            const result = await parsePdfToHtml(buffer, fileName);
            if (isMounted) {
              setActiveHtml(result.html);
              setNumPages(result.numPages || 1);
              setTotalWords(result.totalWords || 0);
            }
          }
        } catch (e) {
          console.error('Error extracting PDF text:', e);
          if (isMounted) {
            setActiveHtml(`
              <div class="p-8 text-center text-slate-500">
                <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Notice on PDF Text Extraction</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  This PDF was ingested and can be viewed using the Canvas View or directly annotated in the playground paper below.
                </p>
              </div>
            `);
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [fileUrl, initialHtml, initialArrayBuffer, fileName, draftKey]);

  // Push history snapshot for Undo/Redo
  const pushHistorySnapshot = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.pdf-document-body');
    if (!body) return;

    const currentHtml = body.innerHTML;
    const stack = historyStackRef.current;
    const idx = historyIndexRef.current;

    if (idx >= 0 && stack[idx] === currentHtml) return;

    const nextStack = stack.slice(0, idx + 1);
    nextStack.push(currentHtml);
    if (nextStack.length > 50) nextStack.shift();

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
    const body = paper.querySelector('.pdf-document-body');
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
      console.error('Failed to save PDF playground draft:', err);
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
        const body = paper.querySelector('.pdf-document-body');
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
        const body = paper.querySelector('.pdf-document-body');
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
    while (el && el !== paper && !el.classList?.contains('pdf-document-body')) {
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

  // Keyboard shortcuts listener
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

      // Save shortcut Cmd+S
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

  // Selection detection for Floating Annotation Bar
  const handleSelectionChange = useCallback(() => {
    if (!isPlayground) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const paper = paperRef.current;
    if (!paper || !paper.contains(sel.anchorNode)) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    savedRangeRef.current = range.cloneRange();
    setSelectionBox({
      top: rect.top - 54,
      left: Math.max(16, rect.left + rect.width / 2),
      visible: true
    });
  }, [isPlayground]);

  useEffect(() => {
    const onSelection = () => handleSelectionChange();
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, [handleSelectionChange]);

  // Document Click handler for Comment popover
  const handleDocumentClick = (e) => {
    const mark = e.target.closest('mark.annotated-comment, mark[data-comment], mark.playground-comment');
    if (mark) {
      e.stopPropagation();
      const comments = parseComments(mark);
      const rect = mark.getBoundingClientRect();
      const isAbove = rect.bottom + 250 > window.innerHeight;

      setCommentPopover({
        isOpen: true,
        mode: 'view',
        top: isAbove ? rect.top - 10 : rect.bottom + 10,
        left: Math.max(20, Math.min(rect.left, window.innerWidth - 380)),
        isAbove,
        text: comments[0] || '',
        selectedText: mark.textContent,
        targetElement: mark,
        comments,
        activeCommentIndex: 0
      });
      return;
    }

    if (!e.target.closest('#comment-popover-box') && !e.target.closest('#floating-annotation-bar') && !e.target.closest('#playground-toolbar')) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Formatting actions
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
      consolidateMarks(paper);
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

    consolidateMarks(paper);
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

  const handleSaveComment = (commentVal, editIndex) => {
    const textVal = (commentVal || '').trim();
    if (!textVal) return;

    // Edit existing comment
    if (commentPopover.mode === 'edit' && commentPopover.targetElement) {
      pushHistorySnapshot();
      setHasEdits(true);
      const mark = commentPopover.targetElement;
      const comments = parseComments(mark);
      const targetIdx = (typeof editIndex === 'number' && editIndex >= 0)
        ? editIndex
        : (commentPopover.activeCommentIndex || 0);

      comments[targetIdx] = textVal;
      setCommentsOnElement(mark, comments);
      triggerAutoSave(true, 50);
      setCommentPopover(prev => ({
        ...prev,
        mode: 'view',
        comments,
        text: textVal
      }));
      return;
    }

    // Add new comment
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

      consolidateMarks(paper);
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

  const handleDeleteComment = (commentId) => {
    if (!commentPopover.targetElement) return;
    pushHistorySnapshot();
    const mark = commentPopover.targetElement;
    let comments = parseComments(mark);

    if (commentId) {
      comments = comments.filter(c => (typeof c === 'object' ? c.id !== commentId : c !== commentId));
    } else {
      comments.splice(commentPopover.activeCommentIndex || 0, 1);
    }

    if (comments.length === 0) {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    } else {
      setCommentsOnElement(mark, comments);
      setCommentPopover(prev => ({
        ...prev,
        comments,
        activeCommentIndex: Math.max(0, prev.activeCommentIndex - 1)
      }));
    }
    triggerAutoSave(true, 100);
  };

  // PDF Export
  const handleDirectPdfDownload = async () => {
    setIsExportingPdf(true);
    const paper = paperRef.current;
    if (paper) {
      await downloadDirectPdf(paper, fileName.replace(/\.pdf$/i, '') + '-annotated.pdf');
    }
    setIsExportingPdf(false);
  };

  // Reset confirmation
  const handleConfirmReset = async () => {
    await clearPlaygroundDraft(draftKey);
    setActiveHtml(initialHtml);
    setHasEdits(false);
    setShowResetModal(false);
    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.pdf-document-body');
      if (body) body.innerHTML = initialHtml;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".pdf" 
        className="hidden" 
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onOpenFile?.(f);
          e.target.value = '';
        }} 
      />

      {/* Top PDF Navigation Bar */}
      <div className="h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Branding & document stats */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-xl transition-all flex items-center justify-center border ${
                showFileSidebar
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800'
              }`}
              title="Toggle File Sidebar (Cmd + B)"
            >
              {showFileSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-red-500/20 ring-1 ring-white/20 shrink-0">
            <FileText className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs tracking-tight">
                {fileName}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase">
                .pdf
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <BookOpen className="w-3 h-3" />
                {words.toLocaleString()} words
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <Layers className="w-3 h-3" />
                {numPages} {numPages === 1 ? 'Page' : 'Pages'}
              </span>
            </div>
          </div>

          {/* View Mode Toggle: Paper (.md style) vs Canvas (Original) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 ml-2">
            <button
              onClick={() => setViewMode('paper')}
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition-all ${
                viewMode === 'paper'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Reading View: Styled document paper matching Markdown viewer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reading View (.md Style)</span>
            </button>
            {fileUrl && (
              <button
                onClick={() => setViewMode('canvas')}
                className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition-all ${
                  viewMode === 'canvas'
                    ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Canvas View: Original vector PDF pages"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Canvas View</span>
              </button>
            )}
          </div>
        </div>

        {/* Center / Right: Playground & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Playground Mode Toggle */}
          <button
            onClick={() => setIsPlayground(!isPlayground)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              isPlayground 
                ? 'bg-red-600 text-white border-red-500 shadow-xs' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Playground (Edit text, highlight colors, and add comments)"
          >
            {isPlayground ? <PenTool className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPlayground ? 'Playground Active' : 'Read Mode'}</span>
          </button>

          {/* Open Another PDF */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-3 rounded-xl border border-slate-200/90 dark:border-slate-700/90 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            title="Open another PDF file"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Open .pdf</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDirectPdfDownload}
            disabled={isExportingPdf}
            className="p-1.5 px-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-red-500/20 border border-red-400/30 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
            title="Download annotated & edited document as high-quality PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Playground Toolbar (Active when Playground mode enabled and in paper view) */}
      {isPlayground && viewMode === 'paper' && (
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

      {/* Main Document Workspace */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center custom-scrollbar"
        onClick={handleDocumentClick}
      >
        {isLoading ? (
          <div className="my-auto text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4 border border-red-500/20 animate-pulse">
              <FileText className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Extracting PDF Structure & Typography...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Compiling "{fileName}" into readable paper format with complete playground annotations.
            </p>
          </div>
        ) : viewMode === 'canvas' && fileUrl ? (
          /* Raw Canvas / Object View */
          <div className="w-full max-w-5xl h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
            <object 
              data={fileUrl} 
              type="application/pdf" 
              className="w-full h-full border-0"
            >
              <iframe 
                src={fileUrl} 
                className="w-full h-full border-0" 
                title={fileName}
              />
            </object>
          </div>
        ) : (
          /* Document Paper View (Alike .md viewer) */
          <article
            id="preview-paper"
            ref={paperRef}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl p-8 sm:p-14 transition-colors min-h-[800px]"
          >
            {isPlayground && (
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 select-none">
                <span className="font-semibold flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF Playground Active: In-place text editing, highlights, and annotations enabled</span>
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Auto-saving to IndexedDB
                </span>
              </div>
            )}

            <div
              className="pdf-document-body markdown-body w-full break-words outline-none"
              contentEditable={isPlayground}
              suppressContentEditableWarning={true}
              onInput={handleContentInput}
              dangerouslySetInnerHTML={{ __html: activeHtml }}
            />
          </article>
        )}
      </div>

      {/* Floating Selection Box */}
      {selectionBox.visible && isPlayground && viewMode === 'paper' && (
        <FloatingAnnotationBar 
          position={{ top: selectionBox.top, left: selectionBox.left, visible: true }}
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
        onDelete={handleDeleteComment}
        onClose={() => setCommentPopover(prev => ({ ...prev, isOpen: false }))}
        onChangeMode={(newMode) => setCommentPopover(prev => ({ ...prev, mode: newMode }))}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal 
        isOpen={showResetModal}
        title="Reset PDF Document"
        fileName={fileName}
        message="Are you sure you want to revert this PDF to its original state? All in-place edits, highlights, and annotations will be cleared."
        confirmLabel="Reset Document"
        cancelLabel="Keep Edits"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
