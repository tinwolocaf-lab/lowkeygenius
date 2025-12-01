/*
  # Create Course Enrollments Table

  ## Overview
  Creates the course_enrollments table to track which users are enrolled in which public courses.
  This is separate from user_progress to clearly distinguish enrollment state from learning progress.

  ## New Table: course_enrollments
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `course_id` (uuid, FK to courses)
  - `enrolled_at` (timestamptz)
  - UNIQUE constraint on (user_id, course_id)

  ## Security
  - Enable RLS
  - Users can view, insert, and delete their own enrollments
  - Users cannot modify other users' enrollments

  ## Requirements: 3.1, 7.1
*/

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON course_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can enroll themselves in courses
CREATE POLICY "Users can insert own enrollments"
  ON course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unenroll themselves from courses
CREATE POLICY "Users can delete own enrollments"
  ON course_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course ON course_enrollments(user_id, course_id);
