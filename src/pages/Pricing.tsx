import { useState } from 'react';
import { Check, Zap, Crown, Gift, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PublicHeader } from '../components/PublicHeader';
import { initiateCheckout } from '../lib/polar';

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  icon: React.ReactNode;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  planType: 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX';
  productIdMonthly?: string;
  productIdYearly?: string;
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const tiers: PricingTier[] = [
    {
      name: 'Free',
      description: 'Perfect for trying out CourseGen',
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: <Gift className="w-6 h-6" />,
      planType: 'FREE',
      features: [
        '1 course total',
        'AI-generated course outlines',
        'AI-generated lessons',
        'Markdown export',
        'Basic course management',
        'No audio generation',
      ],
    },
    {
      name: 'Plus',
      description: 'For regular learners',
      monthlyPrice: 10,
      yearlyPrice: 96,
      icon: <Star className="w-6 h-6" />,
      planType: 'PLUS',
      badge: 'Most Popular',
      highlighted: true,
      productIdMonthly: import.meta.env.VITE_POLAR_PRODUCT_PLUS_MONTHLY,
      productIdYearly: import.meta.env.VITE_POLAR_PRODUCT_PLUS_YEARLY,
      features: [
        '5 courses per month',
        'AI-generated course outlines',
        'AI-generated lessons',
        'Markdown export',
        'Advanced course management',
        'Audio add-on available (+$10/mo)',
      ],
    },
    {
      name: 'Pro',
      description: 'For power users',
      monthlyPrice: 20,
      yearlyPrice: 192,
      icon: <Zap className="w-6 h-6" />,
      planType: 'PRO',
      productIdMonthly: import.meta.env.VITE_POLAR_PRODUCT_PRO_MONTHLY,
      productIdYearly: import.meta.env.VITE_POLAR_PRODUCT_PRO_YEARLY,
      features: [
        '20 courses per month',
        'AI-generated course outlines',
        'AI-generated lessons',
        'Markdown export',
        'Priority support',
        'Audio add-on available (+$10/mo)',
      ],
    },
    {
      name: 'Pro Max',
      description: 'For unlimited creation',
      monthlyPrice: 40,
      yearlyPrice: 384,
      icon: <Crown className="w-6 h-6" />,
      planType: 'PRO_MAX',
      badge: 'Best Value',
      productIdMonthly: import.meta.env.VITE_POLAR_PRODUCT_PRO_MAX_MONTHLY,
      productIdYearly: import.meta.env.VITE_POLAR_PRODUCT_PRO_MAX_YEARLY,
      features: [
        'Unlimited courses',
        'AI-generated course outlines',
        'AI-generated lessons',
        'Markdown export',
        'Priority support',
        'Unlimited audio generation included',
      ],
    },
  ];

  const handleSelectPlan = async (tier: PricingTier) => {
    if (!user) {
      navigate('/signup');
      return;
    }

    if (tier.planType === 'FREE') {
      return;
    }

    const productId = billingCycle === 'monthly' ? tier.productIdMonthly : tier.productIdYearly;

    if (!productId) {
      toast.error('Product not configured. Please contact support.');
      return;
    }

    try {
      setLoading(tier.planType);
      await initiateCheckout(productId, billingCycle);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (productId: string, isAudioAddon = false) => {
    if (!user) {
      navigate('/signup');
      return;
    }

    if (!productId) {
      toast.error('Product not configured. Please contact support.');
      return;
    }

    try {
      setLoading('audio');
      await initiateCheckout(productId, billingCycle, isAudioAddon);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getButtonText = (tier: PricingTier) => {
    if (loading === tier.planType) return 'Loading...';
    if (profile?.plan_type === tier.planType) return 'Current Plan';
    if (tier.planType === 'FREE') return 'Get Started';
    return 'Choose Plan';
  };

  const isCurrentPlan = (tier: PricingTier) => profile?.plan_type === tier.planType;

  const isPublicView = !user;

  const pricingContent = (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-neutral-text mb-4">
            Choose Your Learning Adventure
          </h1>
          <p className="text-xl text-neutral-text-muted mb-8">
            Start creating amazing courses with AI-powered tools
          </p>

          <div className="inline-flex items-center bg-neutral-bg border border-neutral-border rounded-full p-1 shadow-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-white'
                  : 'text-neutral-text-muted hover:text-neutral-text'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-white'
                  : 'text-neutral-text-muted hover:text-neutral-text'
              }`}
            >
              Yearly
              <span className="text-xs bg-accent-green text-white px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier) => {
            const price = billingCycle === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice;
            const effectiveMonthly = billingCycle === 'yearly' ? price / 12 : price;
            const current = isCurrentPlan(tier);

            return (
              <Card
                key={tier.planType}
                className={`relative p-6 bg-neutral-bg ${
                  tier.highlighted
                    ? 'border-2 border-primary shadow-xl transform scale-105'
                    : ''
                } ${current ? 'border-2 border-accent-green' : ''}`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    {tier.badge}
                  </div>
                )}

                {current && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-green text-white px-4 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-light/30 rounded-lg text-primary">
                    {tier.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-text">{tier.name}</h3>
                  </div>
                </div>

                <p className="text-sm text-neutral-text-muted mb-6">{tier.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-neutral-text">
                      ${effectiveMonthly.toFixed(0)}
                    </span>
                    <span className="text-neutral-text-muted">/month</span>
                  </div>
                  {billingCycle === 'yearly' && tier.monthlyPrice > 0 && (
                    <p className="text-sm text-neutral-text-muted mt-1">
                      Billed ${price}/year
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={current || loading === tier.planType}
                  className={`w-full mb-6 ${
                    tier.highlighted && !current
                      ? 'bg-primary hover:bg-primary-dark'
                      : current
                      ? 'bg-accent-green'
                      : ''
                  }`}
                >
                  {getButtonText(tier)}
                </Button>

                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <Card className="p-8 bg-accent-yellow/10 border border-accent-yellow/30 mb-16">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-neutral-text">Audio Add-on</h3>
              <p className="text-neutral-text-muted">Available as separate subscription</p>
            </div>
          </div>
          <p className="text-neutral-text mb-6">
            Transform your written lessons into engaging audio content with AI-powered text-to-speech.
            Perfect for learning on the go! Works with any plan, including Free.
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-3xl font-bold text-neutral-text">$10/month</p>
              <p className="text-sm text-accent-green font-medium">Try free for 7 days</p>
            </div>
            {user && profile && (
              <div className="flex items-center gap-3">
                {profile.audio_addon_enabled || profile.plan_type === 'PRO_MAX' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-body font-semibold text-green-600">Active</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(import.meta.env.VITE_POLAR_PRODUCT_AUDIO_ADDON!, true)}
                    disabled={loading === 'audio'}
                    className="flex items-center gap-2"
                  >
                    {loading === 'audio' ? 'Processing...' : 'Add Audio Generation'}
                  </Button>
                )}
              </div>
            )}
            {!user && (
              <Button onClick={() => navigate('/signup')} className="flex items-center gap-2">
                Get Started
              </Button>
            )}
          </div>
          <p className="text-sm text-neutral-text-muted mt-4">
            Subscribe separately to add audio generation to any plan. Pro Max includes unlimited audio at no extra cost.
          </p>
        </Card>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-neutral-text mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Card className="p-6 bg-neutral-bg">
              <h3 className="font-semibold text-neutral-text mb-2">
                Can I change plans at any time?
              </h3>
              <p className="text-neutral-text-muted">
                Yes! You can upgrade or downgrade your plan anytime. Upgrades take effect immediately,
                while downgrades apply at the end of your billing cycle.
              </p>
            </Card>

            <Card className="p-6 bg-neutral-bg">
              <h3 className="font-semibold text-neutral-text mb-2">
                What happens if I exceed my monthly course limit?
              </h3>
              <p className="text-neutral-text-muted">
                You'll be prompted to upgrade to a higher tier to continue creating courses.
                Your existing courses remain accessible regardless of your plan.
              </p>
            </Card>

            <Card className="p-6 bg-neutral-bg">
              <h3 className="font-semibold text-neutral-text mb-2">
                How does the audio add-on trial work?
              </h3>
              <p className="text-neutral-text-muted">
                You get 7 days free to try the audio generation feature. After the trial,
                you'll be charged $10/month unless you cancel. Each user gets one trial.
              </p>
            </Card>

            <Card className="p-6 bg-neutral-bg">
              <h3 className="font-semibold text-neutral-text mb-2">
                Is there a refund policy?
              </h3>
              <p className="text-neutral-text-muted">
                Yes! We offer a 14-day money-back guarantee on all paid plans. Contact support
                if you're not satisfied with your subscription.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-neutral-surface">
        <PublicHeader />
        {pricingContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-surface">
      {pricingContent}
    </div>
  );
}
