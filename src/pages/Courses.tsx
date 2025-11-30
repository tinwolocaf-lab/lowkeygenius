import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Plus, MoreVertical, Edit2, Trash2, Volume2 } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface Course {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: string;
  status: string;
  estimated_duration_hours: number | null;
  created_at: string;
  owner_id?: string;
  total_lessons?: number;
  completed_lessons?: number;
}

export function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAudioEnabled } = useSubscription();
  const [activeTab, setActiveTab] = useState<'created' | 'learning'>('created');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{ courseId: string; title: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadCourses();
  }, [user, activeTab]);

  const loadCourses = async () => {
    if (!user) return;

    try {
      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCourses(data || []);
      } else {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('course_id')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        const courseIds = [...new Set(progressData?.map(p => p.course_id) || [])];

        if (courseIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;

        const coursesWithProgress = await Promise.all(
          (coursesData || []).map(async (course) => {
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .eq('course_id', course.id);

            const { data: completedProgress } = await supabase
              .from('user_progress')
              .select('lesson_id')
              .eq('course_id', course.id)
              .eq('user_id', user.id)
              .eq('completed', true);

            return {
              ...course,
              total_lessons: lessons?.length || 0,
              completed_lessons: completedProgress?.length || 0,
            };
          })
        );

        setCourses(coursesWithProgress);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft_outline: { label: 'Draft', color: 'bg-neutral-text-muted' },
      generating_lessons: { label: 'Generating', color: 'bg-accent-yellow' },
      ready: { label: 'Ready', color: 'bg-primary' },
      published: { label: 'Published', color: 'bg-green-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft_outline;

    return (
      <span className={`px-3 py-1 ${config.color} text-white rounded-full font-body font-semibold text-xs`}>
        {config.label}
      </span>
    );
  };

  const handleCourseClick = (course: Course) => {
    if (course.status === 'draft_outline' || course.status === 'ready') {
      navigate(`/courses/${course.id}/outline`);
    } else if (course.status === 'generating_lessons') {
      navigate(`/courses/${course.id}/generate`);
    } else {
      navigate(`/courses/${course.id}`);
    }
  };

  const handleRename = async () => {
    if (!renameModal || !newTitle.trim()) return;

    const { error } = await supabase
      .from('courses')
      .update({ title: newTitle.trim() })
      .eq('id', renameModal.courseId);

    if (!error) {
      setCourses(courses.map(c =>
        c.id === renameModal.courseId ? { ...c, title: newTitle.trim() } : c
      ));
      setRenameModal(null);
      setNewTitle('');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', deleteModal);

    if (!error) {
      setCourses(courses.filter(c => c.id !== deleteModal));
      setDeleteModal(null);
    }
  };

  const openRenameModal = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameModal({ courseId: course.id, title: course.title });
    setNewTitle(course.title);
    setShowMenu(null);
  };

  const openDeleteModal = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal(courseId);
    setShowMenu(null);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display-lg text-neutral-text">My Courses</h1>
        <Button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Course
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex gap-4 border-b-2 border-neutral-border">
          <button
            onClick={() => setActiveTab('created')}
            className={`px-4 py-3 font-body font-bold transition-colors ${
              activeTab === 'created'
                ? 'text-primary border-b-4 border-primary'
                : 'text-neutral-text-muted hover:text-neutral-text'
            }`}
          >
            Created by Me
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-3 font-body font-bold transition-colors ${
              activeTab === 'learning'
                ? 'text-primary border-b-4 border-primary'
                : 'text-neutral-text-muted hover:text-neutral-text'
            }`}
          >
            I'm Learning
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-surface rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-neutral-text-muted" />
            </div>
            <p className="font-body text-body-md text-neutral-text-muted mb-4">
              {activeTab === 'created'
                ? 'No courses yet. Create your first course to get started!'
                : 'No courses in progress. Start learning by exploring available courses!'}
            </p>
            {activeTab === 'created' && (
              <Button onClick={() => navigate('/onboarding')}>
                Create Your First Course
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course.id}
              hover
              onClick={() => handleCourseClick(course)}
              className="cursor-pointer relative"
            >
              <div className="flex items-start justify-between mb-3">
                {getStatusBadge(course.status)}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-neutral-text-muted">
                    <Clock className="w-4 h-4" />
                    <span className="font-body text-sm">
                      {course.estimated_duration_hours || '?'}h
                    </span>
                  </div>
                  {activeTab === 'created' && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === course.id ? null : course.id);
                      }}
                      className="p-1 hover:bg-neutral-surface rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-neutral-text-muted" />
                    </button>
                    {showMenu === course.id && (
                      <div className="absolute right-0 top-full mt-1 bg-neutral-bg shadow-soft rounded-2xl border-2 border-neutral-border z-10 py-2 w-48">
                        {isAudioEnabled && course.status === 'published' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/courses/${course.id}/generate-audio`);
                              setShowMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-neutral-surface flex items-center gap-2 font-body text-sm"
                          >
                            <Volume2 className="w-4 h-4" />
                            Generate Audio
                          </button>
                        )}
                        <button
                          onClick={(e) => openRenameModal(course, e)}
                          className="w-full px-4 py-2 text-left hover:bg-neutral-surface flex items-center gap-2 font-body text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(course.id, e)}
                          className="w-full px-4 py-2 text-left hover:bg-accent-red/10 text-accent-red flex items-center gap-2 font-body text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-neutral-text mb-2">
                {course.title}
              </h3>
              <p className="font-body text-sm text-neutral-text-muted mb-4 line-clamp-2">
                {course.description}
              </p>

              {activeTab === 'learning' && course.total_lessons && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-body text-neutral-text-muted">Progress</span>
                    <span className="font-body font-semibold text-neutral-text">
                      {course.completed_lessons || 0} / {course.total_lessons} lessons
                    </span>
                  </div>
                  <div className="w-full bg-neutral-surface rounded-full h-2">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${((course.completed_lessons || 0) / course.total_lessons) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary-light text-primary rounded-full font-body font-semibold text-xs">
                  {course.level}
                </span>
                <span className="px-3 py-1 bg-neutral-surface text-neutral-text rounded-full font-body text-xs">
                  {course.topic}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {renameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="font-display text-xl font-bold text-neutral-text mb-4">
              Rename Course
            </h3>
            <Input
              label="Course Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleRename}
                className="flex-1"
                disabled={!newTitle.trim()}
              >
                Rename
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setRenameModal(null);
                  setNewTitle('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="font-display text-xl font-bold text-neutral-text mb-4">
              Delete Course
            </h3>
            <p className="font-body text-neutral-text-muted mb-6">
              Are you sure you want to delete this course? This action cannot be undone and will delete all lessons and progress.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                className="flex-1 bg-accent-red hover:bg-accent-red/90"
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDeleteModal(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
