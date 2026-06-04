import { NavLink, Outlet } from "react-router-dom";
import { IconChart, IconUsers, IconSettings, IconDoc } from "./icons.jsx";

const tabs = [
  { to: "/admin", label: "Overview", icon: IconChart, end: true },
  { to: "/admin/users", label: "Users", icon: IconUsers },
  { to: "/admin/settings", label: "AI Settings", icon: IconSettings },
  { to: "/admin/content", label: "Content", icon: IconDoc },
];

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Manage users, API keys, and platform content.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-muted hover:text-ink"
              }`
            }
          >
            <Icon width={16} height={16} />
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
