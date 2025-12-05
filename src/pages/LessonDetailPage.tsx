import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  Headphones,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEnrollment } from '../hooks/useEnrollment';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { CourseAudioPlayer } from '../components/CourseAudioPlayer';
import { Button } from '../components/Button';

interface LessonDetail {
  id: string;
  title: string;
  objectives: string[] | null;
  markdown_content: string | null;
  module_index: number;
  lesson_index: number;
  audio_url: string | null;
  course_id: string;
}

interface CourseInfo {
  id: string;
  title: string;
  owner_id: string;
  is_public: boolean;
  topic: string;
  level: string;
}

interface AllLessonsData {
  id: string;
  title: string;
  module_index: number;
  lesson_index: number;
  audio_url: string | null;
}

export function LessonDetailPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEnrollmentStatus } = useEnrollment();
  
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [allLessons, setAllLessons] = useState<AllLessonsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  const isOwner = user?.id === course?.owner_id;
  const isFreePreview = lesson?.module_index === 0 && lesson?.lesson_index === 0;
  const canAccess = isOwner || isEnrolled || isFreePreview;

  // Find current lesson index in the all lessons array
  const currentLessonIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // Check if user can access a specific lesson
  const canAccessLesson = useCallback((moduleIndex: number, lessonIndex: number): boolean => {
    if (isOwner || isEnrolled) return true;
    return moduleIndex === 0 && lessonIndex === 0;
  }, [isOwner, isEnrolled]);


  // Check enrollment status
  const checkEnrollmentStatus = useCallback(async () => {
    if (!courseId || !user) {
      setIsEnrolled(false);
      return;
    }
    const status = await getEnrollmentStatus(courseId);
    setIsEnrolled(status.isEnrolled);
  }, [courseId, user, getEnrollmentStatus]);

  // Check lesson completion status
  const checkCompletionStatus = useCallback(async () => {
    if (!lessonId || !user || !courseId) return;

    const { data } = await supabase
      .from('user_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle();

    setIsComplete(data?.completed ?? false);
  }, [lessonId, user, courseId]);

  useEffect(() => {
    async function fetchData() {
      if (!courseId || !lessonId) {
        setError('Course ID and Lesson ID are required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setAccessDenied(false);

        // Fetch course info first
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, owner_id, is_public, topic, level')
          .eq('id', courseId)
          .single();

        if (courseError || !courseData) {
          setError('Course not found');
          setLoading(false);
          return;
        }

        setCourse(courseData);

        // Fetch all lessons for navigation
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, title, module_index, lesson_index, audio_url')
          .eq('course_id', courseId)
          .order('module_index', { ascending: true })
          .order('lesson_index', { ascending: true });

        if (lessonsData) {
          setAllLessons(lessonsData);
        }

        // Fetch the specific lesson
        const { data: lessonData, error: fetchError } = await supabase
          .from('lessons')
          .select('id, title, objectives, markdown_content, module_index, lesson_index, audio_url, course_id')
          .eq('id', lessonId)
          .eq('course_id', courseId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Lesson not found');
          } else {
            setError('Failed to load lesson');
          }
          return;
        }

        setLesson(lessonData as LessonDetail);
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching lesson:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, lessonId]);

  // Check enrollment after course is loaded
  useEffect(() => {
    if (course) {
      checkEnrollmentStatus();
    }
  }, [course, checkEnrollmentStatus]);

  // Check completion status after lesson is loaded
  useEffect(() => {
    if (lesson && user) {
      checkCompletionStatus();
    }
  }, [lesson, user, checkCompletionStatus]);

  // Check access control after enrollment status is determined
  useEffect(() => {
    if (!loading && lesson && course) {
      const isFreePreviewLesson = lesson.module_index === 0 && lesson.lesson_index === 0;
      const hasAccess = user?.id === course.owner_id || isEnrolled || isFreePreviewLesson;
      
      if (!hasAccess) {
        setAccessDenied(true);
      }
    }
  }, [loading, lesson, course, user, isEnrolled]);


  // Mark lesson as complete - Requirements: 6.4
  const handleMarkComplete = async () => {
    if (!lesson || !user || !courseId || markingComplete) return;

    setMarkingComplete(true);
    try {
      const { error } = await supabase.from('user_progress').upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        course_id: courseId,
        completed: true,
        last_viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id',
      });

      if (!error) {
        setIsComplete(true);
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    } finally {
      setMarkingComplete(false);
    }
  };

  // Navigate to previous lesson - Requirements: 6.3
  const handlePrevLesson = () => {
    if (prevLesson && canAccessLesson(prevLesson.module_index, prevLesson.lesson_index)) {
      navigate(`/marketplace/${courseId}/lesson/${prevLesson.id}`);
    }
  };

  // Navigate to next lesson - Requirements: 6.3
  const handleNextLesson = () => {
    if (nextLesson && canAccessLesson(nextLesson.module_index, nextLesson.lesson_index)) {
      navigate(`/marketplace/${courseId}/lesson/${nextLesson.id}`);
    }
  };

  // Handle audio player lesson change
  const handleAudioLessonChange = (index: number) => {
    const targetLesson = allLessons[index];
    if (targetLesson && canAccessLesson(targetLesson.module_index, targetLesson.lesson_index)) {
      navigate(`/marketplace/${courseId}/lesson/${targetLesson.id}`);
    }
  };

  // Check if prev/next lessons are accessible
  const canGoPrev = prevLesson && canAccessLesson(prevLesson.module_index, prevLesson.lesson_index);
  const canGoNext = nextLesson && canAccessLesson(nextLesson.module_index, nextLesson.lesson_index);

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
          to={`/marketplace/${courseId}`}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Link>
      </div>
    );
  }

  // Access denied - redirect to course detail page - Requirements: 2.2, 2.3, 2.4
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Lock className="w-12 h-12 text-neutral-text-muted" />
        <h2 className="text-xl font-display font-bold text-neutral-text">Access Restricted</h2>
        <p className="text-neutral-text-muted text-center max-w-md">
          You need to enroll in this course to access this lesson.
        </p>
        <Link
          to={`/marketplace/${courseId}`}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Link>
      </div>
    );
  }

  if (!lesson || !course) {
    return null;
  }


  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back to Course Navigation - Requirements: 5.1, 5.2 */}
      <Link
        to={`/marketplace/${courseId}`}
        className="flex items-center gap-2 text-neutral-text-secondary hover:text-neutral-text mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Course
      </Link>

      <div className="bg-neutral-card rounded-xl border border-neutral-border p-6">
        {/* Lesson Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full font-body font-semibold text-sm bg-primary-light text-primary">
              Module {lesson.module_index + 1}
            </span>
            <span className="px-3 py-1 rounded-full font-body text-sm bg-neutral-surface text-neutral-text">
              Lesson {lesson.lesson_index + 1}
            </span>
            {isFreePreview && !isOwner && !isEnrolled && (
              <span className="px-3 py-1 rounded-full font-body font-semibold text-sm bg-accent-green/20 text-accent-green">
                Free Preview
              </span>
            )}
          </div>
          
          {/* Lesson Title - Requirements: 6.1 */}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-text mb-4">
            {lesson.title}
          </h1>

          {/* Audio Player Button - Requirements: 6.2 */}
          {lesson.audio_url && !showAudioPlayer && (
            <button
              onClick={() => setShowAudioPlayer(true)}
              className="flex items-center gap-3 px-4 py-3 bg-primary-light/20 hover:bg-primary-light/30 border-2 border-primary rounded-xl transition-colors mb-4"
            >
              <Headphones className="w-5 h-5 text-primary" />
              <span className="font-body font-semibold text-primary">Listen to Audio Version</span>
            </button>
          )}

          {/* Objectives - Requirements: 6.1 */}
          {lesson.objectives && lesson.objectives.length > 0 && (
            <div className="bg-primary-light/10 border-l-4 border-primary rounded-lg p-4 mb-6">
              <h3 className="font-display font-bold text-neutral-text mb-2">Learning Objectives</h3>
              <ul className="space-y-2">
                {lesson.objectives.map((objective, idx) => (
                  <li key={idx} className="font-body text-neutral-text flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Lesson Content - Requirements: 6.1 */}
        {lesson.markdown_content ? (
          <MarkdownRenderer
            content={lesson.markdown_content}
            courseId={courseId}
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            courseTitle={course.title}
            courseTopic={course.topic}
            courseLevel={course.level}
            isOwner={isOwner}
            enableSelection={true}
          />
        ) : (
          <div className="text-center py-12 bg-neutral-surface rounded-lg">
            <p className="font-body text-neutral-text-muted">
              Content not available for this lesson yet.
            </p>
          </div>
        )}

        {/* Lesson Navigation - Requirements: 5.1, 5.2, 6.3, 6.4 */}
        <div className="mt-8 pt-6 border-t border-neutral-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Previous Lesson */}
            <Button
              variant="secondary"
              onClick={handlePrevLesson}
              disabled={!canGoPrev}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </Button>

            {/* Mark Complete Button - Requirements: 6.4 */}
            {canAccess && !isComplete && (
              <Button
                variant="secondary"
                onClick={handleMarkComplete}
                disabled={markingComplete}
                className="flex items-center gap-2"
              >
                {markingComplete ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Mark Complete
              </Button>
            )}

            {isComplete && (
              <span className="flex items-center gap-2 text-accent-green font-body font-semibold">
                <CheckCircle className="w-5 h-5" />
                Completed
              </span>
            )}

            {/* Next Lesson */}
            <Button
              onClick={handleNextLesson}
              disabled={!canGoNext}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Show message if next lesson requires enrollment */}
          {nextLesson && !canGoNext && !isEnrolled && !isOwner && (
            <p className="text-center text-sm text-neutral-text-muted mt-4">
              Enroll in this course to access more lessons
            </p>
          )}
        </div>
      </div>

      {/* Audio Player - Requirements: 6.2 */}
      {showAudioPlayer && allLessons.some(l => l.audio_url) && (
        <CourseAudioPlayer
          lessons={allLessons}
          currentLessonIndex={currentLessonIndex}
          onLessonChange={handleAudioLessonChange}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}

      {/* Spacer for fixed audio player */}
      {showAudioPlayer && <div className="h-28" />}
    </div>
  );
}
