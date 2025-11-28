import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, CheckCircle, XCircle, Loader, Sparkles, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

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
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<AudioGenerationJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [courseId]);

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
  }, [job?.id]);

  const loadData = async () => {
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
      if (jobResult.data && jobResult.data.status !== 'completed' && jobResult.data.status !== 'failed') {
        setJob(jobResult.data);
        setGenerating(true);
        setVoiceType(jobResult.data.voice_type as 'male' | 'female');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async () => {
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
  };

  const handleStartGeneration = async () => {
    if (!courseId) return;

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

      const result = await response.json();
      await loadData();
    } catch (error: any) {
      console.error('Error starting generation:', error);
      alert(error.message || 'Failed to start audio generation');
      setGenerating(false);
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

              <div className="mb-6">
                <label className="block font-body font-semibold text-neutral-text mb-3">
                  Select Voice Type
                </label>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setVoiceType('female')}
                    className={`flex-1 max-w-xs p-4 rounded-xl border-2 transition-all ${
                      voiceType === 'female'
                        ? 'border-primary bg-primary-light/20'
                        : 'border-neutral-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-body font-bold text-neutral-text mb-1">Female Voice</h3>
                    <p className="text-sm text-neutral-text-muted">Natalie - Professional narration</p>
                  </button>
                  <button
                    onClick={() => setVoiceType('male')}
                    className={`flex-1 max-w-xs p-4 rounded-xl border-2 transition-all ${
                      voiceType === 'male'
                        ? 'border-primary bg-primary-light/20'
                        : 'border-neutral-border hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-body font-bold text-neutral-text mb-1">Male Voice</h3>
                    <p className="text-sm text-neutral-text-muted">Cooper - Clear and engaging</p>
                  </button>
                </div>
              </div>

              <Button onClick={handleStartGeneration} size="lg" className="flex items-center gap-2 mx-auto">
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
            </Card>

            <Card>
              <h3 className="font-display text-lg font-bold text-neutral-text mb-4">Lessons</h3>
              <div className="space-y-2">
                {lessons.map((lesson) => {
                  const status = getLessonStatus(lesson);
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 bg-neutral-surface rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {status === 'failed' && <XCircle className="w-5 h-5 text-accent-red" />}
                        {status === 'generating' && <Loader className="w-5 h-5 text-primary animate-spin" />}
                        {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-neutral-border" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-neutral-text-muted">
                          Module {lesson.module_index + 1}, Lesson {lesson.lesson_index + 1}
                        </p>
                        <p className="font-body font-semibold text-neutral-text truncate">{lesson.title}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-body font-semibold ${
                            status === 'completed'
                              ? 'bg-green-500/20 text-green-600'
                              : status === 'failed'
                              ? 'bg-accent-red/20 text-accent-red'
                              : status === 'generating'
                              ? 'bg-primary-light/20 text-primary'
                              : 'bg-neutral-border text-neutral-text-muted'
                          }`}
                        >
                          {status === 'completed'
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
