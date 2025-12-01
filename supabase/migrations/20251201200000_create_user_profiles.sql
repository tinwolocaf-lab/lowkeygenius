/*
  # User Profiles Table for Profile Onboarding

  ## Overview
  Creates the user_profiles table to store anonymized user background information
  collected during the one-time profile onboarding flow.

  ## New Table

  ### user_profiles
  Stores anonymized user profile data for course personalization
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to auth.users, UNIQUE)
  - `input_method` (text: 'text', 'voice', 'conversation')
  - `anonymized_content` (text) - PII-removed user background
  - `extracted_context` (jsonb) - Structured context for course generation
  - `anonymization_metadata` (jsonb) - Optional metadata about PII removal
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on the table
  - Users can only view, insert, and update their own profile
  - One profile per user (UNIQUE constraint on user_id)
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_method text NOT NULL CHECK (input_method IN ('text', 'voice', 'conversation')),
  anonymized_content text NOT NULL,
  extracted_context jsonb NOT NULL,
  anonymization_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Apply updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
