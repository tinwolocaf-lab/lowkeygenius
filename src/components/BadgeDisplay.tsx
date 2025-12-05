import { useState } from 'react';
import { Award, Flame, Zap, BookOpen, Target, Star } from 'lucide-react';
import type { LearnerBadgeWithDetails, BadgeDefinition, BadgeCategory } from '../types/database';

interface BadgeDisplayProps {
  earnedBadges: LearnerBadgeWithDetails[];
  allBadges: BadgeDefinition[];
  className?: string;
}

interface BadgeItemProps {
  badge: {
    id: string;
    code: string;
    name: string;
    description: string;
    iconUrl: string | null;
    category: BadgeCategory;
  };
  isEarned: boolean;
  earnedAt?: string;
}

/**
 * Get the appropriate icon for a badge category
 */
function getBadgeIcon(category: BadgeCategory, className: string) {
  switch (category) {
    case 'streak':
      return <Flame className={className} />;
    case 'xp':
      return <Zap className={className} />;
    case 'course':
      return <BookOpen className={className} />;
    case 'quiz':
      return <Target className={className} />;
    case 'special':
      return <Star className={className} />;
    default:
      return <Award className={className} />;
  }
}

/**
 * Get badge background color based on category
 */
function getBadgeColor(category: BadgeCategory, isEarned: boolean): string {
  if (!isEarned) return 'bg-neutral-surface border-neutral-border';
  
  switch (category) {
    case 'streak':
      return 'bg-accent-orange/20 border-accent-orange';
    case 'xp':
      return 'bg-accent-yellow/20 border-accent-yellow';
    case 'course':
      return 'bg-accent-green/20 border-accent-green';
    case 'quiz':
      return 'bg-primary/20 border-primary';
    case 'special':
      return 'bg-secondary/20 border-secondary';
    default:
      return 'bg-primary-light/20 border-primary-light';
  }
}

/**
 * Get icon color based on category and earned status
 */
function getIconColor(category: BadgeCategory, isEarned: boolean): string {
  if (!isEarned) return 'text-neutral-text-muted';
  
  switch (category) {
    case 'streak':
      return 'text-accent-orange';
    case 'xp':
      return 'text-accent-yellow';
    case 'course':
      return 'text-accent-green';
    case 'quiz':
      return 'text-primary';
    case 'special':
      return 'text-secondary';
    default:
      return 'text-primary';
  }
}

/**
 * Individual badge item with tooltip
 */
function BadgeItem({ badge, isEarned, earnedAt }: BadgeItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          w-14 h-14 rounded-xl border-2 flex items-center justify-center
          transition-all duration-200
          ${getBadgeColor(badge.category, isEarned)}
          ${isEarned ? 'shadow-soft hover:scale-110' : 'opacity-40 grayscale'}
        `}
      >
        {getBadgeIcon(badge.category, `w-7 h-7 ${getIconColor(badge.category, isEarned)}`)}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-bg border border-neutral-border rounded-lg shadow-soft whitespace-nowrap animate-fade-in z-50 min-w-[160px]"
          role="tooltip"
        >
          <p className="font-display font-bold text-sm text-neutral-text text-center">
            {badge.name}
          </p>
          <p className="font-body text-xs text-neutral-text-muted text-center mt-1">
            {badge.description}
          </p>
          {isEarned && earnedAt && (
            <p className="font-body text-xs text-accent-green text-center mt-2">
              Earned {formatDate(earnedAt)}
            </p>
          )}
          {!isEarned && (
            <p className="font-body text-xs text-neutral-text-muted text-center mt-2 italic">
              Not yet earned
            </p>
          )}
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

/**
 * BadgeDisplay - Displays a grid of badges with earned badges in full color
 * and unearned badges as grayed silhouettes.
 * 
 * Requirements:
 * - 3.3: Show earned badges with full color and unearned badges as grayed-out silhouettes
 * - 3.5: Display all earned badges in chronological order of acquisition
 */
export function BadgeDisplay({ earnedBadges, allBadges, className = '' }: BadgeDisplayProps) {
  // Create a map of earned badge IDs for quick lookup
  const earnedBadgeMap = new Map(
    earnedBadges.map((eb) => [eb.badgeId, eb])
  );

  // Sort badges: earned badges first (chronologically), then unearned badges by sort_order
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aEarned = earnedBadgeMap.get(a.id);
    const bEarned = earnedBadgeMap.get(b.id);

    // Both earned: sort by earned_at chronologically
    if (aEarned && bEarned) {
      return new Date(aEarned.earnedAt).getTime() - new Date(bEarned.earnedAt).getTime();
    }

    // Only one earned: earned comes first
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;

    // Neither earned: sort by sort_order
    return a.sort_order - b.sort_order;
  });

  if (allBadges.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Award className="w-12 h-12 text-neutral-text-muted mx-auto mb-3" />
        <p className="font-body text-neutral-text-muted">No badges available yet</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {sortedBadges.map((badge) => {
        const earnedBadge = earnedBadgeMap.get(badge.id);
        return (
          <BadgeItem
            key={badge.id}
            badge={{
              id: badge.id,
              code: badge.code,
              name: badge.name,
              description: badge.description,
              iconUrl: badge.icon_url,
              category: badge.category,
            }}
            isEarned={!!earnedBadge}
            earnedAt={earnedBadge?.earnedAt}
          />
        );
      })}
    </div>
  );
}
