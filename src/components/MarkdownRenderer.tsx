import React, { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import toast from 'react-hot-toast';
import { MermaidDiagram } from './MermaidDiagram';
import { SelectionOverlayMenu } from './SelectionOverlayMenu';
import { InlineEditor } from './InlineEditor';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
 * Custom paragraph component that avoids invalid DOM nesting.
 * If children contain block-level elements (pre, div, etc.), render as div instead of p.
 */
function Paragraph({ children, ...props }: { children?: React.ReactNode }) {
  const hasBlockElement = (nodes: React.ReactNode): boolean => {
    return React.Children.toArray(nodes).some((child) => {
      if (!React.isValidElement(child)) return false;
      const type = child.type;
      if (typeof type === 'string') {
        return ['pre', 'div', 'table', 'ul', 'ol', 'blockquote', 'figure'].includes(type);
      }
      // Check for our custom CodeBlock which renders pre
      if (type === CodeBlock) return true;
      return false;
    });
  };

  if (hasBlockElement(children)) {
    return <div {...props}>{children}</div>;
  }

  return <p {...props}>{children}</p>;
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
  lessonTitle: _lessonTitle,
  courseTitle: _courseTitle,
  isOwner = false,
  onContentUpdate,
}: MarkdownRendererProps) {
  // Note: lessonTitle and courseTitle are available via props for future use
  // but note saving only requires IDs (titles are joined from DB in Notes page)
  void _lessonTitle;
  void _courseTitle;
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [editorPosition, setEditorPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentContent, setCurrentContent] = useState(content);
  const { user } = useAuth();

  // Keep currentContent in sync with content prop
  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  // Memoize the components configuration to prevent unnecessary re-renders
  const components: Components = useMemo(
    () => ({
      code: CodeBlock as Components['code'],
      p: Paragraph as Components['p'],
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
   * Close the selection overlay menu and inline editor
   */
  const handleCloseMenu = useCallback(() => {
    setSelection(null);
    setMenuPosition(null);
    setShowInlineEditor(false);
    setEditorPosition(null);
  }, []);

  /**
   * Handle save note action from the selection menu.
   * Requirements: 4.2, 4.3 - Store note with context and show success notification
   */
  const handleSaveNote = useCallback(async () => {
    if (!selection || !courseId || !lessonId) {
      toast.error('Cannot save note: missing required context');
      handleCloseMenu();
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save notes');
      handleCloseMenu();
      return;
    }

    // Prevent double-saves
    if (isSavingNote) {
      return;
    }

    setIsSavingNote(true);

    try {
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        snippet_markdown: selection.text,
      });

      if (error) {
        throw error;
      }

      toast.success('Note saved successfully!');
      handleCloseMenu();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note. Please try again.');
      // Don't close menu on error to allow retry (Requirement 4.5)
    } finally {
      setIsSavingNote(false);
    }
  }, [selection, courseId, lessonId, user, isSavingNote, handleCloseMenu]);

  /**
   * Handle edit action from the selection menu.
   * Requirements: 3.2, 3.3 - Enable inline editing and save modified content
   */
  const handleEdit = useCallback(() => {
    if (!selection || !isOwner) {
      handleCloseMenu();
      return;
    }

    // Calculate position for the inline editor (below the selection)
    const editorPos = {
      x: selection.rect.left + selection.rect.width / 2,
      y: selection.rect.bottom + 10,
    };

    setEditorPosition(editorPos);
    setShowInlineEditor(true);
    // Close the menu but keep selection data for the editor
    setMenuPosition(null);
  }, [selection, isOwner, handleCloseMenu]);

  /**
   * Handle inline edit save.
   * Requirements: 3.3 - Save modified content to database and update display immediately
   */
  const handleInlineEditSave = useCallback(async (newText: string) => {
    if (!selection || !lessonId) {
      toast.error('Cannot save edit: missing required context');
      handleCloseMenu();
      return;
    }

    // Calculate new markdown content by replacing the selected text
    const originalText = selection.text;
    const newContent = currentContent.replace(originalText, newText);

    try {
      // Update the lesson in the database
      const { error } = await supabase
        .from('lessons')
        .update({ 
          markdown_content: newContent,
          is_manually_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId);

      if (error) {
        throw error;
      }

      // Update local state
      setCurrentContent(newContent);
      
      // Notify parent component of the content update
      onContentUpdate?.(newContent);

      toast.success('Content updated successfully!');
      handleCloseMenu();
    } catch (error) {
      console.error('Error saving edit:', error);
      // Requirement 3.5: Display error notification and preserve original content
      toast.error('Failed to save edit. Please try again.');
      // Don't close editor on error to allow retry
    }
  }, [selection, lessonId, currentContent, onContentUpdate, handleCloseMenu]);

  /**
   * Handle inline editor cancel
   */
  const handleInlineEditCancel = useCallback(() => {
    handleCloseMenu();
  }, [handleCloseMenu]);

  // Clean up selection when component unmounts or content changes
  useEffect(() => {
    return () => {
      setSelection(null);
      setMenuPosition(null);
    };
  }, [content]);

  if (!currentContent) {
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
          {currentContent}
        </ReactMarkdown>
      </div>

      {/* Selection Overlay Menu - Requirements: 3.1, 4.1, 5.1 */}
      {selection && menuPosition && !showInlineEditor && (
        <SelectionOverlayMenu
          selection={selection}
          position={menuPosition}
          isOwner={isOwner}
          onSaveNote={handleSaveNote}
          onEdit={handleEdit}
          onClose={handleCloseMenu}
        />
      )}

      {/* Inline Editor - Requirements: 3.2, 3.3 */}
      {showInlineEditor && selection && editorPosition && (
        <InlineEditor
          originalText={selection.text}
          onSave={handleInlineEditSave}
          onCancel={handleInlineEditCancel}
          position={editorPosition}
        />
      )}
    </>
  );
});

export type { MarkdownRendererProps, TextSelection };
