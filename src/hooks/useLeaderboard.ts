import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GamificationService } from '../lib/gamificationService';
import type { LeaderboardEntry } from '../types/database';

interface UseLeaderboardReturn {
  /** Top 10 leaderboard entries */
  entries: LeaderboardEntry[];
  /** Current user's rank if outside top 10 */
  userRank: LeaderboardEntry | null;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Number of public participants in the course */
  participantCount: number;
  /** Whether the leaderboard has enough participants to display */
  hasEnoughParticipants: boolean;
  /** Refresh leaderboard data from the server */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing course leaderboard data.
 * Includes the current user's rank if they're outside the top 10.
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function useLeaderboard(courseId: string | null): UseLeaderboardReturn {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  /**
   * Fetch leaderboard data for the course
   */
  const fetchLeaderboard = useCallback(async () => {
    if (!courseId || !user) {
      setEntries([]);
      setUserRank(null);
      setParticipantCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Fetch leaderboard and participant count in parallel
      const [leaderboardData, count] = await Promise.all([
        GamificationService.getCourseLeaderboard(courseId, user.id, 10),
        GamificationService.getPublicParticipantCount(courseId),
      ]);

      setEntries(leaderboardData.entries);
      setUserRank(leaderboardData.userRank);
      setParticipantCount(count);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(message);
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, user]);

  /**
   * Refresh leaderboard data from the server
   */
  const refresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Fetch leaderboard when courseId or user changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Requirement 6.5: Show message when fewer than 3 public participants
  const hasEnoughParticipants = participantCount >= 3;

  return {
    entries,
    userRank,
    isLoading,
    error,
    participantCount,
    hasEnoughParticipants,
    refresh,
  };
}
