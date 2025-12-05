import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Plus, MoreVertical, Pencil, Trash2, Volume2, Globe, AlertTriangle, ImageIcon, AlertCircle, Skull } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useCoursePublishing } from '../hooks/useCoursePublishing';
import { useHorrorTheme } from '../hooks/useHorrorTheme';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ThumbnailUpload } from '../components/ThumbnailUpload';
import toast from 'react-hot-toast';

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
  is_public?: boolean;
  total_lessons?: number;
  completed_lessons?: number;
  creator_display_name?: string | null;
  isEnrolled?: boolean; // true if user enrolled in this public course (not owner)
  thumbnail_url?: string | null;
}

/**
 * CourseThumbnail component with loading skeleton
 * Requirements: 3.1 - Show thumbnail if exists
 * Requirements: 3.3 - Display loading skeleton until image loads
 */
function CourseThumbnail({ url, title }: { url: string; title: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <ImageIcon className="w-12 h-12 text-primary/30" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-surface animate-pulse" />
      )}
      <img
        src={url}
        alt={`${title} thumbnail`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </>
  );
}

export function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscription = useSubscription();
  const { isAudioEnabled } = subscription;
  const { publishCourse, requestDeletion, isLoading: isPublishingLoading } = useCoursePublishing();
  const { isHorror } = useHorrorTheme();
  const [activeTab, setActiveTab] = useState<'created' | 'learning'>('created');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ courseId: string; title: string; thumbnailUrl: string | null } | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deletionRequestModal, setDeletionRequestModal] = useState<{ courseId: string; title: string } | null>(null);
  const [deletionMessage, setDeletionMessage] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!user) return;

    try {
      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('courses')
          .select()
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .returns<Course[]>();

        if (error) throw error;
        setCourses(data || []);
      } else {
        // "I'm Learning" tab: includes both courses with progress AND enrolled public courses
        // Requirements: 3.1 - enrolled courses appear in learning list
        
        // Get courses from user_progress (courses user has started learning)
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('course_id')
          .eq('user_id', user.id)
          .returns<{ course_id: string }[]>();

        if (progressError) throw progressError;

        const progressCourseIds = [...new Set(progressData?.map(p => p.course_id) || [])];

        // Get enrolled public courses (Requirements: 3.1)
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .returns<{ course_id: string }[]>();

        if (enrollmentError) throw enrollmentError;

        const enrolledCourseIds = enrollmentData?.map(e => e.course_id) || [];

        // Combine both sets of course IDs (remove duplicates)
        const allCourseIds = [...new Set([...progressCourseIds, ...enrolledCourseIds])];

        if (allCourseIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select()
          .in('id', allCourseIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .returns<Course[]>();

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

            // Check if this is an enrolled course (not owned by user)
            const isEnrolled = enrolledCourseIds.includes(course.id) && course.owner_id !== user.id;

            return {
              ...course,
              total_lessons: lessons?.length || 0,
              completed_lessons: completedProgress?.length || 0,
              isEnrolled,
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
  }, [user, activeTab]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

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

  const handleSaveEdit = async () => {
    if (!editModal || !newTitle.trim()) return;

    const updates: { title: string; thumbnail_url?: string | null } = { 
      title: newTitle.trim() 
    };
    
    // Only include thumbnail_url if it changed
    if (newThumbnailUrl !== editModal.thumbnailUrl) {
      updates.thumbnail_url = newThumbnailUrl;
    }

    const { error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', editModal.courseId);

    if (!error) {
      setCourses(courses.map(c =>
        c.id === editModal.courseId 
          ? { ...c, title: newTitle.trim(), thumbnail_url: newThumbnailUrl } 
          : c
      ));
      toast.success('Course updated successfully');
      setEditModal(null);
      setNewTitle('');
      setNewThumbnailUrl(null);
    } else {
      toast.error('Failed to update course');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;

    // Check if course is public - public courses cannot be deleted directly
    const courseToDelete = courses.find(c => c.id === deleteModal);
    if (courseToDelete?.is_public) {
      console.error('Cannot delete public course directly. Use deletion request workflow.');
      setDeleteModal(null);
      return;
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', deleteModal);

    if (!error) {
      setCourses(courses.filter(c => c.id !== deleteModal));
      setDeleteModal(null);
    }
  };

  const openEditModal = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditModal({ 
      courseId: course.id, 
      title: course.title, 
      thumbnailUrl: course.thumbnail_url ?? null 
    });
    setNewTitle(course.title);
    setNewThumbnailUrl(course.thumbnail_url ?? null);
    setShowMenu(null);
  };

  const openDeleteModal = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal(courseId);
    setShowMenu(null);
  };

  const openDeletionRequestModal = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletionRequestModal({ courseId: course.id, title: course.title });
    setDeletionMessage('');
    setShowMenu(null);
  };

  /**
   * Handle making a course public
   * Requirements: 1.4, 1.5
   */
  const handleMakePublic = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(null);

    const result = await publishCourse(courseId);
    
    if (result.success) {
      toast.success('Course published to marketplace!');
      // Update local state to reflect the change
      setCourses(courses.map(c =>
        c.id === courseId ? { ...c, is_public: true } : c
      ));
    } else {
      toast.error(result.error || 'Failed to publish course');
    }
  };

  /**
   * Handle submitting a deletion request
   * Requirements: 5.1
   * Note: Deletion requests are stored in DB and admins handle them manually via email
   */
  const handleDeletionRequest = async () => {
    if (!deletionRequestModal) return;

    const result = await requestDeletion(deletionRequestModal.courseId, deletionMessage || undefined);
    
    if (result.success) {
      toast.success('Deletion request submitted. Our team will review it and contact you.');
      setDeletionRequestModal(null);
      setDeletionMessage('');
    } else {
      toast.error(result.error || 'Failed to submit deletion request');
    }
  };

  /**
   * Handle new course creation with quota check
   * Requirements: 1.1, 3.2, 3.3 - Check quota before navigating to onboarding
   */
  const handleNewCourse = () => {
    if (!subscription.canCreateCourse) {
      if (subscription.blockingReason === 'active_generation' && subscription.activeGenerationCourse) {
        toast.error('Finish your current course before starting another.');
        const path = subscription.activeGenerationCourse.status === 'generating_lessons'
          ? `/courses/${subscription.activeGenerationCourse.id}/generate`
          : `/courses/${subscription.activeGenerationCourse.id}/outline`;
        navigate(path);
      } else {
        setShowUpgradeModal(true);
      }
      return;
    }
    navigate('/onboarding');
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
        <h1 className={`font-display text-display-lg text-neutral-text ${isHorror ? 'horror-text-glitch' : ''}`}>
          {isHorror ? 'My Grimoires' : 'My Courses'}
        </h1>
        <Button
          onClick={handleNewCourse}
          className={`flex items-center gap-2 ${isHorror ? 'horror-blood-drip horror-glitch' : ''}`}
        >
          <Plus className="w-5 h-5" />
          {isHorror ? 'Summon' : 'New Course'}
        </Button>
      </div>

      <div className="mb-6">
        <div className={`flex gap-4 border-b-2 ${isHorror ? 'border-primary-dark' : 'border-neutral-border'}`}>
          <button
            onClick={() => setActiveTab('created')}
            className={`px-4 py-3 font-body font-bold transition-colors ${
              activeTab === 'created'
                ? 'text-primary border-b-4 border-primary'
                : 'text-neutral-text-muted hover:text-neutral-text'
            } ${isHorror ? 'horror-flicker' : ''}`}
          >
            {isHorror ? 'My Creations' : 'Created by Me'}
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-3 font-body font-bold transition-colors ${
              activeTab === 'learning'
                ? 'text-primary border-b-4 border-primary'
                : 'text-neutral-text-muted hover:text-neutral-text'
            } ${isHorror ? 'horror-flicker' : ''}`}
          >
            {isHorror ? 'Dark Studies' : "I'm Learning"}
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className={isHorror ? 'horror-blood-drip-static' : ''}>
          <div className="text-center py-12">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isHorror ? 'bg-primary-dark/30' : 'bg-neutral-surface'}`}>
              {isHorror ? <Skull className="w-8 h-8 text-primary" /> : <BookOpen className="w-8 h-8 text-neutral-text-muted" />}
            </div>
            <p className="font-body text-body-md text-neutral-text-muted mb-4">
              {activeTab === 'created'
                ? (isHorror ? 'No tomes yet. Summon your first grimoire!' : 'No courses yet. Create your first course to get started!')
                : (isHorror ? 'No dark studies in progress. Seek forbidden knowledge!' : 'No courses in progress. Start learning by exploring available courses!')}
            </p>
            {activeTab === 'created' && (
              <Button onClick={handleNewCourse} className={isHorror ? 'horror-blood-drip horror-glitch' : ''}>
                {isHorror ? 'Summon Your First Tome' : 'Create Your First Course'}
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
              className={`cursor-pointer relative overflow-hidden ${isHorror ? 'horror-blood-drip horror-glitch' : ''}`}
            >
              {/* Course Thumbnail - Requirements 3.1, 3.2, 3.3 */}
              <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden">
                {course.thumbnail_url ? (
                  <CourseThumbnail url={course.thumbnail_url} title={course.title} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-primary/30" />
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between mb-3">
                {getStatusBadge(course.status)}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-neutral-text-muted">
                    <Clock className="w-4 h-4" />
                    <span className="font-body text-sm">
                      {course.estimated_duration_hours || '?'}h
                    </span>
                  </div>
                  {/* Show menu for created courses only */}
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
                            {/* Make Public option - show only for ready/published courses that are not public (Requirements 1.4, 1.5) */}
                            {!course.is_public && (course.status === 'ready' || course.status === 'published') && (
                              <button
                                onClick={(e) => handleMakePublic(course.id, e)}
                                disabled={isPublishingLoading}
                                className="w-full px-4 py-2 text-left hover:bg-neutral-surface flex items-center gap-2 font-body text-sm disabled:opacity-50"
                              >
                                <Globe className="w-4 h-4" />
                                Make Public
                              </button>
                            )}
                            <button
                              onClick={(e) => openEditModal(course, e)}
                              className="w-full px-4 py-2 text-left hover:bg-neutral-surface flex items-center gap-2 font-body text-sm"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            {/* Delete option - hide for public courses (Requirement 1.2) */}
                            {!course.is_public && (
                              <button
                                onClick={(e) => openDeleteModal(course.id, e)}
                                className="w-full px-4 py-2 text-left hover:bg-accent-red/10 text-accent-red flex items-center gap-2 font-body text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                        {/* Request Deletion option - show only for public courses owned by user (Requirement 5.1) */}
                        {course.is_public && (
                          <button
                            onClick={(e) => openDeletionRequestModal(course, e)}
                            className="w-full px-4 py-2 text-left hover:bg-accent-yellow/10 text-accent-yellow flex items-center gap-2 font-body text-sm"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Request Deletion
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-neutral-text mb-2">
                {course.title}
              </h3>
              {/* Show creator name for enrolled public courses */}
              {course.isEnrolled && course.creator_display_name && (
                <p className="font-body text-xs text-primary mb-1">
                  by {course.creator_display_name}
                </p>
              )}
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

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl font-bold text-neutral-text mb-6">
              Edit Course
            </h3>
            <div className="space-y-6">
              <Input
                label="Course Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter course title"
                autoFocus
              />
              <ThumbnailUpload
                courseId={editModal.courseId}
                currentThumbnailUrl={newThumbnailUrl}
                onUploadComplete={(url) => setNewThumbnailUrl(url)}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSaveEdit}
                className="flex-1"
                disabled={!newTitle.trim()}
              >
                Save Changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditModal(null);
                  setNewTitle('');
                  setNewThumbnailUrl(null);
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

      {/* Deletion Request Modal for public courses (Requirement 5.1) */}
      {deletionRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="font-display text-xl font-bold text-neutral-text mb-4">
              Request Course Deletion
            </h3>
            <p className="font-body text-neutral-text-muted mb-4">
              Since "{deletionRequestModal.title}" is a public course, our team must approve its deletion. 
              If learners are currently enrolled, the request will be held until they unenroll.
            </p>
            <p className="font-body text-sm text-neutral-text-muted mb-4">
              You can also contact us directly at{' '}
              <a 
                href="mailto:contact@Lowkeygenius.study" 
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                contact@Lowkeygenius.study
              </a>
            </p>
            <div className="mb-4">
              <label className="block font-body text-sm font-semibold text-neutral-text mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deletionMessage}
                onChange={(e) => setDeletionMessage(e.target.value)}
                placeholder="Explain why you want to delete this course..."
                className="w-full px-4 py-3 bg-neutral-surface border-2 border-neutral-border rounded-2xl font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDeletionRequest}
                disabled={isPublishingLoading}
                className="flex-1 bg-accent-yellow hover:bg-accent-yellow/90 text-neutral-text"
              >
                {isPublishingLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeletionRequestModal(null);
                  setDeletionMessage('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Upgrade Modal - Requirements 1.1, 3.2, 3.3 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-neutral-text">
                  Course Limit Reached
                </h3>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-neutral-text-muted mb-2">
              You've used {subscription.coursesUsed} / {subscription.coursesLimit === Infinity ? '∞' : subscription.coursesLimit} published/enrolled courses on your {subscription.planType} plan.
            </p>
            <p className="text-neutral-text-muted mb-6">
              Upgrade to create more courses and unlock additional features.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/pricing')}
                className="flex-1 bg-accent-green hover:bg-accent-green/90"
              >
                View Plans
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowUpgradeModal(false)}
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
