import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { CourseStatus, DeletionRequest } from '../types/database';

export interface PublishResult {
  success: boolean;
  error?: string;
}

export interface DeletionRequestResult {
  success: boolean;
  deletionRequest?: DeletionRequest;
  error?: string;
}

interface UseCoursePublishingReturn {
  publishCourse: (courseId: string) => Promise<PublishResult>;
  requestDeletion: (courseId: string, message?: string) => Promise<DeletionRequestResult>;
  isLoading: boolean;
}

// Valid statuses for publishing a course (Requirement 1.4)
const PUBLISHABLE_STATUSES: CourseStatus[] = ['ready', 'published'];

/**
 * Hook for course publishing functionality
 * Requirements: 1.1, 1.4
 */
export function useCoursePublishing(): UseCoursePublishingReturn {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Publish a course to the marketplace
   * Requirements: 1.1, 1.4
   * 
   * - Updates course is_public to true
   * - Sets published_at timestamp
   * - Sets creator_display_name from profile
   * - Validates course status is ready or published
   */
  const publishCourse = useCallback(async (courseId: string): Promise<PublishResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Fetch the course to validate ownership and status
      const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('id, owner_id, status, is_public')
        .eq('id', courseId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching course:', fetchError);
        return { success: false, error: 'Failed to fetch course' };
      }

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Validate ownership
      if (course.owner_id !== user.id) {
        return { success: false, error: 'You can only publish your own courses' };
      }

      // Check if already public (Requirement 1.5)
      if (course.is_public) {
        return { success: false, error: 'This course is already public' };
      }

      // Validate course status (Requirement 1.4)
      if (!PUBLISHABLE_STATUSES.includes(course.status)) {
        return { success: false, error: 'Course must be ready before publishing' };
      }

      // Get creator display name from profile
      const creatorDisplayName = profile?.full_name || profile?.email || 'Anonymous';

      // Update course to public (Requirement 1.1)
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          is_public: true,
          published_at: new Date().toISOString(),
          creator_display_name: creatorDisplayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .eq('owner_id', user.id); // Extra safety check

      if (updateError) {
        console.error('Error publishing course:', updateError);
        return { success: false, error: 'Failed to publish course' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error publishing course:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  /**
   * Request deletion of a public course
   * Requirements: 5.1
   * 
   * - Creates deletion_requests record with pending status
   * - Validates requester is course owner
   * - Validates course is public
   * - Checks for existing pending request
   */
  const requestDeletion = useCallback(async (
    courseId: string, 
    message?: string
  ): Promise<DeletionRequestResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Fetch the course to validate ownership and public status
      const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('id, owner_id, is_public')
        .eq('id', courseId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching course:', fetchError);
        return { success: false, error: 'Failed to fetch course' };
      }

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Validate ownership
      if (course.owner_id !== user.id) {
        return { success: false, error: 'You can only request deletion of your own courses' };
      }

      // Validate course is public (only public courses require deletion requests)
      if (!course.is_public) {
        return { success: false, error: 'Only public courses require deletion requests' };
      }

      // Check for existing pending request
      const { data: existingRequest, error: existingError } = await supabase
        .from('deletion_requests')
        .select('id')
        .eq('course_id', courseId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing requests:', existingError);
        return { success: false, error: 'Failed to check existing requests' };
      }

      if (existingRequest) {
        return { success: false, error: 'A deletion request is already pending for this course' };
      }

      // Create deletion request with pending status
      const { data: deletionRequest, error: insertError } = await supabase
        .from('deletion_requests')
        .insert({
          course_id: courseId,
          requester_id: user.id,
          message: message || null,
          status: 'pending',
        })
        .select()
        .single()
        .returns<DeletionRequest>();

      if (insertError) {
        console.error('Error creating deletion request:', insertError);
        return { success: false, error: 'Failed to create deletion request' };
      }

      return { success: true, deletionRequest };
    } catch (error) {
      console.error('Error requesting deletion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    publishCourse,
    requestDeletion,
    isLoading,
  };
}
