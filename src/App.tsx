import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Homepage } from './pages/Homepage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { Notes } from './pages/Notes';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { CourseOutline } from './pages/CourseOutline';
import { GenerateLessons } from './pages/GenerateLessons';
import { CourseView } from './pages/CourseView';
import { NotFound } from './pages/NotFound';
import Pricing from './pages/Pricing';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import { LessonPreview } from './pages/LessonPreview';
import { GenerateAudio } from './pages/GenerateAudio';
import { Marketplace } from './pages/Marketplace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicRoute } from './components/PublicRoute';
import { VerifyEmailPending } from './pages/VerifyEmailPending';
import { VerifyEmailSuccess } from './pages/VerifyEmailSuccess';
import { AuthCallback } from './pages/AuthCallback';

function PricingWrapper() {
  const { user } = useAuth();

  if (user) {
    return (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    );
  }

  return <Pricing />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-neutral-bg)',
                color: 'var(--color-neutral-text)',
                border: '1px solid var(--color-neutral-border)',
                borderRadius: '0.75rem',
                padding: '1rem',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-accent-green)',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--color-accent-red)',
                  secondary: 'white',
                },
              },
            }}
          />
          <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <PublicRoute>
              <Homepage />
            </PublicRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email/pending" element={<VerifyEmailPending />} />
          <Route path="/verify-email/success" element={<VerifyEmailSuccess />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
          </Route>

          <Route path="/courses" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Courses />} />
          </Route>

          <Route path="/notes" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Notes />} />
          </Route>

          <Route path="/marketplace" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Marketplace />} />
          </Route>

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Settings />} />
          </Route>

          <Route path="/pricing" element={<PricingWrapper />}>
            <Route index element={<Pricing />} />
          </Route>

          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />

          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId/outline"
            element={
              <ProtectedRoute>
                <CourseOutline />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId/generate"
            element={
              <ProtectedRoute>
                <GenerateLessons />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId/preview"
            element={
              <ProtectedRoute>
                <LessonPreview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId/generate-audio"
            element={
              <ProtectedRoute>
                <GenerateAudio />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseView />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
