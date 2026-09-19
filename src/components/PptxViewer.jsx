import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Presentation, 
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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen
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
import { downloadPresentationPdf, printToPdf } from '../utils/pdfExport';
import { savePlaygroundDraft, getPlaygroundDraft, clearPlaygroundDraft } from '../utils/storage';

export default function PptxViewer({
  slides: initialSlides = [],
  fileName = 'Presentation.pptx',
  theme = 'modern',
  showFileSidebar = false,
  onToggleSidebar,
  onOpenFile,
  onLoadSamplePptx,
  onOpenTools
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState('deck'); // 'deck' | 'flow'
  const [isPlayground, setIsPlayground] = useState(true);
  const [hasEdits, setHasEdits] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Annotation & Comment states
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

  const containerRef = useRef(null);
  const flowContainerRef = useRef(null);
  const deckContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const inputDebounceTimerRef = useRef(null);

  const draftKey = `pptx_draft_${fileName}`;

  // Sync slides when initialSlides changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedDraft = await getPlaygroundDraft(draftKey);
        if (isMounted) {
          if (savedDraft) {
            const parsed = typeof savedDraft === 'string' ? JSON.parse(savedDraft) : savedDraft;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlides(parsed);
              return;
            }
          }
          setSlides(initialSlides);
        }
      } catch {
        if (isMounted) setSlides(initialSlides);
      }
    })();
    return () => { isMounted = false; };
  }, [initialSlides, draftKey]);

  const currentSlide = slides[activeSlideIndex] || slides[0] || {
    id: 'empty',
    slideNumber: 1,
    title: 'Empty Slide',
    subtitle: '',
    textBlocks: [],
    tables: [],
    images: []
  };

  // Keyboard navigation in Deck mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (displayMode === 'deck') {
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          setActiveSlideIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMode, slides.length]);

  // Capture DOM snapshots for Undo/Redo
  const captureSnapshot = useCallback(() => {
    const activeEl = displayMode === 'flow' ? flowContainerRef.current : deckContainerRef.current;
    if (!activeEl) return;
    const currentHtml = activeEl.innerHTML;
    const currentIndex = historyIndexRef.current;
    const currentStack = historyStackRef.current;

    if (currentIndex >= 0 && currentStack[currentIndex] === currentHtml) {
      return;
    }

    const newStack = currentStack.slice(0, currentIndex + 1);
    newStack.push(currentHtml);
    if (newStack.length > 50) newStack.shift();

    historyStackRef.current = newStack;
    historyIndexRef.current = newStack.length - 1;

    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < newStack.length - 1
    });
  }, [displayMode]);

  // Debounced auto-save to IndexedDB
  const scheduleAutoSave = useCallback(() => {
    setHasEdits(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await savePlaygroundDraft(draftKey, slides);
        setIsJustSaved(true);
        setTimeout(() => setIsJustSaved(false), 2000);
      } catch (err) {
        console.error('Failed to auto-save presentation draft to IndexedDB:', err);
      }
    }, 1000);
  }, [draftKey, slides]);

  // Handle slide content editing
  const handleSlideContentChange = useCallback((slideIdx, field, value) => {
    setSlides(prev => {
      const copy = [...prev];
      if (copy[slideIdx]) {
        copy[slideIdx] = { ...copy[slideIdx], [field]: value };
      }
      return copy;
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleParagraphChange = useCallback((slideIdx, blockIdx, pIdx, newText) => {
    setSlides(prev => {
      const copy = [...prev];
      const slide = { ...copy[slideIdx] };
      const blocks = [...(slide.textBlocks || [])];
      if (blocks[blockIdx]) {
        const block = { ...blocks[blockIdx] };
        const paragraphs = [...(block.paragraphs || [])];
        if (paragraphs[pIdx]) {
          paragraphs[pIdx] = {
            ...paragraphs[pIdx],
            runs: [{ text: newText, bold: false, italic: false }]
          };
          block.paragraphs = paragraphs;
          blocks[blockIdx] = block;
          slide.textBlocks = blocks;
          copy[slideIdx] = slide;
        }
      }
      return copy;
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    const activeEl = displayMode === 'flow' ? flowContainerRef.current : deckContainerRef.current;
    if (!activeEl || historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prevHtml = historyStackRef.current[historyIndexRef.current];
    activeEl.innerHTML = prevHtml;

    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyStackRef.current.length - 1
    });
    scheduleAutoSave();
  }, [displayMode, scheduleAutoSave]);

  const handleRedo = useCallback(() => {
    const activeEl = displayMode === 'flow' ? flowContainerRef.current : deckContainerRef.current;
    if (!activeEl || historyIndexRef.current >= historyStackRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const nextHtml = historyStackRef.current[historyIndexRef.current];
    activeEl.innerHTML = nextHtml;

    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyStackRef.current.length - 1
    });
    scheduleAutoSave();
  }, [displayMode, scheduleAutoSave]);

  // Manual save to IndexedDB
  const handleSaveDraft = async () => {
    try {
      await savePlaygroundDraft(draftKey, slides);
      setIsJustSaved(true);
      setHasEdits(false);
      setTimeout(() => setIsJustSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save presentation draft:', err);
    }
  };

  // Reset to original PowerPoint
  const handleResetDocument = async () => {
    try {
      await clearPlaygroundDraft(draftKey);
      setSlides(initialSlides);
      setHasEdits(false);
      setShowResetModal(false);
      historyStackRef.current = [];
      historyIndexRef.current = -1;
      setHistoryState({ canUndo: false, canRedo: false });
    } catch (err) {
      console.error('Failed to reset presentation:', err);
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    // Export presentation cards directly
    const targetElement = flowContainerRef.current || containerRef.current;
    if (targetElement) {
      await downloadPresentationPdf(targetElement, fileName.replace(/\.pptx$/, '') + '.pdf');
    }
    setIsExportingPdf(false);
  };

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

    const activeContainer = containerRef.current;
    if (!activeContainer || !activeContainer.contains(sel.anchorNode)) {
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
      top: rect.top - 52,
      left: Math.max(10, rect.left + rect.width / 2),
      visible: true
    });
  }, [isPlayground]);

  useEffect(() => {
    const onSelection = () => handleSelectionChange();
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, [handleSelectionChange]);

  // Keyboard navigation & Right Arrow escape boundary handler
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.rangeCount) return;

      const node = sel.focusNode;
      const offset = sel.focusOffset;
      const mark = node.nodeType === Node.TEXT_NODE 
        ? node.parentElement?.closest('mark') 
        : node.closest?.('mark');

      if (mark) {
        const textLen = node.nodeType === Node.TEXT_NODE ? node.length : mark.textContent.length;
        if (offset >= textLen) {
          e.preventDefault();
          const zwsp = document.createTextNode('\u200B');
          if (mark.nextSibling) {
            mark.parentNode.insertBefore(zwsp, mark.nextSibling);
          } else {
            mark.parentNode.appendChild(zwsp);
          }

          const newRange = document.createRange();
          newRange.setStart(zwsp, 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }
  };

  // Format Selection with Color Highlight
  const handleFormat = (type, value) => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    captureSnapshot();
    const activeEl = displayMode === 'flow' ? flowContainerRef.current : deckContainerRef.current;
    applyFormattingToRange(range, type, value, activeEl);
    setSelectionBox({ top: 0, left: 0, visible: false });
    scheduleAutoSave();
  };

  const handleClearFormatting = () => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    captureSnapshot();
    unwrapFormattingInRange(range);
    setSelectionBox({ top: 0, left: 0, visible: false });
    scheduleAutoSave();
  };

  // Comments Handling
  const handleOpenAddComment = () => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    const rect = range.getBoundingClientRect();
    const selectedText = range.toString().trim();

    setCommentPopover({
      isOpen: true,
      mode: 'add',
      top: rect.bottom + 8,
      left: Math.max(16, rect.left + rect.width / 2 - 160),
      isAbove: false,
      text: '',
      selectedText,
      targetElement: null,
      comments: [],
      activeCommentIndex: 0
    });

    setSelectionBox({ top: 0, left: 0, visible: false });
  };

  const handleSaveComment = (commentText) => {
    if (!commentText.trim()) return;
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    captureSnapshot();
    const activeEl = displayMode === 'flow' ? flowContainerRef.current : deckContainerRef.current;
    const mark = applyFormattingToRange(range, 'comment', commentText, activeEl);

    if (mark) {
      const existing = parseComments(mark);
      existing.push({
        id: `c_${Date.now()}`,
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      });
      setCommentsOnElement(mark, existing);
    }

    setCommentPopover(prev => ({ ...prev, isOpen: false }));
    scheduleAutoSave();
  };

  const handleDocumentClick = (e) => {
    const mark = e.target.closest('mark[data-comment], mark.playground-comment');
    if (mark) {
      e.stopPropagation();
      const comments = parseComments(mark);
      const rect = mark.getBoundingClientRect();

      setCommentPopover({
        isOpen: true,
        mode: 'view',
        top: rect.bottom + 8,
        left: Math.max(16, rect.left + rect.width / 2 - 160),
        isAbove: false,
        text: comments[0]?.text || '',
        selectedText: mark.textContent,
        targetElement: mark,
        comments,
        activeCommentIndex: 0
      });
      return;
    }

    if (!e.target.closest('#comment-popover') && !e.target.closest('#floating-annotation-bar')) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleAddThreadComment = (commentText) => {
    if (!commentPopover.targetElement || !commentText.trim()) return;
    captureSnapshot();
    const comments = parseComments(commentPopover.targetElement);
    const newComment = {
      id: `c_${Date.now()}`,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };
    comments.push(newComment);
    setCommentsOnElement(commentPopover.targetElement, comments);

    setCommentPopover(prev => ({
      ...prev,
      comments,
      activeCommentIndex: comments.length - 1
    }));
    scheduleAutoSave();
  };

  const handleDeleteComment = (commentId) => {
    if (!commentPopover.targetElement) return;
    captureSnapshot();
    const mark = commentPopover.targetElement;
    let comments = parseComments(mark);
    comments = comments.filter(c => c.id !== commentId);

    if (comments.length === 0) {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    } else {
      setCommentsOnElement(mark, comments);
      setCommentPopover(prev => ({
        ...prev,
        comments,
        activeCommentIndex: Math.max(0, prev.activeCommentIndex - 1)
      }));
    }
    scheduleAutoSave();
  };

  // Render a Single Slide Card
  const renderSlideCard = (slide, slideIdx, isInteractive = true) => {
    const isDeckActive = displayMode === 'deck' && activeSlideIndex === slideIdx;

    return (
      <div 
        key={slide.id || `slide-${slideIdx}`}
        id={`pptx-slide-${slideIdx + 1}`}
        className={`pptx-slide-card relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-8 sm:p-12 mb-8 transition-all overflow-hidden ${
          isDeckActive ? 'ring-2 ring-blue-500 shadow-xl' : ''
        }`}
        style={{
          minHeight: '480px',
          aspectRatio: '16 / 9',
        }}
        onClick={handleDocumentClick}
        onKeyDown={handleKeyDown}
      >
        {/* Slide Header & Number Badge */}
        <div className="flex items-start justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex-1" style={{ textAlign: slide.titleAlign || 'left' }}>
            <h2
              contentEditable={isPlayground && isInteractive}
              suppressContentEditableWarning
              onBlur={(e) => handleSlideContentChange(slideIdx, 'title', e.currentTarget.innerText)}
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30 rounded px-1 transition-colors"
              style={{
                fontFamily: slide.titleFontFamily,
                color: slide.titleColor,
              }}
            >
              {slide.titleRuns && slide.titleRuns.length > 0 ? (
                slide.titleRuns.map((r, i) => (
                  <span 
                    key={`tr-${i}`} 
                    className={`${r.bold ? 'font-bold' : ''} ${r.italic ? 'italic' : ''} ${r.underline ? 'underline' : ''} ${r.strike ? 'line-through' : ''}`}
                    style={{ 
                      fontFamily: r.fontFamily, 
                      color: r.color,
                      fontSize: r.fontSize 
                    }}
                  >
                    {r.text}
                  </span>
                ))
              ) : (
                slide.title
              )}
            </h2>
            {slide.subtitle && (
              <p
                contentEditable={isPlayground && isInteractive}
                suppressContentEditableWarning
                onBlur={(e) => handleSlideContentChange(slideIdx, 'subtitle', e.currentTarget.innerText)}
                className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-1.5 outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30 rounded px-1 transition-colors"
                style={{
                  fontFamily: slide.subtitleFontFamily,
                  color: slide.subtitleColor,
                  textAlign: slide.subtitleAlign || 'left'
                }}
              >
                {slide.subtitleRuns && slide.subtitleRuns.length > 0 ? (
                  slide.subtitleRuns.map((r, i) => (
                    <span 
                      key={`sr-${i}`} 
                      className={`${r.bold ? 'font-bold' : ''} ${r.italic ? 'italic' : ''} ${r.underline ? 'underline' : ''} ${r.strike ? 'line-through' : ''}`}
                      style={{ 
                        fontFamily: r.fontFamily, 
                        color: r.color,
                        fontSize: r.fontSize 
                      }}
                    >
                      {r.text}
                    </span>
                  ))
                ) : (
                  slide.subtitle
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Slide {slideIdx + 1}
            </span>
          </div>
        </div>

        {/* Slide Body Content */}
        <div className="space-y-4">
          {/* Text Blocks & Bullet Points */}
          {slide.textBlocks?.map((block, bIdx) => (
            <div key={`block-${bIdx}`} className="space-y-2.5">
              {block.paragraphs?.map((para, pIdx) => {
                const indentClass = para.level === 1 ? 'ml-6' : para.level >= 2 ? 'ml-12' : '';
                const alignStyle = para.align ? { textAlign: para.align } : {};
                return (
                  <div key={`p-${pIdx}`} className={`flex items-start gap-2.5 ${indentClass}`} style={alignStyle}>
                    {para.hasBullet !== false && (
                      para.bulletChar ? (
                        <span 
                          className="shrink-0 font-bold select-none text-sm leading-tight mt-1" 
                          style={{ color: para.bulletColor || 'currentColor', marginRight: '2px' }}
                        >
                          {para.bulletChar}
                        </span>
                      ) : (
                        <span 
                          className="w-2 h-2 rounded-full mt-2 shrink-0 select-none" 
                          style={{ backgroundColor: para.bulletColor || '#3B82F6' }}
                        />
                      )
                    )}
                    <div 
                      contentEditable={isPlayground && isInteractive}
                      suppressContentEditableWarning
                      onBlur={(e) => handleParagraphChange(slideIdx, bIdx, pIdx, e.currentTarget.innerText)}
                      className="flex-1 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30 rounded px-1 transition-colors"
                      style={alignStyle}
                    >
                      {para.runs?.map((run, rIdx) => (
                        <span 
                          key={`run-${rIdx}`}
                          className={`${run.bold ? 'font-bold' : 'font-normal'} ${run.italic ? 'italic' : ''} ${run.underline ? 'underline' : ''} ${run.strike ? 'line-through' : ''}`}
                          style={{
                            fontFamily: run.fontFamily,
                            color: run.color,
                            fontSize: run.fontSize
                          }}
                        >
                          {run.text}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Tables */}
          {slide.tables?.map((table, tIdx) => (
            <div key={`table-${tIdx}`} className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody>
                  {table.map((row, rIdx) => (
                    <tr 
                      key={`tr-${rIdx}`}
                      className={rIdx === 0 ? 'bg-slate-100 dark:bg-slate-800/80 font-semibold' : 'border-t border-slate-100 dark:border-slate-800'}
                    >
                      {row.map((cell, cIdx) => (
                        <td 
                          key={`td-${cIdx}`}
                          contentEditable={isPlayground && isInteractive}
                          suppressContentEditableWarning
                          className="p-3 outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30 text-slate-800 dark:text-slate-200"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Embedded Images */}
          {slide.images?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              {slide.images.map((img, imgIdx) => (
                <div key={`img-${imgIdx}`} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
                  <img src={img.src} alt={img.alt || 'Slide asset'} className="w-full h-auto object-contain max-h-64 rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slide Footer */}
        <div className="absolute bottom-4 left-8 right-8 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
          <span className="truncate max-w-[240px]">{fileName}</span>
          <span>{slideIdx + 1} / {slides.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 transition-colors">
      {/* PPTX Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Presentation Info & View Switcher */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-2 rounded-xl transition-all flex items-center justify-center border ${
                showFileSidebar
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-2xs'
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

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20 ring-1 ring-white/20 shrink-0">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs tracking-tight">
                {fileName}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                .pptx
              </span>
              <span className="text-xs text-slate-400 hidden md:inline font-medium">
                · {slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}
              </span>
            </div>
          </div>

          {/* View Mode Toggle: Deck vs Flow */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 ml-2">
            <button
              onClick={() => setDisplayMode('deck')}
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition-all ${
                displayMode === 'deck'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Slide Deck Mode (Interactive Carousel & Arrows)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deck Mode</span>
            </button>
            <button
              onClick={() => setDisplayMode('flow')}
              className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition-all ${
                displayMode === 'flow'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Document Flow Mode (Continuous Scroll & Print Cards)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flow Mode</span>
            </button>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2">
          {/* Deck navigation in Deck mode */}
          {displayMode === 'deck' && slides.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                disabled={activeSlideIndex === 0}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Slide (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[54px] text-center">
                {activeSlideIndex + 1} / {slides.length}
              </span>
              <button
                onClick={() => setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={activeSlideIndex === slides.length - 1}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Slide (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Playground Mode Toggle */}
          <button
            onClick={() => setIsPlayground(!isPlayground)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              isPlayground 
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Playground (Edit slide text, highlight colors, and add comments)"
          >
            {isPlayground ? <PenTool className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPlayground ? 'Playground Active' : 'Read Mode'}</span>
          </button>

          {/* Reset Draft */}
          {hasEdits && (
            <button
              onClick={() => setShowResetModal(true)}
              className="p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800"
              title="Reset slide edits"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Manual Save */}
          <button
            onClick={handleSaveDraft}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isJustSaved
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
            title="Save draft to IndexedDB"
          >
            {isJustSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isJustSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Switch Tool */}
          {onOpenTools && (
            <button
              onClick={onOpenTools}
              className="p-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200/90 dark:border-slate-700/90 shadow-2xs"
              title="Open Document Tools Hub"
            >
              <div className="w-4 h-4 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Wrench className="w-2.5 h-2.5" />
              </div>
              <span className="hidden sm:inline">Tools</span>
            </button>
          )}

          {/* Download Presentation PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-orange-500/20 border border-amber-400/30 transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
            title="Download Landscape Presentation PDF (1 slide per page)"
          >
            {isExportingPdf ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Slide Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
        {slides.length === 0 ? (
          <div className="my-auto text-center py-16 px-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center mb-4 border border-orange-500/20">
              <Presentation className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No PowerPoint Slides Loaded
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Drop a .pptx file here, open from disk, or explore the built-in sample presentation.
            </p>
            <div className="flex items-center justify-center gap-3">
              {onLoadSamplePptx && (
                <button
                  onClick={onLoadSamplePptx}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Sample Deck</span>
                </button>
              )}
            </div>
          </div>
        ) : displayMode === 'deck' ? (
          /* Deck Mode Carousel View */
          <div ref={deckContainerRef} className="w-full max-w-5xl flex flex-col items-center">
            {renderSlideCard(currentSlide, activeSlideIndex, true)}

            {/* Thumbnail Bottom Strip */}
            <div className="w-full mt-4 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto flex items-center gap-3 shadow-md">
              {slides.map((s, idx) => (
                <button
                  key={`thumb-${idx}`}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`shrink-0 w-28 h-18 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    activeSlideIndex === idx
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate block">
                    {s.title || `Slide ${idx + 1}`}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Document Flow View: Stack of Slides */
          <div ref={flowContainerRef} className="w-full max-w-5xl">
            {slides.map((slide, idx) => renderSlideCard(slide, idx, true))}
          </div>
        )}
      </div>

      {/* Floating Annotation Toolbar */}
      {selectionBox.visible && isPlayground && (
        <FloatingAnnotationBar 
          position={selectionBox}
          onFormat={handleFormat}
          onClearFormatting={handleClearFormatting}
          onAddComment={handleOpenAddComment}
        />
      )}

      {/* Comment Popover */}
      <CommentPopover 
        isOpen={commentPopover.isOpen}
        mode={commentPopover.mode}
        top={commentPopover.top}
        left={commentPopover.left}
        isAbove={commentPopover.isAbove}
        selectedText={commentPopover.selectedText}
        existingComments={commentPopover.comments}
        activeCommentIndex={commentPopover.activeCommentIndex}
        onSaveComment={handleSaveComment}
        onAddComment={handleAddThreadComment}
        onDeleteComment={handleDeleteComment}
        onClose={() => setCommentPopover(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal 
        isOpen={showResetModal}
        title="Reset Slide Edits"
        fileName={fileName}
        message="Are you sure you want to reset this presentation? All in-place edits, highlights, and comments will be reverted to the original version."
        confirmLabel="Reset Deck"
        cancelLabel="Keep Edits"
        variant="warning"
        onConfirm={handleResetDocument}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
