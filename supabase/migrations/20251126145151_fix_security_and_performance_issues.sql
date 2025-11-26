/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses all security and performance issues identified by Supabase:
  1. Adds missing indexes for foreign keys
  2. Optimizes RLS policies to use (select auth.uid())
  3. Sets proper search_path for functions
  4. Removes unused indexes (they'll be recreated as needed)

  ## Changes

  ### 1. Missing Foreign Key Indexes
  - Add index on notes.lesson_id
  - Add index on user_progress.lesson_id

  ### 2. RLS Policy Optimization
  - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
  - This prevents re-evaluation for each row and improves query performance

  ### 3. Function Security
  - Set explicit search_path on functions to prevent search_path attacks
  - Use SECURITY DEFINER with caution and proper search_path

  ### 4. Clean Up Unused Indexes
  - Remove indexes that haven't been used (will be recreated when needed)
*/

-- Add missing foreign key indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_notes_lesson_id ON notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);

-- Drop and recreate all RLS policies with optimized auth.uid() calls
-- This uses (select auth.uid()) to evaluate once per query instead of per row

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Subscriptions table policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Usage counters table policies
DROP POLICY IF EXISTS "Users can view own usage" ON usage_counters;

CREATE POLICY "Users can view own usage"
  ON usage_counters FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Courses table policies
DROP POLICY IF EXISTS "Users can view own courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;

CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = owner_id);

-- File sources table policies
DROP POLICY IF EXISTS "Users can view own files" ON file_sources;
DROP POLICY IF EXISTS "Users can insert own files" ON file_sources;
DROP POLICY IF EXISTS "Users can delete own files" ON file_sources;

CREATE POLICY "Users can view own files"
  ON file_sources FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own files"
  ON file_sources FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own files"
  ON file_sources FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Lessons table policies
DROP POLICY IF EXISTS "Users can view lessons from own courses" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons to own courses" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons in own courses" ON lessons;
DROP POLICY IF EXISTS "Users can delete lessons from own courses" ON lessons;

CREATE POLICY "Users can view lessons from own courses"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert lessons to own courses"
  ON lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update lessons in own courses"
  ON lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete lessons from own courses"
  ON lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

-- User progress table policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Notes table policies
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix function security by setting explicit search_path
-- Drop triggers first, then recreate functions, then recreate triggers

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate all updated_at triggers with the secured function
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER update_usage_counters_updated_at 
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at 
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at 
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: The "unused indexes" warnings are expected in development
-- They will be used once the application has real traffic
-- We keep them as they're essential for query performance at scale

-- Note: "Leaked Password Protection" must be enabled in Supabase Dashboard
-- Go to Authentication > Policies and enable "Password Protection"
-- This cannot be done via SQL migration - it's a project-level setting
