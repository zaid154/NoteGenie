// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: React Router map lives here. Auth state comes from AuthContext, routes decide public/protected/admin access, then render page components inside Layout/AdminLayout.

// Routing — all app pages including billing, legal, share.
// Common entry points (Landing/Login/Register/Dashboard) are eager; heavier and
// less-frequent routes are code-split via React.lazy to shrink the initial bundle.
import { Suspense, lazy } from "react";
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

const Upload = lazy(() => import("./pages/Upload.jsx"));
const Review = lazy(() => import("./pages/Review.jsx"));
const Ask = lazy(() => import("./pages/Ask.jsx"));
const DocumentView = lazy(() => import("./pages/DocumentView.jsx"));
const QuizView = lazy(() => import("./pages/QuizView.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const ShareView = lazy(() => import("./pages/ShareView.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent.jsx"));
const AdminUsage = lazy(() => import("./pages/admin/AdminUsage.jsx"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling.jsx"));

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
  return (
    <Layout>
      <Suspense fallback={<PageShellSkeleton />}>{children}</Suspense>
    </Layout>
  );
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
    <Suspense fallback={<PageLoader />}>
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
      <Route path="/ask" element={<Protected><Ask /></Protected>} />
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
    </Suspense>
  );
}

