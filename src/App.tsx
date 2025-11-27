import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicRoute } from './components/PublicRoute';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <PublicRoute>
              <Homepage />
            </PublicRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />

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

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Settings />} />
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
