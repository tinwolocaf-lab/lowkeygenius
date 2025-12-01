/*
  # Add Admin Flag to Profiles

  ## Overview
  Adds an is_admin flag to the profiles table to identify system administrators
  who can manage deletion requests.

  ## Changes to profiles table
  - `is_admin` (boolean, default false) - Whether the user is a system administrator

  ## Requirements: 8.1
*/

-- Add is_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
