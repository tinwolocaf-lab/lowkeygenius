import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Volume2, CheckCircle, XCircle, Loader, Play, AlertCircle } from 'lucide-react';
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

export function GenerateAudio() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [loading, setLoading] = useState(true);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);

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

  const handleGenerateAudio = async (lessonId: string) => {
    if (!hasAudioAccess) {
      toast.error(accessReason);
      return;
    }

    setGeneratingLessonId(lessonId);

    try {
      await generateLessonAudio({ lessonId, voiceType });
      toast.success('Audio generated successfully');
      await loadLessons();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
      toast.error(errorMessage);
    } finally {
      setGeneratingLessonId(null);
    }
  };

  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.audio_status === 'ready') return 'completed';
    if (lesson.audio_status === 'failed') return 'failed';
    if (lesson.audio_status === 'generating') return 'generating';
    return 'pending';
  };

  const completedCount = lessons.filter((l) => l.audio_status === 'ready').length;

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
            <h2 className="font-display text-display-sm text-neutral-text mb-3">
              Generate Audio for Lessons
            </h2>
            <p className="font-body text-body-lg text-neutral-text-muted mb-2">
              Convert lessons into high-quality audio narrations one at a time.
            </p>
            <p className="font-body text-sm text-neutral-text-muted mb-6">
              {completedCount} of {lessons.length} lessons have audio
            </p>

            {!hasAudioAccess && (
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
                        <li>Subscribe to the <span className="font-semibold">Audio Add-on</span> for your current plan</li>
                        <li>Or upgrade to <span className="font-semibold">Pro Max</span> which includes unlimited audio generation</li>
                      </ul>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/pricing')}
                    >
                      View Plans & Pricing
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 flex justify-center">
              <VoiceSelector
                selectedVoice={voiceType}
                onVoiceChange={setVoiceType}
                disabled={!hasAudioAccess}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-lg font-bold text-neutral-text mb-4">Lessons</h3>
          <div className="space-y-2">
            {lessons.map((lesson) => {
              const status = getLessonStatus(lesson);
              const isGenerating = generatingLessonId === lesson.id || status === 'generating';
              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 bg-neutral-surface rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {status === 'failed' && !isGenerating && <XCircle className="w-5 h-5 text-accent-red" />}
                    {isGenerating && <Loader className="w-5 h-5 text-primary animate-spin" />}
                    {status === 'pending' && !isGenerating && <div className="w-5 h-5 rounded-full border-2 border-neutral-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-neutral-text-muted">
                      Module {lesson.module_index + 1}, Lesson {lesson.lesson_index + 1}
                    </p>
                    <p className="font-body font-semibold text-neutral-text truncate">{lesson.title}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {status === 'completed' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Listen
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleGenerateAudio(lesson.id)}
                        disabled={!hasAudioAccess || isGenerating}
                        className="flex items-center gap-1"
                      >
                        {isGenerating ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            Generate
                          </>
                        )}
                      </Button>
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
