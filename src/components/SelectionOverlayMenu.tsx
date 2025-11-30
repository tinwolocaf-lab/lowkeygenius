import { useEffect, useRef, useCallback } from 'react';
import { Bookmark, Edit3, BookOpen, Loader2 } from 'lucide-react';

interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}

interface SelectionOverlayMenuProps {
  selection: TextSelection;
  position: { x: number; y: number };
  isOwner: boolean;
  onSaveNote: () => void;
  onEdit: () => void;
  onAddDefinition: () => void;
  onClose: () => void;
  isGeneratingDefinition?: boolean;
}

/**
 * Calculate menu position to keep it within viewport bounds.
 * Requirements: 5.3 - Position menu to avoid overlapping with viewport edges
 */
function calculateMenuPosition(
  initialPosition: { x: number; y: number },
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const padding = 8; // Minimum distance from viewport edges
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let { x, y } = initialPosition;

  // Adjust horizontal position if menu would overflow right edge
  if (x + menuWidth > viewportWidth - padding) {
    x = viewportWidth - menuWidth - padding;
  }

  // Adjust horizontal position if menu would overflow left edge
  if (x < padding) {
    x = padding;
  }

  // Adjust vertical position if menu would overflow bottom edge
  if (y + menuHeight > viewportHeight - padding) {
    // Position above the selection instead
    y = initialPosition.y - menuHeight - 10;
  }

  // Adjust vertical position if menu would overflow top edge
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}

/**
 * SelectionOverlayMenu - A floating contextual menu that appears when text is selected.
 * 
 * Requirements:
 * - 3.1: Display Selection_Overlay_Menu near the selection when Course_Owner selects text
 * - 3.2: Show "Edit" option that enables inline editing
 * - 3.4: Display menu without "Edit" option for non-owners
 * - 4.1: Display "Save as Note" option for all users
 * - 5.1: Appear within 200ms positioned near the selection
 * - 5.2: Close on click outside or deselect
 * - 5.3: Position to avoid overlapping with viewport edges
 * - 5.4: Close on scroll
 */
/** Maximum character length for text that can have a definition added */
const MAX_DEFINITION_SELECTION_LENGTH = 100;

export function SelectionOverlayMenu({
  selection,
  position,
  isOwner,
  onSaveNote,
  onEdit,
  onAddDefinition,
  onClose,
  isGeneratingDefinition = false,
}: SelectionOverlayMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const adjustedPositionRef = useRef<{ x: number; y: number }>(position);

  // Calculate adjusted position once menu is rendered
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      adjustedPositionRef.current = calculateMenuPosition(
        position,
        menuRect.width,
        menuRect.height
      );
      // Apply the adjusted position
      menuRef.current.style.left = `${adjustedPositionRef.current.x}px`;
      menuRef.current.style.top = `${adjustedPositionRef.current.y}px`;
    }
  }, [position]);

  // Handle click outside to close menu (Requirement 5.2)
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle scroll to close menu (Requirement 5.4)
  const handleScroll = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle selection change to close menu when selection is cleared (Requirement 5.2)
  const handleSelectionChange = useCallback(() => {
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.isCollapsed || currentSelection.toString().trim() === '') {
      onClose();
    }
  }, [onClose]);

  // Set up event listeners for dismissal behavior
  useEffect(() => {
    // Use setTimeout to avoid immediate close from the mouseup that triggered the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('selectionchange', handleSelectionChange);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleClickOutside, handleScroll, handleSelectionChange]);

  // Don't render if no text is selected
  if (!selection.text.trim()) {
    return null;
  }

  // Check if selection exceeds maximum length for definition (Requirement 2.4)
  const isSelectionTooLong = selection.text.length > MAX_DEFINITION_SELECTION_LENGTH;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-neutral-bg border-2 border-neutral-border rounded-xl shadow-lg overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
      }}
      role="menu"
      aria-label="Text selection actions"
    >
      <div className="flex">
        {/* Save as Note button - shown for all users (Requirement 4.1) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveNote();
          }}
          disabled={isGeneratingDefinition}
          className="flex items-center gap-2 px-4 py-3 hover:bg-primary-light/20 transition-colors text-neutral-text font-body text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          role="menuitem"
          aria-label="Save as Note"
        >
          <Bookmark className="w-4 h-4 text-primary" />
          <span>Save as Note</span>
        </button>

        {/* Edit button - shown only for course owners (Requirements 3.2, 3.4) */}
        {isOwner && (
          <>
            <div className="w-px bg-neutral-border" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              disabled={isGeneratingDefinition}
              className="flex items-center gap-2 px-4 py-3 hover:bg-primary-light/20 transition-colors text-neutral-text font-body text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              role="menuitem"
              aria-label="Edit"
            >
              <Edit3 className="w-4 h-4 text-primary" />
              <span>Edit</span>
            </button>
          </>
        )}

        {/* Add Definition button - shown for all users (Requirements 2.1, 2.2, 2.3, 2.4) */}
        <div className="w-px bg-neutral-border" />
        <div className="relative group">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelectionTooLong && !isGeneratingDefinition) {
                onAddDefinition();
              }
            }}
            disabled={isSelectionTooLong || isGeneratingDefinition}
            className="flex items-center gap-2 px-4 py-3 hover:bg-primary-light/20 transition-colors text-neutral-text font-body text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
            aria-label={isSelectionTooLong ? 'Selection too long for definition' : 'Add Definition'}
            aria-disabled={isSelectionTooLong || isGeneratingDefinition}
          >
            {isGeneratingDefinition ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4 text-primary" />
            )}
            <span>{isGeneratingDefinition ? 'Generating...' : 'Add Definition'}</span>
          </button>
          {/* Tooltip for disabled state when selection is too long (Requirement 2.4) */}
          {isSelectionTooLong && !isGeneratingDefinition && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-text text-neutral-bg text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Selection must be {MAX_DEFINITION_SELECTION_LENGTH} characters or less
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-text" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { SelectionOverlayMenuProps, TextSelection };
