import { useEffect, useRef, useCallback, useState } from 'react';
import { X, Trash2 } from 'lucide-react';

interface DefinitionTooltipProps {
  definition: string;
  position: { x: number; y: number };
  isOwner: boolean;
  onClose: () => void;
  onDelete: () => void;
}

/**
 * Calculate tooltip position to keep it within viewport bounds.
 * Requirements: 6.2 - Position tooltip near the clicked term without overlapping viewport edges
 */
function calculateTooltipPosition(
  initialPosition: { x: number; y: number },
  tooltipWidth: number,
  tooltipHeight: number
): { x: number; y: number } {
  const padding = 8; // Minimum distance from viewport edges
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let { x, y } = initialPosition;

  // Adjust horizontal position if tooltip would overflow right edge
  if (x + tooltipWidth > viewportWidth - padding) {
    x = viewportWidth - tooltipWidth - padding;
  }

  // Adjust horizontal position if tooltip would overflow left edge
  if (x < padding) {
    x = padding;
  }

  // Adjust vertical position if tooltip would overflow bottom edge
  if (y + tooltipHeight > viewportHeight - padding) {
    // Position above the click point instead
    y = initialPosition.y - tooltipHeight - 10;
  }

  // Adjust vertical position if tooltip would overflow top edge
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}

/**
 * DefinitionTooltip - A floating tooltip that displays InlineWiki definitions.
 * 
 * Requirements:
 * - 6.1: Display a tooltip containing the definition when user clicks on an underlined term
 * - 6.2: Position tooltip near the clicked term without overlapping viewport edges
 * - 6.3: Close tooltip when user clicks outside
 * - 6.4: Close tooltip when user presses Escape key
 * - 6.5: Include delete option for course owners only
 */
export function DefinitionTooltip({
  definition,
  position,
  isOwner,
  onClose,
  onDelete,
}: DefinitionTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculate adjusted position once tooltip is rendered
  useEffect(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const adjustedPosition = calculateTooltipPosition(
        position,
        tooltipRect.width,
        tooltipRect.height
      );
      tooltipRef.current.style.left = `${adjustedPosition.x}px`;
      tooltipRef.current.style.top = `${adjustedPosition.y}px`;
    }
  }, [position]);

  // Handle click outside to close tooltip (Requirement 6.3)
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle Escape key to close tooltip (Requirement 6.4)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, showDeleteConfirm]
  );

  // Set up event listeners for dismissal behavior
  useEffect(() => {
    // Use setTimeout to avoid immediate close from the click that triggered the tooltip
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 bg-neutral-bg border-2 border-neutral-border rounded-xl shadow-lg max-w-sm animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
      }}
      role="tooltip"
      aria-label="Definition tooltip"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-border">
        <span className="font-display text-sm font-semibold text-neutral-text-muted">
          Definition
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-surface rounded-lg transition-colors"
          aria-label="Close tooltip"
        >
          <X className="w-4 h-4 text-neutral-text-muted" />
        </button>
      </div>

      {/* Definition content */}
      <div className="px-4 py-3">
        <p className="font-body text-sm text-neutral-text leading-relaxed">
          {definition}
        </p>
      </div>

      {/* Delete option for owners (Requirement 6.5) */}
      {isOwner && (
        <div className="px-4 py-2 border-t border-neutral-border">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-neutral-text-muted">
                Delete this definition?
              </span>
              <button
                onClick={handleConfirmDelete}
                className="px-2 py-1 text-xs font-semibold text-white bg-accent-red rounded-lg hover:brightness-110 transition-all"
              >
                Yes
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-2 py-1 text-xs font-semibold text-neutral-text border border-neutral-border rounded-lg hover:bg-neutral-surface transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-2 text-xs font-semibold text-accent-red hover:text-accent-red/80 transition-colors"
              aria-label="Delete definition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete definition</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export type { DefinitionTooltipProps };
