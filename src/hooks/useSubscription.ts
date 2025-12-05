import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanBillingCycleLimit, PlanType } from '../lib/polar';
import type { CourseStatus } from '../types/database';

interface ActiveGenerationCourse {
  id: string;
  status: CourseStatus;
  title: string;
}

interface SubscriptionData {
  planType: PlanType;
  coursesUsed: number;
  coursesCreated: number;
  coursesEnrolled: number;
  coursesLimit: number;
  canCreateCourse: boolean;
  isAudioEnabled: boolean;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
  subscriptionPeriodStart: Date | null;
  billingCycle: string | null;
  isLoading: boolean;
  activeGenerationCourse: ActiveGenerationCourse | null;
  inProgressCount: number;
  blockingReason?: 'limit_reached' | 'active_generation';
}

export function useSubscription(): SubscriptionData {
  const { user, profile } = useAuth();
  const [publishedCount, setPublishedCount] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [activeGenerationCourse, setActiveGenerationCourse] = useState<ActiveGenerationCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const planType = (profile?.plan_type || 'FREE') as PlanType;
  const coursesLimit = getPlanLimit(planType);
  const isBillingCycleLimit = isPlanBillingCycleLimit(planType);
  
  // Get subscription period start for billing cycle calculations
  const subscriptionPeriodStart = useMemo(() => 
    profile?.subscription_period_start 
      ? new Date(profile.subscription_period_start) 
      : null,
    [profile?.subscription_period_start]
  );

  useEffect(() => {
    async function fetchCourseUsage() {
      if (!user) {
        setPublishedCount(0);
        setInProgressCount(0);
        setActiveGenerationCourse(null);
        setIsLoading(false);
        return;
      }

      try {
        // Count published courses (these consume the plan quota)
        let publishedQuery = supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('status', 'published');

        if (isBillingCycleLimit && subscriptionPeriodStart) {
          publishedQuery = publishedQuery.gte('created_at', subscriptionPeriodStart.toISOString());
        }

        const { count: published, error: publishedError } = await publishedQuery;
        if (publishedError) throw publishedError;
        setPublishedCount(published || 0);

        // Count enrolled/subscribed courses
        let enrolledQuery = supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (isBillingCycleLimit && subscriptionPeriodStart) {
          enrolledQuery = enrolledQuery.gte('enrolled_at', subscriptionPeriodStart.toISOString());
        }

        const { count: enrolled, error: enrolledError } = await enrolledQuery;
        if (enrolledError) throw enrolledError;
        setEnrolledCount(enrolled || 0);

        // Find any active generation (draft/ready) to prevent starting another within quota
        const { data: activeCourses, count: activeCount, error: activeError } = await supabase
          .from('courses')
          .select('id, status, title, updated_at', { count: 'exact' })
          .eq('owner_id', user.id)
          .neq('status', 'published')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (activeError) throw activeError;

        setInProgressCount(activeCount || 0);

        if (activeCourses && activeCourses.length > 0) {
          setActiveGenerationCourse({
            id: activeCourses[0].id,
            status: activeCourses[0].status as CourseStatus,
            title: activeCourses[0].title,
          });
        } else {
          setActiveGenerationCourse(null);
        }
      } catch (error) {
        console.error('Error fetching course usage:', error);
        setPublishedCount(0);
        setEnrolledCount(0);
        setInProgressCount(0);
        setActiveGenerationCourse(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourseUsage();
  }, [user, isBillingCycleLimit, subscriptionPeriodStart]);

  // Only published + enrolled courses count against the plan quota
  // In-progress courses don't consume quota but block new generation (one active slot)
  const coursesUsed = publishedCount + enrolledCount;
  const hasInProgressCourse = inProgressCount > 0;

  let canCreateCourse = true;
  let blockingReason: 'limit_reached' | 'active_generation' | undefined;

  if (coursesLimit !== Infinity) {
    if (coursesUsed >= coursesLimit) {
      // User has reached their published + enrolled course limit
      canCreateCourse = false;
      blockingReason = 'limit_reached';
    } else if (hasInProgressCourse) {
      // User has an in-progress course - must complete or delete it first
      // This ensures users can only work on one course at a time
      canCreateCourse = false;
      blockingReason = 'active_generation';
    }
  }

  const isAudioEnabled = profile?.audio_addon_enabled || planType === 'PRO_MAX';

  return {
    planType,
    coursesUsed,
    coursesCreated: publishedCount,
    coursesEnrolled: enrolledCount,
    coursesLimit,
    canCreateCourse,
    isAudioEnabled,
    subscriptionStatus: profile?.subscription_status || null,
    subscriptionEndsAt: profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null,
    subscriptionPeriodStart,
    billingCycle: profile?.billing_cycle || null,
    isLoading,
    activeGenerationCourse,
    inProgressCount,
    blockingReason,
  };
}
