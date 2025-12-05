import { useState, useCallback, useEffect } from 'react';
import { X, ChevronRight, Check, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { useXPNotifications } from '../hooks/useXPNotifications';
import { QuizService, QuizAttemptResult } from '../lib/quizService';
import { XPNotificationContainer } from './XPNotification';
import type { Quiz, QuizQuestion, QuizAnswer } from '../types/database';

interface QuizTakeProps {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  quiz: Quiz;
  questions: QuizQuestion[];
  onComplete: (result: QuizAttemptResult) => void;
  onClose: () => void;
}

type QuizState = 'answering' | 'feedback' | 'complete';

interface QuestionState {
  question: QuizQuestion;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  submitted: boolean;
}

/**
 * QuizTake component provides a full-screen quiz interface with immediate feedback.
 * Implements question display, answer selection, feedback, and scoring.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1
 */
export function QuizTake({
  lessonTitle,
  courseId,
  quiz,
  questions,
  onComplete,
  onClose,
}: QuizTakeProps) {
  const { user } = useAuth();
  const { awardXP } = useGamification();
  const { notifications, showNotification, dismissNotification } = useXPNotifications();
  
  // Initialize question states
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(() =>
    questions.map(question => ({
      question,
      selectedIndex: null,
      isCorrect: null,
      submitted: false,
    }))
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>('answering');
  const [isSaving, setIsSaving] = useState(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResult | null>(null);

  const currentQuestion = questionStates[currentIndex];
  const totalQuestions = questionStates.length;
  const answeredQuestions = questionStates.filter(q => q.submitted).length;


  /**
   * Handles answer option selection.
   * Requirement 4.2: Highlights selection and enables submit button.
   */
  const handleSelectAnswer = useCallback((optionIndex: number) => {
    if (currentQuestion.submitted) return;
    
    setQuestionStates(prev => prev.map((state, idx) =>
      idx === currentIndex
        ? { ...state, selectedIndex: optionIndex }
        : state
    ));
  }, [currentIndex, currentQuestion?.submitted]);

  /**
   * Determines if the selected answer is correct.
   * Requirement 4.3: Compares selected index with correct_index.
   */
  const checkAnswerCorrectness = useCallback((
    selectedIndex: number,
    correctIndex: number
  ): boolean => {
    return selectedIndex === correctIndex;
  }, []);

  /**
   * Submits the current answer and shows feedback.
   * Requirements 4.3, 4.4: Shows correct/incorrect feedback and explanation.
   */
  const handleSubmitAnswer = useCallback(() => {
    if (currentQuestion.selectedIndex === null) return;
    
    const isCorrect = checkAnswerCorrectness(
      currentQuestion.selectedIndex,
      currentQuestion.question.correct_index
    );
    
    setQuestionStates(prev => prev.map((state, idx) =>
      idx === currentIndex
        ? { ...state, isCorrect, submitted: true }
        : state
    ));
    
    setQuizState('feedback');
  }, [currentIndex, currentQuestion, checkAnswerCorrectness]);

  /**
   * Calculates the quiz score.
   * Requirement 4.5: Score equals count of correct answers.
   */
  const calculateScore = useCallback((states: QuestionState[]): {
    score: number;
    totalQuestions: number;
    percentage: number;
  } => {
    const score = states.filter(s => s.isCorrect === true).length;
    const total = states.length;
    const percentage = total > 0 ? (score / total) * 100 : 0;
    
    return {
      score,
      totalQuestions: total,
      percentage: Math.round(percentage * 100) / 100,
    };
  }, []);

  /**
   * Completes the quiz and saves the attempt.
   * Requirements 4.5, 6.1: Displays final score and saves attempt.
   * Requirements 1.2, 1.3: Awards XP based on score (25 XP for >= 80%, 10 XP otherwise)
   */
  const completeQuiz = useCallback(async () => {
    const { score, totalQuestions: total, percentage } = calculateScore(questionStates);
    
    const answers: QuizAnswer[] = questionStates.map(state => ({
      questionId: state.question.id,
      selectedIndex: state.selectedIndex ?? -1,
      isCorrect: state.isCorrect ?? false,
    }));

    const result: QuizAttemptResult = {
      quizId: quiz.id,
      answers,
      score,
      totalQuestions: total,
      percentage,
    };

    setAttemptResult(result);
    setQuizState('complete');

    // Save attempt to database (Requirement 6.1)
    if (user) {
      setIsSaving(true);
      try {
        await QuizService.saveQuizAttempt(quiz.id, user.id, result);
        
        // Award XP based on score (Requirements 1.2, 1.3)
        // 25 XP for score >= 80%, 10 XP otherwise
        const xpAmount = percentage >= 80 ? 25 : 10;
        await awardXP(courseId, 'quiz_complete', { 
          quizId: quiz.id, 
          score: percentage,
          totalQuestions: total,
          correctAnswers: score 
        });
        showNotification(xpAmount, 'quiz_complete');
      } catch (error) {
        console.error('Failed to save quiz attempt or award XP:', error);
      } finally {
        setIsSaving(false);
      }
    }

    onComplete(result);
  }, [questionStates, quiz.id, user, courseId, calculateScore, onComplete, awardXP, showNotification]);

  /**
   * Advances to the next question or completes the quiz.
   */
  const handleNextQuestion = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuizState('answering');
    } else {
      completeQuiz();
    }
  }, [currentIndex, totalQuestions, completeQuiz]);

  /**
   * Restarts the quiz with fresh state.
   */
  const handleRestart = useCallback(() => {
    setQuestionStates(questions.map(question => ({
      question,
      selectedIndex: null,
      isCorrect: null,
      submitted: false,
    })));
    setCurrentIndex(0);
    setQuizState('answering');
    setAttemptResult(null);
  }, [questions]);


  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quizState === 'complete') return;
      
      // Number keys 1-4 for answer selection
      if (quizState === 'answering' && !currentQuestion.submitted) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= currentQuestion.question.options.length) {
          handleSelectAnswer(num - 1);
        }
      }
      
      // Enter to submit or continue
      if (e.key === 'Enter') {
        e.preventDefault();
        if (quizState === 'answering' && currentQuestion.selectedIndex !== null) {
          handleSubmitAnswer();
        } else if (quizState === 'feedback') {
          handleNextQuestion();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quizState, currentQuestion, handleSelectAnswer, handleSubmitAnswer, handleNextQuestion]);

  /**
   * Gets the appropriate styling for an answer option.
   */
  const getOptionStyles = (optionIndex: number): string => {
    const baseStyles = 'w-full p-4 rounded-xl border-2 text-left transition-all duration-200';
    
    if (!currentQuestion.submitted) {
      // Not submitted yet - show selection state
      if (currentQuestion.selectedIndex === optionIndex) {
        return `${baseStyles} border-primary bg-primary/10 text-neutral-text`;
      }
      return `${baseStyles} border-neutral-border hover:border-primary-light hover:bg-neutral-surface cursor-pointer`;
    }
    
    // Submitted - show correct/incorrect feedback
    const isCorrectOption = optionIndex === currentQuestion.question.correct_index;
    const isSelectedOption = optionIndex === currentQuestion.selectedIndex;
    
    if (isCorrectOption) {
      return `${baseStyles} border-accent-green bg-accent-green/10 text-neutral-text`;
    }
    if (isSelectedOption && !currentQuestion.isCorrect) {
      return `${baseStyles} border-red-500 bg-red-500/10 text-neutral-text`;
    }
    return `${baseStyles} border-neutral-border bg-neutral-surface/50 text-neutral-text-muted`;
  };

  // Quiz complete view
  if (quizState === 'complete' && attemptResult) {
    const percentage = attemptResult.percentage;
    const isPassing = percentage >= 70;
    
    return (
      <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-border">
          <h2 className="font-display text-xl font-bold text-neutral-text">
            Quiz Complete!
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-text-muted" />
          </button>
        </div>

        {/* Results Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="space-y-2">
              <Trophy className={`w-16 h-16 mx-auto ${isPassing ? 'text-accent-yellow' : 'text-neutral-text-muted'}`} />
              <h3 className="font-display text-2xl font-bold text-neutral-text">
                {lessonTitle}
              </h3>
              <p className="text-neutral-text-muted">
                {isPassing ? 'Great job!' : 'Keep practicing!'}
              </p>
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
                  className={`transition-all duration-1000 ${isPassing ? 'text-accent-green' : 'text-accent-yellow'}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-4xl font-bold text-neutral-text">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent-green/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-accent-green" />
                  <span className="font-display text-2xl font-bold text-accent-green">
                    {attemptResult.score}
                  </span>
                </div>
                <p className="text-sm text-neutral-text-muted">Correct</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-display text-2xl font-bold text-red-500">
                    {attemptResult.totalQuestions - attemptResult.score}
                  </span>
                </div>
                <p className="text-sm text-neutral-text-muted">Incorrect</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                onClick={handleRestart}
                disabled={isSaving}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
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
              <p className="text-sm text-neutral-text-muted">Saving results...</p>
            )}
          </div>
        </div>

        {/* XP Notifications - Requirements 1.2, 1.3 */}
        <XPNotificationContainer
          notifications={notifications}
          onDismiss={dismissNotification}
        />
      </div>
    );
  }


  // Quiz taking view
  return (
    <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-border">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-lg font-bold text-neutral-text">
            {quiz.title}
          </h2>
          <span className="text-sm text-neutral-text-muted">
            Question {currentIndex + 1} of {totalQuestions}
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
          style={{ width: `${((answeredQuestions) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          {/* Question Type Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium uppercase tracking-wider bg-primary/10 text-primary rounded-full">
              {currentQuestion.question.question_type === 'multiple_choice' 
                ? 'Multiple Choice' 
                : 'True / False'}
            </span>
          </div>

          {/* Question Text - Requirement 4.1 */}
          <h3 className="text-xl md:text-2xl font-medium text-neutral-text">
            {currentQuestion.question.question_text}
          </h3>

          {/* Answer Options - Requirements 4.1, 4.2 */}
          <div className="space-y-3">
            {currentQuestion.question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectAnswer(index)}
                disabled={currentQuestion.submitted}
                className={getOptionStyles(index)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-border/50 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1">{option}</span>
                  {currentQuestion.submitted && index === currentQuestion.question.correct_index && (
                    <Check className="w-5 h-5 text-accent-green flex-shrink-0" />
                  )}
                  {currentQuestion.submitted && 
                   index === currentQuestion.selectedIndex && 
                   !currentQuestion.isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Feedback Section - Requirements 4.3, 4.4 */}
          {quizState === 'feedback' && (
            <div className={`p-4 rounded-xl ${
              currentQuestion.isCorrect 
                ? 'bg-accent-green/10 border border-accent-green/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {currentQuestion.isCorrect ? (
                  <>
                    <Check className="w-5 h-5 text-accent-green" />
                    <span className="font-medium text-accent-green">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-500">Incorrect</span>
                  </>
                )}
              </div>
              {/* Show explanation for incorrect answers - Requirement 4.4 */}
              {!currentQuestion.isCorrect && currentQuestion.question.explanation && (
                <p className="text-sm text-neutral-text-muted">
                  {currentQuestion.question.explanation}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {quizState === 'answering' ? (
              <Button
                variant="primary"
                onClick={handleSubmitAnswer}
                disabled={currentQuestion.selectedIndex === null}
                className="flex-1"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNextQuestion}
                className="flex-1"
              >
                {currentIndex < totalQuestions - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'See Results'
                )}
              </Button>
            )}
          </div>

          {/* Keyboard hints */}
          <div className="text-center text-sm text-neutral-text-muted">
            <span>Press </span>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">1</kbd>
            <span>-</span>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">{currentQuestion.question.options.length}</kbd>
            <span> to select • </span>
            <kbd className="px-2 py-1 bg-neutral-surface rounded border border-neutral-border mx-1">Enter</kbd>
            <span> to {quizState === 'answering' ? 'submit' : 'continue'}</span>
          </div>
        </div>
      </div>

      {/* XP Notifications - Requirements 1.2, 1.3 */}
      <XPNotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
}
