import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GamificationService } from '../lib/gamificationService';
import type {
  ActivityType,
  LearnerStats,
  LearnerBadgeWithDetails,
  BadgeDefinition,
} from '../types/database';

interface NewBadgeNotification {
  badge: LearnerBadgeWithDetails;
  isVisible: boolean;
}

interface UseGamificationReturn {
  /** Current learner stats (XP, streak, etc.) */
  stats: LearnerStats | null;
  /** All badges earned by the learner */
  earnedBadges: LearnerBadgeWithDetails[];
  /** All available badge definitions */
  allBadges: BadgeDefinition[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Award XP for an activity with optimistic updates */
  awardXP: (
    courseId: string,
    activityType: ActivityType,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  /** New badge notification state */
  newBadgeNotification: NewBadgeNotification | null;
  /** Dismiss the new badge notification */
  dismissBadgeNotification: () => void;
  /** Refresh stats and badges from the server */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing gamification data including XP, streaks, and badges.
 * Provides optimistic updates for XP awards and real-time subscriptions for stats updates.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 2.4
 */
export function useGamification(): UseGamificationReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<LearnerBadgeWithDetails[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBadgeNotification, setNewBadgeNotification] = useState<NewBadgeNotification | null>(null);

  // Track previous badge count to detect new badges
  const previousBadgeCountRef = useRef<number>(0);

  /**
   * Fetch all gamification data for the current user
   */
  const fetchData = useCallback(async () => {
    if (!user) {
      setStats(null);
      setEarnedBadges([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const [fetchedStats, fetchedBadges, fetchedAllBadges] = await Promise.all([
        GamificationService.getLearnerStats(user.id),
        GamificationService.getLearnerBadges(user.id),
        GamificationService.getAllBadgeDefinitions(),
      ]);

      setStats(fetchedStats);
      setEarnedBadges(fetchedBadges);
      setAllBadges(fetchedAllBadges);

      // Check for new badges (only after initial load)
      if (previousBadgeCountRef.current > 0 && fetchedBadges.length > previousBadgeCountRef.current) {
        // Find the newest badge (last in the chronologically ordered list)
        const newestBadge = fetchedBadges[fetchedBadges.length - 1];
        setNewBadgeNotification({
          badge: newestBadge,
          isVisible: true,
        });
      }
      previousBadgeCountRef.current = fetchedBadges.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch gamification data';
      setError(message);
      console.error('Error fetching gamification data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Award XP for completing an activity with optimistic updates
   */
  const awardXP = useCallback(
    async (
      courseId: string,
      activityType: ActivityType,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      if (!user) {
        throw new Error('User must be logged in to award XP');
      }

      // Calculate expected XP for optimistic update
      const xpAmount = activityType === 'lesson_complete' ? 10
        : activityType === 'flashcard_session' ? 5
        : (typeof metadata?.score === 'number' && metadata.score >= 80) ? 25 : 10;

      // Optimistic update for stats
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_xp: prev.total_xp + xpAmount,
          // Increment activity counters optimistically
          lessons_completed: activityType === 'lesson_complete'
            ? prev.lessons_completed + 1
            : prev.lessons_completed,
          quizzes_completed: activityType === 'quiz_complete'
            ? prev.quizzes_completed + 1
            : prev.quizzes_completed,
          flashcard_sessions_completed: activityType === 'flashcard_session'
            ? prev.flashcard_sessions_completed + 1
            : prev.flashcard_sessions_completed,
        };
      });

      try {
        // Perform the actual XP award
        await GamificationService.awardXP(user.id, courseId, activityType, metadata);

        // Refresh to get accurate data including any new badges
        await fetchData();
      } catch (err) {
        // Revert optimistic update on error
        await fetchData();
        throw err;
      }
    },
    [user, fetchData]
  );

  /**
   * Dismiss the new badge notification
   */
  const dismissBadgeNotification = useCallback(() => {
    setNewBadgeNotification(null);
  }, []);

  /**
   * Refresh data from the server
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up Supabase realtime subscription for stats updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`learner_stats:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learner_stats',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update stats when they change in the database
          if (payload.new && typeof payload.new === 'object') {
            const newStats = payload.new as LearnerStats;
            setStats(newStats);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'learner_badges',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh badges when a new one is earned
          GamificationService.getLearnerBadges(user.id).then((badges) => {
            setEarnedBadges(badges);
            // Show notification for the newest badge
            if (badges.length > previousBadgeCountRef.current) {
              const newestBadge = badges[badges.length - 1];
              setNewBadgeNotification({
                badge: newestBadge,
                isVisible: true,
              });
            }
            previousBadgeCountRef.current = badges.length;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    stats,
    earnedBadges,
    allBadges,
    isLoading,
    error,
    awardXP,
    newBadgeNotification,
    dismissBadgeNotification,
    refresh,
  };
}
