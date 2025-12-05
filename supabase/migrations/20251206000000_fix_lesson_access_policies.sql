/*
  # Fix lesson access policies for public preview

  ## Summary
  - Owners keep full lesson access
  - Enrolled users can read all lessons in their courses
  - Anyone (including anon) can read only the first lesson of public, published courses
  - Insert/update/delete policies remain owner-only

  ## Key Fix
  The courses table policy must allow anon users to SELECT public/published courses,
  otherwise the EXISTS subquery in the lessons policy fails for anonymous users.
*/

-- Remove old lesson policies to prevent duplicates
DROP POLICY IF EXISTS "Users can view lessons from own courses" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons to own courses" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons in own courses" ON lessons;
DROP POLICY IF EXISTS "Users can delete lessons from own courses" ON lessons;
DROP POLICY IF EXISTS "Users can view lessons based on access level" ON lessons;
DROP POLICY IF EXISTS "Course owners can insert lessons to own courses" ON lessons;
DROP POLICY IF EXISTS "Course owners can update lessons in own courses" ON lessons;
DROP POLICY IF EXISTS "Course owners can delete lessons from own courses" ON lessons;
DROP POLICY IF EXISTS "Enrolled users can view course lessons" ON lessons;
DROP POLICY IF EXISTS "Public can view first lesson of public courses" ON lessons;

-- Update COURSES policy to allow anon access to public/published courses
-- This is required for the lessons policy subquery to work for anonymous users
DROP POLICY IF EXISTS "Users can view public courses" ON courses;
DROP POLICY IF EXISTS "Public can view public courses" ON courses;

CREATE POLICY "Public can view public courses"
  ON courses FOR SELECT
  TO authenticated, anon
  USING (
    is_public = true 
    AND status = 'published'::course_status
  );

-- Select policies for lessons
CREATE POLICY "Owners can view lessons"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Enrolled users can view lessons"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id = lessons.course_id
      AND ce.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Public can preview first lesson"
  ON lessons FOR SELECT
  TO authenticated, anon
  USING (
    module_index = 0
    AND lesson_index = 0
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.is_public = true
      AND courses.status = 'published'::course_status
    )
  );

-- Maintain owner-only write policies
CREATE POLICY "Owners can insert lessons"
  ON lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners can update lessons"
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

CREATE POLICY "Owners can delete lessons"
  ON lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.owner_id = (select auth.uid())
    )
  );
