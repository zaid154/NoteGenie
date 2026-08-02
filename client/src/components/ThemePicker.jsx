// FLOW: Theme picker. Full-width Light/dark segmented toggle for sidebar.
// Reads/writes ThemeContext (persists to localStorage). Mounted in the sidebar.

import { useTheme } from "../context/ThemeContext.jsx";
import { IconSun, IconMoon } from "./icons.jsx";

export default function ThemePicker() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center rounded-xl border border-line bg-canvas/70 p-1 shadow-2xs">
      <button
        type="button"
        onClick={() => { if (theme !== "light") toggleTheme(); }}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
          theme === "light"
            ? "bg-surface text-ink shadow-xs border border-line/60 font-bold"
            : "text-muted hover:text-ink"
        }`}
        title="Light mode"
      >
        <IconSun width={14} height={14} className={theme === "light" ? "text-amber-500" : ""} />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => { if (theme !== "dark") toggleTheme(); }}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
          theme === "dark"
            ? "bg-slate-800 text-white shadow-xs font-bold"
            : "text-muted hover:text-ink"
        }`}
        title="Dark mode"
      >
        <IconMoon width={14} height={14} className={theme === "dark" ? "text-indigo-400" : ""} />
        <span>Dark</span>
      </button>
    </div>
  );
}
