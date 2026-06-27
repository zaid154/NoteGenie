// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (Layout). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useStorefront } from "../lib/useStorefront.js";
import EmailVerificationBanner from "./EmailVerificationBanner.jsx";
import CommandPalette from "./CommandPalette.jsx";
import InstallButton from "./InstallButton.jsx";
import ThemePicker from "./ThemePicker.jsx";
import Logo from "./Logo.jsx";
import { PageTransition, DrawerPanel } from "./motion.jsx";
import {
  IconHome,
  IconUpload,
  IconChart,
  IconLogout,
  IconMenu,
  IconX,
  IconShield,
  IconUsers,
  IconUser,
  IconSparkles,
  IconCoins,
  IconChat,
  IconSearch,
  IconLayers,
  IconDownload,
} from "./icons.jsx";

// Grouped sidebar nav — clearer than one flat list. Each group has a small section label.
// Items with a `feature` key are hidden when an admin disables that feature.
const navGroups = [
  {
    title: "Workspace",
    items: [
      { to: "/app", label: "Dashboard", icon: IconHome, end: true },
      { to: "/upload", label: "Upload", icon: IconUpload, feature: "upload", ai: true },
      { to: "/ask", label: "Ask AI", icon: IconChat, feature: "askAi", ai: true },
      { to: "/analytics", label: "Analytics", icon: IconChart, feature: "analytics" },
      { to: "/workspaces", label: "Workspaces", icon: IconUsers, feature: "workspaces" },
    ],
  },
  {
    title: "Store",
    items: [
      { to: "/store", label: "Store", icon: IconLayers, feature: "store" },
      { to: "/my-downloads", label: "Saved & downloads", icon: IconDownload },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/billing", label: "Billing", icon: IconCoins, feature: "billing" },
      { to: "/profile", label: "Profile", icon: IconUser },
    ],
  },
];

// Mobile bottom bar shows only the 5 most-used destinations; the rest live in the drawer.
const primaryNav = [
  { to: "/app", label: "Home", icon: IconHome, end: true },
  { to: "/upload", label: "Upload", icon: IconUpload, feature: "upload", ai: true },
  { to: "/store", label: "Store", icon: IconLayers, feature: "store" },
  { to: "/ask", label: "Ask AI", icon: IconChat, feature: "askAi", ai: true },
  { to: "/profile", label: "Profile", icon: IconUser },
];

const featureOn = (features, item) => !item.feature || features[item.feature] !== false;

function openCommandPalette() {
  window.dispatchEvent(new Event("open-command-palette"));
}

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className="block">
      {({ isActive }) => (
        <div className={isActive ? "nav-item-active" : "nav-item-idle"}>
          <Icon width={18} height={18} />
          {label}
        </div>
      )}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const store = useStorefront();
  const features = store.features;
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Nav visibility: hide admin-disabled features; AND hide AI tools (Upload, Ask AI) for EVERYONE
  // when the AI master switch is OFF. Admins re-enable from Admin → Settings → AI keys.
  const navVisible = (it) => featureOn(features, it) && !(it.ai && store.aiEnabled === false);
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(navVisible) }))
    .filter((g) => g.items.length > 0);
  const visiblePrimary = primaryNav.filter(navVisible);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-5">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted/70">
              {group.title}
            </p>
            {group.items.map(({ to, label, icon, end }) => (
              <NavItem
                key={`${to}-${label}`}
                to={to}
                label={label}
                icon={icon}
                end={end}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        ))}
        {(user?.role === "admin" || user?.role === "staff") && (
          <div className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted/70">
              Manage
            </p>
            <NavItem
              to="/admin"
              label={user?.role === "admin" ? "Admin" : "Staff"}
              icon={IconShield}
              onClick={() => setMobileOpen(false)}
            />
          </div>
        )}
      </nav>

      <div className="border-t border-line px-3 py-4 space-y-1">
        {user?.plan === "free" && (
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="mb-2 w-full rounded-xl bg-accent-50 p-3 text-left transition hover:bg-accent-100 dark:bg-accent-950/40 dark:hover:bg-accent-950/60"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-600 text-white">
                <IconSparkles width={16} height={16} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-accent-700 dark:text-accent-300">Free plan</span>
                <span className="block text-xs text-muted">Upgrade for more uploads</span>
              </div>
            </div>
          </button>
        )}
        <div className="px-1 pb-1"><ThemePicker /></div>
        <InstallButton className="nav-item-idle w-full" />
        <button onClick={handleLogout} className="nav-item-idle w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30">
          <IconLogout width={18} height={18} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen lg:flex">
      <CommandPalette />
      <div className="mesh-bg" aria-hidden="true" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="btn-ghost rounded-lg p-2"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <IconMenu />
            </button>
            <Logo size={28} showText={false} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={openCommandPalette}
              className="hidden items-center gap-2 rounded-lg border border-line bg-canvas/60 px-2.5 py-1.5 text-xs text-muted transition hover:text-ink sm:flex"
              aria-label="Open command palette"
            >
              <IconSearch width={15} height={15} />
              <span>Search</span>
              <kbd className="rounded border border-line px-1 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={openCommandPalette}
              className="btn-ghost rounded-lg p-2 sm:hidden"
              aria-label="Open command palette"
            >
              <IconSearch width={18} height={18} />
            </button>
            <div className="flex items-center gap-2.5">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-accent-100 dark:ring-accent-900" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 ring-2 ring-accent-100 dark:bg-accent-950 dark:text-accent-300 dark:ring-accent-900">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              )}
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs capitalize text-muted">{user?.plan || "free"}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-8">
          <EmailVerificationBanner />
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>

      <DrawerPanel open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 z-10 rounded-lg p-2 text-muted"
          aria-label="Close menu"
        >
          <IconX />
        </button>
        {sidebar}
      </DrawerPanel>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-surface/95 px-1 py-1.5 backdrop-blur-md lg:hidden">
        {visiblePrimary.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to + label}
            to={to}
            end={end}
            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-medium"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobileNavIndicator"
                    className="absolute inset-x-2 -top-1.5 h-0.5 rounded-full bg-accent-600"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon width={20} height={20} className={isActive ? "text-accent-600" : "text-muted"} />
                <span className={isActive ? "text-accent-600" : "text-muted"}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

