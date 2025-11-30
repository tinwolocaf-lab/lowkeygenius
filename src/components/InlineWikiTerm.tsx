import { useState, useCallback } from 'react';
import { DefinitionTooltip } from './DefinitionTooltip';

interface InlineWikiTermProps {
  term: string;
  definition: string;
  entryId: string;
  isOwner: boolean;
  onDelete: (entryId: string) => void;
}

/**
 * InlineWikiTerm - A component that wraps terms with definitions, providing
 * underlined styling and click-to-show tooltip functionality.
 *
 * Requirements:
 * - 5.1: Render terms with underline styling to indicate they have definitions
 * - 5.2: Use a distinct visual style (dotted underline) that differentiates from regular links
 * - 6.1: Display a tooltip containing the definition when user clicks on an underlined term
 */
export function InlineWikiTerm({
  term,
  definition,
  entryId,
  isOwner,
  onDelete,
}: InlineWikiTermProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleClick = useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    // Prevent event from bubbling to parent elements
    event.stopPropagation();
    
    // Get the position of the clicked element
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Position tooltip below the term
    setTooltipPosition({
      x: rect.left,
      y: rect.bottom + 8, // 8px gap below the term
    });
    
    setShowTooltip(true);
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleDelete = useCallback(() => {
    onDelete(entryId);
  }, [onDelete, entryId]);

  return (
    <>
      <span
        className="inline-wiki-term"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Definition available for: ${term}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
          }
        }}
      >
        {term}
      </span>
      
      {showTooltip && (
        <DefinitionTooltip
          definition={definition}
          position={tooltipPosition}
          isOwner={isOwner}
          onClose={handleCloseTooltip}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}

export type { InlineWikiTermProps };
