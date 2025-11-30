import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, CheckCircle, Circle, Edit2, Sparkles, Save, X, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { supabase } from '../lib/supabase';
import { regenerateLesson } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import 'highlight.js/styles/github-dark.css';

interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  markdown_content: string | null;
  lesson_status: string;
  module_index: number;
  lesson_index: number;
}

interface Course {
  id: string;
  title: string;
  topic: string;
  level: string;
  outline_json: any;
}

export function LessonPreview() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    if (!courseId) return;

    try {
      const [courseResult, lessonsResult] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
        supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
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
  };

  const currentLesson = lessons[currentLessonIndex];

  const handleEditLesson = () => {
    if (currentLesson) {
      setEditedContent(currentLesson.markdown_content || '');
      setEditMode(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentLesson) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          markdown_content: editedContent,
          lesson_status: 'edited',
          is_manually_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentLesson.id);

      if (error) throw error;

      setLessons((prev) =>
        prev.map((l) =>
          l.id === currentLesson.id
            ? { ...l, markdown_content: editedContent, lesson_status: 'edited', is_manually_edited: true }
            : l
        )
      );
      setEditMode(false);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Failed to save lesson. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateLesson = async () => {
    if (!currentLesson || !course) return;

    setRegenerating(true);
    setShowRegenerateModal(false);

    try {
      const module = course.outline_json.modules[currentLesson.module_index];

      const result = await regenerateLesson({
        lessonId: currentLesson.id,
        instructions: regenerateInstructions || undefined,
        courseContext: {
          topic: course.topic,
          level: course.level,
        },
        moduleTitle: module.title,
        lessonTitle: currentLesson.title,
        objectives: currentLesson.objectives,
        currentContent: currentLesson.markdown_content || undefined,
      });

      setLessons((prev) =>
        prev.map((l) =>
          l.id === currentLesson.id ? { ...l, markdown_content: result.content, lesson_status: 'edited' } : l
        )
      );

      setRegenerateInstructions('');
      await loadData();
    } catch (error: any) {
      console.error('Error regenerating lesson:', error);
      toast.error(error.message || 'Failed to regenerate lesson. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleApproveLesson = async () => {
    if (!currentLesson) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ lesson_status: 'approved' })
        .eq('id', currentLesson.id);

      if (error) throw error;

      setLessons((prev) =>
        prev.map((l) => (l.id === currentLesson.id ? { ...l, lesson_status: 'approved' } : l))
      );
    } catch (error) {
      console.error('Error approving lesson:', error);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Approve all lessons? This will mark all lessons as ready for publishing.')) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ lesson_status: 'approved' })
        .eq('course_id', courseId);

      if (error) throw error;

      setLessons((prev) => prev.map((l) => ({ ...l, lesson_status: 'approved' })));
    } catch (error) {
      console.error('Error approving all lessons:', error);
      toast.error('Failed to approve all lessons. Please try again.');
    }
  };

  const handlePublishCourse = async () => {
    const unapprovedCount = lessons.filter((l) => l.lesson_status !== 'approved').length;

    if (unapprovedCount > 0) {
      if (!confirm(`${unapprovedCount} lesson(s) are not approved yet. Publish anyway?`)) return;
    }

    setPublishing(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'published' })
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Course published successfully!');
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Error publishing course:', error);
      toast.error('Failed to publish course. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

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

  const approvedCount = lessons.filter((l) => l.lesson_status === 'approved').length;
  const progressPercentage = lessons.length > 0 ? (approvedCount / lessons.length) * 100 : 0;

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

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-neutral-text-muted mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-neutral-text mb-2">No lessons available</h2>
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
      <aside className="w-80 bg-neutral-bg border-r border-neutral-border overflow-y-auto">
        <div className="p-4 border-b-2 border-neutral-border sticky top-0 bg-neutral-bg z-10">
          <button
            onClick={() => navigate(`/courses/${courseId}/outline`)}
            className="flex items-center gap-2 text-neutral-text-muted hover:text-neutral-text mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Outline</span>
          </button>
          <h2 className="font-display text-lg font-bold text-neutral-text mb-2">{course.title}</h2>
          <div className="text-sm font-body text-neutral-text-muted mb-2">
            {approvedCount} / {lessons.length} lessons approved
          </div>
          <div className="w-full bg-neutral-surface rounded-full h-2">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
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
                    const globalIndex = lessons.findIndex((l) => l.id === lesson.id);
                    const isActive = globalIndex === currentLessonIndex;
                    const isApproved = lesson.lesson_status === 'approved';

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
                        {isApproved ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-neutral-text-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-body text-sm font-semibold ${
                              isActive ? 'text-primary' : 'text-neutral-text'
                            } truncate`}
                          >
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

        <div className="p-4 border-t-2 border-neutral-border sticky bottom-0 bg-neutral-bg">
          <Button onClick={handleApproveAll} variant="secondary" className="w-full mb-2">
            Approve All Lessons
          </Button>
          <Button onClick={handlePublishCourse} className="w-full" disabled={publishing}>
            {publishing ? 'Publishing...' : 'Publish Course'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-12">
          {/* Lesson Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-primary-light text-primary rounded-full font-body font-semibold text-sm">
                Module {currentLesson.module_index + 1}
              </span>
              <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-full font-body text-sm">
                Lesson {currentLesson.lesson_index + 1}
              </span>
              {currentLesson.lesson_status === 'approved' && (
                <span className="px-3 py-1 bg-green-500/20 text-green-600 rounded-full font-body font-semibold text-sm flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>
            <h1 className="font-display text-display-lg text-neutral-text mb-4">{currentLesson.title}</h1>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {!editMode ? (
                <>
                  <Button variant="secondary" onClick={handleEditLesson} className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit Manually
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRegenerateModal(true)}
                    disabled={regenerating}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {regenerating ? 'Regenerating...' : 'Regenerate with AI'}
                  </Button>
                  {currentLesson.lesson_status !== 'approved' && (
                    <Button onClick={handleApproveLesson} className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Approve Lesson
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditMode(false);
                      setEditedContent('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Lesson Content */}
          {editMode ? (
            <div>
              <label className="block font-body font-semibold text-neutral-text mb-2">Lesson Content (Markdown)</label>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-96 px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-mono text-sm text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg transition-all resize-y"
              />
            </div>
          ) : (
            <Card className="prose prose-lg max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} className="markdown-content">
                {currentLesson.markdown_content || '*No content available*'}
              </ReactMarkdown>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t-2 border-neutral-border flex justify-between">
            <Button
              variant="secondary"
              disabled={currentLessonIndex === 0}
              onClick={() => setCurrentLessonIndex(currentLessonIndex - 1)}
            >
              Previous Lesson
            </Button>
            <Button
              disabled={currentLessonIndex === lessons.length - 1}
              onClick={() => setCurrentLessonIndex(currentLessonIndex + 1)}
            >
              Next Lesson
            </Button>
          </div>
        </div>
      </main>

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRegenerateModal(false)}
          title="Regenerate Lesson with AI"
          size="md"
        >
          <div className="space-y-4">
            <p className="font-body text-neutral-text-muted">
              Provide optional instructions to guide the AI in regenerating this lesson.
            </p>
            <div>
              <label className="block font-body font-semibold text-neutral-text mb-2">
                Instructions (optional)
              </label>
              <textarea
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                placeholder="e.g., Make it more detailed, add more examples, simplify the language..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowRegenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegenerateLesson} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
