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
  coursesUsed: number;  // Published + enrolled courses (what counts against limit)
  limit: number;
  planType: PlanType;
  inProgressCount?: number;
  activeGenerationId?: string;  // ID of in-progress course when blocking
  reason?: 'limit_reached' | 'active_generation';
  error?: string;
}

interface ProfileData {
  plan_type: PlanType;
  subscription_period_start: string | null;
}

/**
 * Validates if a user can create a new course based on their plan quota.
 * 
 * - FREE users: lifetime limit (count published courses only)
 * - PLUS/PRO users: billing cycle limit (count published courses from subscription_period_start)
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
      coursesUsed: 0,
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
      coursesUsed: 0,
      limit: Infinity,
      planType,
    };
  }

  const subscriptionPeriodStart = profileData.subscription_period_start
    ? new Date(profileData.subscription_period_start)
    : null;

  // Count published courses (quota is consumed when a course is published)
  let publishedQuery = supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'published');

  // For billing cycle plans, only count courses published in the current period
  if (planConfig.isBillingCycle && subscriptionPeriodStart) {
    publishedQuery = publishedQuery.gte('created_at', subscriptionPeriodStart.toISOString());
  }

  const { count: publishedCount, error: publishedError } = await publishedQuery;

  if (publishedError) {
    return {
      allowed: false,
      coursesUsed: 0,
      limit,
      planType,
      error: 'Failed to fetch course count',
    };
  }

  // Count enrolled/subscribed courses
  let enrolledQuery = supabase
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (planConfig.isBillingCycle && subscriptionPeriodStart) {
    enrolledQuery = enrolledQuery.gte('enrolled_at', subscriptionPeriodStart.toISOString());
  }

  const { count: enrolledCount, error: enrolledError } = await enrolledQuery;
  if (enrolledError) {
    console.error('Error fetching enrollments:', enrolledError);
  }

  // Track active (not yet published) courses to help the frontend guide users to continue generation
  // Also fetch the ID of the most recent in-progress course for navigation
  const { data: inProgressCourses, count: inProgressCount } = await supabase
    .from('courses')
    .select('id', { count: 'exact' })
    .eq('owner_id', userId)
    .neq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(1);

  const coursesUsed = (publishedCount || 0) + (enrolledCount || 0);
  const hasInProgress = (inProgressCount || 0) > 0;

  // Quota is reached when published + enrolled courses >= limit
  const limitReached = limit !== Infinity && coursesUsed >= limit;
  
  // Block new generation if user has ANY in-progress course (one active slot at a time)
  // This ensures users complete or delete existing courses before starting new ones
  const activeBlock = !limitReached && hasInProgress;
  
  const allowed = !limitReached && !activeBlock;

  // Get the ID of the in-progress course for navigation when blocking
  const activeGenerationId = hasInProgress && inProgressCourses?.[0]?.id 
    ? inProgressCourses[0].id 
    : undefined;

  return {
    allowed,
    coursesUsed,
    limit,
    planType,
    inProgressCount: inProgressCount || 0,
    activeGenerationId,
    reason: limitReached ? 'limit_reached' : (activeBlock ? 'active_generation' : undefined),
    error: allowed
      ? undefined
      : limitReached
        ? 'Course limit reached. Please upgrade your plan.'
        : 'Finish your existing course before starting a new one.',
  };
}
