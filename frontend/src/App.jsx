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
import ProjectWorkspace from './pages/engineer/ProjectWorkspace';

// Contractor pages
import ContractorDashboard from './pages/contractor/ContractorDashboard';
import ContractorSnags from './pages/contractor/ContractorSnags';
import SnagDetail from './pages/contractor/SnagDetail';

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

// ── Root redirect ──────────────────────────────────────────────
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'site_engineer') return <Navigate to="/engineer/dashboard" replace />;
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

      {/* Contractor routes */}
      <Route path="/contractor/dashboard" element={
        <ProtectedRoute role="contractor"><ContractorDashboard /></ProtectedRoute>} />
      <Route path="/contractor/snags" element={
        <ProtectedRoute role="contractor"><ContractorSnags /></ProtectedRoute>} />
      <Route path="/contractor/resolved" element={
        <ProtectedRoute role="contractor"><ContractorSnags resolvedOnly={true} /></ProtectedRoute>} />
      <Route path="/contractor/snags/:id" element={
        <ProtectedRoute role="contractor"><SnagDetail /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
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
