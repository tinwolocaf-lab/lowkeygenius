import { useMemo } from 'react';
import { X, Trophy, TrendingUp, TrendingDown, Minus, Calendar, Target } from 'lucide-react';
import type { QuizAttempt } from '../types/database';

interface QuizHistoryProps {
  lessonId: string;
  lessonTitle: string;
  attempts: QuizAttempt[];
  onClose: () => void;
}

/**
 * QuizHistory component displays previous quiz attempts with scores and improvement trends.
 * 
 * Requirements: 6.2, 6.3
 * - 6.2: Display all previous attempts with scores and dates
 * - 6.3: Show improvement trends across attempts
 */
export function QuizHistory({
  lessonTitle,
  attempts,
  onClose,
}: QuizHistoryProps) {
  /**
   * Calculates improvement trends between consecutive attempts.
   * Requirement 6.3: Show improvement trends across attempts.
   */
  const attemptsWithTrends = useMemo(() => {
    // Attempts are ordered by completed_at descending (most recent first)
    // Reverse to calculate trends from oldest to newest
    const chronological = [...attempts].reverse();
    
    return chronological.map((attempt, index) => {
      let trend: 'up' | 'down' | 'same' | null = null;
      let change: number | null = null;
      
      if (index > 0) {
        const previousAttempt = chronological[index - 1];
        const diff = attempt.percentage - previousAttempt.percentage;
        
        if (diff > 0) {
          trend = 'up';
          change = diff;
        } else if (diff < 0) {
          trend = 'down';
          change = Math.abs(diff);
        } else {
          trend = 'same';
          change = 0;
        }
      }
      
      return {
        ...attempt,
        trend,
        change,
        attemptNumber: index + 1,
      };
    }).reverse(); // Reverse back to show most recent first
  }, [attempts]);


  /**
   * Calculates overall statistics from all attempts.
   */
  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        averageScore: 0,
        latestScore: 0,
        overallTrend: 'same' as const,
      };
    }

    const percentages = attempts.map(a => a.percentage);
    const bestScore = Math.max(...percentages);
    const averageScore = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const latestScore = attempts[0].percentage; // Most recent is first
    
    // Calculate overall trend (compare first half average to second half average)
    let overallTrend: 'up' | 'down' | 'same' = 'same';
    if (attempts.length >= 2) {
      const chronological = [...attempts].reverse();
      const firstScore = chronological[0].percentage;
      const lastScore = chronological[chronological.length - 1].percentage;
      
      if (lastScore > firstScore) {
        overallTrend = 'up';
      } else if (lastScore < firstScore) {
        overallTrend = 'down';
      }
    }

    return {
      totalAttempts: attempts.length,
      bestScore: Math.round(bestScore * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      latestScore: Math.round(latestScore * 100) / 100,
      overallTrend,
    };
  }, [attempts]);

  /**
   * Formats a date string for display.
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Formats a time string for display.
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Gets the color class based on score percentage.
   */
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-accent-green';
    if (percentage >= 60) return 'text-accent-yellow';
    return 'text-red-500';
  };

  /**
   * Gets the background color class based on score percentage.
   */
  const getScoreBgColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-accent-green/10';
    if (percentage >= 60) return 'bg-accent-yellow/10';
    return 'bg-red-500/10';
  };

  /**
   * Renders the trend indicator icon.
   */
  const TrendIcon = ({ trend, change }: { trend: 'up' | 'down' | 'same' | null; change: number | null }) => {
    if (trend === null) return null;
    
    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 text-accent-green">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">+{change?.toFixed(0)}%</span>
        </div>
      );
    }
    
    if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs font-medium">-{change?.toFixed(0)}%</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 text-neutral-text-muted">
        <Minus className="w-4 h-4" />
        <span className="text-xs font-medium">0%</span>
      </div>
    );
  };


  // Empty state
  if (attempts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-border">
          <h2 className="font-display text-xl font-bold text-neutral-text">
            Quiz History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-text-muted" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-neutral-text-muted" />
            <h3 className="font-display text-xl font-bold text-neutral-text">
              No Quiz Attempts Yet
            </h3>
            <p className="text-neutral-text-muted max-w-sm">
              Take the quiz to see your history and track your progress over time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-border">
        <div>
          <h2 className="font-display text-xl font-bold text-neutral-text">
            Quiz History
          </h2>
          <p className="text-sm text-neutral-text-muted">{lessonTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-neutral-text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-surface rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display text-2xl font-bold text-neutral-text">
                {stats.totalAttempts}
              </span>
              <p className="text-xs text-neutral-text-muted mt-1">Total Attempts</p>
            </div>
            
            <div className={`rounded-xl p-4 text-center ${getScoreBgColor(stats.bestScore)}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className={`w-5 h-5 ${getScoreColor(stats.bestScore)}`} />
              </div>
              <span className={`font-display text-2xl font-bold ${getScoreColor(stats.bestScore)}`}>
                {stats.bestScore}%
              </span>
              <p className="text-xs text-neutral-text-muted mt-1">Best Score</p>
            </div>
            
            <div className="bg-neutral-surface rounded-xl p-4 text-center">
              <span className="font-display text-2xl font-bold text-neutral-text">
                {stats.averageScore.toFixed(0)}%
              </span>
              <p className="text-xs text-neutral-text-muted mt-1">Average</p>
            </div>
            
            <div className="bg-neutral-surface rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {stats.overallTrend === 'up' && <TrendingUp className="w-5 h-5 text-accent-green" />}
                {stats.overallTrend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
                {stats.overallTrend === 'same' && <Minus className="w-5 h-5 text-neutral-text-muted" />}
              </div>
              <span className={`font-display text-2xl font-bold ${
                stats.overallTrend === 'up' ? 'text-accent-green' : 
                stats.overallTrend === 'down' ? 'text-red-500' : 
                'text-neutral-text'
              }`}>
                {stats.overallTrend === 'up' ? 'Improving' : 
                 stats.overallTrend === 'down' ? 'Declining' : 
                 'Steady'}
              </span>
              <p className="text-xs text-neutral-text-muted mt-1">Trend</p>
            </div>
          </div>


          {/* Attempts List - Requirement 6.2 */}
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold text-neutral-text">
              All Attempts
            </h3>
            
            {attemptsWithTrends.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-neutral-surface rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {/* Attempt Number */}
                  <div className="w-10 h-10 rounded-full bg-neutral-border flex items-center justify-center">
                    <span className="text-sm font-medium text-neutral-text">
                      #{attempt.attemptNumber}
                    </span>
                  </div>
                  
                  {/* Date and Time */}
                  <div>
                    <div className="flex items-center gap-2 text-neutral-text">
                      <Calendar className="w-4 h-4 text-neutral-text-muted" />
                      <span className="font-medium">{formatDate(attempt.completed_at)}</span>
                    </div>
                    <span className="text-sm text-neutral-text-muted">
                      {formatTime(attempt.completed_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Trend Indicator - Requirement 6.3 */}
                  <TrendIcon trend={attempt.trend} change={attempt.change} />
                  
                  {/* Score */}
                  <div className={`px-4 py-2 rounded-lg ${getScoreBgColor(attempt.percentage)}`}>
                    <span className={`font-display text-xl font-bold ${getScoreColor(attempt.percentage)}`}>
                      {Math.round(attempt.percentage)}%
                    </span>
                    <span className="text-sm text-neutral-text-muted ml-2">
                      ({attempt.score}/{attempt.total_questions})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
