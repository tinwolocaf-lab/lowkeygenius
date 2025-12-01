/*
  # Create Deletion Requests Table

  ## Overview
  Creates the deletion_requests table to store pending deletion requests for public courses.
  Course owners can request deletion, and admins can approve or reject requests.

  ## New Table: deletion_requests
  - `id` (uuid, PK)
  - `course_id` (uuid, FK to courses)
  - `requester_id` (uuid, FK to profiles)
  - `message` (text, optional message from requester)
  - `status` (text: pending, approved, rejected)
  - `admin_notes` (text, optional notes from admin)
  - `reviewed_by` (uuid, FK to profiles, admin who reviewed)
  - `reviewed_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS
  - Course owners can create and view their own requests
  - Admins can view all requests and update them

  ## Requirements: 5.1, 8.1
*/

-- Create deletion request status type
DO $$ BEGIN
  CREATE TYPE deletion_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status deletion_request_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

-- Policy: Users can create deletion requests for their own courses
CREATE POLICY "Users can create own deletion requests"
  ON deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.owner_id = auth.uid()
    )
  );

-- Policy: Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can update deletion requests
CREATE POLICY "Admins can update deletion requests"
  ON deletion_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create index for filtering pending requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_course_id ON deletion_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requester_id ON deletion_requests(requester_id);

-- Add updated_at trigger
CREATE TRIGGER update_deletion_requests_updated_at BEFORE UPDATE ON deletion_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
