/*
  # Prevent Direct Deletion of Public Courses

  ## Overview
  Updates the RLS policy for course deletion to prevent direct deletion of public courses.
  Public courses must go through the deletion request workflow.

  ## Changes
  - Drop existing delete policy for courses
  - Create new delete policy that only allows deletion of non-public courses

  ## Requirements: 1.2
*/

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;

-- Create new delete policy that prevents deletion of public courses
-- Requirement 1.2: Public courses cannot be deleted directly
CREATE POLICY "Users can delete own non-public courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id AND is_public = false);
