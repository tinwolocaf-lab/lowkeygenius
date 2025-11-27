import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';

export function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-surface flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full text-center p-12">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
          <Search className="w-12 h-12 text-primary" />
        </div>

        <h1 className="font-display text-6xl font-bold text-neutral-text mb-4">
          404
        </h1>

        <h2 className="font-display text-3xl font-bold text-neutral-text mb-4">
          Page Not Found
        </h2>

        <p className="font-body text-xl text-neutral-text-muted mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved to a different location.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            {user ? 'Go to Dashboard' : 'Go to Homepage'}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>

        {user && (
          <div className="mt-8 pt-8 border-t-2 border-neutral-border">
            <p className="font-body text-neutral-text-muted mb-4">
              Looking for something specific?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate('/courses')}
                className="font-body text-primary font-bold hover:underline"
              >
                My Courses
              </button>
              <span className="text-neutral-text-muted">•</span>
              <button
                onClick={() => navigate('/notes')}
                className="font-body text-primary font-bold hover:underline"
              >
                Notes
              </button>
              <span className="text-neutral-text-muted">•</span>
              <button
                onClick={() => navigate('/settings')}
                className="font-body text-primary font-bold hover:underline"
              >
                Settings
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
