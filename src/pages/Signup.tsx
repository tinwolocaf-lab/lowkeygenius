import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';

export function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, user } = useAuth();
  const [fullName, setFullName] = useState('');
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const redirect = searchParams.get('redirect') || '/dashboard';
      navigate(redirect);
    }
  };

  return (
    <div className="min-h-screen bg-primary-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-3xl p-4 shadow-tile">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-display text-display-lg text-primary">LearnSelfAI</h1>
          </div>
        </div>

        <Card>
          <h2 className="font-display text-display-md text-neutral-text mb-2 text-center">
            Start Learning Today
          </h2>
          <p className="font-body text-body-lg text-neutral-text-muted mb-8 text-center">
            Create your free account and generate your first AI-powered course
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

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
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-neutral-text-muted">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-bold hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
