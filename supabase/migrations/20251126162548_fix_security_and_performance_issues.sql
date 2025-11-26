/*
  # Fix Security and Performance Issues

  1. RLS Policy Optimization
    - Fix `subscription_events` RLS policy to use subquery for auth.uid()
    - This prevents re-evaluation of auth.uid() for each row, improving performance at scale

  2. Remove Unused Indexes
    - Drop 12 unused indexes to reduce storage overhead and improve write performance
    - Indexes being removed:
      - idx_subscriptions_user_id (foreign key already indexed)
      - idx_usage_counters_user_id_date (low table usage)
      - idx_courses_status (not used in queries)
      - idx_file_sources_user_id (foreign key already indexed)
      - idx_user_progress_user_id (foreign key already indexed)
      - idx_notes_user_id (foreign key already indexed)
      - idx_notes_lesson_id (foreign key already indexed)
      - idx_user_progress_lesson_id (foreign key already indexed)
      - idx_profiles_polar_customer_id (rarely queried)
      - idx_profiles_polar_subscription_id (rarely queried)
      - idx_subscription_events_user_id (foreign key already indexed)
      - idx_subscription_events_polar_subscription_id (rarely queried)

  3. Security Enhancement
    - Note: Password leak protection must be enabled via Supabase Dashboard
    - Navigate to Authentication > Settings > Password Protection
    - Enable "Leaked Password Protection" to check against HaveIBeenPwned.org
*/

-- Optimize RLS policy for subscription_events table
DROP POLICY IF EXISTS "Users can view own subscription events" ON public.subscription_events;

CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Drop unused indexes to improve write performance and reduce storage
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_usage_counters_user_id_date;
DROP INDEX IF EXISTS public.idx_courses_status;
DROP INDEX IF EXISTS public.idx_file_sources_user_id;
DROP INDEX IF EXISTS public.idx_user_progress_user_id;
DROP INDEX IF EXISTS public.idx_notes_user_id;
DROP INDEX IF EXISTS public.idx_notes_lesson_id;
DROP INDEX IF EXISTS public.idx_user_progress_lesson_id;
DROP INDEX IF EXISTS public.idx_profiles_polar_customer_id;
DROP INDEX IF EXISTS public.idx_profiles_polar_subscription_id;
DROP INDEX IF EXISTS public.idx_subscription_events_user_id;
DROP INDEX IF EXISTS public.idx_subscription_events_polar_subscription_id;
