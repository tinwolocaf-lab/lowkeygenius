import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2, Edit2, Sparkles, Play, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updateCourseOutline } from '../lib/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { EditModuleModal } from '../components/EditModuleModal';
import { EditLessonModal } from '../components/EditLessonModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ThumbnailUpload } from '../components/ThumbnailUpload';

interface Lesson {
  title: string;
  objectives: string[];
}

interface Module {
  title: string;
  description: string;
  lessons: Lesson[];
}

interface CourseOutline {
  modules: Module[];
  estimatedDurationHours: number;
  estimatedLessonsCount: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: string;
  intensity: string;
  outline_json: CourseOutline | null;
  status: string;
  thumbnail_url: string | null;
}

export function CourseOutline() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingModule, setEditingModule] = useState<{ index: number; module: Module } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ moduleIndex: number; lessonIndex: number; lesson: Lesson } | null>(null);
  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<number | null>(null);
  const [deleteLessonConfirm, setDeleteLessonConfirm] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (error) {
        console.error('Error loading course:', error);
        navigate('/courses');
        return;
      }

      if (!data) {
        console.error('Course not found');
        navigate('/courses');
        return;
      }

      setCourse({
        ...data,
        outline_json: data.outline_json as CourseOutline | null,
      } as Course);
    } catch (error) {
      console.error('Unexpected error loading course:', error);
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const toggleModule = (index: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedModules(newExpanded);
  };

  const saveOutline = async (newOutline: CourseOutline) => {
    if (!courseId) return;

    setSaving(true);
    try {
      await updateCourseOutline({
        courseId,
        outline: newOutline,
      });

      setCourse(prev => prev ? { ...prev, outline_json: newOutline } : null);
    } catch (error) {
      console.error('Error saving outline:', error);
      toast.error('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = (moduleIndex: number, updatedModule: Module) => {
    if (!course?.outline_json) return;

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: [...course.outline_json.modules],
    };
    newOutline.modules[moduleIndex] = updatedModule;
    saveOutline(newOutline);
  };

  const handleUpdateLesson = (moduleIndex: number, lessonIndex: number, updatedLesson: Lesson) => {
    if (!course?.outline_json) return;

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: course.outline_json.modules.map((m, i) =>
        i === moduleIndex ? { ...m, lessons: [...m.lessons] } : m
      ),
    };
    newOutline.modules[moduleIndex].lessons[lessonIndex] = updatedLesson;
    saveOutline(newOutline);
  };

  const handleDeleteModule = async (moduleIndex: number) => {
    if (!course?.outline_json) return;

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: [...course.outline_json.modules],
    };
    newOutline.modules.splice(moduleIndex, 1);
    await saveOutline(newOutline);
    setDeleteModuleConfirm(null);
  };

  const handleDeleteLesson = async (moduleIndex: number, lessonIndex: number) => {
    if (!course?.outline_json) return;

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: course.outline_json.modules.map((m, i) =>
        i === moduleIndex ? { ...m, lessons: [...m.lessons] } : m
      ),
    };
    newOutline.modules[moduleIndex].lessons.splice(lessonIndex, 1);
    await saveOutline(newOutline);
    setDeleteLessonConfirm(null);
  };

  const handleAddModule = () => {
    if (!course?.outline_json) return;

    const newModule: Module = {
      title: 'New Module',
      description: 'Module description',
      lessons: [],
    };

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: [...course.outline_json.modules, newModule],
    };
    saveOutline(newOutline);
  };

  const handleAddLesson = (moduleIndex: number) => {
    if (!course?.outline_json) return;

    const newLesson: Lesson = {
      title: 'New Lesson',
      objectives: [],
    };

    const newOutline: CourseOutline = {
      ...course.outline_json,
      modules: course.outline_json.modules.map((m, i) =>
        i === moduleIndex ? { ...m, lessons: [...m.lessons, newLesson] } : m
      ),
    };
    saveOutline(newOutline);
  };

  const handleGenerateLessons = async () => {
    if (!course?.outline_json || !courseId) return;

    setGenerating(true);

    try {
      const outline = course.outline_json;

      for (let moduleIndex = 0; moduleIndex < outline.modules.length; moduleIndex++) {
        const module = outline.modules[moduleIndex];

        for (let lessonInModuleIndex = 0; lessonInModuleIndex < module.lessons.length; lessonInModuleIndex++) {
          const lesson = module.lessons[lessonInModuleIndex];

          const { error: insertError } = await supabase
            .from('lessons')
            .insert({
              course_id: courseId,
              module_index: moduleIndex,
              lesson_index: lessonInModuleIndex,
              title: lesson.title,
              objectives: lesson.objectives,
              markdown_content: null,
            });

          if (insertError) {
            console.error('Error creating lesson:', insertError);
          }
        }
      }

      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'generating_lessons' })
        .eq('id', courseId);

      if (updateError) {
        console.error('Error updating course status:', updateError);
      }

      navigate(`/courses/${courseId}/generate`, { state: { autoStart: true } });
    } catch (error) {
      console.error('Error generating lessons:', error);
      setGenerating(false);
    }
  };

  const handleThumbnailUploadComplete = async (url: string | null) => {
    if (!courseId) return;

    try {
      const { error } = await supabase
        .from('courses')
        .update({ thumbnail_url: url })
        .eq('id', courseId);

      if (error) {
        console.error('Error updating course thumbnail:', error);
        toast.error('Failed to update course thumbnail');
        return;
      }

      setCourse(prev => prev ? { ...prev, thumbnail_url: url } : null);
      toast.success(url ? 'Thumbnail updated successfully' : 'Thumbnail removed');
    } catch (error) {
      console.error('Unexpected error updating thumbnail:', error);
      toast.error('Failed to update course thumbnail');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-secondary-light/10 to-accent-yellow/10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <p className="mt-6 font-body text-lg text-neutral-text-muted font-semibold">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const outline = course.outline_json;

  if (!outline || !outline.modules) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-secondary-light/10 to-accent-yellow/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-text mb-2">Course Outline Not Found</h2>
          <p className="text-neutral-text-muted mb-6">
            This course doesn't have an outline yet. Please go back and create one.
          </p>
          <Button onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-surface">
      <header className="bg-neutral-bg border-b border-neutral-border shadow-soft px-3 py-4 md:px-6 md:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-2 md:gap-4 mb-4">
            <button
              onClick={() => navigate('/courses')}
              className="p-2 md:p-3 hover:bg-neutral-surface rounded-xl transition-all active:scale-95 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-neutral-text" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl md:text-display-md text-neutral-text leading-tight">{course.title}</h1>
              <p className="font-body text-sm md:text-base text-neutral-text-muted mt-1 line-clamp-2">{course.description}</p>
            </div>
          </div>

          {/* Thumbnail - full width on mobile */}
          <div className="mb-4">
            <ThumbnailUpload
              courseId={course.id}
              currentThumbnailUrl={course.thumbnail_url}
              onUploadComplete={handleThumbnailUploadComplete}
              disabled={generating || saving}
            />
          </div>

          {/* Stats - horizontal scroll on mobile */}
          <div className="flex gap-2 md:gap-4 overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-body text-xs md:text-sm text-neutral-text-muted hidden md:inline">Level:</span>
              <span className="px-2.5 py-1.5 md:px-4 md:py-2 bg-primary-light text-primary rounded-full font-body font-bold text-xs md:text-sm border border-primary/20">
                {course.level}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-body text-xs md:text-sm text-neutral-text-muted hidden md:inline">Duration:</span>
              <span className="px-2.5 py-1.5 md:px-4 md:py-2 bg-gradient-to-br from-accent-yellow/30 to-accent-orange/30 text-neutral-text rounded-full font-body font-bold text-xs md:text-sm border border-accent-yellow/30">
                {outline.estimatedDurationHours || 0}h
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-body text-xs md:text-sm text-neutral-text-muted hidden md:inline">Lessons:</span>
              <span className="px-2.5 py-1.5 md:px-4 md:py-2 bg-secondary-light/50 text-secondary-dark rounded-full font-body font-bold text-xs md:text-sm border border-secondary/20">
                {outline.estimatedLessonsCount || 0} lessons
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-4 md:px-8 md:py-8">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg md:text-display-sm text-neutral-text">Course Outline</h2>
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="secondary"
              onClick={handleAddModule}
              disabled={saving}
              size="sm"
              className="flex items-center gap-1.5 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span> Module
            </Button>
            <Button
              onClick={handleGenerateLessons}
              disabled={generating || saving}
              size="sm"
              className="flex items-center gap-1.5 text-sm md:text-base"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {outline.modules.map((module, moduleIndex) => (
            <Card key={moduleIndex} className="overflow-hidden !p-3 md:!p-6">
              <div className="flex items-start gap-2 md:gap-4">
                <button
                  onClick={() => toggleModule(moduleIndex)}
                  className="flex-shrink-0 p-1.5 md:p-2 hover:bg-neutral-surface rounded-lg transition-colors"
                >
                  {expandedModules.has(moduleIndex) ? (
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-neutral-text-muted" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5 md:mb-2">
                    <span className="px-2.5 py-1 md:px-4 md:py-2 bg-primary rounded-full text-white font-body font-bold text-xs md:text-sm shadow-soft">
                      Module {moduleIndex + 1}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingModule({ index: moduleIndex, module })}
                        className="p-1.5 md:p-2 hover:bg-primary-light/20 text-primary rounded-lg transition-colors"
                        title="Edit module"
                      >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModuleConfirm(moduleIndex)}
                        className="p-1.5 md:p-2 hover:bg-accent-red/10 text-accent-red rounded-lg transition-colors"
                        title="Delete module"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display text-base md:text-xl font-bold text-neutral-text mb-1 md:mb-2">
                    {module.title}
                  </h3>
                  <p className="font-body text-sm md:text-base text-neutral-text-muted line-clamp-2">{module.description}</p>
                </div>
              </div>

              {expandedModules.has(moduleIndex) && (
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-neutral-border space-y-2 md:space-y-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lessonIndex}
                      className="flex items-start gap-2 md:gap-3 p-2.5 md:p-4 bg-neutral-surface rounded-lg transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary-light flex items-center justify-center">
                        <span className="font-body font-bold text-xs md:text-sm text-primary">
                          {lessonIndex + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body font-semibold text-sm md:text-base text-neutral-text mb-1 md:mb-2">
                          {lesson.title}
                        </h4>
                        {lesson.objectives && lesson.objectives.length > 0 && (
                          <ul className="space-y-0.5 md:space-y-1 hidden md:block">
                            {lesson.objectives.slice(0, 2).map((objective, objIndex) => (
                              <li key={objIndex} className="font-body text-xs md:text-sm text-neutral-text-muted flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>
                                <span className="line-clamp-1">{objective}</span>
                              </li>
                            ))}
                            {lesson.objectives.length > 2 && (
                              <li className="font-body text-xs text-neutral-text-muted">
                                +{lesson.objectives.length - 2} more objectives
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingLesson({ moduleIndex, lessonIndex, lesson })}
                          className="p-1.5 md:p-2 hover:bg-primary-light/20 text-primary rounded-lg transition-colors"
                          title="Edit lesson"
                        >
                          <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteLessonConfirm({ moduleIndex, lessonIndex })}
                          className="p-1.5 md:p-2 hover:bg-accent-red/10 text-accent-red rounded-lg transition-colors"
                          title="Delete lesson"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddLesson(moduleIndex)}
                    className="w-full flex items-center justify-center gap-1.5 p-2.5 md:p-3 border-2 border-dashed border-neutral-border hover:border-primary hover:bg-primary-light/10 rounded-lg transition-colors text-neutral-text-muted hover:text-primary font-body font-semibold text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Add Lesson
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="mt-6 md:mt-8 bg-primary-light border-2 md:border-3 border-primary/30 !p-4 md:!p-6">
          <div className="text-center">
            <h3 className="font-display text-lg md:text-display-md text-neutral-text mb-2 md:mb-3">
              Ready to Generate Content?
            </h3>
            <p className="font-body text-sm md:text-body-lg text-neutral-text-muted mb-4 md:mb-6">
              Create detailed content for all {outline.estimatedLessonsCount} lessons using AI.
            </p>
            <Button
              onClick={handleGenerateLessons}
              disabled={generating}
              size="lg"
              className="flex items-center gap-2 mx-auto w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate All Lessons
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {editingModule && (
        <EditModuleModal
          isOpen={true}
          onClose={() => setEditingModule(null)}
          module={editingModule.module}
          onSave={(updatedModule) => {
            handleUpdateModule(editingModule.index, updatedModule);
            setEditingModule(null);
          }}
        />
      )}

      {editingLesson && (
        <EditLessonModal
          isOpen={true}
          onClose={() => setEditingLesson(null)}
          lesson={editingLesson.lesson}
          onSave={(updatedLesson) => {
            handleUpdateLesson(editingLesson.moduleIndex, editingLesson.lessonIndex, updatedLesson);
            setEditingLesson(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteModuleConfirm !== null}
        title="Delete Module"
        message="Are you sure you want to delete this module? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteModuleConfirm !== null && handleDeleteModule(deleteModuleConfirm)}
        onCancel={() => setDeleteModuleConfirm(null)}
      />

      <ConfirmDialog
        isOpen={deleteLessonConfirm !== null}
        title="Delete Lesson"
        message="Are you sure you want to delete this lesson?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteLessonConfirm && handleDeleteLesson(deleteLessonConfirm.moduleIndex, deleteLessonConfirm.lessonIndex)}
        onCancel={() => setDeleteLessonConfirm(null)}
      />
    </div>
  );
}
