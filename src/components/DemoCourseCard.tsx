import { BookOpen } from 'lucide-react';

interface DemoCourseCardProps {
  moduleTitle: string;
  lessonCount: number;
  animate?: boolean;
}

export function DemoCourseCard({ moduleTitle, lessonCount, animate = true }: DemoCourseCardProps) {
  return (
    <div className={`bg-neutral-bg border border-neutral-border rounded-xl p-4 shadow-soft hover:shadow-lg transition-all ${animate ? 'animate-slide-up' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm font-bold text-neutral-text mb-1 truncate">
            {moduleTitle}
          </h4>
          <p className="font-body text-xs text-neutral-text-muted">
            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          </p>
        </div>
      </div>
    </div>
  );
}
