/*
  # Gamification Tables Migration

  ## Overview
  Creates the database schema for the learner gamification system including
  XP tracking, streaks, badges, and leaderboards.

  ## New Tables

  ### 1. learner_xp_transactions
  Records every XP-earning event for audit and analytics
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `course_id` (uuid, FK to courses)
  - `activity_type` (text: 'lesson_complete', 'quiz_complete', 'flashcard_session')
  - `xp_amount` (integer)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### 2. learner_stats
  Cached aggregated stats per learner for fast reads
  - `user_id` (uuid, PK, FK to profiles)
  - `total_xp` (integer)
  - `current_streak` (integer)
  - `longest_streak` (integer)
  - `last_activity_date` (date)
  - Activity counters
  - `updated_at` (timestamptz)

  ### 3. badge_definitions
  Static table defining all available badges
  - `id` (uuid, PK)
  - `code` (text, UNIQUE)
  - `name` (text)
  - `description` (text)
  - `icon_url` (text)
  - `category` (text)
  - `criteria_json` (jsonb)
  - `sort_order` (integer)

  ### 4. learner_badges
  Junction table for earned badges
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `badge_id` (uuid, FK to badge_definitions)
  - `earned_at` (timestamptz)
  - UNIQUE constraint on (user_id, badge_id)

  ### 5. course_xp_summary
  Cached XP per user per course for leaderboards
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `course_id` (uuid, FK to courses)
  - `total_xp` (integer)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (user_id, course_id)

  ## Profile Extensions
  - `profile_visibility` (text, default 'public')
  - `display_name` (text)

  ## Security
  - Enable RLS on all tables
  - Users can view their own data
  - Public profiles visible to authenticated users
  - Leaderboards filter by profile visibility

  _Requirements: 8.4, 5.4_
*/

-- Create activity_type enum for type safety
CREATE TYPE activity_type AS ENUM ('lesson_complete', 'quiz_complete', 'flashcard_session');

-- Create badge_category enum for type safety
CREATE TYPE badge_category AS ENUM ('streak', 'xp', 'course', 'quiz', 'special');

-- Create profile_visibility enum for type safety
CREATE TYPE profile_visibility AS ENUM ('public', 'private');

-- Add profile_visibility and display_name columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS profile_visibility profile_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS display_name text;

-- learner_xp_transactions table
CREATE TABLE IF NOT EXISTS learner_xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  xp_amount integer NOT NULL CHECK (xp_amount > 0),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE learner_xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP transactions"
  ON learner_xp_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP transactions"
  ON learner_xp_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- learner_stats table
CREATE TABLE IF NOT EXISTS learner_stats (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  lessons_completed integer NOT NULL DEFAULT 0,
  quizzes_completed integer NOT NULL DEFAULT 0,
  flashcard_sessions_completed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT longest_streak_gte_current CHECK (longest_streak >= current_streak)
);

ALTER TABLE learner_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON learner_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON learner_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON learner_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow viewing stats for public profiles (for leaderboards)
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

-- badge_definitions table
CREATE TABLE IF NOT EXISTS badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon_url text,
  category badge_category NOT NULL,
  criteria_json jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view badge definitions
CREATE POLICY "Authenticated users can view badge definitions"
  ON badge_definitions FOR SELECT
  TO authenticated
  USING (true);

-- learner_badges junction table
CREATE TABLE IF NOT EXISTS learner_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE learner_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON learner_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON learner_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow viewing badges for public profiles
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

-- course_xp_summary table
CREATE TABLE IF NOT EXISTS course_xp_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE course_xp_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course XP summary"
  ON course_xp_summary FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course XP summary"
  ON course_xp_summary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course XP summary"
  ON course_xp_summary FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow viewing course XP for public profiles (for leaderboards)
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_learner_xp_transactions_user_id ON learner_xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_xp_transactions_course_id ON learner_xp_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_learner_xp_transactions_created_at ON learner_xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learner_xp_transactions_user_course ON learner_xp_transactions(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_learner_badges_user_id ON learner_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_badges_badge_id ON learner_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_learner_badges_earned_at ON learner_badges(earned_at);

CREATE INDEX IF NOT EXISTS idx_course_xp_summary_user_id ON course_xp_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_course_xp_summary_course_id ON course_xp_summary(course_id);
CREATE INDEX IF NOT EXISTS idx_course_xp_summary_total_xp ON course_xp_summary(total_xp DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_profile_visibility ON profiles(profile_visibility);

-- Apply updated_at trigger to learner_stats
CREATE TRIGGER update_learner_stats_updated_at BEFORE UPDATE ON learner_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to course_xp_summary
CREATE TRIGGER update_course_xp_summary_updated_at BEFORE UPDATE ON course_xp_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
