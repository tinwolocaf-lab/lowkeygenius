import { BarChart3 } from 'lucide-react';
import { StatsCardsSkeleton } from './StatsCardsSkeleton';
import { ActivityHeatmapSkeleton } from './ActivityHeatmapSkeleton';
import { BadgesSkeleton } from './BadgesSkeleton';
import { CourseProgressSkeleton } from './CourseProgressSkeleton';
import { XPBreakdownSkeleton } from './XPBreakdownSkeleton';
import { RecentActivitySkeleton } from './RecentActivitySkeleton';

/**
 * Full page skeleton for the Analytics page.
 * Shows all component skeletons in the same layout as the actual page.
 */
export function AnalyticsSkeleton() {
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
      <StatsCardsSkeleton />

      {/* Activity Heatmap and Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ActivityHeatmapSkeleton />
        <BadgesSkeleton />
      </div>

      {/* Course Progress and XP Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CourseProgressSkeleton />
        <XPBreakdownSkeleton />
      </div>

      {/* Recent Activity */}
      <RecentActivitySkeleton />
    </div>
  );
}
