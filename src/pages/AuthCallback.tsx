import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

type ErrorType = 'expired' | 'invalid' | 'network' | null;

interface AuthCallbackState {
  loading: boolean;
  error: string | null;
  errorType: ErrorType;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resendVerificationEmail, isEmailVerified, user } = useAuth();
  
  const [state, setState] = useState<AuthCallbackState>({
    loading: true,
    error: null,
    errorType: null,
  });
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerificationError = useCallback((error: Error) => {
    const message = error.message.toLowerCase();
    
    let errorType: ErrorType = 'invalid';
    if (message.includes('expired') || message.includes('expire')) {
      errorType = 'expired';
    } else if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      errorType = 'network';
    }
    
    setState({
      loading: false,
      error: error.message,
      errorType,
    });
  }, []);

  const verifyToken = useCallback(async () => {
    // Check if user is already verified - redirect to dashboard
    if (user && isEmailVerified) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Extract code from URL - Supabase uses 'code' query parameter for PKCE flow
    const code = searchParams.get('code');
    
    // Also check hash for older token-based flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const errorDescription = hashParams.get('error_description');
    const errorParam = searchParams.get('error_description') || errorDescription;

    // Handle error from URL
    if (errorParam) {
      handleVerificationError(new Error(errorParam));
      return;
    }

    try {
      if (code) {
        // PKCE flow - exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          handleVerificationError(error);
          return;
        }
        
        // Success - redirect to verification success page
        navigate('/verify-email/success', { replace: true });
      } else if (accessToken && refreshToken) {
        // Token-based flow - set session directly
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          handleVerificationError(error);
          return;
        }
        
        // Success - redirect to verification success page
        navigate('/verify-email/success', { replace: true });
      } else {
        // No valid tokens found
        handleVerificationError(new Error('Invalid verification link. No authentication code found.'));
      }
    } catch (err) {
      // Network or unexpected error
      handleVerificationError(err instanceof Error ? err : new Error('An unexpected error occurred'));
    }
  }, [searchParams, navigate, handleVerificationError, user, isEmailVerified]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleRetry = () => {
    setState({ loading: true, error: null, errorType: null });
    verifyToken();
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    
    const { error } = await resendVerificationEmail();
    
    setResendLoading(false);
    
    if (!error) {
      setResendSuccess(true);
    }
  };

  const getErrorMessage = (): string => {
    switch (state.errorType) {
      case 'expired':
        return 'This verification link has expired. Please request a new one.';
      case 'invalid':
        return 'This verification link is invalid. Please request a new one.';
      case 'network':
        return 'Connection error. Please check your internet and try again.';
      default:
        return state.error || 'An error occurred during verification.';
    }
  };

  // Loading state
  if (state.loading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
              <h2 className="font-display text-display-md text-neutral-text mb-2">
                Verifying Your Email
              </h2>
              <p className="font-body text-body-md text-neutral-text-muted">
                Please wait while we verify your email address...
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-accent-red/10 rounded-full p-6">
                <AlertCircle className="w-12 h-12 text-accent-red" />
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-display text-display-md text-neutral-text mb-2">
              Verification Failed
            </h2>

            {/* Error Message */}
            <p className="font-body text-body-md text-neutral-text-muted mb-6">
              {getErrorMessage()}
            </p>

            {/* Success Message for Resend */}
            {resendSuccess && (
              <div className="bg-accent-green/10 border-2 border-accent-green/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                <p className="text-sm text-accent-green font-body font-semibold">
                  New verification email sent!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry button for network errors */}
              {state.errorType === 'network' && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleRetry}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </span>
                </Button>
              )}

              {/* Resend verification button */}
              <Button
                variant={state.errorType === 'network' ? 'secondary' : 'primary'}
                size="md"
                className="w-full"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>

              {/* Back to Login */}
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
