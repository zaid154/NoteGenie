// FLOW: Theme provider. Manages BOTH light/dark mode and the swappable accent preset.
// Mode toggles the `.dark` class; accent sets `data-accent` on <html> (see index.css presets).
// Both persist in localStorage. Components read/change via useTheme().

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const ThemeContext = createContext(null);

// Accent presets the user can switch between (must match the [data-accent] blocks in index.css).
export const ACCENTS = [
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "blue", label: "Blue", swatch: "#2563eb" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
];
const ACCENT_IDS = ACCENTS.map((a) => a.id);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("notegenie_theme") || "light");
  const [accent, setAccentState] = useState(() => {
    const saved = localStorage.getItem("notegenie_accent");
    return ACCENT_IDS.includes(saved) ? saved : "indigo";
  });

  // Apply mode (dark class) + persist.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("notegenie_theme", theme);
  }, [theme]);

  // Apply accent (data-accent) + persist.
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    localStorage.setItem("notegenie_accent", accent);
  }, [accent]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const setAccent = useCallback((id) => {
    if (ACCENT_IDS.includes(id)) setAccentState(id);
  }, []);

  // Memoized so consumers don't re-render on unrelated parent updates.
  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme, accent, setAccent, accents: ACCENTS }),
    [theme, toggleTheme, accent, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
