/*
  # Add Lesson Editing and Versioning Support

  ## Overview
  Enhances the lessons table to support iterative editing, regeneration tracking,
  and version history for the enhanced course generation workflow.

  ## Changes

  ### 1. Lessons Table Enhancements
  - Add `lesson_status` enum and column (draft, generated, edited, approved, needs_regeneration)
  - Add `edit_history` jsonb field for tracking changes and versions
  - Add `regeneration_count` integer to track regeneration attempts
  - Add `custom_instructions` text field for user regeneration instructions
  - Add `is_manually_edited` boolean flag
  - Add `original_content` text field to preserve initial AI generation

  ### 2. New Enum Type
  - `lesson_status_type` with values: draft, generated, edited, approved, needs_regeneration

  ## Security
  - Maintains existing RLS policies
  - All fields accessible to course owners only
*/

-- Create lesson status enum
DO $$ BEGIN
  CREATE TYPE lesson_status_type AS ENUM (
    'draft',
    'generated', 
    'edited',
    'approved',
    'needs_regeneration'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to lessons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'lesson_status'
  ) THEN
    ALTER TABLE lessons ADD COLUMN lesson_status lesson_status_type NOT NULL DEFAULT 'draft';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'edit_history'
  ) THEN
    ALTER TABLE lessons ADD COLUMN edit_history jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'regeneration_count'
  ) THEN
    ALTER TABLE lessons ADD COLUMN regeneration_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'custom_instructions'
  ) THEN
    ALTER TABLE lessons ADD COLUMN custom_instructions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'is_manually_edited'
  ) THEN
    ALTER TABLE lessons ADD COLUMN is_manually_edited boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'original_content'
  ) THEN
    ALTER TABLE lessons ADD COLUMN original_content text;
  END IF;
END $$;

-- Create index for lesson status queries
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(lesson_status);
CREATE INDEX IF NOT EXISTS idx_lessons_course_status ON lessons(course_id, lesson_status);

-- Update existing lessons to have 'generated' status if they have content
UPDATE lessons 
SET lesson_status = 'generated', 
    original_content = markdown_content
WHERE markdown_content IS NOT NULL 
  AND lesson_status = 'draft';
