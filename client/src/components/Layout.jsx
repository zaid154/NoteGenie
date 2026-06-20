import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import EmailVerificationBanner from "./EmailVerificationBanner.jsx";
import CommandPalette from "./CommandPalette.jsx";
import Logo from "./Logo.jsx";
import { PageTransition, DrawerPanel } from "./motion.jsx";
import {
  IconHome,
  IconUpload,
  IconChart,
  IconSun,
  IconMoon,
  IconLogout,
  IconMenu,
  IconX,
  IconShield,
  IconUsers,
  IconSparkles,
  IconCoins,
  IconChat,
  IconSearch,
} from "./icons.jsx";

const navItems = [
  { to: "/app", label: "Library", icon: IconHome, end: true },
  { to: "/upload", label: "Upload", icon: IconUpload },
  { to: "/ask", label: "Ask AI", icon: IconChat },
  { to: "/analytics", label: "Analytics", icon: IconChart },
  { to: "/billing", label: "Billing", icon: IconCoins },
  { to: "/profile", label: "Profile", icon: IconUsers },
];

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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-5">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {navItems.map(({ to, label, icon, end }) => (
          <NavItem
            key={`${to}-${label}`}
            to={to}
            label={label}
            icon={icon}
            end={end}
            onClick={() => setMobileOpen(false)}
          />
        ))}
        {user?.role === "admin" && (
          <NavItem to="/admin" label="Admin" icon={IconShield} onClick={() => setMobileOpen(false)} />
        )}
      </nav>

      <div className="border-t border-line px-3 py-4 space-y-1">
        {user?.plan === "free" && (
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="mb-2 w-full rounded-xl bg-indigo-50 p-3 text-left transition hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                <IconSparkles width={16} height={16} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-indigo-700 dark:text-indigo-300">Free plan</span>
                <span className="block text-xs text-muted">Upgrade for more uploads</span>
              </div>
            </div>
          </button>
        )}
        <button onClick={toggleTheme} className="nav-item-idle w-full">
          {theme === "dark" ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
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
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-2 ring-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-900">
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
        {navItems.map(({ to, label, icon: Icon, end }) => (
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
                    className="absolute inset-x-2 -top-1.5 h-0.5 rounded-full bg-indigo-600"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon width={20} height={20} className={isActive ? "text-indigo-600" : "text-muted"} />
                <span className={isActive ? "text-indigo-600" : "text-muted"}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
