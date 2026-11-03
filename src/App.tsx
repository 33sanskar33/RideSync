import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppErrorBoundary from '@/components/AppErrorBoundary';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'));
const RideHistoryPage = lazy(() => import('@/pages/RideHistoryPage'));
const RoomDetailsPage = lazy(() => import('@/pages/RoomDetailsPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));

function RouteLoadingFallback() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#0b1220] px-6 text-center text-white"
      aria-live="polite"
      aria-busy="true"
    >
      <div>
        <div
          className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#38d9f5]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium tracking-wide">Loading RideSync…</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/statistics" element={<StatisticsPage />} />
            <Route path="/dashboard/history" element={<RideHistoryPage />} />
          </Route>
          <Route path="/room/:roomId" element={<RoomDetailsPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
