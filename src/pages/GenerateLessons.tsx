import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Pause, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateLesson } from '../lib/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingAnimation } from '../components/LoadingAnimation';

import { useNavigationBlock } from '../hooks/useNavigationBlock';
import { useAuth } from '../contexts/AuthContext';
import type { LessonGenerationJobStatus } from '../types/database';

interface LocationState {
  autoStart?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  objectives: string[] | null;
  module_index: number;
  lesson_index: number;
  markdown_content: string | null;
  lesson_status: string;
}

interface CourseModule {
  title: string;
  description: string;
  lessons: { title: string; objectives: string[] }[];
}

interface CourseOutlineJson {
  modules: CourseModule[];
  estimatedDurationHours?: number;
  estimatedLessonsCount?: number;
}

interface CourseMaterial {
  title: string;
  content: string;
}

interface Course {
  id: string;
  title: string;
  topic: string;
  level: string;
  outline_json: CourseOutlineJson | null;
  materials_json: CourseMaterial[] | null;
}

interface GenerationJob {
  id: string;
  status: LessonGenerationJobStatus;
  total_lessons: number;
  completed_lessons: number;
  current_lesson_index: number;
  error_message: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
}

export function GenerateLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  
  const autoStartHandled = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausingRef = useRef(false);

  // Pause and save progress before navigation
  const pauseAndSaveProgress = useCallback(async () => {
    if (generating && abortControllerRef.current) {
      isPausingRef.current = true;
      abortControllerRef.current.abort();
      
      // Update job status to paused
      if (job?.id) {
        await supabase
          .from('lesson_generation_jobs')
          .update({
            status: 'paused',
            paused_at: new Date().toISOString(),
            current_lesson_index: currentLessonIndex,
          })
          .eq('id', job.id);
      }
    }
  }, [generating, job?.id, currentLessonIndex]);

  // Navigation blocking - handles browser beforeunload
  useNavigationBlock({
    when: generating && !paused,
    message: 'Lesson generation is in progress. Are you sure you want to leave?',
    onBlock: pauseAndSaveProgress,
  });

  const loadCourseAndLessons = useCallback(async () => {
    if (!courseId) return;

    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (courseError || !courseData) {
        console.error('Error loading course:', courseError);
        navigate('/courses');
        return;
      }

      setCourse(courseData as Course);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('module_index', { ascending: true })
        .order('lesson_index', { ascending: true });

      if (lessonsError) {
        console.error('Error loading lessons:', lessonsError);
        return;
      }

      setLessons(lessonsData || []);

      // Check for existing generation job
      const { data: existingJob } = await supabase
        .from('lesson_generation_jobs')
        .select('*')
        .eq('course_id', courseId)
        .in('status', ['pending', 'in_progress', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        setJob(existingJob);
        setCurrentLessonIndex(existingJob.current_lesson_index);
        
        if (existingJob.status === 'paused') {
          setPaused(true);
        } else if (existingJob.status === 'in_progress') {
          // Job was interrupted (e.g., browser crash) - mark as paused
          await supabase
            .from('lesson_generation_jobs')
            .update({ status: 'paused', paused_at: new Date().toISOString() })
            .eq('id', existingJob.id);
          setPaused(true);
        }
      }

      // Check if all lessons are already generated
      const allGenerated = lessonsData?.every(l => l.lesson_status === 'generated');
      if (allGenerated && lessonsData && lessonsData.length > 0) {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      navigate('/courses');
    }
  }, [courseId, navigate]);

  useEffect(() => {
    loadCourseAndLessons();
  }, [loadCourseAndLessons]);


  // Extract relevant material sections for a specific lesson
  const getRelevantMaterials = useCallback((
    lessonTitle: string,
    objectives: string[],
    moduleTitle: string,
    allMaterials: CourseMaterial[] | null,
    lessonIndex: number,
    totalLessons: number
  ): Array<{ title: string; content: string }> => {
    if (!allMaterials || allMaterials.length === 0) return [];

    const relevantMaterials: Array<{ title: string; content: string }> = [];
    const searchTerms = [
      lessonTitle.toLowerCase(),
      moduleTitle.toLowerCase(),
      ...objectives.map(o => o.toLowerCase()),
    ];

    for (const material of allMaterials) {
      if (!material.content) continue;

      const contentLower = material.content.toLowerCase();
      const contentLength = material.content.length;
      
      const portionSize = Math.ceil(contentLength / totalLessons);
      const startIndex = lessonIndex * portionSize;
      const endIndex = Math.min(startIndex + portionSize + 2000, contentLength);
      
      let lessonPortion = material.content.substring(startIndex, endIndex);
      
      const hasRelevantContent = searchTerms.some(term => 
        contentLower.includes(term.split(' ')[0])
      );
      
      if (hasRelevantContent) {
        const paragraphs = material.content.split(/\n\n+/);
        const relevantParagraphs = paragraphs.filter(p => 
          searchTerms.some(term => p.toLowerCase().includes(term.split(' ')[0]))
        );
        
        if (relevantParagraphs.length > 0) {
          lessonPortion = relevantParagraphs.join('\n\n').substring(0, 8000);
        }
      }
      
      if (lessonPortion.length > 0) {
        relevantMaterials.push({
          title: material.title,
          content: lessonPortion.substring(0, 8000),
        });
      }
    }

    return relevantMaterials;
  }, []);

  // Create or get generation job
  const getOrCreateJob = useCallback(async (): Promise<GenerationJob | null> => {
    if (!courseId || !user) return null;

    // Check for existing active job
    if (job && ['pending', 'in_progress', 'paused'].includes(job.status)) {
      return job;
    }

    // Create new job
    const { data: newJob, error: createError } = await supabase
      .from('lesson_generation_jobs')
      .insert({
        course_id: courseId,
        user_id: user.id,
        status: 'pending',
        total_lessons: lessons.length,
        completed_lessons: 0,
        current_lesson_index: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating job:', createError);
      return null;
    }

    setJob(newJob);
    return newJob;
  }, [courseId, user, job, lessons.length]);

  // Update job progress in database
  const updateJobProgress = useCallback(async (
    jobId: string,
    updates: Partial<GenerationJob>
  ) => {
    const { error } = await supabase
      .from('lesson_generation_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job:', error);
    }
  }, []);

  // Pause generation
  const pauseGeneration = useCallback(async () => {
    if (!generating || !abortControllerRef.current) return;
    
    isPausingRef.current = true;
    abortControllerRef.current.abort();
    
    if (job?.id) {
      await updateJobProgress(job.id, {
        status: 'paused',
        paused_at: new Date().toISOString(),
        current_lesson_index: currentLessonIndex,
      } as Partial<GenerationJob>);
    }
    
    setGenerating(false);
    setPaused(true);
  }, [generating, job?.id, currentLessonIndex, updateJobProgress]);

  // Start or resume generation
  const startGeneration = useCallback(async (resumeFromIndex?: number) => {
    if (!course || lessons.length === 0 || !user) return;

    if (!course.outline_json?.modules) {
      console.error('Course outline not found');
      return;
    }

    // Get or create job
    const currentJob = await getOrCreateJob();
    if (!currentJob) {
      setError('Failed to create generation job');
      return;
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();
    isPausingRef.current = false;

    setGenerating(true);
    setPaused(false);
    setError(null);

    // Determine start index
    const startIndex = resumeFromIndex ?? currentJob.current_lesson_index ?? 0;
    
    // Update job status to in_progress
    await updateJobProgress(currentJob.id, {
      status: 'in_progress',
      started_at: currentJob.started_at || new Date().toISOString(),
      paused_at: null,
    } as Partial<GenerationJob>);

    // Update local job state
    setJob(prev => prev ? { ...prev, status: 'in_progress' } : null);

    for (let i = startIndex; i < lessons.length; i++) {
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        if (isPausingRef.current) {
          // User paused - don't show error
          return;
        }
        break;
      }

      setCurrentLessonIndex(i);
      const lesson = lessons[i];

      // Skip already generated lessons
      if (lesson.lesson_status === 'generated' && lesson.markdown_content) {
        await updateJobProgress(currentJob.id, {
          completed_lessons: i + 1,
          current_lesson_index: i + 1,
        } as Partial<GenerationJob>);
        continue;
      }

      try {
        const module = course.outline_json.modules[lesson.module_index];

        if (!module) {
          console.error(`Module not found at index ${lesson.module_index}`);
          continue;
        }

        const lessonMaterials = getRelevantMaterials(
          lesson.title,
          lesson.objectives || [],
          module.title,
          course.materials_json,
          i,
          lessons.length
        );

        await generateLesson(
          {
            courseId: course.id,
            lessonId: lesson.id,
            moduleTitle: module.title,
            lessonTitle: lesson.title,
            objectives: lesson.objectives || [],
            courseContext: {
              topic: course.topic,
              level: course.level,
            },
            materials: lessonMaterials.length > 0 ? lessonMaterials : undefined,
          },
          abortControllerRef.current?.signal
        );

        // Update job progress
        await updateJobProgress(currentJob.id, {
          completed_lessons: i + 1,
          current_lesson_index: i + 1,
        } as Partial<GenerationJob>);

        // Update local lesson state
        setLessons(prev => prev.map((l, idx) => 
          idx === i ? { ...l, lesson_status: 'generated' } : l
        ));

        // Small delay between lessons
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Check if it's an abort error
        if (error instanceof Error && error.name === 'AbortError') {
          if (isPausingRef.current) {
            return; // User paused - exit gracefully
          }
          break;
        }

        console.error(`Error generating lesson ${i + 1}:`, error);
        let errorMessage = `Failed to generate lesson ${i + 1}`;

        const errorWithMessage = error as { message?: string };
        if (errorWithMessage?.message) {
          if (errorWithMessage.message.includes('429') || errorWithMessage.message.includes('quota')) {
            errorMessage = 'AI service rate limit reached. Your progress has been saved. Please wait and resume later.';
            
            // Save progress and pause
            await updateJobProgress(currentJob.id, {
              status: 'paused',
              paused_at: new Date().toISOString(),
              current_lesson_index: i,
              error_message: errorMessage,
            } as Partial<GenerationJob>);
            
            setError(errorMessage);
            setGenerating(false);
            setPaused(true);
            return;
          } else if (errorWithMessage.message.includes('Gemini API error')) {
            errorMessage = `AI service error on lesson ${i + 1}. Some lessons may be incomplete.`;
          }
        }

        setError(errorMessage);
      }
    }

    // Generation completed
    if (!abortControllerRef.current?.signal.aborted) {
      await updateJobProgress(currentJob.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_lessons: lessons.length,
        current_lesson_index: lessons.length,
      } as Partial<GenerationJob>);

      // Update course status
      if (courseId) {
        await supabase
          .from('courses')
          .update({ status: 'ready' })
          .eq('id', courseId);
      }

      setGenerating(false);
      setCompleted(true);
    }
  }, [course, lessons, user, courseId, getOrCreateJob, updateJobProgress, getRelevantMaterials]);

  // Resume from paused state
  const resumeGeneration = useCallback(() => {
    const resumeIndex = job?.current_lesson_index ?? currentLessonIndex;
    startGeneration(resumeIndex);
  }, [job?.current_lesson_index, currentLessonIndex, startGeneration]);

  // Store startGeneration in a ref for auto-start
  const startGenerationRef = useRef(startGeneration);
  useEffect(() => {
    startGenerationRef.current = startGeneration;
  }, [startGeneration]);

  // Auto-start generation if navigated from outline page
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (
      state?.autoStart &&
      !autoStartHandled.current &&
      course &&
      lessons.length > 0 &&
      !generating &&
      !completed &&
      !paused
    ) {
      autoStartHandled.current = true;
      navigate(location.pathname, { replace: true, state: null });
      startGenerationRef.current();
    }
  }, [course, lessons, generating, completed, paused, location.state, location.pathname, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleContinueToPreview = () => {
    navigate(`/courses/${courseId}/preview`);
  };

  const getModuleTitle = (moduleIndex: number) => {
    if (!course?.outline_json?.modules[moduleIndex]) return '';
    return course.outline_json.modules[moduleIndex].title;
  };

  // Calculate progress
  const generatedCount = lessons.filter(l => l.lesson_status === 'generated').length;
  const progressPercent = lessons.length > 0 ? (generatedCount / lessons.length) * 100 : 0;

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 font-body text-neutral-text-muted">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-neutral-surface p-4 md:p-8">

      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <div className="text-center">

            <h1 className="font-display text-display-md text-neutral-text mb-2">
              {completed 
                ? 'Generation Complete!' 
                : generating 
                  ? 'Generating Course Content'
                  : paused 
                    ? 'Generation Paused' 
                    : 'Generate Course Content'}
            </h1>
            <p className="font-body text-neutral-text-muted mb-6">
              {completed 
                ? `All ${lessons.length} lessons have been generated`
                : generating
                  ? `AI is creating detailed content for ${lessons.length} lessons`
                  : paused 
                    ? `${generatedCount} of ${lessons.length} lessons generated. Resume to continue.`
                    : `Ready to generate ${lessons.length} lessons`
              }
            </p>

            {/* Not started state */}
            {!generating && !completed && !paused && (
              <Button onClick={() => startGeneration()} size="lg">
                Start Generation
              </Button>
            )}

            {/* Paused state */}
            {paused && !completed && !generating && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full">
                  <Pause className="w-6 h-6 text-amber-600" />
                </div>
                <p className="font-body text-neutral-text-muted">
                  Generation paused at lesson {currentLessonIndex + 1}
                </p>
                <Button onClick={resumeGeneration} size="lg">
                  <Play className="w-4 h-4 mr-2" />
                  Resume Generation
                </Button>
              </div>
            )}

            {/* Generating state */}
            {generating && !paused && (
              <div className="space-y-6">
                <LoadingAnimation message={`Generating lesson ${currentLessonIndex + 1} of ${lessons.length}`} />
                <div className="w-full bg-neutral-surface rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
                  />
                </div>
                <Button variant="secondary" onClick={pauseGeneration} size="lg">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Generation
                </Button>
                <p className="font-body text-sm text-neutral-text-muted">
                  Your progress is automatically saved. You can pause and resume anytime.
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <Card className="mt-6 bg-accent-red/10 border-2 border-accent-red/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-accent-red flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-neutral-text mb-1">Generation Error</h3>
                    <p className="font-body text-sm text-neutral-text-muted">{error}</p>
                    {paused && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="mt-3"
                        onClick={resumeGeneration}
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Completed state */}
            {completed && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="font-display text-xl font-bold text-neutral-text">
                  All lessons generated successfully!
                </p>
                <p className="font-body text-neutral-text-muted mb-4">
                  Continue to preview and edit your lessons before publishing.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleContinueToPreview} size="lg">
                    Preview & Edit Lessons
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)} size="lg">
                    View Course
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Progress indicator */}
        {(generating || paused) && !completed && (
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-neutral-text-muted">
                Progress: {generatedCount} / {lessons.length} lessons
              </span>
              <span className="font-body text-sm font-semibold text-primary">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-neutral-surface rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Card>
        )}

        {/* Lesson list */}
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isComplete = lesson.lesson_status === 'generated';
            const isCurrent = index === currentLessonIndex && generating;
            const isPending = index > currentLessonIndex || (!isComplete && !isCurrent);

            return (
              <Card
                key={lesson.id}
                className={`transition-all ${
                  isCurrent ? 'border-2 border-primary bg-primary-light/10' : ''
                } ${isComplete ? 'opacity-80' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : isCurrent ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Clock className="w-6 h-6 text-neutral-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-neutral-text-muted">
                      Module {lesson.module_index + 1}: {getModuleTitle(lesson.module_index)}
                    </p>
                    <p className="font-body font-semibold text-neutral-text truncate">
                      {lesson.title}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isComplete && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                        Done
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-xs font-medium text-primary bg-primary-light/20 px-2 py-1 rounded">
                        Generating...
                      </span>
                    )}
                    {isPending && !isComplete && (
                      <span className="text-xs font-medium text-neutral-text-muted bg-neutral-surface px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
