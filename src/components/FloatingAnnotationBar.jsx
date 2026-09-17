import React, { useState } from 'react';
import { 
  Highlighter, 
  Underline as UnderlineIcon, 
  Strikethrough as StrikeIcon, 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Palette, 
  RotateCcw,
  MessageSquarePlus,
  X
} from 'lucide-react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#fef08a', name: 'Sunny Yellow', border: '#fde047' },
  { id: 'green', hex: '#bbf7d0', name: 'Mint Green', border: '#86efac' },
  { id: 'blue', hex: '#bae6fd', name: 'Sky Blue', border: '#7dd3fc' },
  { id: 'pink', hex: '#fbcfe8', name: 'Blossom Pink', border: '#f472b6' },
  { id: 'orange', hex: '#fed7aa', name: 'Sunset Orange', border: '#fb923c' },
  { id: 'purple', hex: '#ddd6fe', name: 'Lavender Violet', border: '#c084fc' },
];

export const TEXT_COLORS = [
  { id: 'slate', hex: '#0f172a', name: 'Deep Slate / Default' },
  { id: 'red', hex: '#dc2626', name: 'Crimson Red' },
  { id: 'blue', hex: '#2563eb', name: 'Royal Blue' },
  { id: 'green', hex: '#16a34a', name: 'Forest Green' },
  { id: 'orange', hex: '#ea580c', name: 'Amber Orange' },
  { id: 'purple', hex: '#9333ea', name: 'Imperial Purple' },
];

export default function FloatingAnnotationBar({
  position,
  onHighlight,
  onTextColor,
  onUnderline,
  onStrikethrough,
  onBold,
  onItalic,
  onClearFormat,
  onAddComment,
  onClose
}) {
  const [activePicker, setActivePicker] = useState(null); // 'highlight' | 'color' | null

  if (!position || !position.visible) return null;

  // Prevent selection loss when clicking buttons
  const handleAction = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div
      id="floating-annotation-bar"
      onMouseDown={(e) => {
        // Essential: prevent mousedown from stealing text selection focus
        e.preventDefault();
      }}
      style={{
        position: 'fixed',
        top: `${Math.max(10, position.top)}px`,
        left: `${Math.max(10, Math.min(window.innerWidth - 320, position.left))}px`,
        zIndex: 60,
      }}
      className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-1.5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs"
    >
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Highlighter Button with Color Swatch Toggle */}
        <button
          onClick={handleAction(() => setActivePicker(activePicker === 'highlight' ? null : 'highlight'))}
          className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            activePicker === 'highlight' ? 'bg-slate-800 text-amber-400 font-medium' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Highlight Text"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline">Highlight</span>
        </button>

        {/* Text Color Picker Toggle */}
        <button
          onClick={handleAction(() => setActivePicker(activePicker === 'color' ? null : 'color'))}
          className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            activePicker === 'color' ? 'bg-slate-800 text-blue-400 font-medium' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Text Color"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline">Color</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Underline */}
        <button
          onClick={handleAction(onUnderline)}
          className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Underline (Ctrl/Cmd + U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          onClick={handleAction(onStrikethrough)}
          className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Strikethrough"
        >
          <StrikeIcon className="w-3.5 h-3.5" />
        </button>

        {/* Bold */}
        <button
          onClick={handleAction(onBold)}
          className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Bold (Ctrl/Cmd + B)"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          onClick={handleAction(onItalic)}
          className="p-1.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg transition-colors"
          title="Italic (Ctrl/Cmd + I)"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </button>

        {/* Add Comment */}
        {onAddComment && (
          <button
            onClick={handleAction(onAddComment)}
            className="p-1.5 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors flex items-center gap-1"
            title="Add Comment to selection"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">Comment</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Clear formatting */}
        <button
          onClick={handleAction(onClearFormat)}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-300 rounded-lg transition-colors"
          title="Clear Highlighting & Formatting"
        >
          <RotateCcw className="w-3 h-3" />
        </button>

        {/* Dismiss */}
        {onClose && (
          <button
            onClick={handleAction(onClose)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors ml-0.5"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Highlighter Color Palette Sub-panel */}
      {activePicker === 'highlight' && (
        <div className="pt-1.5 pb-0.5 border-t border-slate-700/80 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={handleAction(() => {
                  onHighlight(c.hex);
                  setActivePicker(null);
                })}
                style={{ backgroundColor: c.hex, borderColor: c.border }}
                className="w-5 h-5 rounded-full border-2 hover:scale-125 transition-transform shadow-sm flex items-center justify-center"
                title={c.name}
              />
            ))}
          </div>
          <button
            onClick={handleAction(() => {
              onHighlight(null);
              setActivePicker(null);
            })}
            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800"
          >
            None
          </button>
        </div>
      )}

      {/* Text Color Palette Sub-panel */}
      {activePicker === 'color' && (
        <div className="pt-1.5 pb-0.5 border-t border-slate-700/80 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={handleAction(() => {
                  onTextColor(c.hex);
                  setActivePicker(null);
                })}
                style={{ backgroundColor: c.hex }}
                className="w-5 h-5 rounded-full border border-slate-600 hover:scale-125 transition-transform shadow-sm flex items-center justify-center"
                title={c.name}
              />
            ))}
          </div>
          <button
            onClick={handleAction(() => {
              onTextColor(null);
              setActivePicker(null);
            })}
            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
