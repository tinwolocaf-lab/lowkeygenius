import { Clock, Users, User } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import type { CourseLevel } from '../types/database';

interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: CourseLevel;
  estimated_duration_hours: number | null;
  creator_display_name: string | null;
  published_at: string | null;
  enrollment_count: number;
}

interface MarketplaceCourseCardProps {
  course: PublicCourse;
  isEnrolled: boolean;
  isOwner: boolean;
  onEnroll: () => void;
  onContinueLearning: () => void;
}

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner: 'bg-accent-green/20 text-accent-green',
  intermediate: 'bg-accent-yellow/20 text-accent-yellow',
  advanced: 'bg-primary/20 text-primary',
  expert: 'bg-accent-red/20 text-accent-red',
};

export function MarketplaceCourseCard({
  course,
  isEnrolled,
  isOwner,
  onEnroll,
  onContinueLearning,
}: MarketplaceCourseCardProps) {
  const levelColor = LEVEL_COLORS[course.level] || LEVEL_COLORS.beginner;

  return (
    <Card className="flex flex-col h-full">
      {/* Header with level and duration */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 rounded-full font-body font-semibold text-xs capitalize ${levelColor}`}>
          {course.level}
        </span>
        <div className="flex items-center gap-1 text-neutral-text-muted">
          <Clock className="w-4 h-4" />
          <span className="font-body text-sm">
            {course.estimated_duration_hours || '?'}h
          </span>
        </div>
      </div>

      {/* Title and Description (Requirement 2.2) */}
      <h3 className="font-display text-xl font-bold text-neutral-text mb-2 line-clamp-2">
        {course.title}
      </h3>
      <p className="font-body text-sm text-neutral-text-muted mb-4 line-clamp-3 flex-grow">
        {course.description || 'No description available'}
      </p>

      {/* Topic Badge */}
      <div className="mb-4">
        <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-full font-body text-xs">
          {course.topic}
        </span>
      </div>

      {/* Creator and Enrollment Info (Requirement 2.2) */}
      <div className="flex items-center justify-between text-sm text-neutral-text-muted mb-4">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span className="font-body truncate max-w-[120px]">
            {course.creator_display_name || 'Anonymous'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span className="font-body">
            {course.enrollment_count} {course.enrollment_count === 1 ? 'learner' : 'learners'}
          </span>
        </div>
      </div>

      {/* Action Button (Requirement 3.6) */}
      <div className="mt-auto">
        {isOwner || isEnrolled ? (
          <Button
            variant="secondary"
            onClick={onContinueLearning}
            className="w-full"
          >
            {isOwner ? 'View Your Course' : 'Continue Learning'}
          </Button>
        ) : (
          <Button
            onClick={onEnroll}
            className="w-full"
          >
            Enroll
          </Button>
        )}
      </div>
    </Card>
  );
}
