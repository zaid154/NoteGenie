// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (AdminLayout). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useState, Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Logo from "./Logo.jsx";
import { Spinner } from "./ui.jsx";
import { PageTransition, DrawerPanel } from "./motion.jsx";
import {
  IconChart,
  IconUsers,
  IconSettings,
  IconDoc,
  IconActivity,
  IconCoins,
  IconLayers,
  IconDownload,
  IconSun,
  IconMoon,
  IconLogout,
  IconMenu,
  IconX,
  IconArrowLeft,
  IconShield,
} from "./icons.jsx";

// adminOnly items are hidden from staff (support/moderation role).
const topNav = [
  { to: "/admin", label: "Dashboard", icon: IconChart, end: true },
  { to: "/admin/usage", label: "Usage", icon: IconActivity, adminOnly: true },
  { to: "/admin/users", label: "Users", icon: IconUsers },
];

const sectionGroups = [
  {
    label: "Catalog",
    icon: IconLayers,
    prefix: "/admin/catalog",
    to: "/admin/catalog/universities",
    permission: "manage_catalog",
    items: [
      { to: "/admin/catalog/universities", label: "Universities" },
      { to: "/admin/catalog/programs", label: "Programs" },
      { to: "/admin/catalog/courses", label: "Courses" },
    ],
  },
  {
    label: "Resources",
    icon: IconDownload,
    prefix: "/admin/resources",
    to: "/admin/resources",
    permission: "manage_resources",
    items: [{ to: "/admin/resources", label: "All resources" }],
  },
  {
    label: "Combos",
    icon: IconLayers,
    prefix: "/admin/combos",
    to: "/admin/combos",
    permission: "manage_combos",
    items: [{ to: "/admin/combos", label: "All combos" }],
  },
  {
    label: "Orders",
    icon: IconCoins,
    prefix: "/admin/orders",
    to: "/admin/orders",
    permission: "manage_orders",
    items: [{ to: "/admin/orders", label: "All orders" }],
  },
  {
    label: "Content",
    icon: IconDoc,
    prefix: "/admin/content",
    to: "/admin/content/materials",
    items: [
      { to: "/admin/content/materials", label: "Materials" },
      { to: "/admin/content/quizzes", label: "Quizzes" },
      { to: "/admin/content/chat", label: "Chat" },
      { to: "/admin/content/shares", label: "Shares" },
    ],
  },
  {
    label: "Billing",
    icon: IconCoins,
    prefix: "/admin/billing",
    to: "/admin/billing/pricing",
    adminOnly: true,
    items: [
      { to: "/admin/billing/pricing", label: "Pricing" },
      { to: "/admin/billing/plans", label: "Custom plans" },
      { to: "/admin/billing/limits", label: "Plan limits" },
      { to: "/admin/billing/payments", label: "Payments" },
      { to: "/admin/billing/grant", label: "Manual grant" },
    ],
  },
  {
    label: "System",
    icon: IconSettings,
    prefix: "/admin/settings",
    to: "/admin/settings/keys",
    adminOnly: true,
    items: [
      { to: "/admin/settings/keys", label: "AI keys" },
      { to: "/admin/settings/storefront", label: "Storefront" },
      { to: "/admin/settings/audit", label: "Audit log" },
      { to: "/admin/settings/rate-limit", label: "Rate limits" },
    ],
  },
];

function NavItem({ to, label, icon: Icon, end, active, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className="block">
      {({ isActive }) => (
        <div className={active ?? isActive ? "admin-nav-active" : "admin-nav-idle"}>
          {Icon && <Icon width={16} height={16} className="shrink-0" />}
          {label}
        </div>
      )}
    </NavLink>
  );
}

function SectionNavItem({ to, label, icon: Icon, prefix, onClick }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(prefix);
  return <NavItem to={to} label={label} icon={Icon} active={active} onClick={onClick} />;
}

function AdminSubNav() {
  const { pathname } = useLocation();
  const group = sectionGroups.find((g) => pathname.startsWith(g.prefix));
  if (!group) return null;

  return (
    <nav
      className="mb-5 flex gap-1 overflow-x-auto border-b border-line pb-3 scrollbar-thin"
      aria-label={`${group.label} sections`}
    >
      {group.items.map(({ to, label }) => (
        <NavLink key={to} to={to} className="block">
          {({ isActive }) => (
            <span className={isActive ? "admin-subtab-active" : "admin-subtab-idle"}>{label}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminNav({ onNavigate }) {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === "admin";
  // Visible if: admin, OR (not admin-only AND any required permission is held).
  const canSee = (item) =>
    isAdmin || (!item.adminOnly && (!item.permission || hasPermission(item.permission)));
  const visibleTopNav = topNav.filter(canSee);
  const visibleGroups = sectionGroups.filter(canSee);
  return (
    <nav className="space-y-0.5 p-2">
      {visibleTopNav.map(({ to, label, icon, end }) => (
        <NavItem key={to} to={to} label={label} icon={icon} end={end} onClick={onNavigate} />
      ))}
      {visibleGroups.map(({ to, label, icon, prefix }) => (
        <SectionNavItem key={prefix} to={to} label={label} icon={icon} prefix={prefix} onClick={onNavigate} />
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="relative min-h-screen bg-canvas">
      <div className="mesh-bg" aria-hidden="true" />

      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="btn-ghost rounded-lg p-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <IconMenu />
            </button>
            <Logo size={32} />
            <div className="min-w-0 border-l border-line pl-3">
              <div className="flex items-center gap-2">
                <IconShield width={16} height={16} className="shrink-0 text-accent-600 dark:text-accent-400" />
                <h1 className="truncate text-lg font-bold text-ink">{user?.role === "admin" ? "Admin Panel" : "Staff Panel"}</h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link to="/app" className="btn-outline text-sm">
              <IconArrowLeft width={16} height={16} />
              <span className="hidden sm:inline">Back to store</span>
              <span className="sm:hidden">Store</span>
            </Link>
            <button type="button" onClick={toggleTheme} className="btn-ghost hidden rounded-lg p-2 sm:inline-flex" aria-label="Toggle theme">
              {theme === "dark" ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
            </button>
            <button type="button" onClick={handleLogout} className="btn-ghost hidden rounded-lg p-2 text-red-600 sm:inline-flex" aria-label="Sign out">
              <IconLogout width={18} height={18} />
            </button>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="hidden h-9 w-9 rounded-full object-cover ring-2 ring-accent-100 sm:block dark:ring-accent-900" />
            ) : (
              <span className="hidden h-9 w-9 place-items-center rounded-full bg-accent-100 text-sm font-bold text-accent-700 sm:grid dark:bg-accent-950 dark:text-accent-300">
                {user?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] lg:px-8 lg:py-5">
        <aside className="hidden w-48 shrink-0 lg:block xl:w-52">
          <div className="card-solid sticky top-[65px]">
            <AdminNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6 lg:py-0">
          <AdminSubNav />
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Suspense fallback={<div className="grid place-items-center py-24"><Spinner size={26} /></div>}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>

      <DrawerPanel open={mobileOpen} onClose={closeMobile}>
        <button
          type="button"
          onClick={closeMobile}
          className="absolute right-3 top-4 z-10 rounded-lg p-2 text-muted"
          aria-label="Close menu"
        >
          <IconX />
        </button>
        <div className="flex h-full flex-col pt-12">
          <AdminNav onNavigate={closeMobile} />
          <div className="mt-auto space-y-1 border-t border-line p-3">
            <Link to="/app" onClick={closeMobile} className="admin-nav-idle w-full">
              <IconArrowLeft width={16} height={16} />
              Back to store
            </Link>
            <button type="button" onClick={toggleTheme} className="admin-nav-idle w-full">
              {theme === "dark" ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-nav-idle w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <IconLogout width={18} height={18} />
              Sign out
            </button>
          </div>
        </div>
      </DrawerPanel>
    </div>
  );
}

