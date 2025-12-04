import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthError } from '@supabase/supabase-js';

import { useAuth } from '../contexts/AuthContext';
import { useHorrorTheme } from '../hooks/useHorrorTheme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { HorrorLogo } from '../components/horror';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user } = useAuth();
  const { isHorror } = useHorrorTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect);
    }
  }, [user, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          {isHorror ? (
            <HorrorLogo size="lg" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2">
                <img src="/logo.png" alt="Progent" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="font-display text-display-lg text-primary">Progent</h1>
            </div>
          )}
        </div>

        <Card className={isHorror ? 'horror-blood-drip-static' : ''}>
          <h2 className={`font-display text-display-md text-neutral-text mb-2 text-center ${isHorror ? 'horror-text-glitch' : ''}`}>
            {isHorror ? 'Return to the Darkness...' : 'Welcome back!'}
          </h2>
          <p className="font-body text-body-lg text-neutral-text-muted mb-8 text-center">
            {isHorror ? 'Enter your credentials to continue your dark studies' : 'Sign in to continue learning'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-accent-red/10 border-2 border-accent-red/30 rounded-2xl p-4">
                <p className="text-sm text-accent-red font-body font-semibold">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={`w-full ${isHorror ? 'horror-blood-drip horror-glitch' : ''}`}
              disabled={loading}
            >
              {loading ? (isHorror ? 'Opening the portal...' : 'Signing in...') : (isHorror ? 'Enter the Realm' : 'Sign In')}
            </Button>
          </form>

          {/* Divider with "or" text */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-neutral-border" />
            <span className="font-body text-body-sm text-neutral-text-muted">or</span>
            <div className="flex-1 h-px bg-neutral-border" />
          </div>

          {/* Google Sign-In Button */}
          <GoogleSignInButton
            mode="signin"
            onError={(err: AuthError) => setError(err.message)}
          />

          <div className="mt-6 text-center">
            <p className="font-body text-neutral-text-muted">
              {isHorror ? 'New to the darkness?' : "Don't have an account?"}{' '}
              <button
                onClick={() => navigate('/signup')}
                className={`text-primary font-bold hover:underline ${isHorror ? 'horror-flicker' : ''}`}
              >
                {isHorror ? 'Join the coven' : 'Sign up'}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
