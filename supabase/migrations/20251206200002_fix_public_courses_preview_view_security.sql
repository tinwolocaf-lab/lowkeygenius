/*
  # Fix Public Courses Preview View Security

  ## Overview
  Recreates the public_courses_preview view with explicit SECURITY INVOKER
  to ensure it uses the permissions of the querying user, not the view creator.

  ## Security Requirements
  - Requirements: 5.4
*/

-- Drop and recreate the view with explicit security invoker
DROP VIEW IF EXISTS public_courses_preview;

CREATE VIEW public_courses_preview 
WITH (security_invoker = true)
AS
SELECT 
  id,
  title,
  description,
  topic,
  level,
  thumbnail_url,
  published_at
FROM courses
WHERE is_public = true
ORDER BY published_at DESC NULLS LAST;

-- Grant SELECT permission to anon role for unauthenticated access
GRANT SELECT ON public_courses_preview TO anon;

-- Grant SELECT permission to authenticated role as well
GRANT SELECT ON public_courses_preview TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public_courses_preview IS 'Public view of courses for unauthenticated homepage display. Only exposes public courses with limited fields.';
