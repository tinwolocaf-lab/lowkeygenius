import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { MarketplaceCourseCard } from '../components/MarketplaceCourseCard';
import { EnrollmentModal } from '../components/EnrollmentModal';
import { useEnrollment } from '../hooks/useEnrollment';
import type { CourseLevel } from '../types/database';

interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  level: CourseLevel;
  estimated_duration_hours: number | null;
  creator_display_name: string | null;
  published_at: string | null;
  enrollment_count: number;
  owner_id: string;
}

interface EnrollmentStatusMap {
  [courseId: string]: boolean;
}

const LEVEL_OPTIONS: { value: CourseLevel | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

export function Marketplace() {
  const { user } = useAuth();
  const { getEnrollmentStatus } = useEnrollment();
  
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<PublicCourse[]>([]);
  const [enrollmentStatuses, setEnrollmentStatuses] = useState<EnrollmentStatusMap>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<CourseLevel | ''>('');
  const [selectedCourse, setSelectedCourse] = useState<PublicCourse | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);


  const loadPublicCourses = useCallback(async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, topic, level, estimated_duration_hours, creator_display_name, published_at, owner_id')
        .eq('is_public', true)
        .order('published_at', { ascending: false });

      if (coursesError) throw coursesError;

      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            enrollment_count: count || 0,
          };
        })
      );

      setCourses(coursesWithCounts);
      setFilteredCourses(coursesWithCounts);

      if (user) {
        const statuses: EnrollmentStatusMap = {};
        await Promise.all(
          coursesWithCounts.map(async (course) => {
            const status = await getEnrollmentStatus(course.id);
            statuses[course.id] = status.isEnrolled;
          })
        );
        setEnrollmentStatuses(statuses);
      }
    } catch (error) {
      console.error('Error loading public courses:', error);
      setCourses([]);
      setFilteredCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user, getEnrollmentStatus]);

  useEffect(() => {
    loadPublicCourses();
  }, [loadPublicCourses]);

  useEffect(() => {
    let filtered = [...courses];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.topic.toLowerCase().includes(query) ||
          (course.description?.toLowerCase().includes(query) ?? false)
      );
    }

    if (levelFilter) {
      filtered = filtered.filter((course) => course.level === levelFilter);
    }

    setFilteredCourses(filtered);
  }, [courses, searchQuery, levelFilter]);

  const handleEnrollClick = async (course: PublicCourse) => {
    setSelectedCourse(course);
    setShowEnrollModal(true);
  };

  const handleEnrollmentComplete = () => {
    setShowEnrollModal(false);
    setSelectedCourse(null);
    loadPublicCourses();
  };

  const handleContinueLearning = (courseId: string) => {
    window.location.href = `/courses/${courseId}`;
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
      <div className="mb-8">
        <h1 className="font-display text-display-lg text-neutral-text mb-2">Marketplace</h1>
        <p className="font-body text-body-md text-neutral-text-muted">
          Discover and enroll in courses created by the community
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-text-muted" />
          <Input
            type="text"
            placeholder="Search by title or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-text-muted pointer-events-none" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as CourseLevel | '')}
            className="w-full md:w-48 pl-12 pr-4 py-4 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary focus:bg-white focus:shadow-soft transition-all appearance-none cursor-pointer"
          >
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <p className="font-body text-sm text-neutral-text-muted">
          {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} found
        </p>
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-surface rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-neutral-text-muted" />
            </div>
            <p className="font-body text-body-md text-neutral-text-muted mb-2">
              {courses.length === 0
                ? 'No public courses available yet.'
                : 'No courses match your search criteria.'}
            </p>
            {searchQuery || levelFilter ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLevelFilter('');
                }}
                className="font-body text-primary hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <MarketplaceCourseCard
              key={course.id}
              course={course}
              isEnrolled={enrollmentStatuses[course.id] || false}
              isOwner={user?.id === course.owner_id}
              onEnroll={() => handleEnrollClick(course)}
              onContinueLearning={() => handleContinueLearning(course.id)}
            />
          ))}
        </div>
      )}

      {selectedCourse && (
        <EnrollmentModal
          isOpen={showEnrollModal}
          onClose={() => {
            setShowEnrollModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
          onEnrollmentComplete={handleEnrollmentComplete}
        />
      )}
    </div>
  );
}
