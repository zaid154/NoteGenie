// Routing — all app pages including billing, legal, share.
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { PageLoader, PageShellSkeleton } from "./components/ui.jsx";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Upload from "./pages/Upload.jsx";
import Review from "./pages/Review.jsx";
import DocumentView from "./pages/DocumentView.jsx";
import QuizView from "./pages/QuizView.jsx";
import Analytics from "./pages/Analytics.jsx";
import Profile from "./pages/Profile.jsx";
import Pricing from "./pages/Pricing.jsx";
import Billing from "./pages/Billing.jsx";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import ShareView from "./pages/ShareView.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Checkout from "./pages/Checkout.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminUserDetail from "./pages/admin/AdminUserDetail.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminContent from "./pages/admin/AdminContent.jsx";
import AdminUsage from "./pages/admin/AdminUsage.jsx";
import AdminBilling from "./pages/admin/AdminBilling.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Layout>
        <PageShellSkeleton />
      </Layout>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.emailVerified) {
    return (
      <Navigate
        to={`/verify-email?email=${encodeURIComponent(user.email)}`}
        replace
        state={{ from: location }}
      />
    );
  }
  return <Layout>{children}</Layout>;
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== "admin") return <Navigate to="/app" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="font-display text-5xl text-ink">404</p>
        <h1 className="mt-3 font-display text-xl font-600 text-ink">Page not found</h1>
        <Link to="/" className="btn-primary mt-6 inline-flex">Back to home</Link>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) {
    if (!user.emailVerified) {
      return (
        <Navigate
          to={`/verify-email?email=${encodeURIComponent(user.email)}`}
          replace
        />
      );
    }
    return <Navigate to="/app" replace />;
  }
  return children;
}

function ProtectedCheckout({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!user.emailVerified) {
    return (
      <Navigate
        to={`/verify-email?email=${encodeURIComponent(user.email)}`}
        replace
        state={{ from: location }}
      />
    );
  }
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
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/checkout" element={<ProtectedCheckout><Checkout /></ProtectedCheckout>} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/share/:token" element={<ShareView />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />

      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><Upload /></Protected>} />
      <Route path="/review" element={<Protected><Review /></Protected>} />
      <Route path="/document/:id" element={<Protected><DocumentView /></Protected>} />
      <Route path="/quiz/:id" element={<Protected><QuizView /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/billing" element={<Protected><Billing /></Protected>} />

      <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminOverview />} />
        <Route path="usage" element={<AdminUsage />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="content" element={<Navigate to="materials" replace />} />
        <Route path="content/:section" element={<AdminContent />} />
        <Route path="billing" element={<Navigate to="pricing" replace />} />
        <Route path="billing/:section" element={<AdminBilling />} />
        <Route path="settings" element={<Navigate to="keys" replace />} />
        <Route path="settings/:section" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
