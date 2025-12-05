import { Award } from 'lucide-react';
import { Card } from '../Card';

/**
 * Skeleton for the Badges section
 */
export function BadgesSkeleton() {
  // Show 8 badge placeholders (typical number of badges)
  const badgeCount = 8;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-neutral-text">Badges</h3>
        <div className="h-4 w-20 bg-neutral-surface rounded animate-pulse ml-auto" />
      </div>

      {/* Badge grid skeleton */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: badgeCount }).map((_, index) => (
          <div
            key={index}
            className="w-14 h-14 rounded-xl border-2 border-neutral-border bg-neutral-surface animate-pulse"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </Card>
  );
}
