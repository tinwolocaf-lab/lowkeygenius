import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateLesson } from '../lib/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingAnimation } from '../components/LoadingAnimation';

interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  module_index: number;
  lesson_index: number;
  markdown_content: string | null;
}

interface Course {
  id: string;
  title: string;
  topic: string;
  level: string;
  outline_json: any;
}

export function GenerateLessons() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCourseAndLessons();
  }, [courseId]);

  const loadCourseAndLessons = async () => {
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

      setCourse(courseData);

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
    } catch (error) {
      console.error('Unexpected error:', error);
      navigate('/courses');
    }
  };

  const startGeneration = async () => {
    if (!course || lessons.length === 0) return;

    if (!course.outline_json?.modules) {
      console.error('Course outline not found');
      return;
    }

    setGenerating(true);

    for (let i = 0; i < lessons.length; i++) {
      setCurrentLessonIndex(i);
      const lesson = lessons[i];

      try {
        const module = course.outline_json.modules[lesson.module_index];

        if (!module) {
          console.error(`Module not found at index ${lesson.module_index}`);
          continue;
        }

        await generateLesson({
          courseId: course.id,
          lessonId: lesson.id,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          objectives: lesson.objectives,
          courseContext: {
            topic: course.topic,
            level: course.level,
          },
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error generating lesson ${i + 1}:`, error);
        let errorMessage = `Failed to generate lesson ${i + 1}`;

        if (error?.message) {
          if (error.message.includes('429') || error.message.includes('quota')) {
            errorMessage = 'AI service rate limit reached. Please wait and try again later.';
            setError(errorMessage);
            setGenerating(false);
            return;
          } else if (error.message.includes('Gemini API error')) {
            errorMessage = `AI service error on lesson ${i + 1}. Some lessons may be incomplete.`;
          }
        }

        setError(errorMessage);
      }
    }

    const { error: updateError } = await supabase
      .from('courses')
      .update({ status: 'ready' })
      .eq('id', courseId);

    if (updateError) {
      console.error('Error updating course status:', updateError);
    }

    setGenerating(false);
    setCompleted(true);
  };

  const handleContinueToPreview = () => {
    navigate(`/courses/${courseId}/preview`);
  };

  const getModuleTitle = (moduleIndex: number) => {
    if (!course?.outline_json?.modules[moduleIndex]) return '';
    return course.outline_json.modules[moduleIndex].title;
  };

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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-display-md text-neutral-text mb-2">
              Generating Course Content
            </h1>
            <p className="font-body text-neutral-text-muted mb-6">
              AI is creating detailed content for {lessons.length} lessons
            </p>

            {!generating && !completed && (
              <Button onClick={startGeneration} size="lg">
                Start Generation
              </Button>
            )}

            {generating && (
              <div className="space-y-6">
                <LoadingAnimation message={`Generating lesson ${currentLessonIndex + 1} of ${lessons.length}`} />
                <div className="w-full bg-neutral-surface rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 rounded-full"
                    style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <Card className="mt-6 bg-accent-red/10 border-2 border-accent-red/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-accent-red flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-neutral-text mb-1">Generation Error</h3>
                    <p className="font-body text-sm text-neutral-text-muted">{error}</p>
                  </div>
                </div>
              </Card>
            )}

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

        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isComplete = index < currentLessonIndex || completed;
            const isCurrent = index === currentLessonIndex && generating;

            return (
              <Card
                key={lesson.id}
                className={`transition-all ${
                  isCurrent ? 'border-2 border-primary bg-primary-light/10' : ''
                }`}
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
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
