import { Zap, Flame, BookOpen, Award } from 'lucide-react';
import { Card } from '../Card';

/**
 * Skeleton for the 4 stats cards (Total XP, Streak, Lessons, Quizzes)
 */
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total XP Card Skeleton */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-accent-yellow to-accent-orange rounded-2xl p-3 shadow-soft">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
              Total XP
            </p>
            <div className="h-8 w-24 bg-neutral-surface rounded-lg animate-pulse mt-1" />
            <div className="h-4 w-20 bg-neutral-surface rounded animate-pulse mt-1" />
          </div>
        </div>
      </Card>

      {/* Streak Card Skeleton */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-accent-orange to-accent-red rounded-2xl p-3 shadow-soft">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
              Current Streak
            </p>
            <div className="h-8 w-20 bg-neutral-surface rounded-lg animate-pulse mt-1" />
            <div className="h-4 w-16 bg-neutral-surface rounded animate-pulse mt-1" />
          </div>
        </div>
      </Card>

      {/* Lessons Completed Card Skeleton */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-3 shadow-soft">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
              Lessons Completed
            </p>
            <div className="h-8 w-16 bg-neutral-surface rounded-lg animate-pulse mt-1" />
          </div>
        </div>
      </Card>

      {/* Quizzes Completed Card Skeleton */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-secondary to-secondary-dark rounded-2xl p-3 shadow-soft">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase">
              Quizzes Completed
            </p>
            <div className="h-8 w-16 bg-neutral-surface rounded-lg animate-pulse mt-1" />
          </div>
        </div>
      </Card>
    </div>
  );
}
