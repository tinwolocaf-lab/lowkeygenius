import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, TrendingUp, Clock, AlertCircle, Crown, ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useSubscription } from '../hooks/useSubscription';

interface Course {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  estimated_duration_hours: number | null;
  created_at: string;
  thumbnail_url: string | null;
}

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

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const subscription = useSubscription();
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    // Fetch recent courses for display (limited to 3)
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (coursesError) {
      console.error('Error loading courses:', coursesError);
    } else {
      setCourses(coursesData || []);
    }

    // Fetch total course count separately
    const { count, error: countError } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      console.error('Error loading course count:', countError);
    } else {
      setTotalCourses(count || 0);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleNewCourse = () => {
    if (!subscription.canCreateCourse) {
      setShowUpgradeModal(true);
      return;
    }
    navigate('/onboarding');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft_outline: { label: 'Draft', color: 'bg-neutral-text-muted' },
      generating_lessons: { label: 'Generating', color: 'bg-accent-yellow' },
      ready: { label: 'Ready', color: 'bg-accent-green' },
      published: { label: 'Published', color: 'bg-secondary' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft_outline;

    return (
      <span className={`px-4 py-2 ${config.color} text-white rounded-pill font-body font-bold text-xs shadow-soft`}>
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-display-xl text-neutral-text mb-3">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </h1>
        <p className="font-body text-body-xl text-neutral-text-muted">
          Ready to learn something new today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-4 shadow-soft">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase whitespace-nowrap">Current Plan</p>
              <p className="font-display text-2xl font-bold text-neutral-text">{subscription.planType}</p>
            </div>
          </div>
        </Card>

        <Card className={subscription.coursesUsed >= subscription.coursesLimit ? 'border-2 border-red-500' : ''}>
          <div className="flex items-center gap-4">
            <div className={`bg-gradient-to-br rounded-3xl p-4 shadow-soft ${
              subscription.coursesUsed >= subscription.coursesLimit
                ? 'from-red-500 to-red-700'
                : subscription.coursesUsed / subscription.coursesLimit > 0.8
                ? 'from-accent-yellow to-accent-orange'
                : 'from-accent-yellow to-accent-orange'
            }`}>
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase whitespace-nowrap">
                {subscription.planType === 'FREE' ? 'Courses Used' : 'Courses This Period'}
              </p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {subscription.isLoading ? '...' : `${subscription.coursesUsed} / ${subscription.coursesLimit === Infinity ? '∞' : subscription.coursesLimit}`}
              </p>
            </div>
          </div>
          {subscription.coursesUsed >= subscription.coursesLimit && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Limit reached</span>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-secondary to-secondary-dark rounded-3xl p-4 shadow-soft">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-body text-sm text-neutral-text-muted font-semibold uppercase whitespace-nowrap">Total Courses</p>
              <p className="font-display text-2xl font-bold text-neutral-text">
                {loading ? '...' : totalCourses}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {subscription.planType === 'FREE' && (
        <Card className="mb-6 bg-gradient-to-r from-accent-yellow/20 to-accent-orange/20 border-2 border-accent-orange/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Crown className="w-12 h-12 text-accent-orange" />
              <div>
                <h3 className="font-display text-xl font-bold text-neutral-text mb-1">
                  Unlock More Courses
                </h3>
                <p className="font-body text-neutral-text-muted">
                  Upgrade to create 5-30+ courses per month with advanced features
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-accent-green hover:bg-accent-green/90 whitespace-nowrap"
            >
              View Plans
            </Button>
          </div>
        </Card>
      )}

      <Card className="mb-10 bg-neutral-bg border-2 border-neutral-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-display-md text-neutral-text mb-3">
              {courses.length === 0 ? 'Create Your First Course' : 'Create Another Course'}
            </h2>
            <p className="font-body text-body-lg text-neutral-text-muted">
              Generate a personalized AI-powered course on any topic in minutes
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleNewCourse}
            className="flex items-center gap-2 whitespace-nowrap"
            disabled={!subscription.canCreateCourse}
          >
            <Plus className="w-6 h-6" />
            New Course
          </Button>
        </div>
      </Card>

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
            <p className="text-neutral-text-muted mb-6">
              You've reached your {subscription.planType} plan limit of {subscription.coursesLimit} course{subscription.coursesLimit > 1 ? 's' : ''}.
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

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-display-md text-neutral-text">Recent Courses</h2>
          {courses.length > 0 && (
            <button
              onClick={() => navigate('/courses')}
              className="font-body text-primary font-bold hover:underline text-lg"
            >
              View All
            </button>
          )}
        </div>

        {loading ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          </Card>
        ) : courses.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-light to-primary-soft rounded-full mb-6 shadow-soft">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
              <p className="font-body text-body-lg text-neutral-text-muted mb-6">
                You haven't created any courses yet
              </p>
              <Button variant="primary" size="lg" onClick={() => navigate('/onboarding')}>
                Create Your First Course
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                hover
                onClick={() => handleCourseClick(course)}
                className="cursor-pointer overflow-hidden"
              >
                {/* Course Thumbnail */}
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
                  <div className="flex items-center gap-1 text-neutral-text-muted">
                    <Clock className="w-4 h-4" />
                    <span className="font-body text-sm">
                      {course.estimated_duration_hours || '?'}h
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold text-neutral-text mb-2">
                  {course.title}
                </h3>
                <p className="font-body text-sm text-neutral-text-muted mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-primary-light text-primary rounded-pill font-body font-bold text-xs border-2 border-primary/20">
                    {course.level}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
