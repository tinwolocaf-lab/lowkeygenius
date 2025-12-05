import { Trophy, Users, Crown, Medal, Award } from 'lucide-react';
import type { LeaderboardEntry } from '../types/database';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  participantCount: number;
  hasEnoughParticipants: boolean;
  isLoading?: boolean;
  className?: string;
}

/**
 * Get rank icon based on position
 */
function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-accent-yellow" />;
    case 2:
      return <Medal className="w-5 h-5 text-neutral-text-muted" />;
    case 3:
      return <Award className="w-5 h-5 text-accent-orange" />;
    default:
      return null;
  }
}

/**
 * Get rank background color based on position
 */
function getRankBackground(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-accent-yellow/10 border-accent-yellow/30';
    case 2:
      return 'bg-neutral-surface border-neutral-border';
    case 3:
      return 'bg-accent-orange/10 border-accent-orange/30';
    default:
      return 'bg-neutral-bg border-neutral-border';
  }
}

/**
 * Individual leaderboard entry row
 */
function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) {
  const rankIcon = getRankIcon(entry.rank);
  const bgClass = isCurrentUser ? 'bg-primary/10 border-primary/30' : getRankBackground(entry.rank);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        ${bgClass}
        ${isCurrentUser ? 'ring-2 ring-primary/20' : ''}
      `}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {rankIcon || (
          <span className="font-display font-bold text-lg text-neutral-text-muted">
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-neutral-surface border border-neutral-border overflow-hidden flex-shrink-0">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-light/20">
            <span className="font-display font-bold text-primary text-lg">
              {entry.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-body font-semibold truncate ${isCurrentUser ? 'text-primary' : 'text-neutral-text'}`}>
          {entry.displayName}
          {isCurrentUser && <span className="text-xs text-primary ml-2">(You)</span>}
        </p>
      </div>

      {/* XP */}
      <div className="flex items-center gap-1">
        <span className="font-display font-bold text-lg text-neutral-text">
          {entry.courseXp.toLocaleString()}
        </span>
        <span className="font-body text-xs text-neutral-text-muted">XP</span>
      </div>
    </div>
  );
}

/**
 * LeaderboardPanel - Displays the top 10 learners for a course with their rank, avatar, name, and XP.
 * Shows the current user's rank if they're outside the top 10.
 * 
 * Requirements:
 * - 6.1: Display the top 10 learners ranked by XP earned in that specific course
 * - 6.2: Show each learner's rank, display name, avatar, and course XP
 * - 6.3: Display the learner's own rank and XP below the top 10 list if not in top 10
 * - 6.5: Display a message encouraging more learners to join when fewer than 3 participants
 */
export function LeaderboardPanel({
  entries,
  userRank,
  participantCount,
  hasEnoughParticipants,
  isLoading = false,
  className = '',
}: LeaderboardPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-neutral-bg rounded-2xl border border-neutral-border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-accent-yellow" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Leaderboard</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Not enough participants message (Requirement 6.5)
  if (!hasEnoughParticipants) {
    return (
      <div className={`bg-neutral-bg rounded-2xl border border-neutral-border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-accent-yellow" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Leaderboard</h3>
        </div>
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-neutral-text-muted mx-auto mb-3" />
          <p className="font-body text-neutral-text-muted mb-2">
            Not enough participants yet
          </p>
          <p className="font-body text-sm text-neutral-text-muted">
            The leaderboard will appear when at least 3 learners join this course.
          </p>
          <p className="font-body text-xs text-neutral-text-muted mt-2">
            Current participants: {participantCount}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className={`bg-neutral-bg rounded-2xl border border-neutral-border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-accent-yellow" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Leaderboard</h3>
        </div>
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-neutral-text-muted mx-auto mb-3" />
          <p className="font-body text-neutral-text-muted">
            No rankings yet. Start learning to appear on the leaderboard!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-bg rounded-2xl border border-neutral-border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-accent-yellow" />
          <h3 className="font-display font-bold text-lg text-neutral-text">Leaderboard</h3>
        </div>
        <span className="font-body text-xs text-neutral-text-muted">
          {participantCount} participants
        </span>
      </div>

      {/* Leaderboard entries */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
          />
        ))}
      </div>

      {/* Current user's rank if outside top 10 (Requirement 6.3) */}
      {userRank && (
        <div className="mt-4 pt-4 border-t border-neutral-border">
          <p className="font-body text-xs text-neutral-text-muted mb-2">Your ranking</p>
          <LeaderboardRow entry={userRank} isCurrentUser />
        </div>
      )}
    </div>
  );
}
