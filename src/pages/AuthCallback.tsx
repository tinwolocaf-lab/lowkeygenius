import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

type ErrorType = 'expired' | 'invalid' | 'network' | 'account_exists' | null;
type AuthFlowType = 'email_verification' | 'oauth' | null;

interface AuthCallbackState {
  loading: boolean;
  error: string | null;
  errorType: ErrorType;
  isNewRegistration: boolean;
  linkedAccount: boolean;
  authFlowType: AuthFlowType;
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resendVerificationEmail, isEmailVerified, user } = useAuth();
  
  const [state, setState] = useState<AuthCallbackState>({
    loading: true,
    error: null,
    errorType: null,
    isNewRegistration: false,
    linkedAccount: false,
    authFlowType: null,
  });
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerificationError = useCallback((error: Error, authFlowType: AuthFlowType = null) => {
    const message = error.message.toLowerCase();
    
    let errorType: ErrorType = 'invalid';
    if (message.includes('expired') || message.includes('expire')) {
      errorType = 'expired';
    } else if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      errorType = 'network';
    } else if (message.includes('account') && message.includes('exist')) {
      errorType = 'account_exists';
    }
    
    setState({
      loading: false,
      error: error.message,
      errorType,
      isNewRegistration: false,
      linkedAccount: false,
      authFlowType,
    });
  }, []);

  /**
   * Detects if the callback is from OAuth or email verification
   * OAuth callbacks typically have a 'provider' or come from OAuth redirect
   * Email verification callbacks come from email links
   */
  const detectAuthFlowType = useCallback((code: string | null, hashParams: URLSearchParams): AuthFlowType => {
    // Check for OAuth provider indicator in URL
    const provider = searchParams.get('provider');
    if (provider === 'google') {
      return 'oauth';
    }

    // Check hash params for OAuth indicators
    const providerToken = hashParams.get('provider_token');
    if (providerToken) {
      return 'oauth';
    }

    // If we have a code but no explicit provider, we need to check after session exchange
    // Default to email_verification for now, will be updated after session check
    if (code) {
      return 'email_verification';
    }

    return null;
  }, [searchParams]);

  /**
   * Checks if the user has multiple identities (account linking occurred)
   * This happens when a user signs in with Google using an email that already exists
   * Returns an object with:
   * - hasMultipleIdentities: whether the user has more than one identity
   * - isFirstTimeLinking: whether this is the first time linking (Google identity was just added)
   */
  const checkForAccountLinking = useCallback((
    identities: { provider: string; created_at?: string; last_sign_in_at?: string }[] | undefined
  ): { hasMultipleIdentities: boolean; isFirstTimeLinking: boolean } => {
    if (!identities || identities.length <= 1) {
      return { hasMultipleIdentities: false, isFirstTimeLinking: false };
    }
    
    // User has multiple identities - check if Google identity was just added
    const googleIdentity = identities.find(identity => identity.provider === 'google');
    
    if (!googleIdentity) {
      return { hasMultipleIdentities: true, isFirstTimeLinking: false };
    }
    
    // Check if the Google identity was created recently (within the last 60 seconds)
    // This indicates first-time linking
    const googleCreatedAt = googleIdentity.created_at ? new Date(googleIdentity.created_at) : null;
    const now = new Date();
    
    let isFirstTimeLinking = false;
    if (googleCreatedAt) {
      const timeSinceCreation = now.getTime() - googleCreatedAt.getTime();
      isFirstTimeLinking = timeSinceCreation < 60000; // 60 seconds
    }
    
    return { hasMultipleIdentities: true, isFirstTimeLinking };
  }, []);

  /**
   * Determines if this is a new registration based on user metadata
   */
  const checkIsNewRegistration = useCallback((createdAt: string | undefined, lastSignInAt: string | undefined): boolean => {
    if (!createdAt) return false;
    
    const created = new Date(createdAt);
    const lastSignIn = lastSignInAt ? new Date(lastSignInAt) : null;
    
    // If created_at and last_sign_in_at are within 60 seconds, it's likely a new registration
    if (lastSignIn) {
      const timeDiff = Math.abs(lastSignIn.getTime() - created.getTime());
      return timeDiff < 60000; // 60 seconds
    }
    
    // If no last_sign_in_at, check if created within the last minute
    const now = new Date();
    const timeSinceCreation = now.getTime() - created.getTime();
    return timeSinceCreation < 60000;
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

    // Detect the type of auth flow (OAuth vs email verification)
    const detectedFlowType = detectAuthFlowType(code, hashParams);

    // Handle error from URL
    if (errorParam) {
      handleVerificationError(new Error(errorParam), detectedFlowType);
      return;
    }

    try {
      if (code) {
        // PKCE flow - exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          handleVerificationError(error, detectedFlowType);
          return;
        }

        // Get the user from the session to check identities and registration status
        const sessionUser = data.session?.user;
        
        // Determine the actual auth flow type based on user identities
        let actualFlowType: AuthFlowType = detectedFlowType;
        if (sessionUser?.identities) {
          const hasGoogleIdentity = sessionUser.identities.some(
            (identity) => identity.provider === 'google'
          );
          if (hasGoogleIdentity) {
            actualFlowType = 'oauth';
          }
        }

        // Check if account linking occurred (multiple identities)
        const linkingResult = checkForAccountLinking(sessionUser?.identities);
        const linkedAccount = linkingResult.hasMultipleIdentities;
        const isFirstTimeLinking = linkingResult.isFirstTimeLinking;
        
        // Check if this is a new registration
        const isNewRegistration = checkIsNewRegistration(
          sessionUser?.created_at,
          sessionUser?.last_sign_in_at
        );

        // Update state with detection results
        setState(prev => ({
          ...prev,
          isNewRegistration,
          linkedAccount,
          authFlowType: actualFlowType,
        }));

        // Redirect based on flow type
        if (actualFlowType === 'oauth') {
          if (linkedAccount && isFirstTimeLinking) {
            // First-time account linking - redirect to success with linked account info
            navigate('/verify-email/success', { 
              replace: true,
              state: { linkedAccount: true, isOAuth: true, isFirstTimeLinking: true }
            });
          } else if (linkedAccount) {
            // Returning user with linked accounts - redirect to dashboard directly
            navigate('/dashboard', { replace: true });
          } else {
            // Regular OAuth login/signup - redirect to dashboard directly
            navigate('/dashboard', { replace: true });
          }
        } else {
          // Email verification - redirect to success page
          navigate('/verify-email/success', { replace: true });
        }
      } else if (accessToken && refreshToken) {
        // Token-based flow - set session directly
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          handleVerificationError(error, detectedFlowType);
          return;
        }

        // Get the user from the session
        const sessionUser = data.session?.user;
        
        // Check for account linking and new registration
        const linkingResult = checkForAccountLinking(sessionUser?.identities);
        const linkedAccount = linkingResult.hasMultipleIdentities;
        const isFirstTimeLinking = linkingResult.isFirstTimeLinking;
        const isNewRegistration = checkIsNewRegistration(
          sessionUser?.created_at,
          sessionUser?.last_sign_in_at
        );

        // Determine flow type from identities
        let actualFlowType: AuthFlowType = detectedFlowType;
        if (sessionUser?.identities) {
          const hasGoogleIdentity = sessionUser.identities.some(
            (identity) => identity.provider === 'google'
          );
          if (hasGoogleIdentity) {
            actualFlowType = 'oauth';
          }
        }

        // Update state
        setState(prev => ({
          ...prev,
          isNewRegistration,
          linkedAccount,
          authFlowType: actualFlowType,
        }));

        // Redirect based on flow type
        if (actualFlowType === 'oauth') {
          if (linkedAccount && isFirstTimeLinking) {
            // First-time account linking - redirect to success with linked account info
            navigate('/verify-email/success', { 
              replace: true,
              state: { linkedAccount: true, isOAuth: true, isFirstTimeLinking: true }
            });
          } else if (linkedAccount) {
            // Returning user with linked accounts - redirect to dashboard directly
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/verify-email/success', { replace: true });
        }
      } else {
        // No valid tokens found
        handleVerificationError(new Error('Invalid verification link. No authentication code found.'), null);
      }
    } catch (err) {
      // Network or unexpected error
      handleVerificationError(
        err instanceof Error ? err : new Error('An unexpected error occurred'),
        detectedFlowType
      );
    }
  }, [
    searchParams, 
    navigate, 
    handleVerificationError, 
    user, 
    isEmailVerified, 
    detectAuthFlowType, 
    checkForAccountLinking, 
    checkIsNewRegistration
  ]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleRetry = () => {
    setState({ 
      loading: true, 
      error: null, 
      errorType: null,
      isNewRegistration: false,
      linkedAccount: false,
      authFlowType: null,
    });
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
      case 'account_exists':
        return 'An account with this email already exists. Please sign in with your existing account.';
      default:
        return state.error || 'An error occurred during verification.';
    }
  };

  const getLoadingMessage = (): string => {
    if (state.authFlowType === 'oauth') {
      return 'Completing Google sign-in...';
    }
    return 'Verifying your email address...';
  };

  // Loading state
  if (state.loading) {
    const isOAuthFlow = state.authFlowType === 'oauth' || searchParams.get('provider') === 'google';
    
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              </div>
              <h2 className="font-display text-display-md text-neutral-text mb-2">
                {isOAuthFlow ? 'Completing Sign In' : 'Verifying Your Email'}
              </h2>
              <p className="font-body text-body-md text-neutral-text-muted">
                {getLoadingMessage()}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Determine if this is an OAuth error
  const isOAuthError = state.authFlowType === 'oauth';

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
              {isOAuthError ? 'Sign In Failed' : 'Verification Failed'}
            </h2>

            {/* Error Message */}
            <p className="font-body text-body-md text-neutral-text-muted mb-6">
              {getErrorMessage()}
            </p>

            {/* Success Message for Resend */}
            {resendSuccess && !isOAuthError && (
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

              {/* Resend verification button - only show for email verification errors */}
              {!isOAuthError && state.errorType !== 'account_exists' && (
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
              )}

              {/* Try Google Sign In Again - only for OAuth errors */}
              {isOAuthError && state.errorType !== 'account_exists' && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleRetry}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Google Sign In Again
                  </span>
                </Button>
              )}

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
