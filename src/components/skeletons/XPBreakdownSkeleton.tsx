import { BarChart3 } from 'lucide-react';
import { Card } from '../Card';

/**
 * Skeleton for the XP by Course breakdown section
 */
export function XPBreakdownSkeleton() {
  // Show 5 XP breakdown items (matches slice(0, 5) in actual component)
  const itemCount = 5;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-neutral-text">
          XP by Course
        </h3>
      </div>

      <div className="space-y-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="block">
            <div className="flex items-center justify-between mb-1">
              {/* Course title skeleton */}
              <div 
                className="h-4 bg-neutral-surface rounded animate-pulse"
                style={{ 
                  width: `${100 + (index * 25) % 100}px`,
                  animationDelay: `${index * 100}ms` 
                }}
              />
              <div className="flex items-center gap-2">
                {/* XP amount skeleton */}
                <div 
                  className="h-3 w-14 bg-neutral-surface rounded animate-pulse"
                  style={{ animationDelay: `${index * 100 + 50}ms` }}
                />
                {/* Weekly XP skeleton */}
                <div 
                  className="h-3 w-8 bg-neutral-surface rounded animate-pulse"
                  style={{ animationDelay: `${index * 100 + 75}ms` }}
                />
              </div>
            </div>
            {/* Progress bar skeleton */}
            <div className="h-2 bg-neutral-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-border rounded-full animate-pulse"
                style={{ 
                  width: `${100 - (index * 15)}%`,
                  animationDelay: `${index * 100}ms`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
