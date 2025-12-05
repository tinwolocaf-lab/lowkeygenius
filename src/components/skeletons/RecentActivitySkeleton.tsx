import { Clock } from 'lucide-react';
import { Card } from '../Card';

/**
 * Skeleton for the Recent Activity section
 */
export function RecentActivitySkeleton() {
  // Show 10 activity items (matches the limit of 10 in actual component)
  const itemCount = 10;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-neutral-text">
          Recent Activity
        </h3>
      </div>

      <div className="space-y-3">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-neutral-border last:border-0"
          >
            <div className="flex items-center gap-3">
              {/* Activity icon skeleton */}
              <div 
                className="w-8 h-8 rounded-lg bg-neutral-surface animate-pulse"
                style={{ animationDelay: `${index * 50}ms` }}
              />
              <div>
                {/* Activity type skeleton */}
                <div 
                  className="h-4 bg-neutral-surface rounded animate-pulse mb-1"
                  style={{ 
                    width: `${100 + (index * 10) % 40}px`,
                    animationDelay: `${index * 50 + 25}ms` 
                  }}
                />
                {/* Course title skeleton */}
                <div 
                  className="h-3 bg-neutral-surface rounded animate-pulse"
                  style={{ 
                    width: `${80 + (index * 15) % 60}px`,
                    animationDelay: `${index * 50 + 50}ms` 
                  }}
                />
              </div>
            </div>
            <div className="text-right">
              {/* XP amount skeleton */}
              <div 
                className="h-4 w-12 bg-neutral-surface rounded animate-pulse mb-1 ml-auto"
                style={{ animationDelay: `${index * 50 + 25}ms` }}
              />
              {/* Time skeleton */}
              <div 
                className="h-3 w-10 bg-neutral-surface rounded animate-pulse ml-auto"
                style={{ animationDelay: `${index * 50 + 50}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
