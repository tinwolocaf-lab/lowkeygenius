/*
  # Add Audio Generation Support

  ## Overview
  Adds comprehensive support for text-to-audio generation using Murf AI API,
  including audio storage, generation tracking, and subscription management.

  ## Changes

  ### 1. Profiles Table Updates
  - Add `audio_addon_enabled` (boolean) - Tracks if user has audio add-on
  - Add `audio_addon_trial_used` (boolean) - Tracks if user used free trial
  - Add `audio_addon_expires_at` (timestamptz) - Audio add-on expiration date
  - Add `audio_addon_subscription_id` (text) - Polar subscription ID for audio

  ### 2. Lessons Table Updates
  - Add `audio_voice_type` (text) - 'male' or 'female'
  - Add `audio_generated_at` (timestamptz) - When audio was generated

  ### 3. New Table: audio_generation_jobs
  Tracks bulk audio generation progress for courses
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `user_id` (uuid, FK to profiles)
  - `voice_type` (text) - 'male' or 'female'
  - `status` (enum) - pending, processing, completed, failed
  - `total_lessons` (integer)
  - `completed_lessons` (integer)
  - `failed_lessons` (integer)
  - `error_message` (text)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on audio_generation_jobs
  - Users can only view their own audio generation jobs
  - Audio URLs accessible only to course owners
*/

-- Add audio add-on fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'audio_addon_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN audio_addon_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'audio_addon_trial_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN audio_addon_trial_used boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'audio_addon_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN audio_addon_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'audio_addon_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN audio_addon_subscription_id text;
  END IF;
END $$;

-- Add audio fields to lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'audio_voice_type'
  ) THEN
    ALTER TABLE lessons ADD COLUMN audio_voice_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'audio_generated_at'
  ) THEN
    ALTER TABLE lessons ADD COLUMN audio_generated_at timestamptz;
  END IF;
END $$;

-- Create audio generation job status enum
DO $$ BEGIN
  CREATE TYPE audio_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create audio_generation_jobs table
CREATE TABLE IF NOT EXISTS audio_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voice_type text NOT NULL CHECK (voice_type IN ('male', 'female')),
  status audio_job_status NOT NULL DEFAULT 'pending',
  total_lessons integer NOT NULL DEFAULT 0,
  completed_lessons integer NOT NULL DEFAULT 0,
  failed_lessons integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for audio_generation_jobs
CREATE INDEX IF NOT EXISTS idx_audio_jobs_course ON audio_generation_jobs(course_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_user ON audio_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_generation_jobs(status);

-- Enable RLS on audio_generation_jobs
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_generation_jobs
CREATE POLICY "Users can view own audio generation jobs"
  ON audio_generation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own audio generation jobs"
  ON audio_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio generation jobs"
  ON audio_generation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for lessons audio queries
CREATE INDEX IF NOT EXISTS idx_lessons_audio_status ON lessons(audio_status);
CREATE INDEX IF NOT EXISTS idx_lessons_course_audio ON lessons(course_id, audio_status);
