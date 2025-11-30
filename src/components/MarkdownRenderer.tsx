import { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { MermaidDiagram } from './MermaidDiagram';
import { SelectionOverlayMenu } from './SelectionOverlayMenu';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableSelection?: boolean;
  onTextSelect?: (selection: TextSelection) => void;
  courseId?: string;
  lessonId?: string;
  lessonTitle?: string;
  courseTitle?: string;
  isOwner?: boolean;
  onContentUpdate?: (newContent: string) => void;
}

interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}

/**
 * Custom code block component that detects mermaid language
 * and routes to MermaidDiagram component
 */
function CodeBlock({
  inline,
  className,
  children,
  ...props
}: {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  // Route mermaid code blocks to MermaidDiagram component
  if (!inline && language === 'mermaid') {
    return <MermaidDiagram code={codeContent} className="my-4" />;
  }

  // For inline code or non-mermaid code blocks, use default rendering
  if (inline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <pre className={className}>
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );
}


/**
 * Unified MarkdownRenderer component that handles all markdown rendering
 * with Mermaid diagram support, syntax highlighting, and consistent styling.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 5.1
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
  enableSelection = true,
  onTextSelect,
  courseId,
  lessonId,
  lessonTitle,
  courseTitle,
  isOwner = false,
  onContentUpdate,
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Memoize the components configuration to prevent unnecessary re-renders
  const components: Components = useMemo(
    () => ({
      code: CodeBlock as Components['code'],
    }),
    []
  );

  /**
   * Handle text selection detection on mouseup events.
   * Requirements: 3.1, 4.1, 5.1 - Detect text selection and calculate position for menu placement
   */
  const handleMouseUp = useCallback(() => {
    if (!enableSelection) return;

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const windowSelection = window.getSelection();
      
      if (!windowSelection || windowSelection.isCollapsed) {
        return;
      }

      const selectedText = windowSelection.toString().trim();
      if (!selectedText) {
        return;
      }

      // Ensure selection is within our container
      const range = windowSelection.getRangeAt(0);
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        return;
      }

      // Get selection rectangle for menu positioning
      const rect = range.getBoundingClientRect();
      
      // Calculate position - center horizontally above the selection
      const x = rect.left + rect.width / 2;
      const y = rect.top - 10; // Position above the selection

      const textSelection: TextSelection = {
        text: selectedText,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        rect,
      };

      setSelection(textSelection);
      setMenuPosition({ x, y });

      // Call optional callback
      onTextSelect?.(textSelection);
    }, 10);
  }, [enableSelection, onTextSelect]);

  /**
   * Close the selection overlay menu
   */
  const handleCloseMenu = useCallback(() => {
    setSelection(null);
    setMenuPosition(null);
  }, []);

  /**
   * Handle save note action from the selection menu.
   * This is a placeholder that will be fully implemented in task 7.
   */
  const handleSaveNote = useCallback(() => {
    if (!selection || !courseId || !lessonId) {
      console.warn('Cannot save note: missing required context');
      handleCloseMenu();
      return;
    }

    // TODO: Implement note saving in task 7
    console.log('Save note:', {
      text: selection.text,
      courseId,
      lessonId,
      courseTitle,
      lessonTitle,
    });
    
    handleCloseMenu();
  }, [selection, courseId, lessonId, courseTitle, lessonTitle, handleCloseMenu]);

  /**
   * Handle edit action from the selection menu.
   * This is a placeholder that will be fully implemented in task 8.
   */
  const handleEdit = useCallback(() => {
    if (!selection || !isOwner) {
      handleCloseMenu();
      return;
    }

    // TODO: Implement inline editing in task 8
    console.log('Edit selection:', {
      text: selection.text,
      onContentUpdate: !!onContentUpdate,
    });
    
    handleCloseMenu();
  }, [selection, isOwner, onContentUpdate, handleCloseMenu]);

  // Clean up selection when component unmounts or content changes
  useEffect(() => {
    return () => {
      setSelection(null);
      setMenuPosition(null);
    };
  }, [content]);

  if (!content) {
    return (
      <div className={`text-neutral-text-muted italic ${className}`}>
        No content available
      </div>
    );
  }

  return (
    <>
      <div 
        ref={containerRef}
        className={`prose prose-lg max-w-none markdown-content ${className}`}
        onMouseUp={handleMouseUp}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Selection Overlay Menu - Requirements: 3.1, 4.1, 5.1 */}
      {selection && menuPosition && (
        <SelectionOverlayMenu
          selection={selection}
          position={menuPosition}
          isOwner={isOwner}
          onSaveNote={handleSaveNote}
          onEdit={handleEdit}
          onClose={handleCloseMenu}
        />
      )}
    </>
  );
});

export type { MarkdownRendererProps, TextSelection };
