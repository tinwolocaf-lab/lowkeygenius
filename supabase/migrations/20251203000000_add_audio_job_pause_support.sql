-- Add pause support to audio_generation_jobs table
-- This enables sequential audio generation with pause/resume capability

-- Add 'paused' value to the audio_job_status enum
ALTER TYPE audio_job_status ADD VALUE IF NOT EXISTS 'paused' AFTER 'processing';

-- Add new columns for pause support
ALTER TABLE audio_generation_jobs
ADD COLUMN IF NOT EXISTS current_lesson_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS paused_at timestamptz;
