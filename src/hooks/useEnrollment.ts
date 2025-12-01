import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanMonthlyLimit, PlanType } from '../lib/polar';

export interface EnrollmentResult {
  success: boolean;
  error?: string;
}

export interface EnrollmentStatus {
  isEnrolled: boolean;
  enrolledAt?: Date;
}

export interface CanEnrollResult {
  canEnroll: boolean;
  currentCount: number;
  limit: number;
  reason?: 'limit_reached' | 'already_enrolled';
}

interface UseEnrollmentReturn {
  enrollInCourse: (courseId: string) => Promise<EnrollmentResult>;
  unenrollFromCourse: (courseId: string) => Promise<EnrollmentResult>;
  getEnrollmentStatus: (courseId: string) => Promise<EnrollmentStatus>;
  canEnroll: (courseId?: string) => Promise<CanEnrollResult>;
  isLoading: boolean;
}

export function useEnrollment(): UseEnrollmentReturn {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const planType = (profile?.plan_type || 'FREE') as PlanType;
  const isProMax = planType === 'PRO_MAX';
  const coursesLimit = getPlanLimit(planType);
  const isMonthlyLimit = isPlanMonthlyLimit(planType);

  /**
   * Get the current count of courses (created + enrolled) for limit checking
   */
  const getCurrentCourseCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    // PRO_MAX users have unlimited enrollments
    if (isProMax) return 0;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get courses created count
    let createdQuery = supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (isMonthlyLimit) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      createdQuery = createdQuery.gte('created_at', startOfMonth.toISOString());
    }

    const { count: createdCount, error: createdError } = await createdQuery;
    if (createdError) {
      console.error('Error fetching created courses:', createdError);
      return 0;
    }

    // Get enrolled courses count from usage_counters
    let enrolledCount = 0;
    if (isMonthlyLimit) {
      const { data: usageData, error: usageError } = await supabase
        .from('usage_counters')
        .select('courses_enrolled')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (usageError) {
        console.error('Error fetching usage counters:', usageError);
      } else {
        enrolledCount = usageData?.courses_enrolled || 0;
      }
    } else {
      // For FREE plan (non-monthly), count all enrollments
      const { count, error } = await supabase
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching enrollments:', error);
      } else {
        enrolledCount = count || 0;
      }
    }

    return (createdCount || 0) + enrolledCount;
  }, [user, isProMax, isMonthlyLimit]);


  /**
   * Check if user can enroll in a course
   * Requirements: 3.2, 3.3, 3.4, 3.5
   */
  const canEnroll = useCallback(async (courseId?: string): Promise<CanEnrollResult> => {
    if (!user) {
      return { canEnroll: false, currentCount: 0, limit: 0, reason: 'limit_reached' };
    }

    // PRO_MAX users have unlimited enrollments (Requirement 3.4)
    if (isProMax) {
      return { canEnroll: true, currentCount: 0, limit: Infinity };
    }

    // Check if already enrolled in this specific course
    if (courseId) {
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingEnrollment) {
        return { 
          canEnroll: false, 
          currentCount: 0, 
          limit: coursesLimit, 
          reason: 'already_enrolled' 
        };
      }
    }

    const currentCount = await getCurrentCourseCount();

    // Check if limit reached (Requirement 3.5)
    if (currentCount >= coursesLimit) {
      return { 
        canEnroll: false, 
        currentCount, 
        limit: coursesLimit, 
        reason: 'limit_reached' 
      };
    }

    return { canEnroll: true, currentCount, limit: coursesLimit };
  }, [user, isProMax, coursesLimit, getCurrentCourseCount]);

  /**
   * Get enrollment status for a specific course
   */
  const getEnrollmentStatus = useCallback(async (courseId: string): Promise<EnrollmentStatus> => {
    if (!user) {
      return { isEnrolled: false };
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('enrolled_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      console.error('Error checking enrollment status:', error);
      return { isEnrolled: false };
    }

    if (data) {
      return { 
        isEnrolled: true, 
        enrolledAt: new Date(data.enrolled_at) 
      };
    }

    return { isEnrolled: false };
  }, [user]);


  /**
   * Enroll user in a public course
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  const enrollInCourse = useCallback(async (courseId: string): Promise<EnrollmentResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Check if course exists and is public
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, is_public')
        .eq('id', courseId)
        .maybeSingle();

      if (courseError || !course) {
        return { success: false, error: 'Course not found' };
      }

      if (!course.is_public) {
        return { success: false, error: 'This course is not available for enrollment' };
      }

      // Check if can enroll (handles limit checking)
      const enrollCheck = await canEnroll(courseId);
      if (!enrollCheck.canEnroll) {
        if (enrollCheck.reason === 'already_enrolled') {
          return { success: false, error: "You're already enrolled in this course" };
        }
        return { 
          success: false, 
          error: "You've reached your course limit. Upgrade your plan to enroll in more courses." 
        };
      }

      // Create enrollment record (Requirement 3.1)
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (enrollError) {
        // Handle unique constraint violation
        if (enrollError.code === '23505') {
          return { success: false, error: "You're already enrolled in this course" };
        }
        console.error('Error creating enrollment:', enrollError);
        return { success: false, error: 'Failed to enroll in course' };
      }

      // Update usage counter for non-PRO_MAX users (Requirements 3.2, 3.3)
      if (!isProMax) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Try to update existing counter, or insert new one
        const { data: existingCounter } = await supabase
          .from('usage_counters')
          .select('id, courses_enrolled')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (existingCounter) {
          await supabase
            .from('usage_counters')
            .update({ 
              courses_enrolled: existingCounter.courses_enrolled + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCounter.id);
        } else {
          await supabase
            .from('usage_counters')
            .insert({
              user_id: user.id,
              month: currentMonth,
              year: currentYear,
              courses_enrolled: 1,
            });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error enrolling in course:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isProMax, canEnroll]);


  /**
   * Unenroll user from a course
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  const unenrollFromCourse = useCallback(async (courseId: string): Promise<EnrollmentResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Check if enrolled
      const { data: enrollment, error: checkError } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking enrollment:', checkError);
        return { success: false, error: 'Failed to check enrollment status' };
      }

      if (!enrollment) {
        return { success: false, error: 'You are not enrolled in this course' };
      }

      // Delete user progress for this course (Requirement 7.4)
      // Note: inline_wiki_entries and notes are preserved (Requirement 7.3)
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (progressError) {
        console.error('Error deleting progress:', progressError);
        // Continue with unenrollment even if progress deletion fails
      }

      // Delete enrollment record (Requirement 7.1)
      const { error: unenrollError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (unenrollError) {
        console.error('Error removing enrollment:', unenrollError);
        return { success: false, error: 'Failed to unenroll from course' };
      }

      // Decrement usage counter for non-PRO_MAX users (Requirement 7.2)
      if (!isProMax) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const { data: existingCounter } = await supabase
          .from('usage_counters')
          .select('id, courses_enrolled')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (existingCounter && existingCounter.courses_enrolled > 0) {
          await supabase
            .from('usage_counters')
            .update({ 
              courses_enrolled: existingCounter.courses_enrolled - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCounter.id);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error unenrolling from course:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isProMax]);

  return {
    enrollInCourse,
    unenrollFromCourse,
    getEnrollmentStatus,
    canEnroll,
    isLoading,
  };
}
