import { Calendar } from 'lucide-react';

/**
 * Skeleton for the Activity Heatmap component
 */
export function ActivityHeatmapSkeleton() {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeks = 12;

  return (
    <div className="bg-neutral-bg rounded-2xl border border-neutral-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Activity</h3>
        </div>
        <div className="h-4 w-32 bg-neutral-surface rounded animate-pulse" />
      </div>

      {/* Heatmap grid skeleton */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-2">
          {dayLabels.map((day, index) => (
            <div
              key={day}
              className="h-3 flex items-center"
              style={{ visibility: index % 2 === 1 ? 'visible' : 'hidden' }}
            >
              <span className="font-body text-[10px] text-neutral-text-muted">{day}</span>
            </div>
          ))}
        </div>

        {/* Week columns skeleton */}
        <div className="flex gap-1 overflow-x-auto">
          {Array.from({ length: weeks }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="w-3 h-3 rounded-sm bg-neutral-surface animate-pulse"
                  style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 10}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="font-body text-xs text-neutral-text-muted">Less</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-3 h-3 rounded-sm bg-neutral-surface animate-pulse" />
          ))}
        </div>
        <span className="font-body text-xs text-neutral-text-muted">More</span>
      </div>
    </div>
  );
}
