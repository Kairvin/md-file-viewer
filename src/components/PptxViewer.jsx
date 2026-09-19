import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Presentation, 
  Download, 
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
  consolidateMarks
} from './MarkdownViewer';
import { downloadPresentationPdf } from '../utils/pdfExport';
import { savePlaygroundDraft, getPlaygroundDraft, clearPlaygroundDraft } from '../utils/storage';
import { deduplicateText, deduplicateRuns } from '../utils/pptxParser';

/**
 * Escapes characters for HTML output
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts a text run to an HTML string
 */
function runToHtml(run) {
  if (!run) return '';
  if (run.isBreak) return '<br/>';
  const clean = deduplicateText(run.text || '');
  if (!clean) return '';

  const styles = [];
  if (run.fontFamily) styles.push(`font-family: ${escapeHtml(run.fontFamily)}`);
  if (run.color) styles.push(`color: ${escapeHtml(run.color)}`);
  if (run.fontSize) styles.push(`font-size: ${escapeHtml(run.fontSize)}`);

  const classes = [];
  if (run.bold) classes.push('font-bold');
  if (run.italic) classes.push('italic');
  if (run.underline) classes.push('underline');
  if (run.strike) classes.push('line-through');

  const styleAttr = styles.length ? ` style="${styles.join('; ')}"` : '';
  const classAttr = classes.length ? ` class="${classes.join(' ')}"` : '';

  return `<span${classAttr}${styleAttr}>${escapeHtml(clean)}</span>`;
}

/**
 * Converts an array of runs to HTML string
 */
function runsToHtml(runs, fallbackText = '') {
  const sanitized = deduplicateRuns(runs);
  if (sanitized && sanitized.length > 0) {
    return sanitized.map(runToHtml).join('');
  }
  const clean = deduplicateText(fallbackText);
  return clean ? escapeHtml(clean) : '';
}

/**
 * Converts a single paragraph to HTML string
 */
function paragraphToHtml(para) {
  const indentClass = para.level === 1 ? 'ml-6' : para.level >= 2 ? 'ml-12' : '';
  const alignStyle = para.align ? `text-align: ${para.align};` : '';
  const runsHtml = runsToHtml(para.runs, para.text);

  let bulletHtml = '';
  if (para.hasBullet !== false) {
    if (para.bulletChar) {
      bulletHtml = `<span class="bullet-symbol shrink-0 font-bold select-none text-sm leading-tight mt-1" style="color: ${escapeHtml(para.bulletColor || 'currentColor')}; margin-right: 6px;" contenteditable="false">${escapeHtml(para.bulletChar)}</span>`;
    } else {
      bulletHtml = `<span class="bullet-dot w-2 h-2 rounded-full mt-2 shrink-0 select-none" style="background-color: ${escapeHtml(para.bulletColor || '#3B82F6')}; margin-right: 8px;" contenteditable="false"></span>`;
    }
  }

  return `
    <div class="pptx-para flex items-start gap-2.5 ${indentClass}" style="${alignStyle}">
      ${bulletHtml}
      <div class="pptx-para-content flex-1 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 outline-none rounded px-1 transition-colors" style="${alignStyle}">
        ${runsHtml}
      </div>
    </div>
  `;
}

/**
 * Converts a table structure to HTML string
 */
function tableToHtml(table) {
  if (!Array.isArray(table) || table.length === 0) return '';
  const rowsHtml = table.map((row, rIdx) => {
    const isHeader = rIdx === 0;
    const rowClass = isHeader ? 'bg-slate-100 dark:bg-slate-800/80 font-semibold' : 'border-t border-slate-100 dark:border-slate-800';
    const cellsHtml = row.map(cell => `<td class="p-3 outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30 text-slate-800 dark:text-slate-200">${escapeHtml(cell)}</td>`).join('');
    return `<tr class="${rowClass}">${cellsHtml}</tr>`;
  }).join('');

  return `
    <div class="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-left text-xs sm:text-sm">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Converts slide images to HTML string
 */
function imagesToHtml(images) {
  if (!Array.isArray(images) || images.length === 0) return '';
  const imgsHtml = images.map(img => `
    <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
      <img src="${img.src}" alt="${escapeHtml(img.alt || 'Slide asset')}" class="w-full h-auto object-contain max-h-64 rounded-lg select-none" />
    </div>
  `).join('');

  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">${imgsHtml}</div>`;
}

/**
 * Serializes a slide object into complete rich HTML for the editable slide body
 */
export function slideContentToHtml(slide, slideIdx) {
  if (!slide) return '';
  if (slide.slideHtml) return slide.slideHtml;

  const titleHtml = runsToHtml(slide.titleRuns, slide.title);
  const subtitleHtml = runsToHtml(slide.subtitleRuns, slide.subtitle);

  let bodyHtml = '';
  if (Array.isArray(slide.textBlocks)) {
    for (const block of slide.textBlocks) {
      if (Array.isArray(block.paragraphs)) {
        bodyHtml += `<div class="pptx-text-block space-y-2.5 my-2">${block.paragraphs.map(paragraphToHtml).join('')}</div>`;
      }
    }
  }

  let tablesHtml = '';
  if (Array.isArray(slide.tables)) {
    tablesHtml = slide.tables.map(tableToHtml).join('');
  }

  let imagesHtml = '';
  if (Array.isArray(slide.images)) {
    imagesHtml = imagesToHtml(slide.images);
  }

  const titleStyle = [
    slide.titleFontFamily ? `font-family: ${escapeHtml(slide.titleFontFamily)}` : '',
    slide.titleColor ? `color: ${escapeHtml(slide.titleColor)}` : ''
  ].filter(Boolean).join('; ');

  const subtitleStyle = [
    slide.subtitleFontFamily ? `font-family: ${escapeHtml(slide.subtitleFontFamily)}` : '',
    slide.subtitleColor ? `color: ${escapeHtml(slide.subtitleColor)}` : '',
    slide.subtitleAlign ? `text-align: ${slide.subtitleAlign}` : ''
  ].filter(Boolean).join('; ');

  return `
    <div class="pptx-slide-inner">
      <div class="flex items-start justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4 select-none">
        <div class="flex-1" style="text-align: ${slide.titleAlign || 'left'};">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight outline-none rounded px-1 transition-colors" ${titleStyle ? `style="${titleStyle}"` : ''}>
            ${titleHtml}
          </h2>
          ${subtitleHtml ? `
            <p class="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-1.5 outline-none rounded px-1 transition-colors" ${subtitleStyle ? `style="${subtitleStyle}"` : ''}>
              ${subtitleHtml}
            </p>
          ` : ''}
        </div>
        <div class="flex items-center gap-2 shrink-0 select-none" contenteditable="false">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Slide ${slideIdx + 1}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        ${bodyHtml}
        ${tablesHtml}
        ${imagesHtml}
      </div>
    </div>
  `.trim();
}

/**
 * Ensures any slide object (even from older cached drafts) has zero text duplication
 */
function sanitizeSlide(slide) {
  if (!slide) return slide;
  return {
    ...slide,
    title: deduplicateText(slide.title),
    subtitle: deduplicateText(slide.subtitle),
    titleRuns: deduplicateRuns(slide.titleRuns),
    subtitleRuns: deduplicateRuns(slide.subtitleRuns),
    textBlocks: slide.textBlocks?.map(block => ({
      ...block,
      rawText: deduplicateText(block.rawText),
      paragraphs: block.paragraphs?.map(p => ({
        ...p,
        runs: deduplicateRuns(p.runs)
      }))
    }))
  };
}

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
  const [slides, setSlides] = useState(() => {
    const base = Array.isArray(initialSlides) ? initialSlides.map(sanitizeSlide) : [];
    return base.map((s, idx) => ({
      ...s,
      slideHtml: s.slideHtml || slideContentToHtml(s, idx)
    }));
  });

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

  // History stack for Undo / Redo: stores [{ slideIdx, html }]
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const historyStackRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const containerRef = useRef(null);
  const flowContainerRef = useRef(null);
  const deckContainerRef = useRef(null);
  const allSlidesExportRef = useRef(null);
  const slideRefs = useRef([]);
  const fileInputRef = useRef(null);
  const savedRangeRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const inputDebounceTimerRef = useRef(null);

  const draftKey = `pptx_draft_${fileName}`;

  // Sync slides when initialSlides or draftKey changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedDraft = await getPlaygroundDraft(draftKey);
        if (isMounted) {
          if (savedDraft) {
            const parsed = typeof savedDraft === 'string' ? JSON.parse(savedDraft) : savedDraft;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlides(parsed.map((s, idx) => {
                const clean = sanitizeSlide(s);
                return {
                  ...clean,
                  slideHtml: clean.slideHtml || slideContentToHtml(clean, idx)
                };
              }));
              return;
            }
          }
          const base = Array.isArray(initialSlides) ? initialSlides.map(sanitizeSlide) : [];
          setSlides(base.map((s, idx) => ({
            ...s,
            slideHtml: s.slideHtml || slideContentToHtml(s, idx)
          })));
        }
      } catch {
        if (isMounted) {
          const base = Array.isArray(initialSlides) ? initialSlides.map(sanitizeSlide) : [];
          setSlides(base.map((s, idx) => ({
            ...s,
            slideHtml: s.slideHtml || slideContentToHtml(s, idx)
          })));
        }
      }
    })();
    return () => { isMounted = false; };
  }, [initialSlides, draftKey]);

  // Synchronize DOM innerHTML of a slide into state
  const syncSlideHtml = useCallback((slideIdx) => {
    const el = slideRefs.current[slideIdx];
    if (!el) return;
    const cleanHtml = el.innerHTML.replace(/\u200B/g, '');
    setSlides(prev => {
      if (!prev[slideIdx] || prev[slideIdx].slideHtml === cleanHtml) return prev;
      const copy = [...prev];
      copy[slideIdx] = { ...copy[slideIdx], slideHtml: cleanHtml };
      return copy;
    });
  }, []);

  // Synchronize active or all slides
  const syncCurrentSlideHtml = useCallback(() => {
    if (displayMode === 'deck') {
      syncSlideHtml(activeSlideIndex);
    } else {
      slideRefs.current.forEach((_, idx) => syncSlideHtml(idx));
    }
  }, [displayMode, activeSlideIndex, syncSlideHtml]);

  // Push history snapshot for Undo/Redo
  const captureSnapshot = useCallback((targetSlideIdx) => {
    const idx = targetSlideIdx !== undefined ? targetSlideIdx : (displayMode === 'deck' ? activeSlideIndex : 0);
    const el = slideRefs.current[idx];
    if (!el) return;

    const currentHtml = el.innerHTML;
    const stack = historyStackRef.current;
    const hIdx = historyIndexRef.current;

    if (hIdx >= 0 && stack[hIdx]?.html === currentHtml && stack[hIdx]?.slideIdx === idx) return;

    const nextStack = stack.slice(0, hIdx + 1);
    nextStack.push({ slideIdx: idx, html: currentHtml });
    if (nextStack.length > 50) nextStack.shift();

    historyStackRef.current = nextStack;
    historyIndexRef.current = nextStack.length - 1;

    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: false
    });
  }, [displayMode, activeSlideIndex]);

  // Debounced auto-save to IndexedDB
  const scheduleAutoSave = useCallback(() => {
    setHasEdits(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        // Collect current live HTML before writing
        syncCurrentSlideHtml();
        await savePlaygroundDraft(draftKey, slides);
        setIsJustSaved(true);
        setTimeout(() => setIsJustSaved(false), 2000);
      } catch (err) {
        console.error('Failed to auto-save presentation draft to IndexedDB:', err);
      }
    }, 1000);
  }, [draftKey, slides, syncCurrentSlideHtml]);

  // Handle typing input inside slide
  const handleSlideInput = (slideIdx) => {
    setHasEdits(true);
    if (inputDebounceTimerRef.current) clearTimeout(inputDebounceTimerRef.current);
    inputDebounceTimerRef.current = setTimeout(() => {
      captureSnapshot(slideIdx);
      syncSlideHtml(slideIdx);
    }, 300);
    scheduleAutoSave();
  };

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyStackRef.current[historyIndexRef.current];
      if (prev) {
        const el = slideRefs.current[prev.slideIdx];
        if (el) {
          el.innerHTML = prev.html;
          syncSlideHtml(prev.slideIdx);
          setHasEdits(true);
          scheduleAutoSave();
        }
      }
      setHistoryState({
        canUndo: historyIndexRef.current > 0,
        canRedo: historyIndexRef.current < historyStackRef.current.length - 1
      });
    }
  }, [syncSlideHtml, scheduleAutoSave]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyStackRef.current[historyIndexRef.current];
      if (next) {
        const el = slideRefs.current[next.slideIdx];
        if (el) {
          el.innerHTML = next.html;
          syncSlideHtml(next.slideIdx);
          setHasEdits(true);
          scheduleAutoSave();
        }
      }
      setHistoryState({
        canUndo: true,
        canRedo: historyIndexRef.current < historyStackRef.current.length - 1
      });
    }
  }, [syncSlideHtml, scheduleAutoSave]);

  // Manual save to IndexedDB
  const handleSaveDraft = async () => {
    try {
      syncCurrentSlideHtml();
      await savePlaygroundDraft(draftKey, slides);
      setIsJustSaved(true);
      setHasEdits(false);
      setTimeout(() => setIsJustSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save presentation draft:', err);
    }
  };

  // Reset to original presentation
  const handleResetDocument = async () => {
    try {
      await clearPlaygroundDraft(draftKey);
      const cleanSlides = Array.isArray(initialSlides) ? initialSlides.map((s, idx) => {
        const sanitized = sanitizeSlide(s);
        return {
          ...sanitized,
          slideHtml: slideContentToHtml(sanitized, idx)
        };
      }) : [];
      setSlides(cleanSlides);
      setHasEdits(false);
      setShowResetModal(false);
      historyStackRef.current = [];
      historyIndexRef.current = -1;
      setHistoryState({ canUndo: false, canRedo: false });
    } catch (err) {
      console.error('Failed to reset presentation:', err);
    }
  };

  // PDF Export: Exports all slide cards cleanly
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    syncCurrentSlideHtml();
    
    // We export using the dedicated allSlidesExportRef so every slide is captured
    const targetElement = allSlidesExportRef.current || flowContainerRef.current || containerRef.current;
    if (targetElement) {
      await downloadPresentationPdf(targetElement, fileName.replace(/\.pptx$/i, '') + '.pdf');
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

    const editableEl = sel.anchorNode.nodeType === Node.ELEMENT_NODE 
      ? sel.anchorNode.closest('.pptx-slide-editable-body') 
      : sel.anchorNode.parentElement?.closest('.pptx-slide-editable-body');

    if (!editableEl) {
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

  // Caret boundary escape on ArrowRight / ArrowLeft
  const exitMarkBoundary = useCallback((forward = true) => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;

    const container = containerRef.current;
    if (!container) return false;

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
    while (el && el !== container && !el.classList?.contains('pptx-slide-editable-body')) {
      if (isAnnotationElement(el)) {
        targetAnnotation = el;
      }
      el = el.parentElement;
    }

    if (!targetAnnotation || !container.contains(targetAnnotation)) return false;

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

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Exit formatting boundary on ArrowRight / ArrowLeft
      if (isPlayground && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput && containerRef.current && containerRef.current.contains(target)) {
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

      const isEditingText = e.target && (e.target.isContentEditable || e.target.closest?.('.pptx-slide-editable-body'));

      // Save shortcut Cmd+S
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveDraft();
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Strikethrough Cmd+Shift+X
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        if (isEditingText) {
          e.preventDefault();
          document.execCommand('strikeThrough');
          captureSnapshot();
          syncCurrentSlideHtml();
          scheduleAutoSave();
          return;
        }
      }

      // Slide navigation in Deck mode (when not typing in editable text)
      if (!isEditingText && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (displayMode === 'deck') {
          if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            syncSlideHtml(activeSlideIndex);
            setActiveSlideIndex(prev => Math.max(0, prev - 1));
          } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            syncSlideHtml(activeSlideIndex);
            setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPlayground, displayMode, activeSlideIndex, slides.length, handleSaveDraft, handleUndo, handleRedo, exitMarkBoundary, syncSlideHtml, captureSnapshot, syncCurrentSlideHtml, scheduleAutoSave]);

  // Helper to find root editable slide container for a range
  const getSlideRootForRange = (range) => {
    if (!range) return null;
    const node = range.commonAncestorContainer;
    return node.nodeType === Node.ELEMENT_NODE
      ? node.closest('.pptx-slide-editable-body') || node.closest('.pptx-slide-card')
      : node.parentElement?.closest('.pptx-slide-editable-body') || node.parentElement?.closest('.pptx-slide-card');
  };

  // Format Selection with Color Highlight
  const handleHighlight = (color) => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    const root = getSlideRootForRange(range);
    if (!root) return;

    const trimmed = trimRangeToText(root, range);
    if (!trimmed) return;

    captureSnapshot();
    setHasEdits(true);

    if (!color) {
      unwrapFormattingInRange(root, trimmed, { type: 'highlight' });
      setSelectionBox({ top: 0, left: 0, visible: false });
      consolidateMarks(root);
      syncCurrentSlideHtml();
      scheduleAutoSave();
      return;
    }

    const created = applyFormattingToRange(root, trimmed, { type: 'highlight', color });
    const valid = (created || []).filter(el => root.contains(el));
    if (valid.length > 0) {
      const s = window.getSelection();
      if (s) {
        s.removeAllRanges();
        const r = document.createRange();
        r.setStartBefore(valid[0]);
        r.setEndAfter(valid[valid.length - 1]);
        s.addRange(r);
      }
    }

    consolidateMarks(root);
    setSelectionBox({ top: 0, left: 0, visible: false });
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  // Text Color
  const handleTextColor = (color) => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    const root = getSlideRootForRange(range);
    if (!root) return;

    const trimmed = trimRangeToText(root, range);
    if (!trimmed) return;

    captureSnapshot();
    setHasEdits(true);
    applyFormattingToRange(root, trimmed, { type: 'color', color });
    setSelectionBox({ top: 0, left: 0, visible: false });
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  // Clear Formatting
  const handleClearFormat = () => {
    let range = savedRangeRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      range = sel.getRangeAt(0);
    }
    if (!range) return;

    const root = getSlideRootForRange(range);
    if (!root) return;

    const trimmed = trimRangeToText(root, range);
    if (!trimmed) return;

    captureSnapshot();
    setHasEdits(true);
    unwrapFormattingInRange(root, trimmed, { type: 'all' });
    setSelectionBox({ top: 0, left: 0, visible: false });
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  // Document formatting execCommands
  const handleBold = () => {
    document.execCommand('bold');
    captureSnapshot();
    setHasEdits(true);
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  const handleItalic = () => {
    document.execCommand('italic');
    captureSnapshot();
    setHasEdits(true);
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  const handleUnderline = () => {
    document.execCommand('underline');
    captureSnapshot();
    setHasEdits(true);
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

  const handleStrikethrough = () => {
    document.execCommand('strikeThrough');
    captureSnapshot();
    setHasEdits(true);
    syncCurrentSlideHtml();
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

    const root = getSlideRootForRange(range);
    if (!root || !root.contains(range.commonAncestorContainer)) return;

    savedRangeRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    const isAbove = rect.bottom + 250 > window.innerHeight;

    setCommentPopover({
      isOpen: true,
      mode: 'create',
      top: isAbove ? rect.top - 10 : rect.bottom + 10,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)),
      isAbove,
      text: '',
      selectedText: range.toString().trim(),
      targetElement: null,
      comments: [],
      activeCommentIndex: 0
    });

    setSelectionBox({ top: 0, left: 0, visible: false });
  };

  const handleSaveComment = (commentVal, editIndex) => {
    const textVal = (commentVal || '').trim();
    if (!textVal) return;

    // In Edit mode: update existing comment on target element
    if (commentPopover.mode === 'edit' && commentPopover.targetElement) {
      captureSnapshot();
      setHasEdits(true);
      const mark = commentPopover.targetElement;
      const currentComments = parseComments(mark);
      const targetIdx = (typeof editIndex === 'number' && editIndex >= 0) 
        ? editIndex 
        : (commentPopover.activeCommentIndex || 0);

      currentComments[targetIdx] = textVal;
      setCommentsOnElement(mark, currentComments);
      syncCurrentSlideHtml();
      scheduleAutoSave();
      setCommentPopover(prev => ({
        ...prev,
        mode: 'view',
        comments: currentComments,
        text: textVal
      }));
      return;
    }

    // In Create mode: apply new comment to saved range
    const range = savedRangeRef.current;
    if (!range) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const root = getSlideRootForRange(range);
    if (!root) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const trimmed = trimRangeToText(root, range);
    if (!trimmed) {
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
      return;
    }

    try {
      captureSnapshot();
      setHasEdits(true);
      const created = applyFormattingToRange(root, trimmed, {
        type: 'comment',
        commentText: textVal
      });

      consolidateMarks(root);
      syncCurrentSlideHtml();
      scheduleAutoSave();

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
    } catch (err) {
      console.error('Failed to create comment:', err);
      setCommentPopover(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteComment = (commentId) => {
    if (!commentPopover.targetElement) return;
    captureSnapshot();
    setHasEdits(true);
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
    syncCurrentSlideHtml();
    scheduleAutoSave();
  };

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
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)),
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

  const currentSlide = slides[activeSlideIndex] || slides[0] || {
    id: 'empty',
    slideNumber: 1,
    title: 'Empty Slide',
    subtitle: '',
    textBlocks: [],
    tables: [],
    images: [],
    slideHtml: ''
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
      >
        {/* Slide Content rendered via dangerouslySetInnerHTML */}
        <div 
          ref={(el) => { if (isInteractive) slideRefs.current[slideIdx] = el; }}
          className="pptx-slide-editable-body w-full outline-none select-text"
          contentEditable={isPlayground && isInteractive}
          suppressContentEditableWarning={true}
          onInput={() => handleSlideInput(slideIdx)}
          dangerouslySetInnerHTML={{ __html: slide.slideHtml || slideContentToHtml(slide, slideIdx) }}
        />

        {/* Slide Footer */}
        <div className="absolute bottom-4 left-8 right-8 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 select-none pointer-events-none">
          <span className="truncate max-w-[240px]">{fileName}</span>
          <span>{slideIdx + 1} / {slides.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 transition-colors relative">
      {/* Top PPTX Navigation Bar */}
      <div className="h-14 px-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4 transition-colors min-w-0 shrink-0 z-20 shadow-xs">
        {/* Left: Presentation Info & View Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all text-xs flex items-center justify-center shrink-0 ${
                showFileSidebar
                  ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-2xs'
                  : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
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

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-xs border border-slate-800 dark:border-slate-200 shrink-0">
            <Presentation className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0 shrink">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[180px] md:max-w-xs tracking-tight">
                {fileName}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase shrink-0">
                .pptx
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">
                {slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}
              </span>
            </div>
          </div>

          {/* View Mode Toggle: Deck vs Flow */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 ml-1 sm:ml-2 shrink-0">
            <button
              onClick={() => {
                syncSlideHtml(activeSlideIndex);
                setDisplayMode('deck');
              }}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                displayMode === 'deck'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Slide Deck Mode (Interactive Carousel & Arrows)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deck Mode</span>
            </button>
            <button
              onClick={() => {
                syncSlideHtml(activeSlideIndex);
                setDisplayMode('flow');
              }}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                displayMode === 'flow'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Document Flow Mode (Continuous Scroll & Stack)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flow Mode</span>
            </button>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Deck navigation in Deck mode */}
          {displayMode === 'deck' && slides.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => {
                  syncSlideHtml(activeSlideIndex);
                  setActiveSlideIndex(prev => Math.max(0, prev - 1));
                }}
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
                onClick={() => {
                  syncSlideHtml(activeSlideIndex);
                  setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                }}
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
            className={`p-1.5 sm:px-3 sm:py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              isPlayground 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs font-semibold' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title="Toggle Playground (Edit text, highlight colors, and add comments)"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">{isPlayground ? 'Playground Active' : 'Playground'}</span>
          </button>

          {/* Download Presentation PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-xs border border-slate-800 dark:border-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50 shrink-0"
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

      {/* Playground Toolbar (Active when Playground mode enabled) */}
      {isPlayground && (
        <PlaygroundToolbar 
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={handleUnderline}
          onStrikethrough={handleStrikethrough}
          onBold={handleBold}
          onItalic={handleItalic}
          onClearFormat={handleClearFormat}
          onAddComment={handleOpenAddComment}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          onSave={handleSaveDraft}
          onResetOriginal={() => setShowResetModal(true)}
          hasEdits={hasEdits}
          isJustSaved={isJustSaved}
        />
      )}

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
                  onClick={() => {
                    syncSlideHtml(activeSlideIndex);
                    setActiveSlideIndex(idx);
                  }}
                  className={`shrink-0 w-28 h-18 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    activeSlideIndex === idx
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-900 dark:text-white truncate block">
                    {deduplicateText(s.title) || `Slide ${idx + 1}`}
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

      {/* Off-screen staging container rendering all slides for clean multi-page landscape PDF export */}
      <div 
        ref={allSlidesExportRef} 
        style={{ position: 'absolute', left: '-99999px', top: '-99999px', width: '900px', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {slides.map((slide, idx) => (
          <div 
            key={`export-slide-${idx}`}
            className="pptx-slide-card relative bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 mb-8 overflow-hidden"
            style={{ minHeight: '480px', aspectRatio: '16 / 9' }}
          >
            <div 
              className="pptx-slide-editable-body w-full"
              dangerouslySetInnerHTML={{ __html: slide.slideHtml || slideContentToHtml(slide, idx) }}
            />
            <div className="absolute bottom-4 left-8 right-8 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
              <span className="truncate max-w-[240px]">{fileName}</span>
              <span>{idx + 1} / {slides.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Annotation Toolbar */}
      {selectionBox.visible && isPlayground && (
        <FloatingAnnotationBar 
          position={selectionBox}
          onHighlight={handleHighlight}
          onTextColor={handleTextColor}
          onUnderline={handleUnderline}
          onStrikethrough={handleStrikethrough}
          onBold={handleBold}
          onItalic={handleItalic}
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
