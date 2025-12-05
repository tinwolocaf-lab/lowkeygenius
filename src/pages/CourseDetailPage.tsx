import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Clock, Users, User, ImageIcon, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEnrollment } from '../hooks/useEnrollment';
import { Button } from '../components/Button';
import { EnrollmentModal } from '../components/EnrollmentModal';
import { CurriculumList } from '../components/CurriculumList';
import type { CourseLevel } from '../types/database';

interface LessonData {
  id: string;
  title: string;
  module_index: number;
  lesson_index: number;
  audio_url: string | null;
}

interface CourseOutlineJson {
  modules: Array<{
    title: string;
    description: string;
    lessons: Array<{ title: string; objectives: string[] }>;
  }>;
}

interface PublicCourseDetail {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: CourseLevel;
  estimated_duration_hours: number | null;
  creator_display_name: string | null;
  published_at: string | null;
  enrollment_count: number;
  owner_id: string;
  thumbnail_url: string | null;
  outline_json: CourseOutlineJson | null;
}

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner: 'bg-accent-green/20 text-accent-green',
  intermediate: 'bg-accent-yellow/20 text-accent-yellow',
  advanced: 'bg-primary/20 text-primary',
  expert: 'bg-accent-red/20 text-accent-red',
};

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEnrollmentStatus } = useEnrollment();
  
  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);

  const isOwner = user?.id === course?.owner_id;

  const checkEnrollmentStatus = useCallback(async () => {
    if (!courseId || !user) {
      setIsEnrolled(false);
      return;
    }
    const status = await getEnrollmentStatus(courseId);
    setIsEnrolled(status.isEnrolled);
  }, [courseId, user, getEnrollmentStatus]);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) {
        setError('Course ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch course data from courses table (only public courses)
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, description, topic, level, estimated_duration_hours, creator_display_name, published_at, owner_id, thumbnail_url, outline_json')
          .eq('id', courseId)
          .eq('is_public', true)
          .single();

        if (courseError) {
          if (courseError.code === 'PGRST116') {
            setError('Course not found');
          } else {
            setError('Failed to load course');
          }
          return;
        }

        // Fetch enrollment count
        const { count: enrollmentCount } = await supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId);

        setCourse({
          ...courseData,
          outline_json: courseData.outline_json as CourseOutlineJson | null,
          enrollment_count: enrollmentCount || 0,
        });

        // Fetch lessons to get audio status
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, title, module_index, lesson_index, audio_url')
          .eq('course_id', courseId)
          .order('module_index', { ascending: true })
          .order('lesson_index', { ascending: true });

        if (lessonsData) {
          setLessons(lessonsData);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    checkEnrollmentStatus();
  }, [checkEnrollmentStatus]);

  const handleEnrollmentComplete = useCallback(() => {
    setEnrollmentModalOpen(false);
    setIsEnrolled(true);
    // Update enrollment count
    if (course) {
      setCourse(prev => prev ? { ...prev, enrollment_count: prev.enrollment_count + 1 } : null);
    }
  }, [course]);

  const handleContinueLearning = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    }
  };

  const handleViewCourse = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    }
  };

  const handleLessonClick = (lessonId: string, moduleIndex: number, lessonIndex: number) => {
    // Check if user can access this lesson
    const isFreePreview = moduleIndex === 0 && lessonIndex === 0;
    const canAccess = isOwner || isEnrolled || isFreePreview;

    if (canAccess && courseId) {
      navigate(`/marketplace/${courseId}/lesson/${lessonId}`);
    }
  };

  // Build modules with lessons data for CurriculumList
  // Uses outline_json for structure, and lesson IDs from database for accessible lessons
  const buildModulesWithLessons = () => {
    if (!course?.outline_json?.modules) {
      return [];
    }

    return course.outline_json.modules.map((module, moduleIndex) => ({
      title: module.title,
      description: module.description,
      lessons: module.lessons.map((outlineLesson, lessonIndex) => {
        // Find the actual lesson data from database (if user has access)
        const lessonData = lessons.find(
          l => l.module_index === moduleIndex && l.lesson_index === lessonIndex
        );

        return {
          // Use actual lesson ID if available, otherwise empty string (user doesn't have access)
          id: lessonData?.id || '',
          title: outlineLesson.title,
          moduleIndex,
          lessonIndex,
          hasAudio: !!lessonData?.audio_url,
        };
      }),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-accent-red" />
        <p className="text-lg text-neutral-text">{error}</p>
        <Link
          to="/marketplace"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const levelColor = LEVEL_COLORS[course.level] || LEVEL_COLORS.beginner;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        to="/marketplace"
        className="flex items-center gap-2 text-neutral-text-secondary hover:text-neutral-text mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      {/* Course Header Section - Requirements 1.1, 1.3, 1.4 */}
      <div className="bg-neutral-card rounded-xl border border-neutral-border overflow-hidden">
        {/* Thumbnail - Requirement 1.3 */}
        <div className="relative h-48 md:h-64 overflow-hidden">
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
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-primary/30" />
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Level and Topic Badges */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-lg font-body font-semibold text-sm capitalize ${levelColor}`}>
              {course.level}
            </span>
            <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-lg font-body text-sm">
              {course.topic}
            </span>
          </div>

          {/* Title - Requirement 1.1 */}
          <h1 className="font-display text-2xl md:text-3xl font-bold text-neutral-text mb-3">
            {course.title}
          </h1>

          {/* Description - Requirement 1.1 */}
          <p className="font-body text-neutral-text-muted mb-6">
            {course.description || 'No description available'}
          </p>

          {/* Course Meta Info - Requirements 1.1, 1.4 */}
          <div className="flex flex-wrap items-center gap-6 mb-6 text-sm text-neutral-text-muted">
            {/* Duration - Requirement 1.1 */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-body">
                {course.estimated_duration_hours 
                  ? `${course.estimated_duration_hours} hour${course.estimated_duration_hours !== 1 ? 's' : ''}`
                  : 'Duration not specified'}
              </span>
            </div>

            {/* Creator - Requirement 1.1 */}
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="font-body">
                {course.creator_display_name || 'Anonymous'}
              </span>
            </div>

            {/* Enrollment Count - Requirement 1.4 */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-body">
                {course.enrollment_count} {course.enrollment_count === 1 ? 'learner' : 'learners'}
              </span>
            </div>

            {/* Module Count */}
            {course.outline_json?.modules && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span className="font-body">
                  {course.outline_json.modules.length} module{course.outline_json.modules.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons - Requirements 3.1, 3.2, 3.3 */}
          <div className="flex flex-wrap gap-3">
            {isOwner ? (
              // Course owner sees "View Course" button - Requirement 3.3
              <Button onClick={handleViewCourse} className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                View Course
              </Button>
            ) : isEnrolled ? (
              // Enrolled user sees "Continue Learning" button - Requirement 3.2
              <Button onClick={handleContinueLearning} className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Continue Learning
              </Button>
            ) : (
              // Non-enrolled user sees "Enroll" button - Requirement 3.1
              <Button onClick={() => setEnrollmentModalOpen(true)} className="flex items-center gap-2">
                Enroll Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum List - Requirement 1.2 */}
      <div className="mt-6 bg-neutral-card rounded-xl border border-neutral-border p-6">
        <h2 className="font-display text-xl font-bold text-neutral-text mb-4">Course Curriculum</h2>
        <CurriculumList
          modules={buildModulesWithLessons()}
          isEnrolled={isEnrolled}
          isOwner={isOwner}
          onLessonClick={handleLessonClick}
        />
      </div>

      {/* Enrollment Modal - Requirements 3.4, 3.5 */}
      {course && (
        <EnrollmentModal
          isOpen={enrollmentModalOpen}
          onClose={() => setEnrollmentModalOpen(false)}
          course={course}
          onEnrollmentComplete={handleEnrollmentComplete}
        />
      )}
    </div>
  );
}
