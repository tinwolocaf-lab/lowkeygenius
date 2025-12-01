import { supabase } from './supabase';
import type {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizAnswer,
  CourseLevel,
} from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Result of a quiz attempt
 */
export interface QuizAttemptResult {
  quizId: string;
  answers: QuizAnswer[];
  score: number;
  totalQuestions: number;
  percentage: number;
}

/**
 * Response from the generate-quiz Edge Function
 */
interface GenerateQuizResponse {
  quiz: Quiz;
  questions: QuizQuestion[];
  questionCount: number;
}

/**
 * Combined quiz data with questions
 */
export interface QuizWithQuestions {
  quiz: Quiz;
  questions: QuizQuestion[];
}

/**
 * QuizService handles quiz generation, retrieval, and attempt management.
 * Implements caching logic to return existing quizzes without regenerating.
 * 
 * Requirements: 3.1, 3.3, 3.5, 5.2, 5.4, 6.1, 6.2, 6.4
 */
export const QuizService = {
  /**
   * Generates a quiz for a lesson using the AI service.
   * If a quiz already exists, it will be replaced.
   * 
   * Requirements: 3.1, 3.3
   */
  async generateQuiz(
    lessonId: string,
    lessonContent: string,
    lessonTitle: string,
    courseLevel: CourseLevel
  ): Promise<QuizWithQuestions> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonId,
        lessonContent,
        lessonTitle,
        courseLevel,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to generate quiz';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        try {
          const text = await response.text();
          errorMessage = text || `Server error (${response.status})`;
        } catch {
          errorMessage = `Network error (${response.status})`;
        }
      }
      throw new Error(errorMessage);
    }

    const data: GenerateQuizResponse = await response.json();
    return {
      quiz: data.quiz,
      questions: data.questions,
    };
  },

  /**
   * Retrieves existing quiz and questions for a lesson from the database.
   * Returns null if no quiz exists.
   * 
   * Requirements: 3.5 (caching - return existing without regenerating)
   */
  async getQuiz(lessonId: string): Promise<QuizWithQuestions | null> {
    // First, get the quiz for this lesson
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (quizError) {
      // PGRST116 means no rows returned - this is expected when no quiz exists
      if (quizError.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching quiz:', quizError);
      throw new Error(`Failed to fetch quiz: ${quizError.message}`);
    }

    if (!quiz) {
      return null;
    }

    // Get the questions for this quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('Error fetching quiz questions:', questionsError);
      throw new Error(`Failed to fetch quiz questions: ${questionsError.message}`);
    }

    return {
      quiz,
      questions: questions || [],
    };
  },

  /**
   * Regenerates a quiz for a lesson, replacing the existing one.
   * Quiz attempt history is preserved (Requirements: 5.4).
   * 
   * Requirements: 5.2, 5.4
   */
  async regenerateQuiz(
    lessonId: string,
    lessonContent: string,
    lessonTitle: string,
    courseLevel: CourseLevel
  ): Promise<QuizWithQuestions> {
    // The Edge Function handles deletion of existing quiz and questions
    // Quiz attempts are preserved as they reference quiz_id, and the old quiz
    // will be deleted but attempts remain in the database
    return this.generateQuiz(lessonId, lessonContent, lessonTitle, courseLevel);
  },

  /**
   * Saves a quiz attempt result to the database.
   * Creates a new attempt record without modifying existing ones.
   * 
   * Requirements: 6.1, 6.4
   */
  async saveQuizAttempt(
    quizId: string,
    userId: string,
    result: QuizAttemptResult
  ): Promise<QuizAttempt> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        score: result.score,
        total_questions: result.totalQuestions,
        percentage: result.percentage,
        answers_json: result.answers,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz attempt:', error);
      throw new Error(`Failed to save quiz attempt: ${error.message}`);
    }

    return data;
  },

  /**
   * Retrieves all quiz attempts for a user and quiz.
   * Returns attempts ordered by completion date (most recent first).
   * 
   * Requirements: 6.2
   */
  async getQuizAttempts(
    quizId: string,
    userId: string
  ): Promise<QuizAttempt[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching quiz attempts:', error);
      throw new Error(`Failed to fetch quiz attempts: ${error.message}`);
    }

    return data || [];
  },
};
