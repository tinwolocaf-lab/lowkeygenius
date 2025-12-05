import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Link2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const COUNTDOWN_SECONDS = 3;

interface LocationState {
  linkedAccount?: boolean;
  isOAuth?: boolean;
  isFirstTimeLinking?: boolean;
}

export function VerifyEmailSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  
  // Get state passed from AuthCallback
  const state = location.state as LocationState | null;
  const isLinkedAccount = state?.linkedAccount && state?.isFirstTimeLinking;

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, navigate]);

  const handleContinueToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  // Determine heading and message based on whether accounts were linked
  const getHeading = (): string => {
    if (isLinkedAccount) {
      return 'Accounts Linked Successfully!';
    }
    return 'Registration Successful!';
  };

  const getMessage = (): string => {
    if (isLinkedAccount) {
      return 'Your Google account has been linked to your existing email account. You can now sign in with either method.';
    }
    return 'Your email has been verified and your account is now active. Welcome to Lowkeygenius!';
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            {/* Success Icon - different icon for linked accounts */}
            <div className="flex justify-center mb-6">
              <div className="bg-accent-green/10 rounded-full p-6">
                {isLinkedAccount ? (
                  <Link2 className="w-12 h-12 text-accent-green" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-accent-green" />
                )}
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              {getHeading()}
            </h2>

            {/* Success Confirmation Message */}
            <p className="font-body text-body-md text-neutral-text-muted mb-6">
              {getMessage()}
            </p>

            {/* Countdown Timer Display */}
            <div className="bg-neutral-bg rounded-xl p-4 mb-6">
              <p className="font-body text-body-sm text-neutral-text-muted">
                Redirecting to dashboard in{' '}
                <span className="font-semibold text-primary">{countdown}</span>{' '}
                {countdown === 1 ? 'second' : 'seconds'}...
              </p>
            </div>

            {/* Continue to Dashboard Button */}
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleContinueToDashboard}
            >
              <span className="flex items-center justify-center gap-2">
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
