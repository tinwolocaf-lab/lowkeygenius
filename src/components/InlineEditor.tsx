import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';

interface InlineEditorProps {
  originalText: string;
  onSave: (newText: string) => Promise<void>;
  onCancel: () => void;
  position: { x: number; y: number };
}

/**
 * Calculate editor position to keep it within viewport bounds.
 * Similar to SelectionOverlayMenu positioning logic.
 */
function calculateEditorPosition(
  initialPosition: { x: number; y: number },
  editorWidth: number,
  editorHeight: number
): { x: number; y: number } {
  const padding = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let { x, y } = initialPosition;

  // Center horizontally relative to the initial position
  x = x - editorWidth / 2;

  // Adjust horizontal position if editor would overflow right edge
  if (x + editorWidth > viewportWidth - padding) {
    x = viewportWidth - editorWidth - padding;
  }

  // Adjust horizontal position if editor would overflow left edge
  if (x < padding) {
    x = padding;
  }

  // Adjust vertical position if editor would overflow bottom edge
  if (y + editorHeight > viewportHeight - padding) {
    y = viewportHeight - editorHeight - padding;
  }

  // Adjust vertical position if editor would overflow top edge
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}


/**
 * InlineEditor - A floating editor component for inline text editing.
 * 
 * Requirements:
 * - 3.2: Show "Edit" option that enables inline editing of the selected text
 * - 3.3: Save modified content to database and update display immediately
 */
export function InlineEditor({
  originalText,
  onSave,
  onCancel,
  position,
}: InlineEditorProps) {
  const [editedText, setEditedText] = useState(originalText);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustedPositionRef = useRef<{ x: number; y: number }>(position);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Calculate adjusted position once editor is rendered
  useEffect(() => {
    if (editorRef.current) {
      const editorRect = editorRef.current.getBoundingClientRect();
      adjustedPositionRef.current = calculateEditorPosition(
        position,
        editorRect.width,
        editorRect.height
      );
      // Apply the adjusted position
      editorRef.current.style.left = `${adjustedPositionRef.current.x}px`;
      editorRef.current.style.top = `${adjustedPositionRef.current.y}px`;
    }
  }, [position]);

  // Handle click outside to cancel
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Handle escape key to cancel
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  // Set up event listeners
  useEffect(() => {
    // Use setTimeout to avoid immediate close from the click that triggered the editor
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [editedText]);

  const handleSave = async () => {
    if (isSaving) return;
    
    // Don't save if text hasn't changed
    if (editedText === originalText) {
      onCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedText);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl/Cmd + Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      ref={editorRef}
      className="fixed z-50 bg-neutral-bg border-2 border-primary rounded-xl shadow-lg overflow-hidden min-w-[300px] max-w-[500px]"
      style={{
        left: position.x,
        top: position.y,
      }}
      role="dialog"
      aria-label="Edit text"
    >
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          className="w-full min-h-[80px] max-h-[300px] p-3 bg-neutral-surface border border-neutral-border rounded-lg font-body text-sm text-neutral-text resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Enter text..."
          disabled={isSaving}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-neutral-text-muted font-body">
            Press Ctrl+Enter to save
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-body font-semibold text-neutral-text-muted hover:text-neutral-text hover:bg-neutral-surface rounded-lg transition-colors disabled:opacity-50"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || editedText === originalText}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-body font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { InlineEditorProps };
