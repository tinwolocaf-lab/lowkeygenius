import { useState, useCallback } from 'react';
import { Layers, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { FlashcardService } from '../lib/flashcardService';
import { ConfirmDialog } from './ConfirmDialog';
import type { Flashcard, CourseLevel } from '../types/database';

interface FlashcardButtonProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  courseLevel: CourseLevel;
  hasFlashcards: boolean;
  onStudy: (flashcards: Flashcard[]) => void;
  onGenerated?: (flashcards: Flashcard[]) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'error';

/**
 * FlashcardButton component renders a button to generate or view flashcards for a lesson.
 * Shows "Generate Flashcards" or "Study Flashcards" based on existence.
 * Handles loading state during generation and displays error messages with retry option.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */
export function FlashcardButton({
  lessonId,
  lessonTitle,
  lessonContent,
  courseLevel,
  hasFlashcards,
  onStudy,
  onGenerated,
}: FlashcardButtonProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  /**
   * Handles flashcard generation.
   * Requirement 1.1: Invokes AI service to create flashcards.
   * Requirement 1.2: Displays loading indicator during generation.
   * Requirement 1.4: Displays error message with retry option on failure.
   */
  const handleGenerate = useCallback(async () => {
    if (!lessonContent) {
      setErrorMessage('Lesson content required to generate flashcards');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setErrorMessage(null);

    try {
      const flashcards = await FlashcardService.generateFlashcards(
        lessonId,
        lessonContent,
        lessonTitle,
        courseLevel
      );
      
      setStatus('idle');
      onGenerated?.(flashcards);
      onStudy(flashcards);
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to generate flashcards. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, lessonContent, lessonTitle, courseLevel, onStudy, onGenerated]);

  /**
   * Handles viewing existing flashcards.
   * Requirement 1.5: Displays existing flashcards without regenerating.
   */
  const handleStudy = useCallback(async () => {
    setStatus('generating');
    setErrorMessage(null);

    try {
      const flashcards = await FlashcardService.getFlashcards(lessonId);
      
      if (flashcards && flashcards.length > 0) {
        setStatus('idle');
        onStudy(flashcards);
      } else {
        // No flashcards found, generate new ones
        await handleGenerate();
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load flashcards. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, onStudy, handleGenerate]);

  /**
   * Handles flashcard regeneration with confirmation.
   * Requirement 5.1: Regenerates flashcards and replaces existing ones.
   * Requirement 5.3: Confirms action before proceeding.
   */
  const handleRegenerate = useCallback(async () => {
    setShowRegenerateConfirm(false);
    
    if (!lessonContent) {
      setErrorMessage('Lesson content required to regenerate flashcards');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setErrorMessage(null);

    try {
      const flashcards = await FlashcardService.regenerateFlashcards(
        lessonId,
        lessonContent,
        lessonTitle,
        courseLevel
      );
      
      setStatus('idle');
      onGenerated?.(flashcards);
      onStudy(flashcards);
    } catch (error) {
      console.error('Failed to regenerate flashcards:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to regenerate flashcards. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, lessonContent, lessonTitle, courseLevel, onStudy, onGenerated]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setStatus('idle');
    if (hasFlashcards) {
      handleStudy();
    } else {
      handleGenerate();
    }
  }, [hasFlashcards, handleStudy, handleGenerate]);

  // Error state with retry option
  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRetry}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Loading state during generation
  if (status === 'generating') {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        {hasFlashcards ? 'Loading...' : 'Generating Flashcards...'}
      </Button>
    );
  }

  // Show "Study Flashcards" if flashcards exist, otherwise "Generate Flashcards"
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={hasFlashcards ? handleStudy : handleGenerate}
          disabled={!lessonContent}
          title={!lessonContent ? 'Lesson content required' : undefined}
        >
          <Layers className="w-4 h-4 mr-2" />
          {hasFlashcards ? 'Study Flashcards' : 'Generate Flashcards'}
        </Button>
        
        {hasFlashcards && (
          <button
            onClick={() => setShowRegenerateConfirm(true)}
            className="p-2 text-neutral-text-muted hover:text-neutral-text hover:bg-neutral-surface rounded-lg transition-colors"
            title="Regenerate flashcards"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        title="Regenerate Flashcards?"
        message="This will replace the existing flashcards with new ones. Your study session history will be preserved."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </>
  );
}
