import type { PlanType } from '../types/database';

/**
 * Profile data required for audio access check
 */
export interface AudioAccessProfile {
  plan_type: PlanType;
  audio_addon_enabled: boolean;
  audio_addon_trial_used: boolean;
  audio_addon_expires_at: string | null;
}

/**
 * Result of audio access check
 */
export interface AudioAccessResult {
  hasAccess: boolean;
  reason: string;
}

/**
 * Checks if a user has access to audio generation features.
 * 
 * Access is granted if:
 * 1. User has PRO_MAX plan (unlimited access)
 * 2. User has audio add-on enabled AND it hasn't expired
 * 3. User is on FREE plan AND hasn't used their free trial yet
 * 
 * @param profile - The user's profile data containing plan and audio add-on info
 * @param currentDate - Optional date for testing (defaults to current time)
 * @returns Object with hasAccess boolean and reason string
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function checkAudioAccess(
  profile: AudioAccessProfile,
  currentDate: Date = new Date()
): AudioAccessResult {
  // PRO_MAX users have unlimited access (Requirement 4.4)
  if (profile.plan_type === 'PRO_MAX') {
    return { hasAccess: true, reason: 'PRO_MAX plan includes audio generation' };
  }

  // Check audio add-on subscription (Requirements 4.3, 4.5)
  if (profile.audio_addon_enabled) {
    // If there's an expiration date, check if it's still valid
    if (profile.audio_addon_expires_at) {
      const expiresAt = new Date(profile.audio_addon_expires_at);
      if (expiresAt > currentDate) {
        return { hasAccess: true, reason: 'Audio add-on subscription active' };
      }
      // Subscription has expired (Requirement 4.5)
      return { 
        hasAccess: false, 
        reason: 'Your Audio Add-on subscription has expired. Please renew your subscription or upgrade to Pro Max to continue generating audio.' 
      };
    }
    // No expiration date means active subscription
    return { hasAccess: true, reason: 'Audio add-on subscription active' };
  }

  // FREE plan users get one free trial (Requirement 4.1)
  if (profile.plan_type === 'FREE' && !profile.audio_addon_trial_used) {
    return { hasAccess: true, reason: 'Free trial available' };
  }

  // FREE plan users who have used their trial need to upgrade (Requirement 4.2)
  if (profile.plan_type === 'FREE' && profile.audio_addon_trial_used) {
    return { 
      hasAccess: false, 
      reason: 'Your free audio trial has been used. Subscribe to the Audio Add-on or upgrade to Pro Max to generate more audio.' 
    };
  }

  // PLUS or PRO plan users without audio add-on (Requirement 4.3)
  return { 
    hasAccess: false, 
    reason: 'Audio generation requires the Audio Add-on subscription or a Pro Max plan.' 
  };
}
