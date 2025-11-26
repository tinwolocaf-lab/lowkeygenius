/*
  # Initial Database Schema for LearnAI Platform

  ## Overview
  Creates the complete database schema for an AI-powered personalized course generation platform
  with subscription tiers, usage tracking, and comprehensive course management.

  ## New Tables

  ### 1. profiles
  Extends auth.users with app-specific profile data
  - `id` (uuid, PK, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `avatar_url` (text)
  - `plan_type` (enum: FREE, PLUS, PRO, PRO_MAX)
  - `audio_addon` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. subscriptions
  Stripe subscription management
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `stripe_customer_id` (text)
  - `stripe_subscription_id` (text)
  - `plan_type` (enum)
  - `status` (enum: active, cancelled, past_due, etc.)
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `has_audio_addon` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. usage_counters
  Monthly usage tracking per user
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `month` (integer)
  - `year` (integer)
  - `courses_created` (integer)
  - `audio_minutes_generated` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (user_id, month, year)

  ### 4. courses
  Main course entity
  - `id` (uuid, PK)
  - `owner_id` (uuid, FK to profiles)
  - `title` (text)
  - `description` (text)
  - `topic` (text)
  - `level` (enum: beginner, intermediate, advanced, expert)
  - `intensity` (enum: short, standard, deep)
  - `estimated_duration_hours` (integer)
  - `status` (enum: draft_outline, generating_lessons, ready, published)
  - `outline_json` (jsonb) - stores module and lesson structure
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. file_sources
  User-uploaded materials for course generation
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `course_id` (uuid, FK to courses, nullable)
  - `type` (enum: pdf, docx, pptx, url, text)
  - `title` (text)
  - `raw_text` (text)
  - `summary` (text)
  - `storage_url` (text)
  - `file_size` (bigint)
  - `created_at` (timestamptz)

  ### 6. lessons
  Individual lesson content
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `module_index` (integer)
  - `lesson_index` (integer)
  - `title` (text)
  - `objectives` (text[])
  - `markdown_content` (text)
  - `audio_url` (text)
  - `audio_duration_seconds` (integer)
  - `audio_status` (enum: none, generating, ready, failed)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. user_progress
  Tracks user learning progress
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `lesson_id` (uuid, FK to lessons)
  - `course_id` (uuid, FK to courses)
  - `completed` (boolean)
  - `last_viewed_at` (timestamptz)
  - `created_at` (timestamptz)
  - UNIQUE constraint on (user_id, lesson_id)

  ### 8. notes
  User-saved text snippets from lessons
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `course_id` (uuid, FK to courses)
  - `lesson_id` (uuid, FK to lessons)
  - `snippet_markdown` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies ensure users can only access their own data
  - Course owners have full control over their courses
  - Users can only view published courses from others (future sharing feature)
*/

-- Create enums
CREATE TYPE plan_type AS ENUM ('FREE', 'PLUS', 'PRO', 'PRO_MAX');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid', 'trialing');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE course_intensity AS ENUM ('short', 'standard', 'deep');
CREATE TYPE course_status AS ENUM ('draft_outline', 'generating_lessons', 'ready', 'published');
CREATE TYPE file_source_type AS ENUM ('pdf', 'docx', 'pptx', 'url', 'text');
CREATE TYPE audio_status AS ENUM ('none', 'generating', 'ready', 'failed');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  plan_type plan_type NOT NULL DEFAULT 'FREE',
  audio_addon boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type plan_type NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  has_audio_addon boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Usage counters table
CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  courses_created integer NOT NULL DEFAULT 0,
  audio_minutes_generated numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage_counters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  topic text NOT NULL,
  level course_level NOT NULL DEFAULT 'beginner',
  intensity course_intensity NOT NULL DEFAULT 'standard',
  estimated_duration_hours integer,
  status course_status NOT NULL DEFAULT 'draft_outline',
  outline_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- File sources table
CREATE TABLE IF NOT EXISTS file_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  type file_source_type NOT NULL,
  title text NOT NULL,
  raw_text text,
  summary text,
  storage_url text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE file_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files"
  ON file_sources FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON file_sources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON file_sources FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_index integer NOT NULL,
  lesson_index integer NOT NULL,
  title text NOT NULL,
  objectives text[],
  markdown_content text,
  audio_url text,
  audio_duration_seconds integer,
  audio_status audio_status NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lessons from own courses"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lessons to own courses"
  ON lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lessons in own courses"
  ON lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lessons from own courses"
  ON lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = auth.uid()
    )
  );

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  snippet_markdown text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id_date ON usage_counters(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_courses_owner_id ON courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_file_sources_user_id ON file_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_file_sources_course_id ON file_sources(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_course_id ON notes(course_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_counters_updated_at BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
