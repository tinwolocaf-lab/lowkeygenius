import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, Circle, BookOpen, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import 'highlight.js/styles/github-dark.css';

interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  markdown_content: string | null;
  module_index: number;
  lesson_index: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  outline_json: any;
}

interface Progress {
  lesson_id: string;
  completed: boolean;
}

export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  useEffect(() => {
    if (currentLesson) {
      markAsViewed();
    }
  }, [currentLessonIndex]);

  const loadCourseData = async () => {
    if (!courseId || !user) return;

    try {
      const [courseResult, lessonsResult, progressResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('module_index').order('lesson_index'),
        supabase.from('user_progress').select('*').eq('course_id', courseId).eq('user_id', user.id),
      ]);

      if (courseResult.error || !courseResult.data) {
        console.error('Error loading course:', courseResult.error);
        navigate('/courses');
        return;
      }

      setCourse(courseResult.data);
      setLessons(lessonsResult.data || []);
      setProgress(progressResult.data || []);
    } catch (error) {
      console.error('Unexpected error loading course:', error);
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async () => {
    if (!currentLesson || !user || !courseId) return;

    const { error } = await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: currentLesson.id,
      course_id: courseId,
      completed: false,
      last_viewed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,lesson_id',
    });

    if (error) {
      console.error('Error marking lesson as viewed:', error);
    }
  };

  const markAsComplete = async () => {
    if (!currentLesson || !user || !courseId) return;

    const { error } = await supabase.from('user_progress').upsert({
      user_id: user.id,
      lesson_id: currentLesson.id,
      course_id: courseId,
      completed: true,
      last_viewed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,lesson_id',
    });

    if (!error) {
      setProgress(prev => {
        const updated = prev.filter(p => p.lesson_id !== currentLesson.id);
        return [...updated, { lesson_id: currentLesson.id, completed: true }];
      });
    }
  };

  const isLessonComplete = (lessonId: string) => {
    return progress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const currentLesson = lessons[currentLessonIndex];
  const canGoNext = currentLessonIndex < lessons.length - 1;
  const canGoPrev = currentLessonIndex > 0;

  const getModuleTitle = (moduleIndex: number) => {
    if (!course?.outline_json?.modules[moduleIndex]) return '';
    return course.outline_json.modules[moduleIndex].title;
  };

  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.module_index]) {
      acc[lesson.module_index] = [];
    }
    acc[lesson.module_index].push(lesson);
    return acc;
  }, {} as Record<number, Lesson[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 font-body text-neutral-text-muted">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <BookOpen className="w-12 h-12 text-neutral-text-muted mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-neutral-text mb-2">
            No lessons available
          </h2>
          <p className="font-body text-neutral-text-muted mb-4">
            This course doesn't have any lessons yet.
          </p>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-surface flex">
      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-neutral-bg border-r border-neutral-border shadow-tile transition-transform z-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } w-80 overflow-y-auto`}
      >
        <div className="p-4 border-b-2 border-neutral-border">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-neutral-text-muted hover:text-neutral-text mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Courses</span>
          </button>
          <h2 className="font-display text-lg font-bold text-neutral-text">{course.title}</h2>
          <div className="mt-2">
            <div className="text-sm font-body text-neutral-text-muted">
              {progress.filter(p => p.completed).length} / {lessons.length} lessons completed
            </div>
            <div className="w-full bg-neutral-surface rounded-full h-2 mt-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.filter(p => p.completed).length / lessons.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-4">
          {Object.entries(groupedLessons).map(([moduleIndexStr, moduleLessons]) => {
            const moduleIndex = parseInt(moduleIndexStr);
            return (
              <div key={moduleIndex} className="mb-6">
                <h3 className="font-display text-sm font-bold text-neutral-text mb-3">
                  Module {moduleIndex + 1}: {getModuleTitle(moduleIndex)}
                </h3>
                <div className="space-y-1">
                  {moduleLessons.map((lesson, idx) => {
                    const globalIndex = lessons.findIndex(l => l.id === lesson.id);
                    const isActive = globalIndex === currentLessonIndex;
                    const isComplete = isLessonComplete(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-primary-light/20 border-2 border-primary'
                            : 'hover:bg-neutral-surface'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-neutral-text-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-body text-sm font-semibold ${
                            isActive ? 'text-primary' : 'text-neutral-text'
                          } truncate`}>
                            {lesson.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Menu Button */}
        <div className="md:hidden bg-neutral-bg p-4 flex items-center justify-between border-b-2 border-neutral-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neutral-surface rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-body text-sm font-semibold text-neutral-text">
            Lesson {currentLessonIndex + 1} of {lessons.length}
          </span>
        </div>

        {/* Lesson Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 md:p-12">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-primary-light text-primary rounded-full font-body font-semibold text-sm">
                  Module {currentLesson.module_index + 1}
                </span>
                <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-full font-body text-sm">
                  Lesson {currentLesson.lesson_index + 1}
                </span>
              </div>
              <h1 className="font-display text-display-lg text-neutral-text mb-4">
                {currentLesson.title}
              </h1>
              {currentLesson.objectives && currentLesson.objectives.length > 0 && (
                <Card className="bg-primary-light/10 border-l-4 border-primary">
                  <h3 className="font-display font-bold text-neutral-text mb-2">
                    Learning Objectives
                  </h3>
                  <ul className="space-y-2">
                    {currentLesson.objectives.map((objective, idx) => (
                      <li key={idx} className="font-body text-neutral-text flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {currentLesson.markdown_content ? (
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  className="markdown-content"
                >
                  {currentLesson.markdown_content}
                </ReactMarkdown>
              </div>
            ) : (
              <Card className="text-center py-12">
                <p className="font-body text-neutral-text-muted">
                  Content not available for this lesson yet.
                </p>
              </Card>
            )}

            <div className="mt-12 pt-8 border-t-2 border-neutral-border">
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentLessonIndex(currentLessonIndex - 1)}
                  disabled={!canGoPrev}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </Button>

                {!isLessonComplete(currentLesson.id) && (
                  <Button
                    variant="secondary"
                    onClick={markAsComplete}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Complete
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (!isLessonComplete(currentLesson.id)) {
                      markAsComplete();
                    }
                    if (canGoNext) {
                      setCurrentLessonIndex(currentLessonIndex + 1);
                    } else {
                      navigate('/courses');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {canGoNext ? (
                    <>
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    'Finish Course'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
