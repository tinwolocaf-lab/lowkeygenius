/*
  # Create Public Courses Preview View

  ## Overview
  Creates a database view for fetching public course preview data without authentication.
  This view is used by the homepage hero-to-grid scroll animation to display public courses.

  ## View: public_courses_preview
  Exposes limited course fields for unauthenticated access:
  - id, title, description, topic, level, thumbnail_url, published_at

  ## Security
  - Grants SELECT permission to anon role for unauthenticated access
  - Only exposes courses where is_public = true

  ## Requirements: 3.1, 3.2, 3.3, 3.4
*/

-- Create the public courses preview view
CREATE OR REPLACE VIEW public_courses_preview AS
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
