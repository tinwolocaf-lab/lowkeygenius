import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanBillingCycleLimit, PlanType } from '../lib/polar';

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
  const isBillingCycleLimit = isPlanBillingCycleLimit(planType);
  
  // Get subscription period start for billing cycle calculations
  const subscriptionPeriodStart = useMemo(() => 
    profile?.subscription_period_start 
      ? new Date(profile.subscription_period_start) 
      : null,
    [profile?.subscription_period_start]
  );

  /**
   * Get the current count of courses (created + enrolled) for limit checking
   * - FREE users: count ALL courses (lifetime limit)
   * - Subscribed users: count courses from subscription period start
   */
  const getCurrentCourseCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    // PRO_MAX users have unlimited
    if (isProMax) return 0;

    // Get courses created count
    let createdQuery = supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    // For billing cycle plans, count from subscription period start
    if (isBillingCycleLimit && subscriptionPeriodStart) {
      createdQuery = createdQuery.gte('created_at', subscriptionPeriodStart.toISOString());
    }

    const { count: createdCount, error: createdError } = await createdQuery;
    if (createdError) {
      console.error('Error fetching created courses:', createdError);
      return 0;
    }

    // Get enrolled courses count
    let enrolledQuery = supabase
      .from('course_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // For billing cycle plans, count enrollments from subscription period start
    if (isBillingCycleLimit && subscriptionPeriodStart) {
      enrolledQuery = enrolledQuery.gte('enrolled_at', subscriptionPeriodStart.toISOString());
    }

    const { count: enrolledCount, error: enrolledError } = await enrolledQuery;
    if (enrolledError) {
      console.error('Error fetching enrollments:', enrolledError);
      return (createdCount || 0);
    }

    return (createdCount || 0) + (enrolledCount || 0);
  }, [user, isProMax, isBillingCycleLimit, subscriptionPeriodStart]);


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

      // Create enrollment record
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

      return { success: true };
    } catch (error) {
      console.error('Error enrolling in course:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isProMax, canEnroll]);

  return {
    enrollInCourse,
    getEnrollmentStatus,
    canEnroll,
    isLoading,
  };
}
