/*
  # Optimize RLS Policies for Performance

  ## Overview
  This migration optimizes RLS policies across multiple tables to use the
  `(select auth.uid())` pattern instead of `auth.uid()`. This prevents
  re-evaluation of auth.uid() for each row and improves query performance.

  ## Tables Updated
  - course_enrollments
  - deletion_requests
  - user_profiles
  - flashcard_sessions
  - quiz_attempts
  - learner_xp_transactions
  - learner_stats
  - learner_badges
  - course_xp_summary
  - audio_generation_jobs
  - lesson_generation_jobs
  - inline_wiki_entries

  ## Security Requirements
  - Requirements: 5.1, 5.2, 5.3, 5.4
*/

-- ============================================
-- course_enrollments table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can insert own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can delete own enrollments" ON course_enrollments;

CREATE POLICY "Users can view own enrollments"
  ON course_enrollments FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own enrollments"
  ON course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own enrollments"
  ON course_enrollments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- deletion_requests table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Users can create own deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON deletion_requests;
DROP POLICY IF EXISTS "Admins can update deletion requests" ON deletion_requests;

CREATE POLICY "Users can view own deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = requester_id);

CREATE POLICY "Users can create own deletion requests"
  ON deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = requester_id
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update deletion requests"
  ON deletion_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- user_profiles table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own user_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own user_profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own user_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- flashcard_sessions table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own flashcard sessions" ON flashcard_sessions;
DROP POLICY IF EXISTS "Users can insert their own flashcard sessions" ON flashcard_sessions;

CREATE POLICY "Users can view their own flashcard sessions"
  ON flashcard_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own flashcard sessions"
  ON flashcard_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- quiz_attempts table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON quiz_attempts;

CREATE POLICY "Users can view their own quiz attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- learner_xp_transactions table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own XP transactions" ON learner_xp_transactions;
DROP POLICY IF EXISTS "Users can insert own XP transactions" ON learner_xp_transactions;

CREATE POLICY "Users can view own XP transactions"
  ON learner_xp_transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own XP transactions"
  ON learner_xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- learner_stats table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own stats" ON learner_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON learner_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON learner_stats;
DROP POLICY IF EXISTS "Authenticated users can view public profile stats" ON learner_stats;

CREATE POLICY "Users can view own stats"
  ON learner_stats FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own stats"
  ON learner_stats FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own stats"
  ON learner_stats FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can view public profile stats"
  ON learner_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = learner_stats.user_id
      AND profiles.profile_visibility = 'public'
    )
  );

-- ============================================
-- learner_badges table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own badges" ON learner_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON learner_badges;
DROP POLICY IF EXISTS "Authenticated users can view public profile badges" ON learner_badges;

CREATE POLICY "Users can view own badges"
  ON learner_badges FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own badges"
  ON learner_badges FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can view public profile badges"
  ON learner_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = learner_badges.user_id
      AND profiles.profile_visibility = 'public'
    )
  );

-- ============================================
-- course_xp_summary table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own course XP summary" ON course_xp_summary;
DROP POLICY IF EXISTS "Users can insert own course XP summary" ON course_xp_summary;
DROP POLICY IF EXISTS "Users can update own course XP summary" ON course_xp_summary;
DROP POLICY IF EXISTS "Authenticated users can view public profile course XP" ON course_xp_summary;

CREATE POLICY "Users can view own course XP summary"
  ON course_xp_summary FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own course XP summary"
  ON course_xp_summary FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own course XP summary"
  ON course_xp_summary FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Authenticated users can view public profile course XP"
  ON course_xp_summary FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = course_xp_summary.user_id
      AND profiles.profile_visibility = 'public'
    )
  );

-- ============================================
-- audio_generation_jobs table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own audio generation jobs" ON audio_generation_jobs;
DROP POLICY IF EXISTS "Users can create own audio generation jobs" ON audio_generation_jobs;
DROP POLICY IF EXISTS "Users can update own audio generation jobs" ON audio_generation_jobs;

CREATE POLICY "Users can view own audio generation jobs"
  ON audio_generation_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own audio generation jobs"
  ON audio_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own audio generation jobs"
  ON audio_generation_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- lesson_generation_jobs table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own lesson generation jobs" ON lesson_generation_jobs;
DROP POLICY IF EXISTS "Users can create own lesson generation jobs" ON lesson_generation_jobs;
DROP POLICY IF EXISTS "Users can update own lesson generation jobs" ON lesson_generation_jobs;

CREATE POLICY "Users can view own lesson generation jobs"
  ON lesson_generation_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own lesson generation jobs"
  ON lesson_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own lesson generation jobs"
  ON lesson_generation_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- inline_wiki_entries table policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own wiki entries" ON inline_wiki_entries;
DROP POLICY IF EXISTS "Users can insert own wiki entries" ON inline_wiki_entries;
DROP POLICY IF EXISTS "Users can update own wiki entries" ON inline_wiki_entries;
DROP POLICY IF EXISTS "Users can delete own wiki entries" ON inline_wiki_entries;

CREATE POLICY "Users can view own wiki entries"
  ON inline_wiki_entries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own wiki entries"
  ON inline_wiki_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own wiki entries"
  ON inline_wiki_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own wiki entries"
  ON inline_wiki_entries FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
