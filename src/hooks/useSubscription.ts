import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanBillingCycleLimit, PlanType } from '../lib/polar';

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
}

export function useSubscription(): SubscriptionData {
  const { user, profile } = useAuth();
  const [coursesCreated, setCoursesCreated] = useState(0);
  const [coursesEnrolled, setCoursesEnrolled] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const planType = (profile?.plan_type || 'FREE') as PlanType;
  const coursesLimit = getPlanLimit(planType);
  const isBillingCycleLimit = isPlanBillingCycleLimit(planType);
  const isProMax = planType === 'PRO_MAX';
  
  // Get subscription period start for billing cycle calculations
  const subscriptionPeriodStart = useMemo(() => 
    profile?.subscription_period_start 
      ? new Date(profile.subscription_period_start) 
      : null,
    [profile?.subscription_period_start]
  );

  useEffect(() => {
    async function fetchCoursesUsed() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Build query for courses created by user
        let createdQuery = supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id);

        // For billing cycle plans (PLUS, PRO), count from subscription period start
        // For FREE users, count ALL courses (lifetime limit)
        // For PRO_MAX, no limit so we don't filter
        if (isBillingCycleLimit && subscriptionPeriodStart) {
          createdQuery = createdQuery.gte('created_at', subscriptionPeriodStart.toISOString());
        }

        const { count: createdCount, error: createdError } = await createdQuery;

        if (createdError) throw createdError;

        setCoursesCreated(createdCount || 0);

        // Fetch enrolled courses count
        // PRO_MAX users have unlimited, so we don't count them
        if (isProMax) {
          setCoursesEnrolled(0);
        } else {
          // Build query for enrollments
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
            setCoursesEnrolled(0);
          } else {
            setCoursesEnrolled(enrolledCount || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching courses used:', error);
        setCoursesCreated(0);
        setCoursesEnrolled(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCoursesUsed();
  }, [user, isBillingCycleLimit, isProMax, subscriptionPeriodStart]);

  // Total courses used = created + enrolled
  const coursesUsed = coursesCreated + coursesEnrolled;
  const canCreateCourse = coursesUsed < coursesLimit;
  const isAudioEnabled = profile?.audio_addon_enabled || planType === 'PRO_MAX';

  return {
    planType,
    coursesUsed,
    coursesCreated,
    coursesEnrolled,
    coursesLimit,
    canCreateCourse,
    isAudioEnabled,
    subscriptionStatus: profile?.subscription_status || null,
    subscriptionEndsAt: profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null,
    subscriptionPeriodStart,
    billingCycle: profile?.billing_cycle || null,
    isLoading,
  };
}
