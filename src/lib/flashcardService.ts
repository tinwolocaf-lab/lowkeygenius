import { supabase } from './supabase';
import type {
  Flashcard,
  FlashcardSession,
  FlashcardResponse,
  CourseLevel,
} from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Result of a study session
 */
export interface StudySessionResult {
  totalCards: number;
  masteredCards: number;
  reviewCards: number;
  responses: FlashcardResponse[];
}

/**
 * Response from the generate-flashcards Edge Function
 */
interface GenerateFlashcardsResponse {
  flashcards: Flashcard[];
  count: number;
}

/**
 * FlashcardService handles flashcard generation, retrieval, and session management.
 * Implements caching logic to return existing flashcards without regenerating.
 * 
 * Requirements: 1.1, 1.3, 1.5, 5.1, 5.4
 */
export const FlashcardService = {
  /**
   * Generates flashcards for a lesson using the AI service.
   * If flashcards already exist, they will be replaced.
   * 
   * Requirements: 1.1, 1.3
   */
  async generateFlashcards(
    lessonId: string,
    lessonContent: string,
    lessonTitle: string,
    courseLevel: CourseLevel
  ): Promise<Flashcard[]> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-flashcards`, {
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
      let errorMessage = 'Failed to generate flashcards';
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

    const data: GenerateFlashcardsResponse = await response.json();
    return data.flashcards;
  },

  /**
   * Retrieves existing flashcards for a lesson from the database.
   * Returns null if no flashcards exist.
   * 
   * Requirements: 1.5 (caching - return existing without regenerating)
   */
  async getFlashcards(lessonId: string): Promise<Flashcard[] | null> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching flashcards:', error);
      throw new Error(`Failed to fetch flashcards: ${error.message}`);
    }

    // Return null if no flashcards exist (caching logic)
    if (!data || data.length === 0) {
      return null;
    }

    return data;
  },

  /**
   * Regenerates flashcards for a lesson, replacing existing ones.
   * Study session history is preserved (Requirements: 5.4).
   * 
   * Requirements: 5.1, 5.4
   */
  async regenerateFlashcards(
    lessonId: string,
    lessonContent: string,
    lessonTitle: string,
    courseLevel: CourseLevel
  ): Promise<Flashcard[]> {
    // The Edge Function handles deletion of existing flashcards
    // Study sessions are preserved as they reference lesson_id, not flashcard_id
    return this.generateFlashcards(lessonId, lessonContent, lessonTitle, courseLevel);
  },

  /**
   * Saves a study session result to the database.
   * 
   * Requirements: 2.3, 2.4
   */
  async saveStudySession(
    lessonId: string,
    userId: string,
    results: StudySessionResult
  ): Promise<FlashcardSession> {
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        total_cards: results.totalCards,
        mastered_cards: results.masteredCards,
        review_cards: results.reviewCards,
        responses_json: results.responses,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving study session:', error);
      throw new Error(`Failed to save study session: ${error.message}`);
    }

    return data;
  },

  /**
   * Retrieves all study sessions for a user and lesson.
   * Returns sessions ordered by completion date (most recent first).
   */
  async getStudySessions(
    lessonId: string,
    userId: string
  ): Promise<FlashcardSession[]> {
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching study sessions:', error);
      throw new Error(`Failed to fetch study sessions: ${error.message}`);
    }

    return data || [];
  },
};
