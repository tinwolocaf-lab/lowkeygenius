import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ThemeSelector } from '../components/ThemeSelector';
import { ProfileSettings } from '../components/ProfileSettings';
import { useSubscription } from '../hooks/useSubscription';
import { openCustomerPortal, initiateCheckout } from '../lib/polar';
import { Crown, Sparkles, Gift, Zap, Calendar, CreditCard, Palette, LogOut, User, BookOpen, Volume2 } from 'lucide-react';

export function Settings() {
  const { profile, signOut } = useAuth();
  const { theme } = useTheme();
  const subscription = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      await openCustomerPortal();
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAudioAddon = async () => {
    const audioAddonId = import.meta.env.VITE_POLAR_PRODUCT_AUDIO_ADDON;
    if (!audioAddonId) {
      toast.error('Audio add-on not configured. Please contact support.');
      return;
    }

    try {
      setLoading(true);
      await initiateCheckout(audioAddonId, 'monthly', true);
    } catch (error) {
      console.error('Error starting audio add-on checkout:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = () => {
    switch (subscription.planType) {
      case 'PRO_MAX':
        return <Crown className="w-6 h-6 text-accent-orange" />;
      case 'PRO':
        return <Zap className="w-6 h-6 text-secondary" />;
      case 'PLUS':
        return <Sparkles className="w-6 h-6 text-accent-green" />;
      default:
        return <Gift className="w-6 h-6 text-neutral-text-muted" />;
    }
  };

  const getPlanColor = () => {
    switch (subscription.planType) {
      case 'PRO_MAX':
        return 'bg-accent-orange/20 text-accent-orange';
      case 'PRO':
        return 'bg-secondary-light text-secondary-dark';
      case 'PLUS':
        return 'bg-accent-green/20 text-accent-green';
      default:
        return 'bg-neutral-surface text-neutral-text-muted';
    }
  };

  const getStatusBadge = () => {
    if (!subscription.subscriptionStatus) return null;

    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      canceled: 'bg-orange-100 text-orange-700',
      past_due: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[subscription.subscriptionStatus] || 'bg-gray-100 text-gray-700'}`}>
        {subscription.subscriptionStatus.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPlanBenefits = () => {
    switch (subscription.planType) {
      case 'PRO_MAX':
        return [
          { icon: BookOpen, text: 'Unlimited courses per month' },
          { icon: Volume2, text: 'Unlimited audio generation included' },
          { icon: Sparkles, text: 'Priority AI generation' },
          { icon: Crown, text: 'Early access to new features' },
        ];
      case 'PRO':
        return [
          { icon: BookOpen, text: '20 courses per month' },
          { icon: Volume2, text: 'Audio add-on available ($10/mo)' },
          { icon: Sparkles, text: 'Advanced AI generation' },
        ];
      case 'PLUS':
        return [
          { icon: BookOpen, text: '10 courses per month' },
          { icon: Volume2, text: 'Audio add-on available ($10/mo)' },
        ];
      default:
        return [
          { icon: BookOpen, text: '3 courses per month' },
          { icon: Gift, text: 'Basic features included' },
        ];
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-display-lg text-neutral-text mb-6">Account Settings</h1>

      <div className="space-y-6">
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                {profile?.full_name ? (
                  <span className="text-2xl font-bold text-primary">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h2 className="font-display text-display-sm text-neutral-text">
                  {profile?.full_name || 'User'}
                </h2>
                <p className="font-body text-neutral-text-muted">{profile?.email}</p>
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-medium ${getPlanColor()}`}>
                  {getPlanIcon()}
                  <span>{subscription.planType}</span>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-accent-red hover:bg-accent-red/10"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="font-display text-display-sm text-neutral-text">Appearance</h2>
          </div>
          <p className="text-sm font-body text-neutral-text-muted mb-4">
            Customize the look and feel of your workspace
          </p>
          <div className="flex items-center justify-between p-4 bg-neutral-surface rounded-2xl">
            <div>
              <p className="font-body font-bold text-neutral-text mb-1">Theme</p>
              <p className="text-sm text-neutral-text-muted">
                Current: {theme.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </p>
            </div>
            <div className="w-64">
              <ThemeSelector />
            </div>
          </div>
        </Card>

        <ProfileSettings />

        <Card>
          <h2 className="font-display text-display-sm text-neutral-text mb-4">Profile Details</h2>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={profile?.full_name || ''}
              placeholder="Your name"
              disabled
            />
            <Input
              label="Email"
              type="email"
              value={profile?.email || ''}
              disabled
            />
            <p className="text-sm font-body text-neutral-text-muted">
              Profile editing coming soon
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-display-sm text-neutral-text mb-4">Subscription</h2>

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${getPlanColor()}`}>
                  {getPlanIcon()}
                </div>
                <div>
                  <p className="font-body text-sm text-neutral-text-muted">Current Plan</p>
                  <p className="font-display text-2xl font-bold text-neutral-text mb-2">
                    {subscription.planType}
                  </p>
                  {getStatusBadge()}
                </div>
              </div>
              {subscription.planType !== 'FREE' && (
                <Button
                  variant="secondary"
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Manage Subscription'}
                </Button>
              )}
            </div>

            {subscription.billingCycle && (
              <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
                <Calendar className="w-4 h-4" />
                <span>
                  Billed {subscription.billingCycle}
                  {subscription.subscriptionEndsAt && (
                    <> • Next billing: {subscription.subscriptionEndsAt.toLocaleDateString()}</>
                  )}
                </span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-neutral-text mb-3">Plan Benefits</h3>
              <div className="space-y-2">
                {getPlanBenefits().map((benefit, index) => {
                  const BenefitIcon = benefit.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-primary-light/30 flex items-center justify-center flex-shrink-0">
                        <BenefitIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-neutral-text">{benefit.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-neutral-text">Course Usage</h3>
                <span className="text-sm text-neutral-text-muted">
                  {subscription.coursesUsed} / {subscription.coursesLimit === Infinity ? '∞' : subscription.coursesLimit} courses
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    subscription.coursesUsed >= subscription.coursesLimit
                      ? 'bg-red-500'
                      : subscription.coursesUsed / subscription.coursesLimit > 0.8
                      ? 'bg-orange-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min((subscription.coursesUsed / (subscription.coursesLimit === Infinity ? subscription.coursesUsed + 1 : subscription.coursesLimit)) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            {subscription.planType !== 'PRO_MAX' && (
              <div className="border-t border-gray-200 pt-4">
                <Button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-primary hover:bg-primary-dark"
                >
                  Upgrade Plan
                </Button>
              </div>
            )}
          </div>
        </Card>

        {(subscription.planType === 'PLUS' || subscription.planType === 'PRO') && (
          <Card className="bg-accent-yellow/10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-accent-yellow/30 rounded-lg">
                  <Sparkles className="w-6 h-6 text-accent-orange" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-neutral-text mb-1">
                    Audio Add-on
                  </h3>
                  <p className="text-sm text-neutral-text-muted">
                    {subscription.isAudioEnabled
                      ? 'Audio generation is enabled'
                      : 'Transform lessons into audio content'}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription.isAudioEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {subscription.isAudioEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {!subscription.isAudioEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-neutral-text">$10/month</p>
                    {!profile?.audio_addon_trial_used && (
                      <p className="text-sm text-green-600 font-medium">
                        Try free for 7 days
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleAddAudioAddon}
                    disabled={loading}
                    className="bg-accent-green hover:bg-accent-green/90"
                  >
                    {loading ? 'Loading...' : 'Add Audio Features'}
                  </Button>
                </div>
              </div>
            )}

            {subscription.isAudioEnabled && (
              <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
                <CreditCard className="w-4 h-4" />
                <span>Manage audio subscription in your billing portal</span>
              </div>
            )}
          </Card>
        )}

        {subscription.planType === 'PRO_MAX' && (
          <Card className="bg-accent-yellow/10">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-accent-orange" />
              <div>
                <h3 className="font-display text-lg font-bold text-neutral-text">
                  Unlimited Audio Included
                </h3>
                <p className="text-sm text-neutral-text-muted">
                  Your Pro Max plan includes unlimited audio generation at no extra cost
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
