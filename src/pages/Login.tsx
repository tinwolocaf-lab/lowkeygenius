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
    <div className={`min-h-screen flex items-center justify-center p-4 ${isHorror ? 'horror-bg' : 'bg-neutral-bg'}`}>
      {/* Overlay for horror mode to darken background if needed */}
      {isHorror && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          {isHorror ? (
            <div className="transform hover:scale-105 transition-transform duration-300">
              <HorrorLogo size="lg" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2">
                <img src="/logo.png" alt="Progent" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="font-display text-display-lg text-primary">Progent</h1>
            </div>
          )}
        </div>

        <Card className={isHorror ? 'horror-card border-red-900/50' : ''}>
          <h2 className={`font-display text-display-md text-neutral-text mb-2 text-center ${isHorror ? 'text-red-500 horror-text-shadow tracking-wider' : ''}`}>
            {isHorror ? 'RETURN TO DARKNESS' : 'Welcome back!'}
          </h2>
          <p className={`font-body text-body-lg mb-8 text-center ${isHorror ? 'text-red-200/70' : 'text-neutral-text-muted'}`}>
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
              className={isHorror ? 'horror-input' : ''}
              labelClassName={isHorror ? 'text-red-200/80' : ''}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={isHorror ? 'horror-input' : ''}
              labelClassName={isHorror ? 'text-red-200/80' : ''}
            />

            {error && (
              <div className={`${isHorror ? 'bg-red-950/50 border-red-800/50' : 'bg-accent-red/10 border-accent-red/30'} border-2 rounded-2xl p-4`}>
                <p className={`text-sm font-body font-semibold ${isHorror ? 'text-red-400' : 'text-accent-red'}`}>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant={isHorror ? 'danger' : 'primary'}
              size="lg"
              className={`w-full ${isHorror ? 'horror-blood-drip horror-glitch bg-red-900 hover:bg-red-800 border-red-950' : ''}`}
              disabled={loading}
            >
              {loading ? (isHorror ? 'OPENING PORTAL...' : 'Signing in...') : (isHorror ? 'ENTER THE REALM' : 'Sign In')}
            </Button>
          </form>

          {/* Divider with "or" text */}
          <div className="flex items-center gap-4 my-6">
            <div className={`flex-1 h-px ${isHorror ? 'bg-red-900/30' : 'bg-neutral-border'}`} />
            <span className={`font-body text-body-sm ${isHorror ? 'text-red-900/50' : 'text-neutral-text-muted'}`}>or</span>
            <div className={`flex-1 h-px ${isHorror ? 'bg-red-900/30' : 'bg-neutral-border'}`} />
          </div>

          {/* Google Sign-In Button */}
          <div className={isHorror ? 'opacity-80 hover:opacity-100 transition-opacity' : ''}>
            <GoogleSignInButton
              mode="signin"
              onError={(err: AuthError) => setError(err.message)}
            />
          </div>

          <div className="mt-6 text-center">
            <p className={`font-body ${isHorror ? 'text-red-200/60' : 'text-neutral-text-muted'}`}>
              {isHorror ? 'New to the darkness?' : "Don't have an account?"}{' '}
              <button
                onClick={() => navigate('/signup')}
                className={`font-bold hover:underline ${isHorror ? 'text-red-500 hover:text-red-400 horror-flicker' : 'text-primary'}`}
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
