// FLOW: Theme provider. Manages BOTH light/dark mode and the swappable accent preset.
// Mode toggles the `.dark` class; accent sets `data-accent` on <html> (see index.css presets).
//
// Priority: the USER's explicit choice (localStorage) wins; otherwise the ADMIN site default
// (from GET /catalog/storefront -> theme) applies. So an admin can re-theme the whole site for
// everyone who hasn't picked their own look. Components read/change via useTheme().

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api/client.js";

const ThemeContext = createContext(null);

// Accent presets the user can switch between (must match the [data-accent] blocks in index.css).
export const ACCENTS = [
  { id: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "blue", label: "Blue", swatch: "#2563eb" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
];
const ACCENT_IDS = ACCENTS.map((a) => a.id);
const MODES = ["light", "dark"];

export function ThemeProvider({ children }) {
  // null = user hasn't explicitly chosen -> follow the admin site default.
  const [userMode, setUserMode] = useState(() => {
    const v = localStorage.getItem("notegenie_theme");
    return MODES.includes(v) ? v : null;
  });
  const [userAccent, setUserAccent] = useState(() => {
    const v = localStorage.getItem("notegenie_accent");
    return ACCENT_IDS.includes(v) ? v : null;
  });

  // Admin-configured site defaults (loaded once from the public config).
  const [adminMode, setAdminMode] = useState("light");
  const [adminAccent, setAdminAccent] = useState("indigo");

  useEffect(() => {
    let on = true;
    api
      .get("/catalog/storefront")
      .then((r) => {
        if (!on) return;
        const t = r.data?.theme;
        if (t?.mode && MODES.includes(t.mode)) setAdminMode(t.mode);
        if (t?.accent && ACCENT_IDS.includes(t.accent)) setAdminAccent(t.accent);
      })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  // Effective values: user choice wins, else admin default.
  const mode = userMode ?? adminMode;
  const accent = userAccent ?? adminAccent;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  const setTheme = useCallback((next) => {
    const v = next === "dark" ? "dark" : "light";
    setUserMode(v);
    localStorage.setItem("notegenie_theme", v);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setUserMode(next);
    localStorage.setItem("notegenie_theme", next);
  }, [mode]);

  const setAccent = useCallback((id) => {
    if (!ACCENT_IDS.includes(id)) return;
    setUserAccent(id);
    localStorage.setItem("notegenie_accent", id);
  }, []);

  const value = useMemo(
    () => ({ theme: mode, toggleTheme, setTheme, accent, setAccent, accents: ACCENTS }),
    [mode, toggleTheme, setTheme, accent, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
