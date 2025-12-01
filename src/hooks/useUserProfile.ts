import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { UserProfile, ExtractedContext } from '../types/database';

interface UserProfileData {
  profile: UserProfile | null;
  extractedContext: ExtractedContext | null;
  hasProfile: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserProfile(): UserProfileData {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        setError(fetchError.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user profile';
      console.error('Error fetching user profile:', err);
      setError(errorMessage);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const hasProfile = profile !== null;
  const extractedContext = profile?.extracted_context ?? null;

  return {
    profile,
    extractedContext,
    hasProfile,
    isLoading,
    error,
    refetch: fetchUserProfile,
  };
}
