import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPlanLimit, isPlanMonthlyLimit, PlanType } from '../lib/polar';

interface SubscriptionData {
  planType: PlanType;
  coursesUsed: number;
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
  const [coursesUsed, setCoursesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const planType = (profile?.plan_type || 'FREE') as PlanType;
  const coursesLimit = getPlanLimit(planType);
  const isMonthlyLimit = isPlanMonthlyLimit(planType);

  useEffect(() => {
    async function fetchCoursesUsed() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (isMonthlyLimit) {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startOfMonth.toISOString());
        }

        const { count, error } = await query;

        if (error) throw error;

        setCoursesUsed(count || 0);
      } catch (error) {
        console.error('Error fetching courses used:', error);
        setCoursesUsed(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCoursesUsed();
  }, [user, isMonthlyLimit]);

  const canCreateCourse = coursesUsed < coursesLimit;
  const isAudioEnabled = profile?.audio_addon_enabled || planType === 'PRO_MAX';

  return {
    planType,
    coursesUsed,
    coursesLimit,
    canCreateCourse,
    isAudioEnabled,
    subscriptionStatus: profile?.subscription_status || null,
    subscriptionEndsAt: profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null,
    billingCycle: profile?.billing_cycle || null,
    isLoading,
  };
}
