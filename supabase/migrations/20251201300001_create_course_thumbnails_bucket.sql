-- Create course-thumbnails storage bucket with RLS policies
-- Requirements: 1.4, 5.1, 5.2, 5.3

-- Create the storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails',
  true,  -- Public read access for published courses
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Policy: Allow public read access to all thumbnails
CREATE POLICY "Public read access for course thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Policy: Allow authenticated users to upload thumbnails for their own courses
CREATE POLICY "Users can upload thumbnails for their own courses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own thumbnails
CREATE POLICY "Users can update their own course thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own thumbnails
CREATE POLICY "Users can delete their own course thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
