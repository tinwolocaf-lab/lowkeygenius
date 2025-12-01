import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanMonthlyLimit, PlanType } from '../lib/polar';

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
  const isMonthlyLimit = isPlanMonthlyLimit(planType);
  const isProMax = planType === 'PRO_MAX';

  useEffect(() => {
    async function fetchCoursesUsed() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch courses created by user
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

        if (createdError) throw createdError;

        setCoursesCreated(createdCount || 0);

        // Fetch enrolled courses count (Requirements 3.2, 3.3, 3.5)
        // PRO_MAX users have unlimited enrollments, so we don't count them
        if (isProMax) {
          setCoursesEnrolled(0);
        } else if (isMonthlyLimit) {
          // For monthly limit plans (PLUS, PRO), get from usage_counters
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();

          const { data: usageData, error: usageError } = await supabase
            .from('usage_counters')
            .select('courses_enrolled')
            .eq('user_id', user.id)
            .eq('month', currentMonth)
            .eq('year', currentYear)
            .maybeSingle();

          if (usageError) {
            console.error('Error fetching usage counters:', usageError);
            setCoursesEnrolled(0);
          } else {
            setCoursesEnrolled(usageData?.courses_enrolled || 0);
          }
        } else {
          // For FREE plan (non-monthly), count all enrollments directly
          const { count: enrolledCount, error: enrolledError } = await supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

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
  }, [user, isMonthlyLimit, isProMax]);

  // Total courses used = created + enrolled (Requirements 3.2, 3.3, 3.5)
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
    billingCycle: profile?.billing_cycle || null,
    isLoading,
  };
}
