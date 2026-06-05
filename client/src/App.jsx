import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { PageLoader } from "./components/ui.jsx";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Upload from "./pages/Upload.jsx";
import DocumentView from "./pages/DocumentView.jsx";
import QuizView from "./pages/QuizView.jsx";
import Analytics from "./pages/Analytics.jsx";
import Profile from "./pages/Profile.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminContent from "./pages/admin/AdminContent.jsx";
import AdminUsage from "./pages/admin/AdminUsage.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Layout>{children}</Layout>;
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== "admin") return <Navigate to="/app" replace />;
  return <Layout>{children}</Layout>;
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="font-display text-5xl font-700 text-brand-600">404</p>
        <h1 className="mt-3 font-display text-xl font-600 text-ink">Page not found</h1>
        <p className="mt-1 text-muted">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><Upload /></Protected>} />
      <Route path="/document/:id" element={<Protected><DocumentView /></Protected>} />
      <Route path="/quiz/:id" element={<Protected><QuizView /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />

      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminLayout />
          </ProtectedAdmin>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="usage" element={<AdminUsage />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="content" element={<AdminContent />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
