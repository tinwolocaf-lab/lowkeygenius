import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isEmailVerified } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 font-body text-neutral-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email/pending" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
