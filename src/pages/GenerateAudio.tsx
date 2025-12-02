import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Volume2, CheckCircle, XCircle, Clock, Pause, Play, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { VoiceSelector } from '../components/VoiceSelector';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { checkAudioAccess } from '../utils/audioAccess';
import { generateLessonAudio } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationBlock } from '../hooks/useNavigationBlock';
import type { AudioJobStatus, VoiceType } from '../types/database';

interface LocationState {
  autoStart?: boolean;
}

interface Course {
  id: string;
  title: string;
  status: string;
}

interface Lesson {
  id: string;
  title: string;
  markdown_content: string | null;
  audio_status: string | null;
  audio_url: string | null;
  module_index: number;
  lesson_index: number;
}

interface AudioGenerationJob {
  id: string;
  course_id: string;
  user_id: string;
  voice_type: VoiceType;
  status: AudioJobStatus;
  total_lessons: number;
  completed_lessons: number;
  failed_lessons: number;
  current_lesson_index: number;
  error_message: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
}

export function GenerateAudio() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [voiceType, setVoiceType] = useState<VoiceType>('female');
  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<AudioGenerationJob | null>(null);

  const autoStartHandled = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausingRef = useRef(false);

  const audioAccessResult = profile
    ? checkAudioAccess({
        plan_type: profile.plan_type,
        audio_addon_enabled: profile.audio_addon_enabled,
        audio_addon_trial_used: profile.audio_addon_trial_used,
        audio_addon_expires_at: profile.audio_addon_expires_at,
      })
    : { hasAccess: false, reason: 'Loading profile...' };

  const hasAudioAccess = audioAccessResult.hasAccess;
  const accessReason = audioAccessResult.reason;

  // Pause and save progress before navigation
  const pauseAndSaveProgress = useCallback(async () => {
    if (generating && abortControllerRef.current) {
      isPausingRef.current = true;
      abortControllerRef.current.abort();

      if (job?.id) {
        await supabase
          .from('audio_generation_jobs')
          .update({
            status: 'paused',
            paused_at: new Date().toISOString(),
            current_lesson_index: currentLessonIndex,
          })
          .eq('id', job.id);
      }
    }
  }, [generating, job?.id, currentLessonIndex]);

  // Navigation blocking
  useNavigationBlock({
    when: generating && !paused,
    message: 'Audio generation is in progress. Are you sure you want to leave?',
    onBlock: pauseAndSaveProgress,
  });

  const loadData = useCallback(async () => {
    if (!courseId) return;

    try {
      const [courseResult, lessonsResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .not('markdown_content', 'is', null)
          .order('module_index')
          .order('lesson_index'),
      ]);

      if (courseResult.error || !courseResult.data) {
        navigate('/courses');
        return;
      }

      setCourse(courseResult.data);
      setLessons(lessonsResult.data || []);

      // Check for existing generation job
      const { data: existingJob } = await supabase
        .from('audio_generation_jobs')
        .select('*')
        .eq('course_id', courseId)
        .in('status', ['pending', 'processing', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        setJob(existingJob as AudioGenerationJob);
        setCurrentLessonIndex(existingJob.current_lesson_index || 0);
        setVoiceType(existingJob.voice_type);

        if (existingJob.status === 'paused') {
          setPaused(true);
        } else if (existingJob.status === 'processing') {
          // Job was interrupted - mark as paused
          await supabase
            .from('audio_generation_jobs')
            .update({ status: 'paused', paused_at: new Date().toISOString() })
            .eq('id', existingJob.id);
          setPaused(true);
        }
      }

      // Check if all lessons already have audio
      const allHaveAudio = lessonsResult.data?.every((l) => l.audio_status === 'ready');
      if (allHaveAudio && lessonsResult.data && lessonsResult.data.length > 0) {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get or create generation job
  const getOrCreateJob = useCallback(async (): Promise<AudioGenerationJob | null> => {
    if (!courseId || !user) return null;

    // Filter lessons that need audio (status is 'none', 'failed', 'pending', null, or undefined)
    const lessonsToProcess = lessons.filter(
      (l) =>
        !l.audio_status ||
        l.audio_status === 'none' ||
        l.audio_status === 'failed' ||
        l.audio_status === 'pending'
    );

    if (lessonsToProcess.length === 0) {
      return null;
    }

    // Check for existing active job with matching lesson count
    if (job && ['pending', 'processing', 'paused'].includes(job.status)) {
      // Update job with current lesson count if it changed
      if (job.total_lessons !== lessonsToProcess.length) {
        await supabase
          .from('audio_generation_jobs')
          .update({
            total_lessons: lessonsToProcess.length,
            current_lesson_index: 0,
            completed_lessons: 0,
            failed_lessons: 0,
          })
          .eq('id', job.id);
        
        const updatedJob = {
          ...job,
          total_lessons: lessonsToProcess.length,
          current_lesson_index: 0,
          completed_lessons: 0,
          failed_lessons: 0,
        };
        setJob(updatedJob);
        return updatedJob;
      }
      return job;
    }

    // Create new job
    const { data: newJob, error: createError } = await supabase
      .from('audio_generation_jobs')
      .insert({
        course_id: courseId,
        user_id: user.id,
        voice_type: voiceType,
        status: 'pending',
        total_lessons: lessonsToProcess.length,
        completed_lessons: 0,
        failed_lessons: 0,
        current_lesson_index: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating job:', createError);
      return null;
    }

    setJob(newJob as AudioGenerationJob);
    return newJob as AudioGenerationJob;
  }, [courseId, user, job, lessons, voiceType]);

  // Update job progress
  const updateJobProgress = useCallback(
    async (jobId: string, updates: Partial<AudioGenerationJob>) => {
      const { error } = await supabase
        .from('audio_generation_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) {
        console.error('Error updating job:', error);
      }
    },
    []
  );

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
      } as Partial<AudioGenerationJob>);
    }

    setGenerating(false);
    setPaused(true);
  }, [generating, job?.id, currentLessonIndex, updateJobProgress]);

  // Start or resume generation
  const startGeneration = useCallback(
    async (resumeFromIndex?: number) => {
      if (!course || lessons.length === 0 || !user || !hasAudioAccess) return;

      // Get or create job
      const currentJob = await getOrCreateJob();
      if (!currentJob) {
        toast.success('All lessons already have audio');
        setCompleted(true);
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

      // Update job status
      await updateJobProgress(currentJob.id, {
        status: 'processing',
        started_at: currentJob.started_at || new Date().toISOString(),
        paused_at: null,
      } as Partial<AudioGenerationJob>);

      setJob((prev) => (prev ? { ...prev, status: 'processing' } : null));

      // Get lessons that need audio generation (status is 'none', 'failed', 'pending', null, or undefined)
      const lessonsToProcess = lessons.filter(
        (l) =>
          !l.audio_status ||
          l.audio_status === 'none' ||
          l.audio_status === 'failed' ||
          l.audio_status === 'pending'
      );

      let completedCount = currentJob.completed_lessons;
      let failedCount = currentJob.failed_lessons;

      for (let i = startIndex; i < lessonsToProcess.length; i++) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          if (isPausingRef.current) {
            return;
          }
          break;
        }

        setCurrentLessonIndex(i);
        const lesson = lessonsToProcess[i];

        // Skip already completed lessons
        if (lesson.audio_status === 'ready') {
          completedCount++;
          await updateJobProgress(currentJob.id, {
            completed_lessons: completedCount,
            current_lesson_index: i + 1,
          } as Partial<AudioGenerationJob>);
          continue;
        }

        try {
          // Update lesson status to generating
          await supabase
            .from('lessons')
            .update({ audio_status: 'generating' })
            .eq('id', lesson.id);

          setLessons((prev) =>
            prev.map((l) => (l.id === lesson.id ? { ...l, audio_status: 'generating' } : l))
          );

          try {
            await generateLessonAudio({
              lessonId: lesson.id,
              voiceType,
            });
          } catch (apiError) {
            // On timeout/502, check if the audio was actually generated
            // The edge function may complete even if the HTTP response times out
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const { data: updatedLesson } = await supabase
              .from('lessons')
              .select('audio_status')
              .eq('id', lesson.id)
              .single();

            if (updatedLesson?.audio_status !== 'ready') {
              throw apiError; // Re-throw if it actually failed
            }
            // Audio was generated despite timeout, continue normally
          }

          completedCount++;

          // Update job progress
          await updateJobProgress(currentJob.id, {
            completed_lessons: completedCount,
            current_lesson_index: i + 1,
          } as Partial<AudioGenerationJob>);

          // Update local lesson state
          setLessons((prev) =>
            prev.map((l) => (l.id === lesson.id ? { ...l, audio_status: 'ready' } : l))
          );

          // Small delay between lessons to avoid rate limiting
          if (i < lessonsToProcess.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          // Check if it's an abort error
          if (error instanceof Error && error.name === 'AbortError') {
            if (isPausingRef.current) {
              return;
            }
            break;
          }

          console.error(`Error generating audio for lesson ${i + 1}:`, error);
          failedCount++;

          // Update lesson status to failed
          await supabase
            .from('lessons')
            .update({ audio_status: 'failed' })
            .eq('id', lesson.id);

          setLessons((prev) =>
            prev.map((l) => (l.id === lesson.id ? { ...l, audio_status: 'failed' } : l))
          );

          const errorWithMessage = error as { message?: string };
          let errorMessage = `Failed to generate audio for lesson ${i + 1}`;

          if (errorWithMessage?.message) {
            if (
              errorWithMessage.message.includes('429') ||
              errorWithMessage.message.includes('rate limit')
            ) {
              errorMessage =
                'API rate limit reached. Your progress has been saved. Please wait and resume later.';

              await updateJobProgress(currentJob.id, {
                status: 'paused',
                paused_at: new Date().toISOString(),
                current_lesson_index: i,
                failed_lessons: failedCount,
                error_message: errorMessage,
              } as Partial<AudioGenerationJob>);

              setError(errorMessage);
              setGenerating(false);
              setPaused(true);
              return;
            }
          }

          // Update job with failure count but continue
          await updateJobProgress(currentJob.id, {
            failed_lessons: failedCount,
            current_lesson_index: i + 1,
          } as Partial<AudioGenerationJob>);

          // Continue to next lesson after a short delay
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Generation completed
      if (!abortControllerRef.current?.signal.aborted) {
        const finalStatus = failedCount === lessonsToProcess.length ? 'failed' : 'completed';

        await updateJobProgress(currentJob.id, {
          status: finalStatus,
          completed_at: new Date().toISOString(),
          completed_lessons: completedCount,
          failed_lessons: failedCount,
          current_lesson_index: lessonsToProcess.length,
        } as Partial<AudioGenerationJob>);

        setGenerating(false);
        setCompleted(true);

        if (failedCount > 0 && failedCount < lessonsToProcess.length) {
          toast.success(`Audio generation complete. ${failedCount} lesson(s) failed.`);
        } else if (failedCount === 0) {
          toast.success('All audio generated successfully!');
        }
      }
    },
    [course, lessons, user, hasAudioAccess, voiceType, getOrCreateJob, updateJobProgress]
  );

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

  // Auto-start if navigated with autoStart state
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (
      state?.autoStart &&
      !autoStartHandled.current &&
      course &&
      lessons.length > 0 &&
      !generating &&
      !completed &&
      !paused &&
      hasAudioAccess
    ) {
      autoStartHandled.current = true;
      navigate(location.pathname, { replace: true, state: null });
      startGenerationRef.current();
    }
  }, [course, lessons, generating, completed, paused, hasAudioAccess, location.state, location.pathname, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calculate progress
  const lessonsNeedingAudio = lessons.filter(
    (l) => !l.audio_status || l.audio_status !== 'ready'
  );
  const completedCount = lessons.filter((l) => l.audio_status === 'ready').length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.audio_status === 'ready') return 'completed';
    if (lesson.audio_status === 'failed') return 'failed';
    if (lesson.audio_status === 'generating') return 'generating';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 font-body text-neutral-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-surface">
      <header className="bg-neutral-bg border-b border-neutral-border shadow-soft p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-2 text-neutral-text-muted hover:text-neutral-text mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Course</span>
          </button>
          <h1 className="font-display text-display-md text-neutral-text">{course.title}</h1>
          <p className="font-body text-neutral-text-muted">Audio Generation</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Card className="mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>

            <h2 className="font-display text-display-sm text-neutral-text mb-2">
              {completed
                ? 'Audio Generation Complete!'
                : generating
                  ? 'Generating Audio'
                  : paused
                    ? 'Generation Paused'
                    : 'Generate Audio for Lessons'}
            </h2>
            <p className="font-body text-body-lg text-neutral-text-muted mb-6">
              {completed
                ? `All ${lessons.length} lessons have audio`
                : generating
                  ? `Converting lessons to high-quality audio narrations`
                  : paused
                    ? `${completedCount} of ${lessons.length} lessons have audio. Resume to continue.`
                    : `Ready to generate audio for ${lessonsNeedingAudio.length} lessons`}
            </p>

            {/* Access denied message */}
            {!hasAudioAccess && !completed && (
              <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      Audio Generation Requires Subscription
                    </h3>
                    <p className="font-body text-amber-700 dark:text-amber-400 text-sm mb-3">
                      {accessReason}
                    </p>
                    <div className="font-body text-amber-700 dark:text-amber-400 text-sm mb-4">
                      <p className="font-semibold mb-1">To unlock audio generation:</p>
                      <ul className="list-disc list-inside space-y-1 ml-1">
                        <li>
                          Subscribe to the <span className="font-semibold">Audio Add-on</span> for
                          your current plan
                        </li>
                        <li>
                          Or upgrade to <span className="font-semibold">Pro Max</span> which
                          includes unlimited audio generation
                        </li>
                      </ul>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => navigate('/pricing')}>
                      View Plans & Pricing
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Voice selector - only show when not generating */}
            {!generating && !completed && hasAudioAccess && (
              <div className="mb-6 flex justify-center">
                <VoiceSelector
                  selectedVoice={voiceType}
                  onVoiceChange={setVoiceType}
                  disabled={paused}
                />
              </div>
            )}

            {/* Not started state */}
            {!generating && !completed && !paused && hasAudioAccess && (
              <Button onClick={() => startGeneration()} size="lg">
                Start Audio Generation
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
                <Button onClick={resumeGeneration} size="lg" disabled={!hasAudioAccess}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume Generation
                </Button>
              </div>
            )}

            {/* Generating state */}
            {generating && !paused && (
              <div className="space-y-6">
                <LoadingAnimation
                  message={`Generating audio for lesson ${currentLessonIndex + 1} of ${lessonsNeedingAudio.length}`}
                />
                <div className="w-full bg-neutral-surface rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${((currentLessonIndex + 1) / lessonsNeedingAudio.length) * 100}%`,
                    }}
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
                    <h3 className="font-display font-bold text-neutral-text mb-1">
                      Generation Error
                    </h3>
                    <p className="font-body text-sm text-neutral-text-muted">{error}</p>
                    {paused && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={resumeGeneration}
                        disabled={!hasAudioAccess}
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
                  All audio generated successfully!
                </p>
                <p className="font-body text-neutral-text-muted mb-4">
                  Your lessons now have audio narration. Listen while you learn!
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate(`/courses/${courseId}`)} size="lg">
                    Go to Course
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
                Progress: {completedCount} / {lessons.length} lessons
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
        <Card>
          <h3 className="font-display text-lg font-bold text-neutral-text mb-4">Lessons</h3>
          <div className="space-y-2">
            {lessons.map((lesson) => {
              const status = getLessonStatus(lesson);
              const isCurrentlyGenerating =
                generating &&
                lessonsNeedingAudio[currentLessonIndex]?.id === lesson.id;

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrentlyGenerating
                      ? 'bg-primary-light/20 border-2 border-primary'
                      : 'bg-neutral-surface'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {status === 'failed' && !isCurrentlyGenerating && (
                      <XCircle className="w-5 h-5 text-accent-red" />
                    )}
                    {isCurrentlyGenerating && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                    )}
                    {status === 'pending' && !isCurrentlyGenerating && (
                      <Clock className="w-5 h-5 text-neutral-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-neutral-text-muted">
                      Module {lesson.module_index + 1}, Lesson {lesson.lesson_index + 1}
                    </p>
                    <p className="font-body font-semibold text-neutral-text truncate">
                      {lesson.title}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {status === 'completed' && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                        Done
                      </span>
                    )}
                    {isCurrentlyGenerating && (
                      <span className="text-xs font-medium text-primary bg-primary-light/20 px-2 py-1 rounded">
                        Generating...
                      </span>
                    )}
                    {status === 'failed' && !isCurrentlyGenerating && (
                      <span className="text-xs font-medium text-accent-red bg-accent-red/10 px-2 py-1 rounded">
                        Failed
                      </span>
                    )}
                    {status === 'pending' && !isCurrentlyGenerating && (
                      <span className="text-xs font-medium text-neutral-text-muted bg-neutral-bg px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
