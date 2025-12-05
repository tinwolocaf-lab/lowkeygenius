import { useState } from 'react';
import { Flame } from 'lucide-react';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

/**
 * StreakWidget - Displays the user's current learning streak with a fire icon.
 * Shows a tooltip with the longest streak on hover.
 * 
 * Requirements: 2.5 - Display both current streak and longest streak values
 */
export function StreakWidget({ currentStreak, longestStreak, className = '' }: StreakWidgetProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine flame color based on streak length
  const getFlameColor = () => {
    if (currentStreak === 0) return 'text-neutral-text-muted';
    if (currentStreak >= 30) return 'text-accent-orange';
    if (currentStreak >= 7) return 'text-accent-yellow';
    return 'text-accent-red';
  };

  // Determine background color based on streak
  const getBackgroundColor = () => {
    if (currentStreak === 0) return 'bg-neutral-surface';
    if (currentStreak >= 30) return 'bg-accent-orange/10';
    if (currentStreak >= 7) return 'bg-accent-yellow/10';
    return 'bg-accent-red/10';
  };

  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-xl ${getBackgroundColor()} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Flame className={`w-5 h-5 ${getFlameColor()} ${currentStreak > 0 ? 'animate-pulse' : ''}`} />
      <span className={`font-display font-bold text-lg ${currentStreak === 0 ? 'text-neutral-text-muted' : 'text-neutral-text'}`}>
        {currentStreak}
      </span>

      {/* Tooltip showing longest streak */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-bg border border-neutral-border rounded-lg shadow-soft whitespace-nowrap animate-fade-in z-50"
          role="tooltip"
        >
          <div className="text-center">
            <p className="font-body text-xs text-neutral-text-muted">
              {currentStreak === 0 ? 'No active streak' : `${currentStreak} day streak!`}
            </p>
            <p className="font-body text-xs text-neutral-text-muted mt-1">
              Best: <span className="font-semibold text-neutral-text">{longestStreak} days</span>
            </p>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-neutral-border" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-neutral-bg" />
          </div>
        </div>
      )}
    </div>
  );
}
