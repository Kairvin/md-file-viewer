import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  Sun, 
  Moon, 
  Printer, 
  Minimize2, 
  Check, 
  Copy,
  AlignJustify,
  FileDown,
  Maximize2,
  Sparkles,
  PenTool
} from 'lucide-react';
import FloatingAnnotationBar from './FloatingAnnotationBar';
import PlaygroundToolbar from './PlaygroundToolbar';
import CommentPopover from './CommentPopover';
import ConfirmModal from './ConfirmModal';
import { showInAppAlert } from '../utils/alerts';

/**
 * Safely collect all text nodes intersecting a given range inside root.
 */
export function getTextNodesInRange(root, range) {
  if (!root || !range) return [];
  const textNodes = [];

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.nodeValue || node.nodeValue.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        try {
          return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      }
    }
  );

  let curr;
  while ((curr = walker.nextNode())) {
    textNodes.push(curr);
  }
  return textNodes;
}

/**
 * Trims leading and trailing whitespace from a Range so that
 * formatting is only applied to actual visible characters and
 * never crosses or extracts block element boundaries (like <li> or <p>).
 */
export function trimRangeToText(root, range) {
  if (!root || !range || range.collapsed) return null;
  const rawText = range.toString();
  if (!rawText.trim()) return null;

  const textNodes = getTextNodesInRange(root, range);
  if (textNodes.length === 0) return null;

  let firstNode = null;
  let startOffset = 0;

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const nodeStart = (node === range.startContainer) ? range.startOffset : 0;
    const nodeEnd = (node === range.endContainer) ? range.endOffset : node.nodeValue.length;
    if (nodeEnd <= nodeStart) continue;

    const slice = node.nodeValue.substring(nodeStart, nodeEnd);
    const nonWs = slice.search(/\S/);
    if (nonWs !== -1) {
      firstNode = node;
      startOffset = nodeStart + nonWs;
      break;
    }
  }

  let lastNode = null;
  let endOffset = 0;

  for (let i = textNodes.length - 1; i >= 0; i--) {
    const node = textNodes[i];
    const nodeStart = (node === range.startContainer) ? range.startOffset : 0;
    const nodeEnd = (node === range.endContainer) ? range.endOffset : node.nodeValue.length;
    if (nodeEnd <= nodeStart) continue;

    const slice = node.nodeValue.substring(nodeStart, nodeEnd);
    const trailingSpacesMatch = slice.match(/\s+$/);
    const trailingSpacesLen = trailingSpacesMatch ? trailingSpacesMatch[0].length : 0;
    if (slice.trim().length > 0) {
      lastNode = node;
      endOffset = nodeEnd - trailingSpacesLen;
      break;
    }
  }

  if (!firstNode || !lastNode) return null;

  const trimmedRange = document.createRange();
  try {
    trimmedRange.setStart(firstNode, startOffset);
    trimmedRange.setEnd(lastNode, endOffset);
  } catch (err) {
    return range;
  }

  if (trimmedRange.collapsed || !trimmedRange.toString().trim()) {
    return null;
  }

  return trimmedRange;
}

/**
 * Safely parse all comments from an annotated element.
 * Supports multi-comments stored as JSON in data-comments,
 * with fallback to single data-comment.
 */
export function parseComments(el) {
  if (!el) return [];
  const raw = el.getAttribute('data-comments');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(c => typeof c === 'string' && c.trim().length > 0);
      }
    } catch (e) {
      console.warn('Failed to parse data-comments:', e);
    }
  }
  const single = el.getAttribute('data-comment');
  if (single && single.trim()) {
    return [single.trim()];
  }
  return [];
}

/**
 * Updates an element's comment attributes and classes.
 * Stores full JSON array in data-comments and the latest comment in data-comment.
 */
export function setCommentsOnElement(el, commentsList) {
  if (!el) return;
  const filtered = (commentsList || [])
    .map(c => typeof c === 'string' ? c.trim() : '')
    .filter(Boolean);

  if (filtered.length === 0) {
    el.removeAttribute('data-comments');
    el.removeAttribute('data-comment');
    el.removeAttribute('data-comment-count');
    el.removeAttribute('title');
    el.classList.remove('annotated-comment');
    el.style.cursor = '';
  } else {
    el.classList.add('annotated-comment');
    el.setAttribute('data-comments', JSON.stringify(filtered));
    el.setAttribute('data-comment', filtered[filtered.length - 1]);
    el.setAttribute('data-comment-count', String(filtered.length));
    el.title = filtered.length === 1 
      ? `Comment: ${filtered[0]}` 
      : `Comments (${filtered.length}):\n${filtered.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    el.style.cursor = 'pointer';
  }
}

/**
 * Applies highlight, text color, or comment safely at the text-node level.
 * Never calls extractContents(), never touches or extracts <li> or <p> tags,
 * and never breaks document structure.
 */
export function applyFormattingToRange(root, range, options = {}) {
  const { type, color, commentText, inheritedBgColor } = options;
  if (!root || !range) return [];

  const textNodes = getTextNodesInRange(root, range);
  if (textNodes.length === 0) return [];

  const createdElements = [];

  textNodes.forEach((node) => {
    const isStartNode = (node === range.startContainer);
    const isEndNode = (node === range.endContainer);

    let startOffset = isStartNode ? range.startOffset : 0;
    let endOffset = isEndNode ? range.endOffset : node.nodeValue.length;

    if (startOffset > node.nodeValue.length) startOffset = node.nodeValue.length;
    if (endOffset > node.nodeValue.length) endOffset = node.nodeValue.length;
    if (endOffset <= startOffset) return;

    // Split at end first if needed
    let targetNode = node;
    if (endOffset < node.nodeValue.length) {
      targetNode.splitText(endOffset);
    }
    // Split at start if needed
    if (startOffset > 0) {
      targetNode = targetNode.splitText(startOffset);
    }

    if (!targetNode.nodeValue || targetNode.nodeValue.trim().length === 0) {
      return;
    }

    const parent = targetNode.parentNode;
    if (!parent) return;

    if (type === 'highlight') {
      const parentMark = parent.closest('mark');
      if (parentMark && root.contains(parentMark)) {
        const isEntireMark = parentMark.textContent.trim() === targetNode.nodeValue.trim();
        if (isEntireMark) {
          parentMark.classList.add('annotated-mark');
          parentMark.style.backgroundColor = color;
          parentMark.style.color = 'inherit';
          createdElements.push(parentMark);
        } else {
          // Sub-range highlight inside existing mark
          const beforeRange = document.createRange();
          beforeRange.setStart(parentMark, 0);
          beforeRange.setEndBefore(targetNode);
          const beforeFrag = beforeRange.extractContents();

          const targetRange = document.createRange();
          targetRange.selectNode(targetNode);
          const targetFrag = targetRange.extractContents();

          const markParent = parentMark.parentNode;

          if (beforeFrag.textContent.length > 0) {
            const markBefore = parentMark.cloneNode(false);
            markBefore.appendChild(beforeFrag);
            markParent.insertBefore(markBefore, parentMark);
          }

          const targetEl = parentMark.cloneNode(false);
          targetEl.classList.add('annotated-mark');
          targetEl.style.backgroundColor = color;
          targetEl.style.color = 'inherit';
          targetEl.appendChild(targetFrag);
          markParent.insertBefore(targetEl, parentMark);
          createdElements.push(targetEl);

          if (parentMark.textContent.length === 0) {
            parentMark.remove();
          }
        }
      } else {
        const mark = document.createElement('mark');
        mark.className = 'annotated-mark';
        mark.style.backgroundColor = color;
        mark.style.color = 'inherit';
        parent.insertBefore(mark, targetNode);
        mark.appendChild(targetNode);
        createdElements.push(mark);
      }
    } else if (type === 'color') {
      const parentSpan = parent.closest('span.annotated-color');
      if (parentSpan && root.contains(parentSpan)) {
        parentSpan.style.color = color;
        createdElements.push(parentSpan);
      } else {
        const span = document.createElement('span');
        span.className = 'annotated-color';
        span.style.color = color;
        parent.insertBefore(span, targetNode);
        span.appendChild(targetNode);
        createdElements.push(span);
      }
    } else if (type === 'comment') {
      const parentMark = parent.closest('mark');
      if (parentMark && root.contains(parentMark)) {
        const isEntireMark = parentMark.textContent.trim() === targetNode.nodeValue.trim();
        if (isEntireMark) {
          const existing = parseComments(parentMark);
          const newComments = existing.includes(commentText) ? existing : [...existing, commentText];
          setCommentsOnElement(parentMark, newComments);
          createdElements.push(parentMark);
        } else {
          // Splitting parentMark so ONLY targetNode receives the comment
          const beforeRange = document.createRange();
          beforeRange.setStart(parentMark, 0);
          beforeRange.setEndBefore(targetNode);
          const beforeFrag = beforeRange.extractContents();

          const targetRange = document.createRange();
          targetRange.selectNode(targetNode);
          const targetFrag = targetRange.extractContents();

          const markParent = parentMark.parentNode;

          if (beforeFrag.textContent.length > 0) {
            const markBefore = parentMark.cloneNode(false);
            markBefore.appendChild(beforeFrag);
            markParent.insertBefore(markBefore, parentMark);
          }

          const targetEl = document.createElement('mark');
          targetEl.className = parentMark.className;
          targetEl.style.cssText = parentMark.style.cssText;
          setCommentsOnElement(targetEl, [commentText]);
          const bg = parentMark.style.backgroundColor || inheritedBgColor;
          if (bg && bg !== 'transparent') {
            targetEl.classList.add('annotated-mark');
            targetEl.style.backgroundColor = bg;
          }
          targetEl.appendChild(targetFrag);
          markParent.insertBefore(targetEl, parentMark);
          createdElements.push(targetEl);

          if (parentMark.textContent.length === 0) {
            parentMark.remove();
          }
        }
      } else {
        const mark = document.createElement('mark');
        setCommentsOnElement(mark, [commentText]);
        if (inheritedBgColor && inheritedBgColor !== 'rgb(241, 245, 249)' && inheritedBgColor !== '#f1f5f9') {
          mark.classList.add('annotated-mark');
          mark.style.backgroundColor = inheritedBgColor;
        }
        parent.insertBefore(mark, targetNode);
        mark.appendChild(targetNode);
        createdElements.push(mark);
      }
    }
  });

  return createdElements;
}

/**
 * Unwraps formatting tags (marks or color spans) intersecting range.
 */
export function unwrapFormattingInRange(root, range, options = {}) {
  const { type = 'all' } = options; // 'highlight' | 'color' | 'all'
  if (!root || !range) return;

  if (type === 'highlight' || type === 'all') {
    const marks = root.querySelectorAll('mark');
    marks.forEach(mark => {
      try {
        if (!range.intersectsNode(mark)) return;
      } catch {
        return;
      }

      if (type === 'highlight') {
        if (mark.classList.contains('annotated-comment') || mark.hasAttribute('data-comment') || mark.hasAttribute('data-comments')) {
          mark.classList.remove('annotated-mark');
          mark.style.backgroundColor = '';
          mark.style.color = '';
        } else {
          const parent = mark.parentNode;
          if (parent) {
            while (mark.firstChild) {
              parent.insertBefore(mark.firstChild, mark);
            }
            parent.removeChild(mark);
            parent.normalize();
          }
        }
      } else if (type === 'all') {
        const parent = mark.parentNode;
        if (parent) {
          while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
          }
          parent.removeChild(mark);
          parent.normalize();
        }
      }
    });
  }

  if (type === 'color' || type === 'all') {
    const colorSpans = root.querySelectorAll('span.annotated-color');
    colorSpans.forEach(span => {
      try {
        if (!range.intersectsNode(span)) return;
      } catch {
        return;
      }

      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
      }
    });
  }
}

/**
 * Cleans up empty marks, orphan list items, and stray nodes inside lists.
 */
export function cleanupEmptyAnnotationsInDom(root) {
  if (!root) return;

  // 1. Remove empty marks that have no text and no comment
  const marks = root.querySelectorAll('mark');
  marks.forEach(mark => {
    const text = (mark.textContent || '').trim();
    const hasComment = mark.hasAttribute('data-comment') && mark.getAttribute('data-comment').trim();
    if (!text && !hasComment) {
      mark.remove();
    }
  });

  // 2. Remove empty list items that have no text and no media
  const listItems = root.querySelectorAll('li');
  listItems.forEach(li => {
    const text = (li.textContent || '').trim();
    const hasMedia = li.querySelector('img, input, svg, code, pre, a, mark');
    if (!text && !hasMedia) {
      li.remove();
    }
  });

  // 3. Remove stray elements directly inside ul/ol that are not li
  const lists = root.querySelectorAll('ul, ol');
  lists.forEach(list => {
    Array.from(list.children).forEach(child => {
      if (child.tagName !== 'LI') {
        if (!child.textContent.trim()) {
          child.remove();
        } else {
          const li = document.createElement('li');
          list.insertBefore(li, child);
          li.appendChild(child);
        }
      }
    });
  });

  // 4. Remove empty color spans
  const spans = root.querySelectorAll('span.annotated-color');
  spans.forEach(span => {
    if (!(span.textContent || '').trim()) {
      span.remove();
    }
  });
}

/**
 * Sanitizes HTML string: removes empty marks and orphan li tags, auto-repairing broken lists.
 */
export function sanitizePlaygroundHtml(html) {
  if (!html || typeof html !== 'string') return html;

  const cleaned = html.replace(/\u200B/g, '');
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/html');
      cleanupEmptyAnnotationsInDom(doc.body);
      return doc.body.innerHTML;
    } catch (e) {
      // Fall through to regex
    }
  }

  // Regex fallback
  return cleaned
    .replace(/<mark\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/mark>/gi, '')
    .replace(/(<ul\b[^>]*>)\s*<mark\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/mark>/gi, '$1')
    .replace(/<mark\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/mark>\s*(<\/ul>)/gi, '$1')
    .replace(/<li\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/li>/gi, '')
    .replace(/(<ul\b[^>]*>)\s*(<li>)/gi, '$1$2')
    .replace(/(<\/li>)\s*(<\/ul>)/gi, '$1$2');
}

export default function MarkdownViewer({
  html,
  theme,
  setTheme,
  isFullscreen,
  toggleFullscreen,
  columnWidth,
  setColumnWidth,
  onPrintPdf,
  onDirectPdfDownload,
  onDropFile,
  isPlayground = false,
  onTogglePlayground,
  isExportingPdf = false,
  fileName = 'Document.md',
  onPlaygroundEditsChange
}) {
  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const [fontSize, setFontSize] = useState(16); // px
  const [selectionBox, setSelectionBox] = useState({ top: 0, left: 0, visible: false });
  const [hasEdits, setHasEdits] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isJustSaved, setIsJustSaved] = useState(false);

  // Comment popover state & selection range ref
  const [commentPopover, setCommentPopover] = useState({
    isOpen: false,
    mode: 'view', // 'create' | 'view' | 'edit'
    top: 0,
    left: 0,
    isAbove: false,
    comments: [],
    activeCommentIndex: 0,
    text: '',
    selectedText: '',
    targetElement: null
  });
  const savedRangeForCommentRef = useRef(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Storage key for saving Playground edits per file
  const storageKey = `md_playground_saved_${fileName}`;

  // Active HTML for playground: loads saved draft if available, sanitizing legacy glitches
  const displayHtml = useMemo(() => {
    if (isPlayground && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) return sanitizePlaygroundHtml(saved);
    }
    return sanitizePlaygroundHtml(html);
  }, [isPlayground, storageKey, resetKey, html]);

  const hasRestoredDraft = useMemo(() => {
    if (isPlayground && typeof window !== 'undefined') {
      return Boolean(localStorage.getItem(storageKey));
    }
    return false;
  }, [isPlayground, storageKey, resetKey]);

  // Clean up any empty annotations or damaged list elements directly on paper DOM
  useEffect(() => {
    if (paperRef.current) {
      cleanupEmptyAnnotationsInDom(paperRef.current);
    }
  }, [resetKey, displayHtml]);

  // Responsive width mapping: full width on mobile phones, customized on tablet/desktop
  const widthClasses = {
    '95%': 'w-full sm:w-[95%] sm:max-w-[95%] mx-auto',
    '100%': 'w-full max-w-full mx-0 px-2 sm:px-6 md:px-8',
    'wide': 'w-full sm:w-[88%] sm:max-w-7xl mx-auto',
    'standard': 'w-full sm:max-w-4xl mx-auto'
  };

  const nextWidth = () => {
    const modes = ['95%', '100%', 'wide', 'standard'];
    const idx = modes.indexOf(columnWidth);
    setColumnWidth(modes[(idx + 1) % modes.length]);
  };

  // Track selection changes to show the FloatingAnnotationBar
  useEffect(() => {
    if (!isPlayground) {
      setSelectionBox({ top: 0, left: 0, visible: false });
      return;
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      // Edge case: selection contains only whitespace or newlines
      const rawText = selection.toString();
      if (!rawText || !rawText.trim()) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const range = selection.getRangeAt(0);
      const paper = paperRef.current;
      if (!paper || !paper.contains(range.commonAncestorContainer)) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionBox(prev => prev.visible ? { ...prev, visible: false } : prev);
        return;
      }

      const top = rect.top - 54 < 10 ? rect.bottom + 10 : rect.top - 54;
      const left = Math.max(16, Math.min(window.innerWidth - 320, rect.left + (rect.width / 2) - 140));

      setSelectionBox({
        top,
        left,
        visible: true
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isPlayground]);

  // Dedicated History Stack for robust Undo & Redo across typing and all formatting
  const historyStackRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const isInternalHistoryUpdateRef = useRef(false);
  const inputDebounceTimerRef = useRef(null);
  const justSavedTimerRef = useRef(null);
  const autoSaveDebounceTimerRef = useRef(null);

  // Snapshot recording function
  const pushHistorySnapshot = (explicitHtml) => {
    if (isInternalHistoryUpdateRef.current) return;
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.markdown-body');
    if (!body) return;

    const currentHtml = explicitHtml !== undefined ? explicitHtml : body.innerHTML;
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;

    // Avoid pushing duplicate consecutive states
    if (stack.length > 0 && currentIndex >= 0 && stack[currentIndex] === currentHtml) {
      return;
    }

    const newStack = stack.slice(0, currentIndex + 1);
    newStack.push(currentHtml);
    if (newStack.length > 50) {
      newStack.shift();
    }

    historyStackRef.current = newStack;
    historyIndexRef.current = newStack.length - 1;

    setHistoryState({
      canUndo: newStack.length > 1,
      canRedo: false
    });
  };

  // Seed history stack on mount or reset
  useEffect(() => {
    const timer = setTimeout(() => {
      if (paperRef.current) {
        const body = paperRef.current.querySelector('.markdown-body');
        if (body) {
          historyStackRef.current = [body.innerHTML];
          historyIndexRef.current = 0;
          setHistoryState({ canUndo: false, canRedo: false });
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [resetKey, html]);

  // Core Save Playground Draft
  const handleSavePlayground = useCallback((showIndicator = true) => {
    const paper = paperRef.current;
    if (!paper) return;
    const body = paper.querySelector('.markdown-body');
    if (!body) return;

    try {
      localStorage.setItem(storageKey, body.innerHTML.replace(/\u200B/g, ''));
      setHasEdits(false);
      onPlaygroundEditsChange?.(false);
      if (showIndicator) {
        setIsJustSaved(true);
        if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
        justSavedTimerRef.current = setTimeout(() => setIsJustSaved(false), 2200);
      }
    } catch (err) {
      console.error('Failed to auto-save playground changes:', err);
    }
  }, [storageKey, onPlaygroundEditsChange]);

  // Auto-save debouncer: saves changes automatically so work is never lost
  const triggerAutoSave = useCallback((showIndicator = true, delay = 100) => {
    if (autoSaveDebounceTimerRef.current) {
      clearTimeout(autoSaveDebounceTimerRef.current);
    }
    if (delay === 0) {
      handleSavePlayground(showIndicator);
    } else {
      autoSaveDebounceTimerRef.current = setTimeout(() => {
        handleSavePlayground(showIndicator);
      }, delay);
    }
  }, [handleSavePlayground]);

  // Handle typing input inside contentEditable paper with debounce and auto-save
  const handleContentInput = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    if (inputDebounceTimerRef.current) clearTimeout(inputDebounceTimerRef.current);
    inputDebounceTimerRef.current = setTimeout(() => {
      pushHistorySnapshot();
    }, 350);

    triggerAutoSave(true, 1200);
  };

  // Format Handlers
  const handleHighlight = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      if (color) {
        showInAppAlert('Please highlight or select text in the document before choosing a highlight color.', 'Selection Required', 'info');
      }
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const paper = paperRef.current;
    if (!paper || !paper.contains(range.commonAncestorContainer)) return;

    const trimmedRange = trimRangeToText(paper, range);
    if (!trimmedRange) return;

    setHasEdits(true);
    onPlaygroundEditsChange?.(true);

    if (!color) {
      unwrapFormattingInRange(paper, trimmedRange, { type: 'highlight' });
      setSelectionBox(prev => ({ ...prev, visible: false }));
      pushHistorySnapshot();
      triggerAutoSave(true, 300);
      return;
    }

    const createdElements = applyFormattingToRange(paper, trimmedRange, {
      type: 'highlight',
      color
    });

    if (createdElements.length > 0) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartBefore(createdElements[0]);
        newRange.setEndAfter(createdElements[createdElements.length - 1]);
        sel.addRange(newRange);
      }
    }

    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleTextColor = (color) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      if (color) {
        showInAppAlert('Please highlight or select text in the document before choosing a font color.', 'Selection Required', 'info');
      }
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const paper = paperRef.current;
    if (!paper || !paper.contains(range.commonAncestorContainer)) return;

    const trimmedRange = trimRangeToText(paper, range);
    if (!trimmedRange) return;

    setHasEdits(true);
    onPlaygroundEditsChange?.(true);

    if (!color) {
      unwrapFormattingInRange(paper, trimmedRange, { type: 'color' });
      pushHistorySnapshot();
      triggerAutoSave(true, 300);
      return;
    }

    const createdElements = applyFormattingToRange(paper, trimmedRange, {
      type: 'color',
      color
    });

    if (createdElements.length > 0) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStartBefore(createdElements[0]);
        newRange.setEndAfter(createdElements[createdElements.length - 1]);
        sel.addRange(newRange);
      }
    }

    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleUnderline = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('underline', false, null);
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleStrikethrough = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('strikeThrough', false, null);
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleBold = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('bold', false, null);
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleItalic = () => {
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    document.execCommand('italic', false, null);
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleClearFormat = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      showInAppAlert('Please highlight or select the formatted text you want to clear.', 'Selection Required', 'info');
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const paper = paperRef.current;
    if (!paper || !paper.contains(range.commonAncestorContainer)) return;

    const trimmedRange = trimRangeToText(paper, range) || range;

    setHasEdits(true);
    onPlaygroundEditsChange?.(true);

    unwrapFormattingInRange(paper, trimmedRange, { type: 'all' });
    document.execCommand('removeFormat', false, null);

    setSelectionBox(prev => ({ ...prev, visible: false }));
    pushHistorySnapshot();
    triggerAutoSave(true, 300);
  };

  const handleUndo = () => {
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) return;

    const newIndex = currentIndex - 1;
    historyIndexRef.current = newIndex;
    const previousHtml = stack[newIndex];

    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.markdown-body');
      if (body) {
        isInternalHistoryUpdateRef.current = true;
        body.innerHTML = previousHtml;
        isInternalHistoryUpdateRef.current = false;
      }
    }

    setHistoryState({
      canUndo: newIndex > 0,
      canRedo: true
    });
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    triggerAutoSave(false, 400);
  };

  const handleRedo = () => {
    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex >= stack.length - 1) return;

    const newIndex = currentIndex + 1;
    historyIndexRef.current = newIndex;
    const nextHtml = stack[newIndex];

    const paper = paperRef.current;
    if (paper) {
      const body = paper.querySelector('.markdown-body');
      if (body) {
        isInternalHistoryUpdateRef.current = true;
        body.innerHTML = nextHtml;
        isInternalHistoryUpdateRef.current = false;
      }
    }

    setHistoryState({
      canUndo: true,
      canRedo: newIndex < stack.length - 1
    });
    setHasEdits(true);
    onPlaygroundEditsChange?.(true);
    triggerAutoSave(false, 400);
  };

  // Open comment popover in create mode for selected text (or existing comment)
  const handleOpenAddComment = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      showInAppAlert('Please highlight or select the text you want to attach a comment to.', 'Selection Required', 'warning');
      return;
    }

    const range = selection.getRangeAt(0);
    const paper = paperRef.current;
    if (!paper || !paper.contains(range.commonAncestorContainer)) {
      showInAppAlert('Please select text inside the document paper to attach a comment.', 'Selection Required', 'warning');
      return;
    }

    const trimmedRange = trimRangeToText(paper, range);
    if (!trimmedRange || !trimmedRange.toString().trim()) {
      showInAppAlert('Please select visible text characters to attach a comment.', 'Selection Required', 'warning');
      return;
    }

    // Check if the selection is within an existing annotated-comment
    const existingCommentEl = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer.closest('.annotated-comment')
      : range.commonAncestorContainer.parentElement?.closest('.annotated-comment');

    const selectedText = trimmedRange.toString().trim();
    const rect = trimmedRange.getBoundingClientRect();
    const isAbove = rect.bottom + 260 > window.innerHeight && rect.top > 260;

    // Only target the existing comment element if the user selected the ENTIRE comment element
    // If the user selected a specific word/sub-string inside an existing highlight or comment,
    // create a new comment specifically for that selected word/sub-string!
    const isFullElementSelection = existingCommentEl && 
      paper.contains(existingCommentEl) &&
      selectedText === (existingCommentEl.textContent || '').trim();

    if (isFullElementSelection) {
      const existingComments = parseComments(existingCommentEl);
      setCommentPopover({
        isOpen: true,
        mode: 'create',
        top: isAbove ? Math.max(16, rect.top - 8) : rect.bottom + 8,
        left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + (rect.width / 2) - 150)),
        isAbove,
        comments: existingComments,
        activeCommentIndex: existingComments.length,
        text: '',
        selectedText: existingCommentEl.textContent || selectedText,
        targetElement: existingCommentEl
      });
    } else {
      savedRangeForCommentRef.current = trimmedRange.cloneRange();
      setCommentPopover({
        isOpen: true,
        mode: 'create',
        top: isAbove ? Math.max(16, rect.top - 8) : rect.bottom + 8,
        left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + (rect.width / 2) - 150)),
        isAbove,
        comments: [],
        activeCommentIndex: 0,
        text: '',
        selectedText,
        targetElement: null
      });
    }
    setSelectionBox(prev => ({ ...prev, visible: false }));
  };

  // Save comment: either wrap range as .annotated-comment, append to existing element, or update by index
  const handleSaveComment = (commentText, indexToUpdate = null) => {
    const textVal = (commentText || '').trim();
    if (!textVal) return;

    if (commentPopover.mode === 'create') {
      const targetEl = commentPopover.targetElement;
      if (targetEl) {
        // Appending comment to existing annotated element
        const currentComments = parseComments(targetEl);
        const updatedComments = [...currentComments, textVal];
        setCommentsOnElement(targetEl, updatedComments);

        pushHistorySnapshot();
        setHasEdits(false);
        onPlaygroundEditsChange?.(false);

        // Switch to view mode at the newly appended comment
        setCommentPopover(prev => ({
          ...prev,
          mode: 'view',
          comments: updatedComments,
          activeCommentIndex: updatedComments.length - 1,
          text: textVal,
          targetElement: targetEl
        }));
        triggerAutoSave(true, 50);
        return;
      }

      // Brand new comment annotation on selected range
      const range = savedRangeForCommentRef.current;
      if (!range) {
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
        return;
      }

      const paper = paperRef.current;
      if (!paper) {
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
        return;
      }

      const trimmedRange = trimRangeToText(paper, range);
      if (!trimmedRange) {
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
        return;
      }

      try {
        const createdElements = applyFormattingToRange(paper, trimmedRange, {
          type: 'comment',
          commentText: textVal
        });

        window.getSelection()?.removeAllRanges();
        savedRangeForCommentRef.current = null;

        pushHistorySnapshot();
        setHasEdits(false);
        onPlaygroundEditsChange?.(false);

        const primaryEl = createdElements[0] || null;
        if (primaryEl) {
          const comments = parseComments(primaryEl);
          setCommentPopover(prev => ({
            ...prev,
            mode: 'view',
            comments,
            activeCommentIndex: 0,
            text: textVal,
            targetElement: primaryEl
          }));
        } else {
          setCommentPopover(prev => ({ ...prev, isOpen: false }));
        }
      } catch (err) {
        console.error('Failed to create comment annotation:', err);
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
      }

      triggerAutoSave(true, 50);
    } else if (commentPopover.mode === 'edit') {
      const el = commentPopover.targetElement;
      if (el) {
        const currentComments = parseComments(el);
        const editIdx = (typeof indexToUpdate === 'number' && indexToUpdate >= 0 && indexToUpdate < currentComments.length)
          ? indexToUpdate
          : (commentPopover.activeCommentIndex || 0);

        if (currentComments.length > 0 && editIdx < currentComments.length) {
          currentComments[editIdx] = textVal;
        } else {
          currentComments.push(textVal);
        }
        setCommentsOnElement(el, currentComments);

        pushHistorySnapshot();
        setHasEdits(false);
        onPlaygroundEditsChange?.(false);

        setCommentPopover(prev => ({
          ...prev,
          mode: 'view',
          comments: currentComments,
          activeCommentIndex: editIdx,
          text: textVal
        }));
      } else {
        setCommentPopover(prev => ({ ...prev, isOpen: false }));
      }
      triggerAutoSave(true, 50);
    }
  };

  // Delete comment: if multiple comments exist, delete only the current comment;
  // if only 1 comment exists, unwrap or strip comment styling
  const handleDeleteComment = (indexToDelete = null) => {
    const el = commentPopover.targetElement;
    if (!el || !el.parentNode) {
      setCommentPopover(prev => ({ ...prev, isOpen: false, targetElement: null }));
      return;
    }

    const currentComments = parseComments(el);
    const targetIndex = (typeof indexToDelete === 'number' && indexToDelete >= 0 && indexToDelete < currentComments.length)
      ? indexToDelete
      : (commentPopover.activeCommentIndex || 0);

    if (currentComments.length > 1) {
      // Remove only this single comment
      const updatedComments = currentComments.filter((_, idx) => idx !== targetIndex);
      setCommentsOnElement(el, updatedComments);
      const nextIndex = Math.min(targetIndex, updatedComments.length - 1);

      pushHistorySnapshot();
      setHasEdits(false);
      onPlaygroundEditsChange?.(false);

      // Keep popover open on remaining comments
      setCommentPopover(prev => ({
        ...prev,
        comments: updatedComments,
        activeCommentIndex: nextIndex,
        text: updatedComments[nextIndex],
        mode: 'view'
      }));
      triggerAutoSave(true, 50);
      return;
    }

    // Only 1 comment was present: delete whole comment annotation
    if (el.classList.contains('annotated-mark') || (el.style.backgroundColor && el.style.backgroundColor !== 'rgb(241, 245, 249)' && el.style.backgroundColor !== '#f1f5f9')) {
      // Was also highlighted, preserve highlight and only strip comment
      el.classList.remove('annotated-comment');
      el.removeAttribute('data-comment');
      el.removeAttribute('data-comments');
      el.removeAttribute('data-comment-count');
      el.removeAttribute('title');
      el.style.cursor = '';
    } else {
      // Solely a comment, unwrap
      const parent = el.parentNode;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
      parent.normalize();
    }

    pushHistorySnapshot();
    setHasEdits(false);
    onPlaygroundEditsChange?.(false);

    setCommentPopover(prev => ({ ...prev, isOpen: false, targetElement: null, comments: [] }));
    triggerAutoSave(true, 50);
  };

  const handleResetOriginal = () => {
    setShowResetModal(true);
  };

  const handleConfirmResetOriginal = () => {
    localStorage.removeItem(storageKey);
    setResetKey(prev => prev + 1);
    setHasEdits(false);
    onPlaygroundEditsChange?.(false);
    setSelectionBox({ top: 0, left: 0, visible: false });
    setCommentPopover(prev => ({ ...prev, isOpen: false }));
    setShowResetModal(false);
  };

  // Auto-save and emergency flush on beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPlayground) {
        const paper = paperRef.current;
        if (paper) {
          const body = paper.querySelector('.markdown-body');
          if (body) {
            try {
              localStorage.setItem(storageKey, body.innerHTML.replace(/\u200B/g, ''));
            } catch (err) {
              console.error('Failed to sync on beforeunload:', err);
            }
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlayground, storageKey]);

  // Helper to exit mark / comment / color formatting boundary on ArrowRight or ArrowLeft
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
        el.hasAttribute('data-comment') ||
        (el.style?.backgroundColor && el.style.backgroundColor !== 'transparent')
      );
    };

    // Find outermost annotation element
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    let targetAnnotation = null;
    while (el && el !== paper && !el.classList?.contains('markdown-body')) {
      if (isAnnotationElement(el)) {
        targetAnnotation = el;
      }
      el = el.parentElement;
    }

    if (!targetAnnotation || !paper.contains(targetAnnotation)) return false;

    if (forward) {
      // ArrowRight: Check if caret is at the end of the annotation element
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
      // ArrowLeft: Check if caret is at the start of the annotation element
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

  // Keyboard shortcut listener for Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+S, and ArrowKey exit from annotations
  useEffect(() => {
    if (!isPlayground) return;

    const handleKeyDown = (e) => {
      // Exit highlight/comment formatting boundary on ArrowRight or ArrowLeft
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === false);
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
        e.stopPropagation();
        handleSavePlayground();
        return;
      }

      // Undo / Redo shortcuts
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayground, hasEdits, exitMarkBoundary]);

  // Setup click handler for copy code buttons & mermaid toggle buttons
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = async (e) => {
      // 1. Copy button
      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        const rawCode = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
        if (rawCode) {
          try {
            await navigator.clipboard.writeText(rawCode);
            const textSpan = copyBtn.querySelector('.btn-text');
            if (textSpan) {
              const original = textSpan.textContent;
              textSpan.textContent = 'Copied!';
              copyBtn.classList.add('text-emerald-400');
              setTimeout(() => {
                textSpan.textContent = original;
                copyBtn.classList.remove('text-emerald-400');
              }, 2000);
            }
          } catch (err) {
            console.error('Failed to copy code: ', err);
          }
        }
        return;
      }

      // 2. Mermaid source toggle button
      const toggleBtn = e.target.closest('.mermaid-toggle-btn');
      if (toggleBtn) {
        const parent = toggleBtn.closest('.mermaid-container');
        if (parent) {
          const sourceBlock = parent.querySelector('.mermaid-source');
          if (sourceBlock) {
            sourceBlock.classList.toggle('hidden');
          }
        }
      }

      // 3. Comment click handler
      const commentEl = e.target.closest('.annotated-comment');
      if (commentEl) {
        e.preventDefault();
        e.stopPropagation();
        const comments = parseComments(commentEl);
        const rect = commentEl.getBoundingClientRect();
        const isAbove = rect.bottom + 260 > window.innerHeight && rect.top > 260;

        setCommentPopover({
          isOpen: true,
          mode: 'view',
          top: isAbove ? Math.max(16, rect.top - 8) : rect.bottom + 8,
          left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + (rect.width / 2) - 150)),
          isAbove,
          comments,
          activeCommentIndex: 0,
          text: comments[0] || '',
          selectedText: commentEl.textContent,
          targetElement: commentEl
        });
        return;
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [displayHtml, isPlayground]);

  // Render Mermaid diagrams into visual SVG mind maps & flowcharts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = theme === 'github-dark' || theme === 'obsidian';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : (theme === 'sepia' ? 'neutral' : 'default'),
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      themeVariables: isDark ? {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#3b82f6',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#60a5fa',
        lineColor: '#94a3b8',
        secondaryColor: '#6366f1',
        tertiaryColor: '#1e293b'
      } : {
        primaryColor: '#eff6ff',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b'
      }
    });

    const mermaidContainers = container.querySelectorAll('.mermaid-container');
    if (mermaidContainers.length === 0) return;

    mermaidContainers.forEach(async (el, index) => {
      const renderDiv = el.querySelector('.mermaid-render');
      if (!renderDiv) return;

      const rawCode = decodeURIComponent(el.getAttribute('data-mermaid') || '').trim();
      if (!rawCode) return;

      const uniqueId = `mermaid-chart-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode);
        renderDiv.innerHTML = svg;
        
        // Ensure SVG scales responsively on small and large viewports
        const svgEl = renderDiv.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
          svgEl.classList.add('rounded-lg', 'transition-all');
        }
      } catch (err) {
        console.warn('Mermaid render error for chart', index, err);
        renderDiv.innerHTML = `
          <div class="w-full p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono">
            <div class="font-bold flex items-center gap-1.5 mb-1.5">
              <span>⚠️ Could not render diagram visually:</span>
            </div>
            <div class="text-[11px] opacity-90 mb-2">${err?.message || 'Syntax issue in diagram'}</div>
            <pre class="p-2 sm:p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-xs leading-5"><code>${rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
        `;
      }
    });
  }, [html, theme]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && onDropFile) {
      const isText = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt') || (file.type && file.type.startsWith('text/'));
      if (!isText) {
        showInAppAlert(`The file "${file.name}" is not a supported Markdown or text document. Please choose a .md, .markdown, or .txt file.`, 'Unsupported File', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        onDropFile(file.name, event.target.result);
      };
      reader.onerror = () => {
        showInAppAlert(`Failed to read "${file.name}". Please ensure the file is accessible and try again.`, 'File Read Error', 'danger');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div 
      id="preview-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex-1 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden transition-all duration-200 theme-${theme} ${
        isFullscreen ? '!h-screen !fixed !inset-0 !z-50 bg-slate-950' : 'bg-slate-100/70 dark:bg-slate-950'
      }`}
    >
      {/* Floating Zen Controls Bar in Fullscreen / Reader Mode (Mobile-Calibrated) */}
      {isFullscreen && (
        <div 
          id="zen-controls"
          className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-1.5 sm:gap-3 transition-opacity duration-300 opacity-60 hover:opacity-100 max-w-[96vw] overflow-x-auto"
        >
          <span className="text-[11px] sm:text-xs font-semibold text-slate-400 pr-1.5 sm:pr-2 border-r border-slate-700 select-none hidden xs:inline">
            Zen
          </span>

          {/* Font size */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button 
              onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono"
              title="Smaller Text (A-)"
            >
              A-
            </button>
            <span className="text-xs text-slate-400 font-mono w-5 sm:w-6 text-center">{fontSize}</span>
            <button 
              onClick={() => setFontSize(Math.min(26, fontSize + 1))}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-mono"
              title="Larger Text (A+)"
            >
              A+
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Width Cycle */}
          <button 
            onClick={nextWidth}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Cycle Reading Width"
          >
            <AlignJustify className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-mono">{columnWidth}</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* PDF Direct */}
          <button 
            onClick={onDirectPdfDownload}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Download PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] hidden sm:inline">PDF</span>
          </button>

          {/* Print to PDF */}
          <button 
            onClick={onPrintPdf}
            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs flex items-center gap-1"
            title="Vector Print to PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] hidden sm:inline">Print</span>
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Exit Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="p-1 sm:p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
            title="Exit Full Screen (Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Exit</span>
          </button>
        </div>
      )}

      {/* Playground Top Control Toolbar */}
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
          onResetOriginal={handleResetOriginal}
          onDownloadAnnotatedPdf={onDirectPdfDownload}
          isExportingPdf={isExportingPdf}
          hasEdits={hasEdits}
          canUndo={historyState.canUndo}
          canRedo={historyState.canRedo}
          onSave={handleSavePlayground}
          isJustSaved={isJustSaved}
        />
      )}

      {/* Floating Selection Formatting Bar */}
      {isPlayground && selectionBox.visible && (
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

      {/* Comment Popover Box (Add, View, Edit, Multi-comment Navigation) */}
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

      {/* Reset to Original Confirmation Alert Modal */}
      <ConfirmModal 
        isOpen={showResetModal}
        title="Reset Document"
        fileName={fileName}
        message="Are you sure you want to revert this document to its original Markdown? All saved and unsaved playground edits, highlights, and comments will be permanently cleared."
        confirmLabel="Reset Document"
        cancelLabel="Keep Edits"
        variant="danger"
        onConfirm={handleConfirmResetOriginal}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Reader Paper Viewport - Calibrated padding for mobile/tablet */}
      <main className="py-3 sm:py-6 md:py-8 px-1.5 sm:px-4 md:px-6 flex justify-center min-h-full">
        <article 
          id="preview-paper"
          key={resetKey}
          ref={(el) => {
            containerRef.current = el;
            paperRef.current = el;
          }}
          style={{ fontSize: `${fontSize}px` }}
          className={`${widthClasses[columnWidth] || widthClasses['95%']} bg-[var(--bg-primary)] text-[var(--text-main)] rounded-xl sm:rounded-2xl border ${
            isPlayground 
              ? 'border-slate-300 dark:border-slate-700 ring-1 ring-slate-400/25 dark:ring-slate-600/30 shadow-md shadow-slate-200/50 dark:shadow-none' 
              : 'border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-200/50 dark:shadow-none'
          } p-3.5 sm:p-7 md:p-12 transition-all duration-200 max-w-full overflow-hidden relative`}
        >
          {/* Subtle Switch to Playground Banner in Preview Mode */}
          {!isPlayground && onTogglePlayground && (
            <div className="flex justify-end mb-3 no-print">
              <button
                onClick={onTogglePlayground}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs"
                title="Switch to interactive text highlighter, in-place editor, and styling tools"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Annotate & Edit in Playground</span>
              </button>
            </div>
          )}

          {/* Active Playground Mode Banner inside paper */}
          {isPlayground && (
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 no-print select-none">
              <span className="font-semibold flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-500" />
                <span>Playground Mode: Direct in-place editing & highlighting active</span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 hidden sm:inline flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Auto-save active · Comments & annotations persist automatically
              </span>
            </div>
          )}

          {displayHtml ? (
            <div 
              className="markdown-body w-full break-words outline-none"
              contentEditable={isPlayground}
              suppressContentEditableWarning={true}
              onInput={handleContentInput}
              dangerouslySetInnerHTML={{ __html: displayHtml }} 
            />
          ) : (
            <div className="py-20 text-center text-slate-400">
              <p className="text-base font-medium">Nothing to preview yet</p>
              <p className="text-xs mt-1">Start writing or open a Markdown (.md) file.</p>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
