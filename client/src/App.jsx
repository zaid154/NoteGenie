// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: React Router map lives here. Auth state comes from AuthContext, routes decide public/protected/admin access, then render page components inside Layout/AdminLayout.

// Routing — all app pages including billing, legal, share.
// The site home ("/") IS the public storefront (store-first). Common entry points
// (Login/Register/Dashboard) are eager; heavier and less-frequent routes are
// code-split via React.lazy to shrink the initial bundle.
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useFeatures } from "./lib/useStorefront.js";
import { PageLoader, PageShellSkeleton } from "./components/ui.jsx";
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import OnboardingWizard from "./components/OnboardingWizard.jsx";

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
const Workspaces = lazy(() => import("./pages/Workspaces.jsx"));
const WorkspaceDetail = lazy(() => import("./pages/WorkspaceDetail.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const Refund = lazy(() => import("./pages/Refund.jsx"));
const ShareView = lazy(() => import("./pages/ShareView.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail.jsx"));
const MyDownloads = lazy(() => import("./pages/MyDownloads.jsx"));
const StoreLayout = lazy(() => import("./components/StoreLayout.jsx"));
const StoreHome = lazy(() => import("./pages/store/StoreHome.jsx"));
const StoreCategory = lazy(() => import("./pages/store/StoreCategory.jsx"));
const StoreCourse = lazy(() => import("./pages/store/StoreCourse.jsx"));
const StoreSearch = lazy(() => import("./pages/store/StoreSearch.jsx"));
const Cart = lazy(() => import("./pages/store/Cart.jsx"));
const CombosList = lazy(() => import("./pages/store/CombosList.jsx"));
const ComboDetail = lazy(() => import("./pages/store/ComboDetail.jsx"));
const About = lazy(() => import("./pages/store/About.jsx"));
const FAQ = lazy(() => import("./pages/store/FAQ.jsx"));
const HowToBuy = lazy(() => import("./pages/store/HowToBuy.jsx"));
const Contact = lazy(() => import("./pages/store/Contact.jsx"));
const Support = lazy(() => import("./pages/store/Support.jsx"));

const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.jsx"));
const AdminCatalog = lazy(() => import("./pages/admin/AdminCatalog.jsx"));
const AdminResources = lazy(() => import("./pages/admin/AdminResources.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail.jsx"));
const AdminCombos = lazy(() => import("./pages/admin/AdminCombos.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent.jsx"));
const AdminUsage = lazy(() => import("./pages/admin/AdminUsage.jsx"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling.jsx"));

// Shown when an admin has disabled a feature (also enforced server-side for some routes).
function FeatureUnavailable() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl text-ink">This feature is currently unavailable.</h1>
        <p className="mt-2 text-muted">It has been turned off by the site administrator. Please check back later.</p>
        <Link to="/app" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}

// Like Protected, but first checks a feature flag. Disabled → friendly message (inside the
// app chrome, still auth-gated) instead of the page.
function FeatureProtected({ feature, children }) {
  const features = useFeatures();
  if (features[feature] === false) {
    return <Protected><FeatureUnavailable /></Protected>;
  }
  return <Protected>{children}</Protected>;
}

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

// Admin panel access: staff (support/moderation) and admin both allowed in.
function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== "admin" && user.role !== "staff") return <Navigate to="/app" replace />;
  return children;
}

// Admin-only sub-pages (usage, billing, settings): staff is redirected to the dashboard.
function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/admin" replace />;
  return children;
}

// Admin sub-pages gated by a granular permission (admin always passes).
function RequirePermission({ permission, children }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <Navigate to="/admin" replace />;
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

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/checkout" element={<ProtectedCheckout><Checkout /></ProtectedCheckout>} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund" element={<Refund />} />
      <Route path="/share/:token" element={<ShareView />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />

      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<FeatureProtected feature="upload"><Upload /></FeatureProtected>} />
      <Route path="/review" element={<Protected><Review /></Protected>} />
      <Route path="/ask" element={<FeatureProtected feature="askAi"><Ask /></FeatureProtected>} />
      <Route path="/document/:id" element={<Protected><DocumentView /></Protected>} />
      <Route path="/quiz/:id" element={<Protected><QuizView /></Protected>} />
      <Route path="/analytics" element={<FeatureProtected feature="analytics"><Analytics /></FeatureProtected>} />
      <Route path="/workspaces" element={<FeatureProtected feature="workspaces"><Workspaces /></FeatureProtected>} />
      <Route path="/workspaces/:id" element={<FeatureProtected feature="workspaces"><WorkspaceDetail /></FeatureProtected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/billing" element={<FeatureProtected feature="billing"><Billing /></FeatureProtected>} />

      {/* Old catalog routes now live in the public storefront */}
      <Route path="/catalog" element={<Navigate to="/store" replace />} />
      <Route path="/catalog/courses/:id" element={<Navigate to="/store" replace />} />
      <Route path="/my-downloads" element={<Protected><MyDownloads /></Protected>} />

      {/* Public storefront (StoreLayout chrome via Outlet). The site home "/" is the
          store itself; "/store" stays as a working alias for existing links. */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<StoreHome />} />
        <Route path="/store" element={<StoreHome />} />
        <Route path="/store/search" element={<StoreSearch />} />
        <Route path="/store/cart" element={<Cart />} />
        <Route path="/store/combos" element={<CombosList />} />
        <Route path="/store/combos/:id" element={<ComboDetail />} />
        <Route path="/store/course/:id" element={<StoreCourse />} />
        <Route path="/store/how-to-buy" element={<HowToBuy />} />
        <Route path="/store/:category" element={<StoreCategory />} />
        <Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/support" element={<Support />} />
      </Route>

      <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminOverview />} />
        <Route path="usage" element={<AdminOnly><AdminUsage /></AdminOnly>} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="catalog" element={<Navigate to="universities" replace />} />
        <Route path="catalog/:section" element={<RequirePermission permission="manage_catalog"><AdminCatalog /></RequirePermission>} />
        <Route path="resources" element={<RequirePermission permission="manage_resources"><AdminResources /></RequirePermission>} />
        <Route path="combos" element={<RequirePermission permission="manage_combos"><AdminCombos /></RequirePermission>} />
        <Route path="orders" element={<RequirePermission permission="manage_orders"><AdminOrders /></RequirePermission>} />
        <Route path="orders/:id" element={<RequirePermission permission="manage_orders"><AdminOrderDetail /></RequirePermission>} />
        <Route path="content" element={<Navigate to="materials" replace />} />
        <Route path="content/:section" element={<AdminContent />} />
        <Route path="billing" element={<Navigate to="pricing" replace />} />
        <Route path="billing/:section" element={<AdminOnly><AdminBilling /></AdminOnly>} />
        <Route path="settings" element={<Navigate to="keys" replace />} />
        <Route path="settings/:section" element={<AdminOnly><AdminSettings /></AdminOnly>} />
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

