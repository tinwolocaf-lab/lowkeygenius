import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface ActivityData {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
}

interface ActivityHeatmapProps {
  activities: ActivityData[];
  weeks?: number;
  className?: string;
}

/**
 * Get color intensity based on activity count
 */
function getActivityColor(count: number): string {
  if (count === 0) return 'bg-neutral-surface';
  if (count === 1) return 'bg-accent-green/30';
  if (count <= 3) return 'bg-accent-green/50';
  if (count <= 5) return 'bg-accent-green/70';
  return 'bg-accent-green';
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(dateString: string): number {
  return new Date(dateString).getDay();
}

/**
 * Generate array of dates for the heatmap grid
 */
function generateDateGrid(weeks: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // Start from the beginning of the week, `weeks` weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7) + (7 - today.getDay()));
  
  // Generate all dates from start to today
  const currentDate = new Date(startDate);
  while (currentDate <= today) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Group dates by week for grid layout
 */
function groupByWeek(dates: string[]): string[][] {
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  dates.forEach((date, index) => {
    const dayOfWeek = getDayOfWeek(date);
    
    // Start a new week on Sunday
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentWeek.push(date);
    
    // Push the last week
    if (index === dates.length - 1) {
      weeks.push(currentWeek);
    }
  });
  
  return weeks;
}

/**
 * Individual cell in the heatmap
 */
function HeatmapCell({ date, count }: { date: string; count: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          w-3 h-3 rounded-sm
          ${getActivityColor(count)}
          transition-all duration-200
          hover:ring-2 hover:ring-primary/30
        `}
      />
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-bg border border-neutral-border rounded-lg shadow-soft whitespace-nowrap animate-fade-in z-50 text-center"
          role="tooltip"
        >
          <p className="font-body text-xs text-neutral-text">
            {formatDate(date)}
          </p>
          <p className="font-body text-xs text-neutral-text-muted">
            {count === 0 ? 'No activity' : `${count} ${count === 1 ? 'activity' : 'activities'}`}
          </p>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-neutral-border" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-bg" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ActivityHeatmap - Displays a 12-week activity grid showing learning activity patterns.
 * 
 * Requirements: 4.2 - Show a weekly activity heatmap indicating days with learning activity
 */
export function ActivityHeatmap({ activities, weeks = 12, className = '' }: ActivityHeatmapProps) {
  // Create a map of date -> activity count for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((activity) => {
      map.set(activity.date, activity.count);
    });
    return map;
  }, [activities]);

  // Generate the date grid
  const dates = useMemo(() => generateDateGrid(weeks), [weeks]);
  const weekGroups = useMemo(() => groupByWeek(dates), [dates]);

  // Day labels
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate total activities
  const totalActivities = activities.reduce((sum, a) => sum + a.count, 0);
  const activeDays = activities.filter((a) => a.count > 0).length;

  return (
    <div className={`bg-neutral-bg rounded-2xl border border-neutral-border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Activity</h3>
        </div>
        <span className="font-body text-xs text-neutral-text-muted">
          {activeDays} active days • {totalActivities} activities
        </span>
      </div>

      {/* Heatmap grid */}
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

        {/* Week columns */}
        <div className="flex gap-1 overflow-x-auto">
          {weekGroups.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {/* Pad the first week if it doesn't start on Sunday */}
              {weekIndex === 0 && getDayOfWeek(week[0]) > 0 && (
                <>
                  {Array.from({ length: getDayOfWeek(week[0]) }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-3 h-3" />
                  ))}
                </>
              )}
              {week.map((date) => (
                <HeatmapCell
                  key={date}
                  date={date}
                  count={activityMap.get(date) || 0}
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
          <div className="w-3 h-3 rounded-sm bg-neutral-surface" />
          <div className="w-3 h-3 rounded-sm bg-accent-green/30" />
          <div className="w-3 h-3 rounded-sm bg-accent-green/50" />
          <div className="w-3 h-3 rounded-sm bg-accent-green/70" />
          <div className="w-3 h-3 rounded-sm bg-accent-green" />
        </div>
        <span className="font-body text-xs text-neutral-text-muted">More</span>
      </div>
    </div>
  );
}
