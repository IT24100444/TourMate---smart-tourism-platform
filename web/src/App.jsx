import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';

// Pages
import LandingPage   from './pages/LandingPage';
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';

// Dashboard components
import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';
import OverviewDashboard  from './features/overview/OverviewDashboard';
import PlacesManager      from './features/tourism-places/PlacesManager';
import BusinessManager    from './features/businesses/BusinessManager';
import BookingQueue       from './features/bookings/BookingQueue';
import BookingComplaints  from './features/bookings/BookingComplaints';
import AIWorkflowMonitor  from './features/ai-workflows/AIWorkflowMonitor';
import BookingReviews     from './features/reviews/BookingReviews';
import PlacesReviews      from './features/reviews/PlacesReviews';

// ── Protected Route Guard ────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="TourMate" className="w-20 h-20 object-contain animate-pulse" />
          <div className="w-8 h-8 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-blue-200 text-sm font-medium">Loading TourMate…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Dashboard Layout ─────────────────────────────────────────────────────────
function DashboardLayout() {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Default tab based on role
  const defaultTab = role === 'Administrator' ? 'overview'
    : role === 'BusinessOwner'              ? 'businesses'
    : 'overview';

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Tab visibility per role - strict RBAC
  const canSee = (tab) => {
    if (role === 'Administrator') return ['overview', 'places', 'businesses', 'places-reviews', 'booking-complaints', 'ai-workflows'].includes(tab);
    if (role === 'BusinessOwner') return ['businesses', 'bookings', 'booking-reviews'].includes(tab);
    return false;
  };

  // Guard: if current tab is not allowed for this role, reset
  const safeTab = canSee(activeTab) ? activeTab : defaultTab;

  return (
    <div className="flex bg-slate-100 text-slate-800 min-h-screen font-sans">
      <Sidebar activeTab={safeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {/* Admin-only tabs */}
          {safeTab === 'overview'           && role === 'Administrator' && <OverviewDashboard onNavigate={setActiveTab} />}
          {safeTab === 'places'             && role === 'Administrator' && <PlacesManager />}
          {safeTab === 'places-reviews'     && role === 'Administrator' && <PlacesReviews />}
          {safeTab === 'booking-complaints' && role === 'Administrator' && <BookingComplaints />}
          {safeTab === 'ai-workflows'       && role === 'Administrator' && <AIWorkflowMonitor />}

          {/* Shared & Business Owner tabs */}
          {safeTab === 'businesses'         && (role === 'Administrator' || role === 'BusinessOwner') && <BusinessManager />}
          {safeTab === 'bookings'           && role === 'BusinessOwner' && <BookingQueue />}
          {safeTab === 'booking-reviews'    && role === 'BusinessOwner' && <BookingReviews />}

          {/* Access denied message */}
          {!canSee(safeTab) && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
              <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
              <p className="text-slate-500 text-sm max-w-sm text-center">
                You don't have permission to view this section. Contact your administrator if you believe this is an error.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register"  element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* Protected dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Redirect already-logged-in users away from login/register
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
