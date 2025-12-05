import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { DeletionRequest, Course, Profile } from '../types/database';

export interface DeletionRequestWithDetails extends DeletionRequest {
  course: Pick<Course, 'id' | 'title' | 'topic' | 'level'> | null;
  requester: Pick<Profile, 'id' | 'email' | 'full_name'> | null;
  enrollmentCount: number;
}

export interface ApprovalResult {
  success: boolean;
  error?: string;
  blockedReason?: 'has_enrollments' | 'not_admin';
}

export interface RejectionResult {
  success: boolean;
  error?: string;
}

interface UseAdminDeletionRequestsReturn {
  getDeletionRequests: () => Promise<DeletionRequestWithDetails[]>;
  approveDeletion: (requestId: string) => Promise<ApprovalResult>;
  rejectDeletion: (requestId: string, adminNotes?: string) => Promise<RejectionResult>;
  isLoading: boolean;
}

/**
 * Hook for admin deletion request management
 * Requirements: 5.4, 5.5, 8.1, 8.2, 8.3, 8.4
 */
export function useAdminDeletionRequests(): UseAdminDeletionRequestsReturn {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = profile?.is_admin === true;

  /**
   * Get all pending deletion requests with course and requester details
   * Requirements: 8.1, 8.2
   */
  const getDeletionRequests = useCallback(async (): Promise<DeletionRequestWithDetails[]> => {
    if (!user || !isAdmin) {
      return [];
    }

    setIsLoading(true);

    try {
      // Fetch pending deletion requests
      const { data: requests, error: requestsError } = await supabase
        .from('deletion_requests')
        .select()
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .returns<DeletionRequest[]>();

      if (requestsError) {
        console.error('Error fetching deletion requests:', requestsError);
        return [];
      }

      if (!requests || requests.length === 0) {
        return [];
      }

      // Get course IDs and requester IDs
      const courseIds = requests.map(r => r.course_id);
      const requesterIds = requests.map(r => r.requester_id);

      // Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, topic, level')
        .in('id', courseIds);

      // Fetch requesters
      const { data: requesters } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', requesterIds);

      // Fetch enrollment counts for each course
      const enrollmentCounts: Record<string, number> = {};
      for (const courseId of courseIds) {
        const { count } = await supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId);
        enrollmentCounts[courseId] = count || 0;
      }

      // Combine data
      const requestsWithDetails: DeletionRequestWithDetails[] = requests.map(request => ({
        ...request,
        course: courses?.find(c => c.id === request.course_id) || null,
        requester: requesters?.find(r => r.id === request.requester_id) || null,
        enrollmentCount: enrollmentCounts[request.course_id] || 0,
      }));

      return requestsWithDetails;
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  /**
   * Approve a deletion request
   * Requirements: 5.4, 5.5, 8.3
   * 
   * - Check enrollment count before approval
   * - Block approval if enrollments > 0
   * - Execute cascade deletion if enrollments = 0
   * - Update request status to approved
   */
  const approveDeletion = useCallback(async (requestId: string): Promise<ApprovalResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isAdmin) {
      return { success: false, error: 'Admin access required', blockedReason: 'not_admin' };
    }

    setIsLoading(true);

    try {
      // Fetch the deletion request
      const { data: request, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('id, course_id, status')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching deletion request:', fetchError);
        return { success: false, error: 'Failed to fetch deletion request' };
      }

      if (!request) {
        return { success: false, error: 'Deletion request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'This request has already been processed' };
      }

      // Check enrollment count (Requirement 5.4)
      const { count: enrollmentCount, error: countError } = await supabase
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', request.course_id);

      if (countError) {
        console.error('Error checking enrollments:', countError);
        return { success: false, error: 'Failed to check enrollment count' };
      }

      // Block approval if enrollments > 0 (Requirement 5.4)
      if (enrollmentCount && enrollmentCount > 0) {
        return { 
          success: false, 
          error: 'Cannot delete course while learners are enrolled',
          blockedReason: 'has_enrollments'
        };
      }

      // Execute cascade deletion (Requirement 5.5)
      // Delete the course - cascade will handle related data
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', request.course_id);

      if (deleteError) {
        console.error('Error deleting course:', deleteError);
        return { success: false, error: 'Failed to delete course' };
      }

      // Update request status to approved (Requirement 8.3)
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        // Course is already deleted, so we still return success
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving deletion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  /**
   * Reject a deletion request
   * Requirements: 8.4
   * 
   * - Update request status to rejected
   * - Store admin notes
   */
  const rejectDeletion = useCallback(async (
    requestId: string, 
    adminNotes?: string
  ): Promise<RejectionResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    setIsLoading(true);

    try {
      // Fetch the deletion request to verify it exists and is pending
      const { data: request, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('id, status')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching deletion request:', fetchError);
        return { success: false, error: 'Failed to fetch deletion request' };
      }

      if (!request) {
        return { success: false, error: 'Deletion request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'This request has already been processed' };
      }

      // Update request status to rejected with admin notes
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error rejecting deletion request:', updateError);
        return { success: false, error: 'Failed to reject deletion request' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  return {
    getDeletionRequests,
    approveDeletion,
    rejectDeletion,
    isLoading,
  };
}
