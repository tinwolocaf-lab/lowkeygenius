import { useState, useCallback } from 'react';
import { FileQuestion, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { QuizService, QuizWithQuestions } from '../lib/quizService';
import { ConfirmDialog } from './ConfirmDialog';
import type { CourseLevel } from '../types/database';

interface QuizButtonProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  courseLevel: CourseLevel;
  hasQuiz: boolean;
  onTake: (quizData: QuizWithQuestions) => void;
  onGenerated?: (quizData: QuizWithQuestions) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'error';

/**
 * QuizButton component renders a button to generate or take a quiz for a lesson.
 * Shows "Generate Quiz" or "Take Quiz" based on existence.
 * Handles loading state during generation and displays error messages with retry option.
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */
export function QuizButton({
  lessonId,
  lessonTitle,
  lessonContent,
  courseLevel,
  hasQuiz,
  onTake,
  onGenerated,
}: QuizButtonProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  /**
   * Handles quiz generation.
   * Requirement 3.1: Invokes AI service to create quiz questions.
   * Requirement 3.2: Displays loading indicator during generation.
   * Requirement 3.4: Displays error message with retry option on failure.
   */
  const handleGenerate = useCallback(async () => {
    if (!lessonContent) {
      setErrorMessage('Lesson content required to generate quiz');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setErrorMessage(null);

    try {
      const quizData = await QuizService.generateQuiz(
        lessonId,
        lessonContent,
        lessonTitle,
        courseLevel
      );
      
      setStatus('idle');
      onGenerated?.(quizData);
      onTake(quizData);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to generate quiz. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, lessonContent, lessonTitle, courseLevel, onTake, onGenerated]);

  /**
   * Handles taking an existing quiz.
   * Requirement 3.5: Displays existing quiz without regenerating.
   */
  const handleTake = useCallback(async () => {
    setStatus('generating');
    setErrorMessage(null);

    try {
      const quizData = await QuizService.getQuiz(lessonId);
      
      if (quizData) {
        setStatus('idle');
        onTake(quizData);
      } else {
        // No quiz found, generate new one
        await handleGenerate();
      }
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load quiz. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, onTake, handleGenerate]);

  /**
   * Handles quiz regeneration with confirmation.
   * Requirement 5.2: Regenerates quiz and replaces existing one.
   * Requirement 5.3: Confirms action before proceeding.
   */
  const handleRegenerate = useCallback(async () => {
    setShowRegenerateConfirm(false);
    
    if (!lessonContent) {
      setErrorMessage('Lesson content required to regenerate quiz');
      setStatus('error');
      return;
    }

    setStatus('generating');
    setErrorMessage(null);

    try {
      const quizData = await QuizService.regenerateQuiz(
        lessonId,
        lessonContent,
        lessonTitle,
        courseLevel
      );
      
      setStatus('idle');
      onGenerated?.(quizData);
      onTake(quizData);
    } catch (error) {
      console.error('Failed to regenerate quiz:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to regenerate quiz. Please try again.'
      );
      setStatus('error');
    }
  }, [lessonId, lessonContent, lessonTitle, courseLevel, onTake, onGenerated]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setStatus('idle');
    if (hasQuiz) {
      handleTake();
    } else {
      handleGenerate();
    }
  }, [hasQuiz, handleTake, handleGenerate]);

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
        {hasQuiz ? 'Loading...' : 'Generating Quiz...'}
      </Button>
    );
  }

  // Show "Take Quiz" if quiz exists, otherwise "Generate Quiz"
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={hasQuiz ? handleTake : handleGenerate}
          disabled={!lessonContent}
          title={!lessonContent ? 'Lesson content required' : undefined}
        >
          <FileQuestion className="w-4 h-4 mr-2" />
          {hasQuiz ? 'Take Quiz' : 'Generate Quiz'}
        </Button>
        
        {hasQuiz && (
          <button
            onClick={() => setShowRegenerateConfirm(true)}
            className="p-2 text-neutral-text-muted hover:text-neutral-text hover:bg-neutral-surface rounded-lg transition-colors"
            title="Regenerate quiz"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        title="Regenerate Quiz?"
        message="This will replace the existing quiz with a new one. Your quiz attempt history will be preserved."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </>
  );
}
