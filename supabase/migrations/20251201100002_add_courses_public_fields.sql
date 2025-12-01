/*
  # Add Public Course Fields to Courses Table

  ## Overview
  Adds fields to support public course publishing in the marketplace.

  ## Changes to courses table
  - `is_public` (boolean, default false) - Whether the course is publicly visible
  - `published_at` (timestamptz) - When the course was made public
  - `creator_display_name` (text) - Display name of the creator for public view

  ## Security
  - Add RLS policy for authenticated users to view public courses
  - Existing policies for owners remain unchanged

  ## Requirements: 1.1, 2.1
*/

-- Add new columns to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE courses ADD COLUMN is_public boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE courses ADD COLUMN published_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'creator_display_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN creator_display_name text;
  END IF;
END $$;

-- Create index for marketplace queries on public courses
CREATE INDEX IF NOT EXISTS idx_courses_is_public ON courses(is_public) WHERE is_public = true;

-- Policy: Authenticated users can view public courses
CREATE POLICY "Users can view public courses"
  ON courses FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Policy: Enrolled users can view courses they're enrolled in
CREATE POLICY "Users can view enrolled courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = courses.id
      AND course_enrollments.user_id = auth.uid()
    )
  );
