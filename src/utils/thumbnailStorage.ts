import { supabase } from '../lib/supabase';

/**
 * Accepted MIME types for thumbnail images
 * Requirements: 1.2
 */
export const ACCEPTED_THUMBNAIL_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AcceptedThumbnailType = typeof ACCEPTED_THUMBNAIL_TYPES[number];

/**
 * Maximum file size for thumbnails in bytes (5MB)
 * Requirements: 1.3
 */
export const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB = 5,242,880 bytes

/**
 * Storage bucket name for course thumbnails
 */
export const THUMBNAIL_BUCKET = 'course-thumbnails';

/**
 * Result type for file validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Result type for upload operations
 */
export type UploadResult = 
  | { url: string; error?: never }
  | { url?: never; error: string };

/**
 * Result type for delete operations
 */
export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Generates a consistent storage path for thumbnail files.
 * 
 * The path follows the pattern: {userId}/{courseId}/thumbnail
 * This ensures thumbnails are organized by user and course.
 * 
 * @param userId - The UUID of the user who owns the course
 * @param courseId - The UUID of the course
 * @returns The storage path string
 * 
 * Requirements: 5.1
 */
export function getThumbnailStoragePath(userId: string, courseId: string): string {
  return `${userId}/${courseId}/thumbnail`;
}


/**
 * Validates a file for thumbnail upload.
 * 
 * Checks that:
 * - File type is an accepted image format (JPEG, PNG, WebP, GIF)
 * - File size is within the 5MB limit
 * 
 * @param file - The File object to validate
 * @returns ValidationResult with valid=true if file passes all checks,
 *          or valid=false with an error message if validation fails
 * 
 * Requirements: 1.2, 1.3
 */
export function validateThumbnailFile(file: File): ValidationResult {
  // Check file type
  if (!ACCEPTED_THUMBNAIL_TYPES.includes(file.type as AcceptedThumbnailType)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted formats: JPEG, PNG, WebP, GIF`,
    };
  }

  // Check file size
  if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
    const maxSizeMB = MAX_THUMBNAIL_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a thumbnail image to Supabase Storage.
 * 
 * The file is stored at the path: {userId}/{courseId}/thumbnail
 * If a thumbnail already exists at this path, it will be replaced.
 * 
 * @param file - The File object to upload
 * @param userId - The UUID of the user who owns the course
 * @param courseId - The UUID of the course
 * @returns Promise resolving to UploadResult with the public URL on success,
 *          or an error message on failure
 * 
 * Requirements: 1.4, 4.2, 5.1
 */
export async function uploadThumbnail(
  file: File,
  userId: string,
  courseId: string
): Promise<UploadResult> {
  // Validate file before upload
  const validation = validateThumbnailFile(file);
  if (!validation.valid) {
    return { error: validation.error ?? 'Invalid file' };
  }

  const storagePath = getThumbnailStoragePath(userId, courseId);

  // Upload file to storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Get public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from(THUMBNAIL_BUCKET)
    .getPublicUrl(storagePath);

  return { url: urlData.publicUrl };
}

/**
 * Deletes a thumbnail image from Supabase Storage.
 * 
 * @param userId - The UUID of the user who owns the course
 * @param courseId - The UUID of the course
 * @returns Promise resolving to DeleteResult indicating success or failure
 * 
 * Requirements: 4.3
 */
export async function deleteThumbnail(
  userId: string,
  courseId: string
): Promise<DeleteResult> {
  const storagePath = getThumbnailStoragePath(userId, courseId);

  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
