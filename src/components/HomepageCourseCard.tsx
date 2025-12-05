import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PublicCoursePreview } from '../types/database';

interface HomepageCourseCardProps {
  course: PublicCoursePreview;
  className?: string;
}

/**
 * A simplified course card for the homepage hero-to-grid animation.
 * Displays course thumbnail, title, and description with hover interactivity.
 * Clicking navigates to login with a toast notification.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 4.1, 4.2, 4.3
 */
export function HomepageCourseCard({ course, className = '' }: HomepageCourseCardProps) {
  const navigate = useNavigate();
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleClick = () => {
    // Requirement 4.2: Display toast notification explaining sign-in requirement
    toast('Sign in to explore this course and start learning!', {
      icon: '🔐',
      duration: 4000,
    });
    // Requirement 4.1: Navigate to authentication page
    navigate('/login');
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-neutral-bg rounded-2xl overflow-hidden shadow-soft border border-neutral-border
        cursor-pointer transition-all duration-200
        hover:shadow-tile hover:scale-[1.02]
        ${className}
      `}
    >
      {/* Requirement 7.1: Course thumbnail displayed prominently */}
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail_url && !thumbnailError ? (
          <>
            {thumbnailLoading && (
              <div className="absolute inset-0 bg-neutral-surface animate-pulse" />
            )}
            <img
              src={course.thumbnail_url}
              alt={`${course.title} thumbnail`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                thumbnailLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setThumbnailLoading(false)}
              onError={() => {
                setThumbnailLoading(false);
                setThumbnailError(true);
              }}
            />
          </>
        ) : (
          /* Requirement 7.4: Gradient placeholder with icon when no thumbnail */
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-primary/30" />
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4">
        {/* Requirement 7.2: Course title with text truncation */}
        <h3 className="font-display text-lg font-bold text-neutral-text mb-2 line-clamp-2">
          {course.title}
        </h3>
        
        {/* Requirement 7.3: Course description with line clamping */}
        <p className="font-body text-sm text-neutral-text-muted line-clamp-2">
          {course.description || 'Discover something new with this course'}
        </p>
      </div>
    </div>
  );
}
