import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const COUNTDOWN_SECONDS = 3;

export function VerifyEmailSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

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

  return (
    <div className="min-h-screen bg-primary-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            {/* Success Checkmark Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-accent-green/10 rounded-full p-6">
                <CheckCircle className="w-12 h-12 text-accent-green" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              Email Verified!
            </h2>

            {/* Success Confirmation Message */}
            <p className="font-body text-body-md text-neutral-text-muted mb-6">
              Your email has been successfully verified. You can now access all features of your account.
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
