import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Volume2, CheckCircle, XCircle, Loader, Sparkles, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { VoiceSelector } from '../components/VoiceSelector';
import { checkAudioAccess } from '../utils/audioAccess';
import { generateLessonAudio } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  voice_type: string;
  status: string;
  total_lessons: number;
  completed_lessons: number;
  failed_lessons: number;
  error_message: string | null;
}

export function GenerateAudio() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<AudioGenerationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingLessonId, setRetryingLessonId] = useState<string | null>(null);

  // Check audio access using profile from AuthContext (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)
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

  const loadLessons = useCallback(async () => {
    if (!courseId) return;

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .not('markdown_content', 'is', null)
      .order('module_index')
      .order('lesson_index');

    if (data) {
      setLessons(data);
    }
  }, [courseId]);

  const loadData = useCallback(async () => {
    if (!courseId) return;

    try {
      const [courseResult, lessonsResult, jobResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .not('markdown_content', 'is', null)
          .order('module_index')
          .order('lesson_index'),
        supabase
          .from('audio_generation_jobs')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (courseResult.error || !courseResult.data) {
        navigate('/courses');
        return;
      }

      setCourse(courseResult.data);
      setLessons(lessonsResult.data || []);
      
      // Only show in-progress jobs, not completed or failed ones
      const jobData = jobResult.data as AudioGenerationJob | null;
      if (jobData && jobData.status === 'processing') {
        setJob(jobData);
        setGenerating(true);
        setVoiceType(jobData.voice_type as 'male' | 'female');
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

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;

    const subscription = supabase
      .channel(`audio_job_${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audio_generation_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          setJob(payload.new as AudioGenerationJob);
          if (payload.new.status === 'completed' || payload.new.status === 'failed') {
            loadLessons();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [job, loadLessons]);

  const handleStartGeneration = async () => {
    if (!courseId) return;

    // Check access control before starting (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)
    if (!hasAudioAccess) {
      toast.error(accessReason);
      return;
    }

    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-course-audio`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            voiceType,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start audio generation');
      }

      await response.json();
      await loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start audio generation';
      console.error('Error starting generation:', error);
      toast.error(errorMessage);
      setGenerating(false);
    }
  };

  // Retry audio generation for a single failed lesson (Requirement 6.3)
  const handleRetryLesson = async (lessonId: string) => {
    if (!hasAudioAccess) {
      toast.error(accessReason);
      return;
    }

    setRetryingLessonId(lessonId);

    try {
      await generateLessonAudio({ lessonId, voiceType });
      toast.success('Audio generated successfully');
      await loadLessons();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
      toast.error(errorMessage);
    } finally {
      setRetryingLessonId(null);
    }
  };

  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.audio_status === 'ready') return 'completed';
    if (lesson.audio_status === 'failed') return 'failed';
    if (lesson.audio_status === 'generating') return 'generating';
    return 'pending';
  };

  const completedCount = lessons.filter((l) => l.audio_status === 'ready').length;
  const failedCount = lessons.filter((l) => l.audio_status === 'failed').length;
  const progressPercentage = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

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

  const isCompleted = job?.status === 'completed';
  const isFailed = job?.status === 'failed';

  const handleRetry = () => {
    // Reset state to show the initial generation form
    setJob(null);
    setGenerating(false);
  };

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
        {!generating && !isCompleted && (
          <Card className="mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
                <Volume2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-display-sm text-neutral-text mb-3">
                Generate Audio Version
              </h2>
              <p className="font-body text-body-lg text-neutral-text-muted mb-6">
                Convert all {lessons.length} lessons into high-quality audio narrations.
              </p>

              {/* Access control warning (Requirements 4.1, 4.2, 4.3, 4.4, 4.5) */}
              {!hasAudioAccess && (
                <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl">
                  <div className="flex items-center gap-3 justify-center">
                    <AlertCircle className="w-5 h-5 text-accent-red" />
                    <p className="font-body text-accent-red">{accessReason}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/pricing')}
                    className="mt-3"
                  >
                    View Pricing
                  </Button>
                </div>
              )}

              {/* Voice selection using VoiceSelector component (Requirement 1.2) */}
              <div className="mb-6 flex justify-center">
                <VoiceSelector
                  selectedVoice={voiceType}
                  onVoiceChange={setVoiceType}
                  disabled={!hasAudioAccess}
                />
              </div>

              <Button 
                onClick={handleStartGeneration} 
                size="lg" 
                className="flex items-center gap-2 mx-auto"
                disabled={!hasAudioAccess}
              >
                <Sparkles className="w-5 h-5" />
                Generate Audio for All Lessons
              </Button>
            </div>
          </Card>
        )}

        {generating && (
          <>
            <Card className="mb-6">
              <div className="text-center mb-6">
                <h2 className="font-display text-display-sm text-neutral-text mb-2">
                  {isCompleted ? 'Generation Complete!' : isFailed ? 'Generation Failed' : 'Generating Audio...'}
                </h2>
                <p className="font-body text-neutral-text-muted">
                  {isCompleted
                    ? `Successfully generated ${completedCount} of ${lessons.length} lessons`
                    : isFailed
                    ? 'Some lessons failed to generate'
                    : `Processing lesson ${job?.completed_lessons || 0} of ${lessons.length}`}
                </p>
              </div>

              <div className="mb-4">
                <div className="w-full bg-neutral-surface rounded-full h-3">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-neutral-text-muted mt-2">
                  <span>{completedCount} completed</span>
                  {failedCount > 0 && <span className="text-accent-red">{failedCount} failed</span>}
                </div>
              </div>

              {isCompleted && (
                <div className="flex justify-center gap-3 mt-6">
                  <Button onClick={() => navigate(`/courses/${courseId}`)} className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start Listening
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                    Back to Course
                  </Button>
                </div>
              )}

              {isFailed && (
                <div className="flex flex-col items-center gap-4 mt-6">
                  <p className="text-sm text-accent-red max-w-md text-center">
                    {job?.error_message || 'Audio generation failed. Please try again.'}
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={handleRetry} className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                      Back to Course
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-display text-lg font-bold text-neutral-text mb-4">Lessons</h3>
              <div className="space-y-2">
                {lessons.map((lesson) => {
                  const status = getLessonStatus(lesson);
                  const isRetrying = retryingLessonId === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 bg-neutral-surface rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {status === 'failed' && !isRetrying && <XCircle className="w-5 h-5 text-accent-red" />}
                        {(status === 'generating' || isRetrying) && <Loader className="w-5 h-5 text-primary animate-spin" />}
                        {status === 'pending' && !isRetrying && <div className="w-5 h-5 rounded-full border-2 border-neutral-border" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-neutral-text-muted">
                          Module {lesson.module_index + 1}, Lesson {lesson.lesson_index + 1}
                        </p>
                        <p className="font-body font-semibold text-neutral-text truncate">{lesson.title}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Retry button for failed lessons (Requirement 6.3) */}
                        {status === 'failed' && !isRetrying && (
                          <button
                            onClick={() => handleRetryLesson(lesson.id)}
                            className="p-2 hover:bg-neutral-border rounded-lg transition-colors"
                            title="Retry audio generation"
                            disabled={!hasAudioAccess}
                          >
                            <RefreshCw className="w-4 h-4 text-neutral-text-muted hover:text-primary" />
                          </button>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-body font-semibold ${
                            status === 'completed'
                              ? 'bg-green-500/20 text-green-600'
                              : status === 'failed'
                              ? 'bg-accent-red/20 text-accent-red'
                              : status === 'generating' || isRetrying
                              ? 'bg-primary-light/20 text-primary'
                              : 'bg-neutral-border text-neutral-text-muted'
                          }`}
                        >
                          {isRetrying
                            ? 'Retrying...'
                            : status === 'completed'
                            ? 'Ready'
                            : status === 'failed'
                            ? 'Failed'
                            : status === 'generating'
                            ? 'Generating...'
                            : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
