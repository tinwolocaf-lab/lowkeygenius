import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Zap,
  Flame,
  Award,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { GamificationService } from '../lib/gamificationService';
import { Card } from '../components/Card';
import { BadgeDisplay } from '../components/BadgeDisplay';
import type { PublicProfileData, BadgeDefinition } from '../types/database';

/**
 * PublicProfile Page - Displays a user's public profile with XP, streak, and badges.
 * Returns a privacy message if the profile is set to private.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch public profile data
   */
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    try {
      const [profileData, badgeDefinitions] = await Promise.all([
        GamificationService.getPublicProfile(userId),
        GamificationService.getAllBadgeDefinitions(),
      ]);

      setAllBadges(badgeDefinitions);

      if (profileData === null) {
        // Profile is either private or doesn't exist
        // We need to check if the user exists to differentiate
        setIsPrivate(true);
      } else {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching public profile:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <User className="w-16 h-16 text-neutral-text-muted mx-auto mb-4" />
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              User Not Found
            </h2>
            <p className="font-body text-neutral-text-muted mb-6">
              The user you're looking for doesn't exist.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Card>
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-neutral-text-muted mx-auto mb-4" />
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              Private Profile
            </h2>
            <p className="font-body text-neutral-text-muted mb-6">
              This user has set their profile to private.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-neutral-text-muted hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Profile Header */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-primary">
                {profile.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name and Stats */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-display text-display-lg text-neutral-text mb-4">
              {profile.displayName}
            </h1>

            {/* Stats Row */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              {/* Total XP */}
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-accent-yellow to-accent-orange rounded-lg p-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-neutral-text">
                    {profile.totalXp.toLocaleString()}
                  </p>
                  <p className="font-body text-xs text-neutral-text-muted">
                    Total XP
                  </p>
                </div>
              </div>

              {/* Current Streak */}
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-accent-orange to-accent-red rounded-lg p-2">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-neutral-text">
                    {profile.currentStreak}
                  </p>
                  <p className="font-body text-xs text-neutral-text-muted">
                    Day Streak
                  </p>
                </div>
              </div>

              {/* Badges Count */}
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-lg p-2">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-neutral-text">
                    {profile.badges.length}
                  </p>
                  <p className="font-body text-xs text-neutral-text-muted">
                    Badges Earned
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Badges Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-neutral-text">
            Badges
          </h3>
          <span className="font-body text-xs text-neutral-text-muted ml-auto">
            {profile.badges.length} / {allBadges.length} earned
          </span>
        </div>
        <BadgeDisplay earnedBadges={profile.badges} allBadges={allBadges} />
      </Card>
    </div>
  );
}
