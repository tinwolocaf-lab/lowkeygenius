import { useEffect, useState, useCallback } from 'react';
import { Zap, BookOpen, Target, Layers } from 'lucide-react';
import type { ActivityType } from '../types/database';

interface XPNotificationProps {
  xpAmount: number;
  activityType: ActivityType;
  onDismiss: () => void;
  autoHideDuration?: number;
}

/**
 * Get the appropriate icon for an activity type
 */
function getActivityIcon(activityType: ActivityType, className: string) {
  switch (activityType) {
    case 'lesson_complete':
      return <BookOpen className={className} />;
    case 'quiz_complete':
      return <Target className={className} />;
    case 'flashcard_session':
      return <Layers className={className} />;
    default:
      return <Zap className={className} />;
  }
}

/**
 * Get human-readable activity label
 */
function getActivityLabel(activityType: ActivityType): string {
  switch (activityType) {
    case 'lesson_complete':
      return 'Lesson Complete';
    case 'quiz_complete':
      return 'Quiz Complete';
    case 'flashcard_session':
      return 'Flashcard Session';
    default:
      return 'Activity';
  }
}

/**
 * XPNotification - Toast notification for XP awards with animated entrance and exit.
 * 
 * Requirements: 3.2 - Display a celebratory notification when XP is awarded
 */
export function XPNotification({
  xpAmount,
  activityType,
  onDismiss,
  autoHideDuration = 3000,
}: XPNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  // Animate entrance
  useEffect(() => {
    // Small delay to trigger entrance animation
    const enterTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(enterTimeout);
  }, []);

  // Auto-hide after duration
  useEffect(() => {
    const hideTimeout = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => clearTimeout(hideTimeout);
  }, [autoHideDuration, handleDismiss]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className="
          flex items-center gap-3 px-4 py-3
          bg-neutral-bg border-2 border-accent-yellow
          rounded-xl shadow-tile
          cursor-pointer hover:scale-105 transition-transform
        "
        onClick={handleDismiss}
      >
        {/* XP Icon with glow effect */}
        <div className="relative">
          <div className="w-10 h-10 bg-accent-yellow/20 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-yellow" />
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 bg-accent-yellow/30 rounded-full animate-ping" />
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-accent-yellow">
              +{xpAmount} XP
            </span>
            {getActivityIcon(activityType, 'w-4 h-4 text-neutral-text-muted')}
          </div>
          <span className="font-body text-xs text-neutral-text-muted">
            {getActivityLabel(activityType)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Container component to render multiple XP notifications
 */
interface XPNotificationItem {
  id: string;
  xpAmount: number;
  activityType: ActivityType;
}

interface XPNotificationContainerProps {
  notifications: XPNotificationItem[];
  onDismiss: (id: string) => void;
}

export function XPNotificationContainer({ notifications, onDismiss }: XPNotificationContainerProps) {
  return (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            position: 'fixed',
            bottom: `${24 + index * 80}px`,
            right: '24px',
            zIndex: 50 + index,
          }}
        >
          <XPNotification
            xpAmount={notification.xpAmount}
            activityType={notification.activityType}
            onDismiss={() => onDismiss(notification.id)}
          />
        </div>
      ))}
    </>
  );
}
