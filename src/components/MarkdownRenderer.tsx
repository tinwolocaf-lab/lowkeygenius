import React, { memo, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import toast from 'react-hot-toast';
import { MermaidDiagram } from './MermaidDiagram';
import { SelectionOverlayMenu } from './SelectionOverlayMenu';
import { InlineEditor } from './InlineEditor';
import { InlineWikiTerm } from './InlineWikiTerm';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateDefinition } from '../lib/api';
import type { InlineWikiEntry } from '../types/database';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableSelection?: boolean;
  onTextSelect?: (selection: TextSelection) => void;
  courseId?: string;
  lessonId?: string;
  lessonTitle?: string;
  courseTitle?: string;
  courseTopic?: string;
  courseLevel?: string;
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
 * Escape special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  // Escape special regex characters by prepending backslash
  return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
}

/**
 * Custom code block component that detects mermaid language
 * and routes to MermaidDiagram component.
 * For regular code blocks, renders a simple pre > code structure.
 * 
 * Note: In react-markdown v9+, inline code doesn't have a className,
 * while code blocks have a className like "language-xxx".
 * We detect inline code by checking if there's no className and no newlines.
 */
function CodeBlock({
  className,
  children,
  node,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
  [key: string]: unknown;
}) {
  // Suppress unused variable warning
  void node;
  void props;
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');
  
  // Detect if this is inline code:
  // - No language class means it's likely inline
  // - No newlines in content suggests inline
  // - Short content is likely inline
  const isInline = !className && !codeContent.includes('\n');

  // Route mermaid code blocks to MermaidDiagram component
  if (!isInline && language === 'mermaid') {
    return <MermaidDiagram code={codeContent} className="my-4" />;
  }

  // Inline code - render as simple inline code element
  if (isInline) {
    return (
      <code 
        className="inline-code"
        style={{ display: 'inline', whiteSpace: 'nowrap' }}
      >
        {children}
      </code>
    );
  }

  // Block code - single pre element with code inside
  return (
    <pre className="code-block">
      <code className={className}>{children}</code>
    </pre>
  );
}

/**
 * Process React children to wrap wiki terms with InlineWikiTerm components.
 */
function processChildrenForWikiTerms(
  children: React.ReactNode,
  wikiEntries: InlineWikiEntry[],
  isOwner: boolean,
  onDelete: (entryId: string) => void,
  isLoading?: boolean
): React.ReactNode {
  if (wikiEntries.length === 0 || isLoading) {
    return children;
  }

  return React.Children.map(children, (child) => {
    // If it's a string, process it for wiki terms
    if (typeof child === 'string') {
      return renderTextWithWikiTerms(child, wikiEntries, isOwner, onDelete);
    }
    
    // If it's a valid React element, recursively process its children
    if (React.isValidElement(child)) {
      const elementChild = child as React.ReactElement<{ children?: React.ReactNode }>;
      // Don't process code blocks or pre elements
      if (elementChild.type === 'code' || elementChild.type === 'pre' || elementChild.type === CodeBlock) {
        return child;
      }
      
      if (elementChild.props.children) {
        return React.cloneElement(elementChild, {
          ...elementChild.props,
          children: processChildrenForWikiTerms(
            elementChild.props.children,
            wikiEntries,
            isOwner,
            onDelete,
            isLoading
          ),
        });
      }
    }
    
    return child;
  });
}

/**
 * Render text with InlineWiki terms wrapped.
 */
function renderTextWithWikiTerms(
  text: string,
  wikiEntries: InlineWikiEntry[],
  isOwner: boolean,
  onDelete: (entryId: string) => void
): React.ReactNode {
  if (wikiEntries.length === 0) {
    return text;
  }

  // Sort entries by term length (longest first) to handle overlapping terms
  const sortedEntries = [...wikiEntries].sort((a, b) => b.term.length - a.term.length);
  
  // Build a map of term positions to avoid overlapping matches
  const matches: Array<{ start: number; end: number; entry: InlineWikiEntry }> = [];
  
  for (const entry of sortedEntries) {
    // Case-insensitive search for the term
    const regex = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Check if this position overlaps with existing matches
      const overlaps = matches.some(
        m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end)
      );
      
      if (!overlaps) {
        matches.push({ start, end, entry });
      }
    }
  }

  if (matches.length === 0) {
    return text;
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build the result with InlineWikiTerm components
  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    // Add text before this match
    if (match.start > lastIndex) {
      result.push(text.slice(lastIndex, match.start));
    }

    // Add the InlineWikiTerm component
    const matchedText = text.slice(match.start, match.end);
    result.push(
      <InlineWikiTerm
        key={`${match.entry.id}-${match.start}-${i}`}
        term={matchedText}
        definition={match.entry.definition}
        entryId={match.entry.id}
        isOwner={isOwner}
        onDelete={onDelete}
      />
    );

    lastIndex = match.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}


/**
 * Unified MarkdownRenderer component that handles all markdown rendering
 * with Mermaid diagram support, syntax highlighting, consistent styling,
 * and InlineWiki term definitions.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 4.2, 4.3, 5.1, 5.3, 6.1, 6.3
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
  enableSelection = true,
  onTextSelect,
  courseId,
  lessonId,
  lessonTitle,
  courseTitle: _courseTitle,
  courseTopic,
  courseLevel,
  isOwner = false,
  onContentUpdate,
}: MarkdownRendererProps) {
  // Note: courseTitle is available via props for future use
  void _courseTitle;
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [editorPosition, setEditorPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentContent, setCurrentContent] = useState(content);
  const [isGeneratingDefinition, setIsGeneratingDefinition] = useState(false);
  const { user } = useAuth();

  // InlineWiki state - Requirements: 4.2, 5.1, 6.1
  const [wikiEntries, setWikiEntries] = useState<InlineWikiEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  /**
   * Sanitize markdown content by removing outer code fence wrappers.
   * Some AI-generated content comes wrapped in ```markdown ... ``` which
   * causes the entire content to render as a code block instead of markdown.
   */
  const sanitizeMarkdownContent = useCallback((rawContent: string): string => {
    if (!rawContent) return rawContent;
    
    // Check if content is wrapped in markdown code fence
    const markdownFencePattern = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/;
    const match = rawContent.match(markdownFencePattern);
    
    if (match) {
      return match[1].trim();
    }
    
    return rawContent;
  }, []);

  // Keep currentContent in sync with content prop, sanitizing if needed
  useEffect(() => {
    setCurrentContent(sanitizeMarkdownContent(content));
  }, [content, sanitizeMarkdownContent]);

  /**
   * Load InlineWiki entries for the lesson on mount.
   * Requirements: 4.1, 4.2, 4.4 - Retrieve InlineWiki_Entries for the current user only
   * Each user sees only their own definitions, ensuring user isolation for public courses.
   */
  useEffect(() => {
    async function loadWikiEntries() {
      if (!lessonId || !user) return;

      setIsLoadingEntries(true);
      setEntriesError(null);

      try {
        // Filter by user_id to ensure user isolation (Requirements 4.1, 4.2, 4.4)
        // Each user only sees their own definitions, whether they are the course owner or a learner
        const { data, error } = await supabase
          .from('inline_wiki_entries')
          .select()
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .returns<InlineWikiEntry[]>();

        if (error) {
          throw error;
        }

        setWikiEntries(data || []);
      } catch (error) {
        console.error('Error loading InlineWiki entries:', error);
        setEntriesError('Failed to load definitions');
      } finally {
        setIsLoadingEntries(false);
      }
    }

    loadWikiEntries();
  }, [lessonId, user]);


  /**
   * Extract surrounding paragraph context for a selection.
   * Requirements: 3.1 - Send the selected term and surrounding paragraph to the AI service
   */
  const extractSurroundingContext = useCallback((selectedText: string): string => {
    // Find the paragraph containing the selected text
    const paragraphs = currentContent.split(/\n\n+/);
    for (const paragraph of paragraphs) {
      if (paragraph.includes(selectedText)) {
        // Return the paragraph, limited to reasonable length
        return paragraph.slice(0, 500);
      }
    }
    // Fallback: return text around the selection
    const index = currentContent.indexOf(selectedText);
    if (index !== -1) {
      const start = Math.max(0, index - 200);
      const end = Math.min(currentContent.length, index + selectedText.length + 200);
      return currentContent.slice(start, end);
    }
    return selectedText;
  }, [currentContent]);

  /**
   * Handle deleting an InlineWiki entry.
   * Requirements: 4.3 - Remove entry from database and update display immediately
   * Only allows deletion of entries owned by the current user (user isolation)
   */
  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!user) {
      toast.error('You must be logged in to delete definitions');
      return;
    }

    try {
      // Filter by user_id to ensure users can only delete their own definitions
      const { error } = await supabase
        .from('inline_wiki_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Remove from local state immediately
      setWikiEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast.success('Definition deleted');
    } catch (error) {
      console.error('Error deleting InlineWiki entry:', error);
      toast.error('Failed to delete definition');
    }
  }, [user]);

  /**
   * Create custom paragraph component that processes wiki terms.
   * Requirements: 5.1, 5.3 - Match InlineWiki terms in content and apply styling
   * Requirements: 4.1, 4.2 - User isolation: users only see their own definitions
   */
  const WikiParagraph = useCallback(({ children, ...props }: { children?: React.ReactNode }) => {
    const hasBlockElement = (nodes: React.ReactNode): boolean => {
      return React.Children.toArray(nodes).some((child) => {
        if (!React.isValidElement(child)) return false;
        const type = child.type;
        if (typeof type === 'string') {
          return ['pre', 'div', 'table', 'ul', 'ol', 'blockquote', 'figure'].includes(type);
        }
        if (type === CodeBlock) return true;
        return false;
      });
    };

    // With user isolation, users only see their own definitions,
    // so they should always be able to delete them (pass true for canDelete)
    const processedChildren = processChildrenForWikiTerms(
      children,
      wikiEntries,
      true, // Users can always delete their own definitions
      handleDeleteEntry,
      isLoadingEntries
    );

    if (hasBlockElement(children)) {
      return <div {...props}>{processedChildren}</div>;
    }

    return <p {...props}>{processedChildren}</p>;
  }, [wikiEntries, handleDeleteEntry, isLoadingEntries]);

  /**
   * Create custom list item component that processes wiki terms.
   * Requirements: 4.1, 4.2 - User isolation: users only see their own definitions
   */
  const WikiListItem = useCallback(({ children, ...props }: { children?: React.ReactNode }) => {
    // With user isolation, users only see their own definitions,
    // so they should always be able to delete them (pass true for canDelete)
    const processedChildren = processChildrenForWikiTerms(
      children,
      wikiEntries,
      true, // Users can always delete their own definitions
      handleDeleteEntry,
      isLoadingEntries
    );
    return <li {...props}>{processedChildren}</li>;
  }, [wikiEntries, handleDeleteEntry, isLoadingEntries]);

  /**
   * Create custom heading components that process wiki terms.
   * Requirements: 4.1, 4.2 - User isolation: users only see their own definitions
   */
  const createWikiHeading = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const HeadingComponent = ({ children, ...props }: { children?: React.ReactNode }) => {
      // With user isolation, users only see their own definitions,
      // so they should always be able to delete them (pass true for canDelete)
      const processedChildren = processChildrenForWikiTerms(
        children,
        wikiEntries,
        true, // Users can always delete their own definitions
        handleDeleteEntry,
        isLoadingEntries
      );
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag {...props}>{processedChildren}</Tag>;
    };
    return HeadingComponent;
  }, [wikiEntries, handleDeleteEntry, isLoadingEntries]);

  // Memoize the components configuration to prevent unnecessary re-renders
  const components: Components = useMemo(
    () => ({
      code: CodeBlock as Components['code'],
      p: WikiParagraph as Components['p'],
      li: WikiListItem as Components['li'],
      h1: createWikiHeading(1) as Components['h1'],
      h2: createWikiHeading(2) as Components['h2'],
      h3: createWikiHeading(3) as Components['h3'],
      h4: createWikiHeading(4) as Components['h4'],
      h5: createWikiHeading(5) as Components['h5'],
      h6: createWikiHeading(6) as Components['h6'],
    }),
    [WikiParagraph, WikiListItem, createWikiHeading]
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
   * Find the position of selected text in markdown content.
   * Handles edge cases where the same text appears multiple times.
   * Requirements: 1.1 - Ensure selected text is correctly replaced in markdown content
   */
  const findTextPositionInContent = useCallback((
    content: string,
    selectedText: string,
    selectionRect: DOMRect
  ): { start: number; end: number } | null => {
    // Find all occurrences of the selected text in the content
    const occurrences: number[] = [];
    let searchIndex = 0;
    
    while (searchIndex < content.length) {
      const foundIndex = content.indexOf(selectedText, searchIndex);
      if (foundIndex === -1) break;
      occurrences.push(foundIndex);
      searchIndex = foundIndex + 1;
    }

    if (occurrences.length === 0) {
      return null;
    }

    // If only one occurrence, use it directly
    if (occurrences.length === 1) {
      return {
        start: occurrences[0],
        end: occurrences[0] + selectedText.length,
      };
    }

    // Multiple occurrences: try to find the best match based on context
    // Use the selection's vertical position to help disambiguate
    // The selection closer to the top of the document is likely earlier in the content
    
    // Get all text nodes in the container and their positions
    if (containerRef.current) {
      const walker = document.createTreeWalker(
        containerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node: Text | null;
      let charCount = 0;
      const textNodePositions: Array<{ start: number; end: number; rect: DOMRect | null }> = [];
      
      while ((node = walker.nextNode() as Text | null)) {
        const nodeText = node.textContent || '';
        const nodeStart = charCount;
        charCount += nodeText.length;
        
        // Check if this node contains our selected text
        const indexInNode = nodeText.indexOf(selectedText);
        if (indexInNode !== -1) {
          // Get the bounding rect for this text node
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();
          
          textNodePositions.push({
            start: nodeStart + indexInNode,
            end: nodeStart + indexInNode + selectedText.length,
            rect,
          });
        }
      }
      
      // Find the text node position closest to the selection rect
      if (textNodePositions.length > 0) {
        let bestMatch = textNodePositions[0];
        let bestDistance = Math.abs((bestMatch.rect?.top || 0) - selectionRect.top);
        
        for (const pos of textNodePositions) {
          if (pos.rect) {
            const distance = Math.abs(pos.rect.top - selectionRect.top);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestMatch = pos;
            }
          }
        }
        
        // Map the DOM position back to markdown content position
        // Since rendered text may differ from markdown, find the closest occurrence
        let closestOccurrence = occurrences[0];
        let minDiff = Infinity;
        
        for (const occurrence of occurrences) {
          // Estimate position ratio in content
          const ratio = occurrence / content.length;
          const estimatedDomPos = ratio * charCount;
          const diff = Math.abs(estimatedDomPos - bestMatch.start);
          
          if (diff < minDiff) {
            minDiff = diff;
            closestOccurrence = occurrence;
          }
        }
        
        return {
          start: closestOccurrence,
          end: closestOccurrence + selectedText.length,
        };
      }
    }

    // Fallback: use the first occurrence
    return {
      start: occurrences[0],
      end: occurrences[0] + selectedText.length,
    };
  }, []);

  /**
   * Replace text at a specific position in the content.
   * Requirements: 1.1 - Handle edge cases for text at start/end of content
   */
  const replaceTextAtPosition = useCallback((
    content: string,
    start: number,
    end: number,
    replacement: string
  ): string => {
    // Handle edge case: start at beginning of content
    const before = start > 0 ? content.slice(0, start) : '';
    // Handle edge case: end at end of content
    const after = end < content.length ? content.slice(end) : '';
    
    return before + replacement + after;
  }, []);

  /**
   * Handle inline edit save.
   * Requirements: 1.1, 1.2, 1.3 - Save modified content to database and update display immediately
   */
  const handleInlineEditSave = useCallback(async (newText: string) => {
    if (!selection || !lessonId) {
      toast.error('Cannot save edit: missing required context');
      handleCloseMenu();
      return;
    }

    const originalText = selection.text;
    
    // Find the exact position of the selected text in the markdown content
    const position = findTextPositionInContent(currentContent, originalText, selection.rect);
    
    if (!position) {
      toast.error('Could not find the selected text in the content');
      handleCloseMenu();
      return;
    }

    // Replace the text at the specific position
    const newContent = replaceTextAtPosition(
      currentContent,
      position.start,
      position.end,
      newText
    );

    try {
      // Update the lesson in the database (Requirement 1.2)
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

      // Update local state immediately (Requirement 1.3)
      setCurrentContent(newContent);
      
      // Notify parent component of the content update
      onContentUpdate?.(newContent);

      toast.success('Content updated successfully!');
      handleCloseMenu();
    } catch (error) {
      console.error('Error saving edit:', error);
      // Requirement 1.4: Display error notification and preserve original content
      toast.error('Failed to save edit. Please try again.');
      // Don't close editor on error to allow retry
    }
  }, [selection, lessonId, currentContent, onContentUpdate, handleCloseMenu, findTextPositionInContent, replaceTextAtPosition]);

  /**
   * Handle inline editor cancel
   */
  const handleInlineEditCancel = useCallback(() => {
    handleCloseMenu();
  }, [handleCloseMenu]);


  /**
   * Handle add definition action from the selection menu.
   * Requirements: 2.1, 2.2, 2.3, 3.1, 3.5 - Initiate definition generation for selected text
   */
  const handleAddDefinition = useCallback(async () => {
    if (!selection || !lessonId) {
      toast.error('Cannot add definition: missing required context');
      return;
    }

    // Check if term already has a definition
    const existingEntry = wikiEntries.find(
      entry => entry.term.toLowerCase() === selection.text.toLowerCase()
    );
    if (existingEntry) {
      toast.error('This term already has a definition');
      handleCloseMenu();
      return;
    }

    setIsGeneratingDefinition(true);
    
    try {
      // Extract surrounding context for the AI
      const surroundingContext = extractSurroundingContext(selection.text);

      // Call the generateDefinition API
      const result = await generateDefinition({
        lessonId,
        term: selection.text,
        surroundingContext,
        courseContext: {
          topic: courseTopic || 'General',
          level: courseLevel || 'intermediate',
          lessonTitle: lessonTitle || 'Lesson',
        },
      });

      // Add the new entry to local state
      const newEntry: InlineWikiEntry = {
        id: result.entryId,
        lesson_id: lessonId,
        user_id: user?.id || '',
        term: result.term,
        definition: result.definition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setWikiEntries(prev => [...prev, newEntry]);
      toast.success('Definition added!');
      handleCloseMenu();
    } catch (error) {
      console.error('Error generating definition:', error);
      toast.error('Failed to generate definition. Please try again.');
    } finally {
      setIsGeneratingDefinition(false);
    }
  }, [selection, lessonId, wikiEntries, extractSurroundingContext, courseTopic, courseLevel, lessonTitle, user?.id, handleCloseMenu]);

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
        {/* Show subtle error indicator if entries failed to load */}
        {entriesError && (
          <div className="text-xs text-accent-red/70 mb-2">
            {entriesError}
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {currentContent}
        </ReactMarkdown>
      </div>

      {/* Selection Overlay Menu - Requirements: 2.1, 2.2, 2.3, 3.1, 4.1, 5.1 */}
      {selection && menuPosition && !showInlineEditor && (
        <SelectionOverlayMenu
          selection={selection}
          position={menuPosition}
          isOwner={isOwner}
          onSaveNote={handleSaveNote}
          onEdit={handleEdit}
          onAddDefinition={handleAddDefinition}
          onClose={handleCloseMenu}
          isGeneratingDefinition={isGeneratingDefinition}
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
