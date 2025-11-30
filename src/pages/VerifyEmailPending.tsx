import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface LocationState {
  email?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailPending() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerificationEmail, user } = useAuth();
  
  const state = location.state as LocationState | null;
  const email = state?.email || user?.email || '';

  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    const { error: resendError } = await resendVerificationEmail();

    setResendLoading(false);

    if (resendError) {
      setError(resendError.message);
    } else {
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }, [resendCooldown, resendLoading, resendVerificationEmail]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-primary-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            {/* Email Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-primary/10 rounded-full p-6">
                <Mail className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              Check Your Email
            </h2>

            {/* Email Address Display */}
            {email && (
              <p className="font-body text-body-lg text-neutral-text mb-4">
                We've sent a verification link to:
              </p>
            )}
            {email && (
              <p className="font-body text-body-lg font-semibold text-primary mb-6">
                {email}
              </p>
            )}

            {/* Instructions */}
            <div className="bg-neutral-bg rounded-xl p-4 mb-6 text-left">
              <p className="font-body text-body-md text-neutral-text-muted mb-2">
                Click the link in the email to verify your account.
              </p>
              <p className="font-body text-body-sm text-neutral-text-muted">
                Don't see it? Check your spam folder.
              </p>
            </div>

            {/* Success Message */}
            {resendSuccess && (
              <div className="bg-accent-green/10 border-2 border-accent-green/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                <p className="text-sm text-accent-green font-body font-semibold">
                  Verification email sent successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-accent-red/10 border-2 border-accent-red/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
                <p className="text-sm text-accent-red font-body font-semibold">
                  {error}
                </p>
              </div>
            )}

            {/* Resend Button */}
            <Button
              variant="secondary"
              size="md"
              className="w-full mb-4"
              onClick={handleResendVerification}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Resend Verification Email
                </span>
              )}
            </Button>

            {/* Back to Login Link */}
            <button
              onClick={handleBackToLogin}
              className="flex items-center justify-center gap-2 text-primary font-body font-semibold hover:underline mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
