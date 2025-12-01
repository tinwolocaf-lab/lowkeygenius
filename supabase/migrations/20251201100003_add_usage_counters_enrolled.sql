/*
  # Add Courses Enrolled Counter to Usage Counters

  ## Overview
  Adds a field to track the number of courses a user has enrolled in,
  separate from courses they have created.

  ## Changes to usage_counters table
  - `courses_enrolled` (integer, default 0) - Number of public courses user is enrolled in

  ## Requirements: 3.2, 3.3, 7.2
*/

-- Add courses_enrolled column to usage_counters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_counters' AND column_name = 'courses_enrolled'
  ) THEN
    ALTER TABLE usage_counters ADD COLUMN courses_enrolled integer NOT NULL DEFAULT 0;
  END IF;
END $$;
