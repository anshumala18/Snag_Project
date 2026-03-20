import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import Login from './pages/auth/Login';
import EngineerSignup from './pages/auth/EngineerSignup';
import ContractorSignup from './pages/auth/ContractorSignup';

// Engineer pages
import EngineerDashboard from './pages/engineer/EngineerDashboard';
import Projects from './pages/engineer/Projects';
import GenerateSnag from './pages/engineer/GenerateSnag';
import SnagList from './pages/engineer/SnagList';
import Reports from './pages/engineer/Reports';
import MailLogs from './pages/engineer/MailLogs';
import ProjectWorkspace from './pages/engineer/ProjectWorkspace';
import OfflineSync from './pages/engineer/OfflineSync';

// Contractor pages
import ContractorDashboard from './pages/contractor/ContractorDashboard';
import ContractorSnags from './pages/contractor/ContractorSnags';
import SnagDetail from './pages/contractor/SnagDetail';
import CompleteProfile from './pages/auth/CompleteProfile';
import UpdateProfile from './pages/contractor/UpdateProfile';

// ── Protected Route wrapper ────────────────────────────────────
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'site_engineer' ? '/engineer/dashboard' : '/contractor/dashboard'} replace />;
  }
  return children;
};

// ── Contractor Route (Profile Completion Guard) ────────────────
const ContractorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'contractor') return <Navigate to="/" replace />;
  if (!user.profile_completed) return <Navigate to="/complete-profile" replace />;
  return children;
};

// ── Root redirect ──────────────────────────────────────────────
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'site_engineer') return <Navigate to="/engineer/dashboard" replace />;
  if (!user.profile_completed) return <Navigate to="/complete-profile" replace />;
  return <Navigate to="/contractor/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup/engineer" element={<EngineerSignup />} />
      <Route path="/signup/contractor" element={<ContractorSignup />} />
      <Route path="/complete-profile" element={<ProtectedRoute role="contractor"><CompleteProfile /></ProtectedRoute>} />

      {/* Site Engineer routes */}
      <Route path="/engineer/dashboard" element={
        <ProtectedRoute role="site_engineer"><EngineerDashboard /></ProtectedRoute>} />
      <Route path="/engineer/projects" element={
        <ProtectedRoute role="site_engineer"><Projects /></ProtectedRoute>} />
      <Route path="/engineer/projects/:id" element={
        <ProtectedRoute role="site_engineer"><ProjectWorkspace /></ProtectedRoute>} />
      <Route path="/engineer/generate" element={
        <ProtectedRoute role="site_engineer"><GenerateSnag /></ProtectedRoute>} />
      <Route path="/engineer/snags" element={
        <ProtectedRoute role="site_engineer"><SnagList /></ProtectedRoute>} />
      <Route path="/engineer/reports" element={
        <ProtectedRoute role="site_engineer"><Reports /></ProtectedRoute>} />
      <Route path="/engineer/mail" element={
        <ProtectedRoute role="site_engineer"><MailLogs /></ProtectedRoute>} />
      <Route path="/engineer/offline" element={
        <ProtectedRoute role="site_engineer"><OfflineSync /></ProtectedRoute>} />

      {/* Contractor routes */}
      <Route path="/contractor/dashboard" element={
        <ContractorRoute><ContractorDashboard /></ContractorRoute>} />
      <Route path="/contractor/snags" element={
        <ContractorRoute><ContractorSnags /></ContractorRoute>} />
      <Route path="/contractor/resolved" element={
        <ContractorRoute><ContractorSnags resolvedOnly={true} /></ContractorRoute>} />
      <Route path="/contractor/snags/:id" element={
        <ContractorRoute><SnagDetail /></ContractorRoute>} />
      <Route path="/contractor/update-profile" element={
        <ContractorRoute><UpdateProfile /></ContractorRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useEffect } from 'react';
import { useOnlineStatus } from './hooks/useSocket';
import { triggerSync } from './utils/syncManager';

export default function App() {
  const online = useOnlineStatus();

  useEffect(() => {
    if (online) {
      triggerSync();
    }
  }, [online]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
