import { supabase } from './supabase';
import type {
  ActivityType,
  Json,
  LearnerStats,
  LearnerXPTransaction,
  BadgeDefinition,
  LearnerBadgeWithDetails,
  LeaderboardEntry,
  PublicProfileData,
  CourseXPBreakdown,
  XPTransactionWithCourse,
} from '../types/database';

/**
 * XP amounts for different activity types
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
const XP_AMOUNTS = {
  lesson_complete: 10,
  quiz_complete_high: 25, // score >= 80%
  quiz_complete_low: 10,  // score < 80%
  flashcard_session: 5,
} as const;

/**
 * Calculates XP amount based on activity type and metadata
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export function calculateXPAmount(
  activityType: ActivityType,
  metadata?: Record<string, unknown>
): number {
  switch (activityType) {
    case 'lesson_complete':
      return XP_AMOUNTS.lesson_complete;
    case 'quiz_complete': {
      const score = typeof metadata?.score === 'number' ? metadata.score : 0;
      return score >= 80 ? XP_AMOUNTS.quiz_complete_high : XP_AMOUNTS.quiz_complete_low;
    }
    case 'flashcard_session':
      return XP_AMOUNTS.flashcard_session;
    default:
      return 0;
  }
}

/**
 * GamificationService handles XP awards, stats, badges, leaderboards, and profiles.
 * 
 * Requirements: 1.1-1.5, 2.2-2.5, 3.1-3.5, 4.4, 5.1-5.4, 6.1-6.5, 7.1-7.2, 8.1-8.4
 */
export const GamificationService = {
  /**
   * Awards XP to a user for completing an activity.
   * The database trigger handles updating learner_stats and course_xp_summary.
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async awardXP(
    userId: string,
    courseId: string,
    activityType: ActivityType,
    metadata?: Record<string, unknown>
  ): Promise<LearnerXPTransaction> {
    const xpAmount = calculateXPAmount(activityType, metadata);

    const { data, error } = await supabase
      .from('learner_xp_transactions')
      .insert({
        user_id: userId,
        course_id: courseId,
        activity_type: activityType,
        xp_amount: xpAmount,
        metadata: (metadata ?? {}) as Json,
      })
      .select()
      .single()
      .returns<LearnerXPTransaction>();

    if (error) {
      console.error('Error awarding XP:', error);
      throw new Error(`Failed to award XP: ${error.message}`);
    }

    return data;
  },

  /**
   * Retrieves learner stats for a user.
   * Creates initial stats record if none exists.
   * 
   * Requirements: 2.5
   */
  async getLearnerStats(userId: string): Promise<LearnerStats> {
    const { data, error } = await supabase
      .from('learner_stats')
      .select()
      .eq('user_id', userId)
      .single()
      .returns<LearnerStats>();

    if (error) {
      // PGRST116 means no rows returned - create initial stats
      if (error.code === 'PGRST116') {
        const { data: newStats, error: insertError } = await supabase
          .from('learner_stats')
          .insert({
            user_id: userId,
            total_xp: 0,
            current_streak: 0,
            longest_streak: 0,
            lessons_completed: 0,
            quizzes_completed: 0,
            flashcard_sessions_completed: 0,
          })
          .select()
          .single()
          .returns<LearnerStats>();

        if (insertError) {
          console.error('Error creating learner stats:', insertError);
          throw new Error(`Failed to create learner stats: ${insertError.message}`);
        }

        return newStats;
      }

      console.error('Error fetching learner stats:', error);
      throw new Error(`Failed to fetch learner stats: ${error.message}`);
    }

    return data;
  },


  /**
   * Retrieves all badges earned by a user with full badge details.
   * Returns badges ordered by earned_at timestamp (chronological).
   * 
   * Requirements: 3.5
   */
  async getLearnerBadges(userId: string): Promise<LearnerBadgeWithDetails[]> {
    const { data, error } = await supabase
      .from('learner_badges')
      .select(`
        id,
        user_id,
        badge_id,
        earned_at,
        badge_definitions (
          id,
          code,
          name,
          description,
          icon_url,
          category
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: true });

    if (error) {
      console.error('Error fetching learner badges:', error);
      throw new Error(`Failed to fetch learner badges: ${error.message}`);
    }

    // Transform the data to match LearnerBadgeWithDetails interface
    return (data || []).map((item) => {
      const badgeDef = item.badge_definitions as unknown as BadgeDefinition;
      return {
        id: item.id,
        userId: item.user_id,
        badgeId: item.badge_id,
        earnedAt: item.earned_at,
        badge: {
          id: badgeDef.id,
          code: badgeDef.code,
          name: badgeDef.name,
          description: badgeDef.description,
          iconUrl: badgeDef.icon_url,
          category: badgeDef.category,
        },
      };
    });
  },

  /**
   * Retrieves all badge definitions (for showing unearned badges).
   */
  async getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
    const { data, error } = await supabase
      .from('badge_definitions')
      .select()
      .order('sort_order', { ascending: true })
      .returns<BadgeDefinition[]>();

    if (error) {
      console.error('Error fetching badge definitions:', error);
      throw new Error(`Failed to fetch badge definitions: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Retrieves the course leaderboard for a specific course.
   * Only includes users with public profiles.
   * Returns top N learners ranked by XP earned in that course.
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async getCourseLeaderboard(
    courseId: string,
    requestingUserId: string,
    limit: number = 10
  ): Promise<{ entries: LeaderboardEntry[]; userRank: LeaderboardEntry | null }> {
    // Get top learners with public profiles
    const { data: topEntries, error: topError } = await supabase
      .from('course_xp_summary')
      .select(`
        user_id,
        total_xp,
        profiles!inner (
          id,
          display_name,
          full_name,
          avatar_url,
          profile_visibility
        )
      `)
      .eq('course_id', courseId)
      .eq('profiles.profile_visibility', 'public')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (topError) {
      console.error('Error fetching leaderboard:', topError);
      throw new Error(`Failed to fetch leaderboard: ${topError.message}`);
    }

    // Transform to LeaderboardEntry format with ranks
    const entries: LeaderboardEntry[] = (topEntries || []).map((item, index) => {
      const profile = item.profiles as unknown as {
        id: string;
        display_name: string | null;
        full_name: string | null;
        avatar_url: string | null;
      };
      return {
        rank: index + 1,
        userId: item.user_id,
        displayName: profile.display_name || profile.full_name || 'Anonymous',
        avatarUrl: profile.avatar_url,
        courseXp: item.total_xp,
      };
    });

    // Check if requesting user is in top entries
    const userInTop = entries.find((e) => e.userId === requestingUserId);
    
    let userRank: LeaderboardEntry | null = null;
    
    if (!userInTop) {
      // Get user's rank if not in top entries
      // Use maybeSingle() since user may not have earned any XP yet (no row in course_xp_summary)
      const { data: userEntry, error: userError } = await supabase
        .from('course_xp_summary')
        .select(`
          user_id,
          total_xp,
          profiles!inner (
            id,
            display_name,
            full_name,
            avatar_url,
            profile_visibility
          )
        `)
        .eq('course_id', courseId)
        .eq('user_id', requestingUserId)
        .maybeSingle();

      if (!userError && userEntry) {
        // Count how many users have more XP to determine rank
        const { count, error: countError } = await supabase
          .from('course_xp_summary')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .gt('total_xp', userEntry.total_xp);

        if (!countError && count !== null) {
          const profile = userEntry.profiles as unknown as {
            id: string;
            display_name: string | null;
            full_name: string | null;
            avatar_url: string | null;
          };
          userRank = {
            rank: count + 1,
            userId: userEntry.user_id,
            displayName: profile.display_name || profile.full_name || 'Anonymous',
            avatarUrl: profile.avatar_url,
            courseXp: userEntry.total_xp,
          };
        }
      }
    }

    return { entries, userRank };
  },


  /**
   * Retrieves a user's public profile data.
   * Returns null if the profile is private or doesn't exist.
   * Excludes sensitive data like email, subscription status, etc.
   * 
   * Requirements: 5.1, 5.2, 5.3
   */
  async getPublicProfile(userId: string): Promise<PublicProfileData | null> {
    // Get profile with visibility check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, profile_visibility')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return null; // User not found
      }
      console.error('Error fetching profile:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // Return null for private profiles
    if (profile.profile_visibility === 'private') {
      return null;
    }

    // Get learner stats
    const stats = await this.getLearnerStats(userId);

    // Get badges
    const badges = await this.getLearnerBadges(userId);

    return {
      userId: profile.id,
      displayName: profile.display_name || profile.full_name || 'Anonymous',
      avatarUrl: profile.avatar_url,
      totalXp: stats.total_xp,
      currentStreak: stats.current_streak,
      badges,
    };
  },

  /**
   * Retrieves recent XP transactions for a user with course info.
   * 
   * Requirements: 4.4
   */
  async getXPTransactions(
    userId: string,
    limit: number = 20
  ): Promise<XPTransactionWithCourse[]> {
    const { data, error } = await supabase
      .from('learner_xp_transactions')
      .select(`
        id,
        user_id,
        course_id,
        activity_type,
        xp_amount,
        metadata,
        created_at,
        courses (
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching XP transactions:', error);
      throw new Error(`Failed to fetch XP transactions: ${error.message}`);
    }

    return (data || []).map((item) => {
      const course = item.courses as unknown as { title: string } | null;
      return {
        id: item.id,
        userId: item.user_id,
        courseId: item.course_id,
        courseTitle: course?.title || 'Unknown Course',
        activityType: item.activity_type,
        xpAmount: item.xp_amount,
        metadata: item.metadata as Record<string, unknown>,
        createdAt: item.created_at,
      };
    });
  },

  /**
   * Retrieves XP breakdown per course for a user.
   * Includes both total XP and weekly XP for each course.
   * 
   * Requirements: 7.1, 7.2
   */
  async getCourseXPBreakdown(userId: string): Promise<CourseXPBreakdown[]> {
    // Get total XP per course
    const { data: summaries, error: summaryError } = await supabase
      .from('course_xp_summary')
      .select(`
        course_id,
        total_xp,
        courses (
          title
        )
      `)
      .eq('user_id', userId)
      .order('total_xp', { ascending: false });

    if (summaryError) {
      console.error('Error fetching course XP summary:', summaryError);
      throw new Error(`Failed to fetch course XP summary: ${summaryError.message}`);
    }

    // Calculate weekly XP for each course
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    const { data: weeklyData, error: weeklyError } = await supabase
      .from('learner_xp_transactions')
      .select('course_id, xp_amount')
      .eq('user_id', userId)
      .gte('created_at', oneWeekAgoISO);

    if (weeklyError) {
      console.error('Error fetching weekly XP:', weeklyError);
      throw new Error(`Failed to fetch weekly XP: ${weeklyError.message}`);
    }

    // Aggregate weekly XP by course
    const weeklyXpByCourse = new Map<string, number>();
    for (const tx of weeklyData || []) {
      const current = weeklyXpByCourse.get(tx.course_id) || 0;
      weeklyXpByCourse.set(tx.course_id, current + tx.xp_amount);
    }

    // Combine total and weekly XP
    return (summaries || []).map((item) => {
      const course = item.courses as unknown as { title: string } | null;
      return {
        courseId: item.course_id,
        courseTitle: course?.title || 'Unknown Course',
        totalXp: item.total_xp,
        weeklyXp: weeklyXpByCourse.get(item.course_id) || 0,
      };
    });
  },

  /**
   * Updates a user's profile visibility setting.
   * 
   * Requirements: 5.4
   */
  async updateProfileVisibility(
    userId: string,
    visibility: 'public' | 'private'
  ): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ profile_visibility: visibility })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile visibility:', error);
      throw new Error(`Failed to update profile visibility: ${error.message}`);
    }
  },

  /**
   * Gets the count of public participants in a course.
   * Used to determine if leaderboard should be shown.
   * 
   * Requirements: 6.5
   */
  async getPublicParticipantCount(courseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('course_xp_summary')
      .select(`
        *,
        profiles!inner (
          profile_visibility
        )
      `, { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('profiles.profile_visibility', 'public');

    if (error) {
      console.error('Error counting participants:', error);
      throw new Error(`Failed to count participants: ${error.message}`);
    }

    return count || 0;
  },
};
