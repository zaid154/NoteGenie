import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Logo from "./Logo.jsx";
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
} from "./icons.jsx";

const navItems = [
  { to: "/app", label: "Dashboard", icon: IconHome, end: true },
  { to: "/upload", label: "New Material", icon: IconUpload },
  { to: "/analytics", label: "Analytics", icon: IconChart },
  { to: "/profile", label: "Profile", icon: IconUsers },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2 pt-2">
        <Logo />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-lift"
                  : "text-muted hover:bg-ink/5 hover:text-ink"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white shadow-lift"
                  : "text-muted hover:bg-ink/5 hover:text-ink"
              }`
            }
          >
            <IconShield />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="mt-auto space-y-2">
        <button onClick={toggleTheme} className="btn-ghost w-full justify-start gap-3">
          {theme === "dark" ? <IconSun /> : <IconMoon />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-600 text-white">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-500 text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="rounded-lg p-1.5 text-muted hover:bg-ink/5 hover:text-red-500"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={28} />
        <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2">
          <IconMenu />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl animate-fade-up">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-ink/5"
            >
              <IconX />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
