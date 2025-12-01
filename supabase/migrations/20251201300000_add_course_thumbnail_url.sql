-- Add thumbnail_url column to courses table for storing course thumbnail images
-- Requirements: 1.5, 4.2, 4.3

ALTER TABLE courses ADD COLUMN thumbnail_url text;

-- Add comment for documentation
COMMENT ON COLUMN courses.thumbnail_url IS 'URL to the course thumbnail image stored in Supabase Storage';
