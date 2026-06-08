// Yeh file decide karti hai ki kaunsa URL kaunsa page dikhayega (routing).
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { PageLoader } from "./components/ui.jsx";

// Layout components — yeh pages ke around sidebar/navbar lagate hain.
import Layout from "./components/Layout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";

// Saare pages import kar rahe hain.
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Upload from "./pages/Upload.jsx";
import DocumentView from "./pages/DocumentView.jsx";
import QuizView from "./pages/QuizView.jsx";
import Analytics from "./pages/Analytics.jsx";
import Profile from "./pages/Profile.jsx";

// Admin area ke pages.
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import AdminContent from "./pages/admin/AdminContent.jsx";
import AdminUsage from "./pages/admin/AdminUsage.jsx";

// Protected = sirf logged-in user hi yeh page dekh sakta hai.
function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Jab tak login check ho raha hai, loader dikhao.
  if (loading) return <PageLoader />;

  // Agar user login nahi hai, to login page pe bhej do.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // User login hai, to page ko Layout (sidebar/navbar) ke andar dikhao.
  return <Layout>{children}</Layout>;
}

// ProtectedAdmin = sirf "admin" role wala user hi yeh page dekh sakta hai.
function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  // Login nahi hai -> login page.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Login to hai par admin nahi hai -> normal app pe bhej do.
  if (user.role !== "admin") return <Navigate to="/app" replace />;

  return <Layout>{children}</Layout>;
}

// Jab koi galat URL khole, to yeh 404 page dikhega.
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

// PublicOnly = yeh page sirf un logo ko dikhana hai jo login NAHI hain
// (jaise login/register page). Agar already login hai to app pe bhej do.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

// Home route ("/"): login hai to app, warna landing page dikhao.
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

// Main App: yahan saare routes (URL -> page) ki list hai.
export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      {/* Login zaroori hai (Protected) un pages ke liye */}
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/upload" element={<Protected><Upload /></Protected>} />
      <Route path="/document/:id" element={<Protected><DocumentView /></Protected>} />
      <Route path="/quiz/:id" element={<Protected><QuizView /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />

      {/* Admin area: "/admin" ke andar ke saare pages (nested routes) */}
      <Route
        path="/admin"
        element={
          <ProtectedAdmin>
            <AdminLayout />
          </ProtectedAdmin>
        }
      >
        {/* index = jab sirf "/admin" khulega to yeh dikhega */}
        <Route index element={<AdminOverview />} />
        <Route path="usage" element={<AdminUsage />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="content" element={<AdminContent />} />
      </Route>

      {/* Koi bhi aur URL -> 404 page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
