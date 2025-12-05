/*
  # Rate Limiting Infrastructure

  ## Overview
  Creates the rate_limit_log table for tracking API request rates per user and endpoint.
  This enables rate limiting to protect against abuse and denial of service attacks.

  ## New Table: rate_limit_log
  - `id` (uuid, PK) - Unique identifier for each log entry
  - `user_id` (uuid, FK to profiles) - The user making the request
  - `endpoint` (text) - The API endpoint being accessed
  - `created_at` (timestamptz) - When the request was made

  ## Security
  - RLS enabled with policies for service role access only
  - Users cannot directly query or modify rate limit logs
  - Only Edge Functions using service role can manage entries

  ## Maintenance
  - Includes cleanup function to remove entries older than 1 hour
  - Index optimized for rate limit queries (user_id, endpoint, created_at)
*/

-- Create rate_limit_log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Create index for efficient rate limit queries
-- This index supports queries filtering by user_id and endpoint, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_endpoint_time 
  ON rate_limit_log(user_id, endpoint, created_at DESC);

-- Additional index for cleanup operations (by created_at)
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_created_at 
  ON rate_limit_log(created_at);

-- RLS Policies
-- Only service role can insert rate limit entries (Edge Functions)
CREATE POLICY "Service role can insert rate limit logs"
  ON rate_limit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can select rate limit entries for checking limits
CREATE POLICY "Service role can select rate limit logs"
  ON rate_limit_log FOR SELECT
  TO service_role
  USING (true);

-- Only service role can delete rate limit entries (for cleanup)
CREATE POLICY "Service role can delete rate limit logs"
  ON rate_limit_log FOR DELETE
  TO service_role
  USING (true);

-- Function to cleanup old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM rate_limit_log 
  WHERE created_at < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission on cleanup function to service role
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_log() TO service_role;

-- Comment on table and columns for documentation
COMMENT ON TABLE rate_limit_log IS 'Tracks API requests for rate limiting purposes';
COMMENT ON COLUMN rate_limit_log.user_id IS 'The authenticated user making the request';
COMMENT ON COLUMN rate_limit_log.endpoint IS 'The API endpoint being accessed (e.g., generate-outline, generate-lesson)';
COMMENT ON COLUMN rate_limit_log.created_at IS 'Timestamp when the request was made';
COMMENT ON FUNCTION cleanup_rate_limit_log() IS 'Removes rate limit log entries older than 1 hour. Should be called periodically.';
