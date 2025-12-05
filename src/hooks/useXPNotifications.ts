import { useState } from 'react';
import type { ActivityType } from '../types/database';

/**
 * XP notification item for the queue
 */
export interface XPNotificationItem {
  id: string;
  xpAmount: number;
  activityType: ActivityType;
}

interface UseXPNotificationsReturn {
  notifications: XPNotificationItem[];
  showNotification: (xpAmount: number, activityType: ActivityType) => void;
  dismissNotification: (id: string) => void;
}

/**
 * Hook to manage XP notifications queue
 */
export function useXPNotifications(): UseXPNotificationsReturn {
  const [notifications, setNotifications] = useState<XPNotificationItem[]>([]);

  const showNotification = (xpAmount: number, activityType: ActivityType) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [...prev, { id, xpAmount, activityType }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    showNotification,
    dismissNotification,
  };
}
