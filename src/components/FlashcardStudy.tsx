import { useState, useCallback, useEffect } from 'react';
import { X, RotateCcw, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { useXPNotifications } from '../hooks/useXPNotifications';
import { FlashcardService, StudySessionResult } from '../lib/flashcardService';
import { XPNotificationContainer } from './XPNotification';
import type { Flashcard, FlashcardResponse } from '../types/database';

interface FlashcardStudyProps {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  flashcards: Flashcard[];
  onComplete: (results: StudySessionResult) => void;
  onClose: () => void;
}

type ResponseType = 'got_it' | 'need_review';

interface CardState {
  flashcard: Flashcard;
  isFlipped: boolean;
  response: ResponseType | null;
  timeStarted: number;
}

/**
 * FlashcardStudy component provides a full-screen study interface for flashcards.
 * Implements flip interaction, response tracking, and session management.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function FlashcardStudy({
  lessonId,
  lessonTitle,
  courseId,
  flashcards,
  onComplete,
  onClose,
}: FlashcardStudyProps) {
  const { user } = useAuth();
  const { awardXP } = useGamification();
  const { notifications, showNotification, dismissNotification } = useXPNotifications();
  
  // Initialize card states with prioritization for review cards (Requirement 2.5)
  const [cardStates, setCardStates] = useState<CardState[]>(() => 
    flashcards.map(flashcard => ({
      flashcard,
      isFlipped: false,
      response: null,
      timeStarted: Date.now(),
    }))
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionResults, setSessionResults] = useState<StudySessionResult | null>(null);

  const currentCard = cardStates[currentIndex];
  const totalCards = cardStates.length;
  const answeredCards = cardStates.filter(c => c.response !== null).length;

  /**
   * Toggles the flip state of the current card.
   * Requirement 2.2: Clicking the card flips it to reveal the back.
   */
  const handleFlip = useCallback(() => {
    if (!currentCard) return;
    
    setCardStates(prev => prev.map((state, idx) => 
      idx === currentIndex 
        ? { ...state, isFlipped: !state.isFlipped }
        : state
    ));
  }, [currentIndex, currentCard]);

  /**
   * Completes the study session and calculates results.
   * Requirement 2.4: Displays summary with mastered vs review counts.
   * Requirement 1.4: Awards 5 XP for flashcard session completion.
   */
  const completeSession = useCallback(async () => {
    const responses: FlashcardResponse[] = cardStates.map(state => ({
      flashcardId: state.flashcard.id,
      response: state.response || 'need_review',
      timeSpentMs: Date.now() - state.timeStarted,
    }));

    const masteredCards = cardStates.filter(s => s.response === 'got_it').length;
    const reviewCards = cardStates.filter(s => s.response === 'need_review').length;

    const results: StudySessionResult = {
      totalCards: cardStates.length,
      masteredCards,
      reviewCards,
      responses,
    };

    setSessionResults(results);
    setIsSessionComplete(true);

    // Save session to database and award XP
    if (user) {
      setIsSaving(true);
      try {
        await FlashcardService.saveStudySession(lessonId, user.id, results);
        
        // Award XP for flashcard session completion (Requirement 1.4)
        await awardXP(courseId, 'flashcard_session', {
          lessonId,
          totalCards: cardStates.length,
          masteredCards,
          reviewCards,
        });
        showNotification(5, 'flashcard_session');
      } catch (error) {
        console.error('Failed to save study session or award XP:', error);
      } finally {
        setIsSaving(false);
      }
    }

    onComplete(results);
  }, [cardStates, lessonId, courseId, user, onComplete, awardXP, showNotification]);

  /**
   * Records the user's response and advances to the next card.
   * Requirement 2.3: Records response and advances to next card.
   */
  const handleResponse = useCallback((response: ResponseType) => {
    setCardStates(prev => prev.map((state, idx) => 
      idx === currentIndex 
        ? { ...state, response, isFlipped: false }
        : state
    ));

    // Move to next unanswered card or complete session
    const nextUnansweredIndex = cardStates.findIndex(
      (state, idx) => idx > currentIndex && state.response === null
    );
    
    if (nextUnansweredIndex !== -1) {
      setCurrentIndex(nextUnansweredIndex);
      // Reset time for next card
      setCardStates(prev => prev.map((state, idx) => 
        idx === nextUnansweredIndex 
          ? { ...state, timeStarted: Date.now() }
          : state
      ));
    } else {
      // Check if all cards are answered
      const allAnswered = cardStates.every(
        (state, idx) => idx === currentIndex || state.response !== null
      );
      
      if (allAnswered) {
        completeSession();
      }
    }
  }, [currentIndex, cardStates, completeSession]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSessionComplete) return;
      
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < totalCards - 1) {
            setCurrentIndex(prev => prev + 1);
          }
          break;
        case '1':
          if (currentCard?.isFlipped) {
            handleResponse('got_it');
          }
          break;
        case '2':
          if (currentCard?.isFlipped) {
            handleResponse('need_review');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalCards, isSessionComplete, currentCard?.isFlipped, handleFlip, handleResponse]);

  /**
   * Restarts the study session with review cards prioritized.
   * Requirement 2.5: Prioritizes cards marked as "Need review".
   */
  const handleRestart = useCallback(() => {
    // Sort cards: review cards first, then mastered cards
    const reviewCards = cardStates.filter(s => s.response === 'need_review');
    const masteredCards = cardStates.filter(s => s.response === 'got_it');
    const sortedCards = [...reviewCards, ...masteredCards];

    setCardStates(sortedCards.map(state => ({
      ...state,
      isFlipped: false,
      response: null,
      timeStarted: Date.now(),
    })));
    setCurrentIndex(0);
    setIsSessionComplete(false);
    setSessionResults(null);
  }, [cardStates]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Session complete view
  if (isSessionComplete && sessionResults) {
    const percentage = Math.round((sessionResults.masteredCards / sessionResults.totalCards) * 100);
    
    return (
      <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-border">
          <h2 className="font-display text-xl font-bold text-neutral-text">
            Study Complete!
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-text-muted" />
          </button>
        </div>

        {/* Summary Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-neutral-text">
                {lessonTitle}
              </h3>
              <p className="text-neutral-text-muted">Session Summary</p>
            </div>

            {/* Score Circle */}
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-neutral-border"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${percentage * 4.4} 440`}
                  strokeLinecap="round"
                  className="text-accent-green transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-4xl font-bold text-neutral-text">
                  {percentage}%
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent-green/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-accent-green" />
                  <span className="font-display text-2xl font-bold text-accent-green">
                    {sessionResults.masteredCards}
                  </span>
                </div>
                <p className="text-sm text-neutral-text-muted">Mastered</p>
              </div>
              <div className="bg-accent-yellow/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-accent-yellow" />
                  <span className="font-display text-2xl font-bold text-accent-yellow">
                    {sessionResults.reviewCards}
                  </span>
                </div>
                <p className="text-sm text-neutral-text-muted">Need Review</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {sessionResults.reviewCards > 0 && (
                <Button
                  variant="primary"
                  onClick={handleRestart}
                  disabled={isSaving}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Study Again (Review Cards First)
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSaving}
                className="w-full"
              >
                Done
              </Button>
            </div>

            {isSaving && (
              <p className="text-sm text-neutral-text-muted">Saving session...</p>
            )}
          </div>
        </div>

        {/* XP Notifications - Requirement 1.4 */}
        <XPNotificationContainer
          notifications={notifications}
          onDismiss={dismissNotification}
        />
      </div>
    );
  }

  // Study view
  return (
    <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-border">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-lg font-bold text-neutral-text">
            {lessonTitle}
          </h2>
          <span className="text-sm text-neutral-text-muted">
            {answeredCards} / {totalCards} cards
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-neutral-text-muted" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-neutral-border">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(answeredCards / totalCards) * 100}%` }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Flashcard */}
          <div
            className="relative w-full aspect-[3/2] cursor-pointer perspective-1000"
            onClick={handleFlip}
          >
            <div
              className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${
                currentCard?.isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front of card */}
              <div className="absolute inset-0 backface-hidden bg-neutral-surface rounded-2xl border-2 border-neutral-border shadow-lg p-8 flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wider text-neutral-text-muted mb-4">
                  Question
                </span>
                <p className="text-xl md:text-2xl text-center font-medium text-neutral-text">
                  {currentCard?.flashcard.front_text}
                </p>
                <span className="absolute bottom-4 text-sm text-neutral-text-muted">
                  Click to flip
                </span>
              </div>

              {/* Back of card */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary/5 rounded-2xl border-2 border-primary shadow-lg p-8 flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wider text-primary mb-4">
                  Answer
                </span>
                <p className="text-xl md:text-2xl text-center font-medium text-neutral-text">
                  {currentCard?.flashcard.back_text}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl hover:bg-neutral-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-neutral-text" />
            </button>

            <span className="text-neutral-text-muted">
              Card {currentIndex + 1} of {totalCards}
            </span>

            <button
              onClick={goToNext}
              disabled={currentIndex === totalCards - 1}
              className="p-3 rounded-xl hover:bg-neutral-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-neutral-text" />
            </button>
          </div>

          {/* Response Buttons - Only show when card is flipped */}
          {currentCard?.isFlipped && (
            <div className="flex gap-4 mt-6">
              <Button
                variant="success"
                onClick={() => handleResponse('got_it')}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Got it (1)
              </Button>
              <Button
                variant="warning"
                onClick={() => handleResponse('need_review')}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Need Review (2)
              </Button>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="mt-6 text-center text-sm text-neutral-text-muted">
            <span>Press </span>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">Space</kbd>
            <span> to flip • </span>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">←</kbd>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">→</kbd>
            <span> to navigate</span>
          </div>
        </div>
      </div>

      {/* XP Notifications - Requirement 1.4 */}
      <XPNotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
}
