import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Zap,
  Flame,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../hooks/useGamification';
import { GamificationService } from '../lib/gamificationService';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { BadgeDisplay } from '../components/BadgeDisplay';
import type {
  XPTransactionWithCourse,
  CourseXPBreakdown,
  ActivityType,
} from '../types/database';

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
}

interface ActivityData {
  date: string;
  count: number;
}

/**
 * Format activity type for display
 */
function formatActivityType(activityType: ActivityType): string {
  switch (activityType) {
    case 'lesson_complete':
      return 'Lesson completed';
    case 'quiz_complete':
      return 'Quiz completed';
    case 'flashcard_session':
      return 'Flashcard session';
    default:
      return activityType;
  }
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get icon for activity type
 */
function getActivityIcon(activityType: ActivityType) {
  switch (activityType) {
    case 'lesson_complete':
      return <BookOpen className="w-4 h-4" />;
    case 'quiz_complete':
      return <Award className="w-4 h-4" />;
    case 'flashcard_session':
      return <BarChart3 className="w-4 h-4" />;
    default:
      return <Zap className="w-4 h-4" />;
  }
}

/**
 * Analytics Page - Personal analytics dashboard displaying learning statistics and progress.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3
 */
export function Analytics() {
  const { user } = useAuth();
  const { stats, earnedBadges, allBadges, isLoading: statsLoading } = useGamification();

  const [transactions, setTransactions] = useState<XPTransactionWithCourse[]>([]);
  const [courseXPBreakdown, setCourseXPBreakdown] = useState<CourseXPBreakdown[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [weeklyXP, setWeeklyXP] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch analytics data
   */
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch XP transactions
      const txData = await GamificationService.getXPTransactions(user.id, 10);
      setTransactions(txData);

      // Fetch course XP breakdown
      const xpBreakdown = await GamificationService.getCourseXPBreakdown(user.id);
      setCourseXPBreakdown(xpBreakdown);

      // Calculate weekly XP
      const totalWeeklyXP = xpBreakdown.reduce((sum, course) => sum + course.weeklyXp, 0);
      setWeeklyXP(totalWeeklyXP);

      // Fetch course progress data
      const { data: ownedCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('owner_id', user.id);

      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id, courses(id, title)')
        .eq('user_id', user.id);

      // Combine owned and enrolled courses
      const allCourses = [
        ...(ownedCourses || []).map((c) => ({ id: c.id, title: c.title })),
        ...(enrollments || [])
          .filter((e) => e.courses)
          .map((e) => {
            const course = e.courses as unknown as { id: string; title: string };
            return { id: course.id, title: course.title };
          }),
      ];

      // Remove duplicates
      const uniqueCourses = Array.from(
        new Map(allCourses.map((c) => [c.id, c])).values()
      );

      // Get progress for each course
      const progressData: CourseProgress[] = [];

      for (const course of uniqueCourses) {
        const { count: totalLessons } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { count: completedLessons } = await supabase
          .from('user_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .eq('completed', true);

        const total = totalLessons || 0;
        const completed = completedLessons || 0;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (total > 0) {
          progressData.push({
            courseId: course.id,
            courseTitle: course.title,
            completedLessons: completed,
            totalLessons: total,
            completionPercentage: percentage,
          });
        }
      }

      progressData.sort((a, b) => b.completionPercentage - a.completionPercentage);
      setCourseProgress(progressData);

      // Fetch activity data for heatmap
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const { data: activityTxData } = await supabase
        .from('learner_xp_transactions')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', twelveWeeksAgo.toISOString());

      const activityMap = new Map<string, number>();
      (activityTxData || []).forEach((tx) => {
        const date = tx.created_at.split('T')[0];
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      });

      const activities: ActivityData[] = Array.from(activityMap.entries()).map(
        ([date, count]) => ({ date, count })
      );
      setActivityData(activities);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  if (statsLoading || isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="font-display text-display-xl text-neutral-text">Analytics</h1>
        </div>
        <p className="font-body text-body-lg text-neutral-text-muted">
          Track your learning progress and achievements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total XP Card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-accent-yellow to-accent-orange rounded-2xl p-3 shadow-soft">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
                Total XP
              </p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {stats?.total_xp.toLocaleString() || 0}
              </p>
              {weeklyXP > 0 && (
                <p className="font-body text-xs text-accent-green flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{weeklyXP} this week
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Streak Card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-accent-orange to-accent-red rounded-2xl p-3 shadow-soft">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
                Current Streak
              </p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {stats?.current_streak || 0} days
              </p>
              <p className="font-body text-xs text-neutral-text-muted">
                Best: {stats?.longest_streak || 0} days
              </p>
            </div>
          </div>
        </Card>

        {/* Lessons Completed Card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-3 shadow-soft">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
                Lessons Completed
              </p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {stats?.lessons_completed || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Quizzes Completed Card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-secondary to-secondary-dark rounded-2xl p-3 shadow-soft">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
                Quizzes Completed
              </p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {stats?.quizzes_completed || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Heatmap and Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Heatmap */}
        <ActivityHeatmap activities={activityData} weeks={12} />

        {/* Badges Section */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-neutral-text">Badges</h3>
            <span className="font-body text-xs text-neutral-text-muted ml-auto">
              {earnedBadges.length} / {allBadges.length} earned
            </span>
          </div>
          <BadgeDisplay earnedBadges={earnedBadges} allBadges={allBadges} />
        </Card>
      </div>

      {/* Course Progress and XP Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Course Progress */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-lg text-neutral-text">
                Course Progress
              </h3>
            </div>
          </div>

          {courseProgress.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-neutral-text-muted mx-auto mb-3" />
              <p className="font-body text-neutral-text-muted">
                No course progress yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseProgress.slice(0, 5).map((course) => (
                <Link
                  key={course.courseId}
                  to={`/courses/${course.courseId}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-neutral-text group-hover:text-primary transition-colors truncate max-w-[200px]">
                      {course.courseTitle}
                    </span>
                    <span className="font-body text-xs text-neutral-text-muted">
                      {course.completedLessons}/{course.totalLessons} lessons
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-300"
                        style={{ width: `${course.completionPercentage}%` }}
                      />
                    </div>
                    <span className="font-body text-xs font-semibold text-neutral-text w-10 text-right">
                      {course.completionPercentage}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Course XP Breakdown */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-neutral-text">
              XP by Course
            </h3>
          </div>

          {courseXPBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-10 h-10 text-neutral-text-muted mx-auto mb-3" />
              <p className="font-body text-neutral-text-muted">
                No XP earned yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseXPBreakdown.slice(0, 5).map((course) => {
                const maxXP = courseXPBreakdown[0]?.totalXp || 1;
                const percentage = (course.totalXp / maxXP) * 100;

                return (
                  <Link
                    key={course.courseId}
                    to={`/courses/${course.courseId}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-sm text-neutral-text group-hover:text-primary transition-colors truncate max-w-[200px]">
                        {course.courseTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs font-semibold text-neutral-text">
                          {course.totalXp.toLocaleString()} XP
                        </span>
                        {course.weeklyXp > 0 && (
                          <span className="font-body text-xs text-accent-green">
                            +{course.weeklyXp}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-neutral-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-yellow to-accent-orange rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent XP Transactions */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-neutral-text">
            Recent Activity
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-neutral-text-muted mx-auto mb-3" />
            <p className="font-body text-neutral-text-muted">
              No recent activity
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-neutral-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getActivityIcon(tx.activityType)}
                  </div>
                  <div>
                    <p className="font-body text-sm text-neutral-text">
                      {formatActivityType(tx.activityType)}
                    </p>
                    <p className="font-body text-xs text-neutral-text-muted">
                      {tx.courseTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-sm text-accent-green">
                    +{tx.xpAmount} XP
                  </p>
                  <p className="font-body text-xs text-neutral-text-muted">
                    {formatRelativeTime(tx.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
