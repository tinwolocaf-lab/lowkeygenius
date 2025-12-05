import { BookOpen } from 'lucide-react';
import { Card } from '../Card';

/**
 * Skeleton for the Course Progress section
 */
export function CourseProgressSkeleton() {
  // Show 5 course progress items (matches slice(0, 5) in actual component)
  const itemCount = 5;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-neutral-text">
            Course Progress
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="block">
            <div className="flex items-center justify-between mb-1">
              {/* Course title skeleton */}
              <div 
                className="h-4 bg-neutral-surface rounded animate-pulse"
                style={{ 
                  width: `${120 + (index * 20) % 80}px`,
                  animationDelay: `${index * 100}ms` 
                }}
              />
              {/* Lessons count skeleton */}
              <div 
                className="h-3 w-16 bg-neutral-surface rounded animate-pulse"
                style={{ animationDelay: `${index * 100 + 50}ms` }}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Progress bar skeleton */}
              <div className="flex-1 h-2 bg-neutral-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-border rounded-full animate-pulse"
                  style={{ 
                    width: `${30 + (index * 15) % 60}%`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
              </div>
              {/* Percentage skeleton */}
              <div 
                className="h-3 w-8 bg-neutral-surface rounded animate-pulse"
                style={{ animationDelay: `${index * 100 + 50}ms` }}
              />
              {/* Chevron placeholder */}
              <div className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
