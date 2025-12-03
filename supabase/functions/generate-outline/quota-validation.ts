import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type PlanType = 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX';

export const PLAN_LIMITS: Record<PlanType, { courses: number; isBillingCycle: boolean }> = {
  FREE: { courses: 1, isBillingCycle: false },
  PLUS: { courses: 5, isBillingCycle: true },
  PRO: { courses: 20, isBillingCycle: true },
  PRO_MAX: { courses: Infinity, isBillingCycle: false },
};

export interface QuotaValidationResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  planType: PlanType;
  error?: string;
}

interface ProfileData {
  plan_type: PlanType;
  subscription_period_start: string | null;
}

/**
 * Validates if a user can create a new course based on their plan quota.
 * 
 * - FREE users: lifetime limit (count all courses)
 * - PLUS/PRO users: billing cycle limit (count from subscription_period_start)
 * - PRO_MAX users: unlimited (always allowed)
 */
export async function validateUserQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaValidationResult> {
  // Fetch user profile to get plan type and subscription period
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan_type, subscription_period_start')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      planType: 'FREE',
      error: 'Failed to fetch user profile',
    };
  }

  const profileData = profile as ProfileData;
  const planType = (profileData.plan_type || 'FREE') as PlanType;
  const planConfig = PLAN_LIMITS[planType];
  const limit = planConfig.courses;

  // PRO_MAX users have unlimited access - skip quota check
  if (planType === 'PRO_MAX') {
    return {
      allowed: true,
      currentCount: 0,
      limit: Infinity,
      planType,
    };
  }

  const subscriptionPeriodStart = profileData.subscription_period_start
    ? new Date(profileData.subscription_period_start)
    : null;

  // Count courses created by user
  let coursesCreatedQuery = supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);

  // For billing cycle plans (PLUS, PRO), count from subscription period start
  // For FREE users, count ALL courses (lifetime limit)
  if (planConfig.isBillingCycle && subscriptionPeriodStart) {
    coursesCreatedQuery = coursesCreatedQuery.gte('created_at', subscriptionPeriodStart.toISOString());
  }

  const { count: coursesCreated, error: coursesError } = await coursesCreatedQuery;

  if (coursesError) {
    return {
      allowed: false,
      currentCount: 0,
      limit,
      planType,
      error: 'Failed to fetch course count',
    };
  }

  // Count enrolled courses
  let enrolledQuery = supabase
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // For billing cycle plans, count enrollments from subscription period start
  if (planConfig.isBillingCycle && subscriptionPeriodStart) {
    enrolledQuery = enrolledQuery.gte('enrolled_at', subscriptionPeriodStart.toISOString());
  }

  const { count: coursesEnrolled, error: enrolledError } = await enrolledQuery;

  if (enrolledError) {
    console.error('Error fetching enrollments:', enrolledError);
    // Continue with just created courses count if enrollment query fails
  }

  const currentCount = (coursesCreated || 0) + (coursesEnrolled || 0);
  const allowed = currentCount < limit;

  return {
    allowed,
    currentCount,
    limit,
    planType,
    error: allowed ? undefined : 'Course limit reached. Please upgrade your plan.',
  };
}
