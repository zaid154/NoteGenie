// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Theme provider. Saved theme comes from localStorage/system preference, class is applied to document, and components read/toggle it through useTheme().

// Yeh file light/dark theme handle karti hai.
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // theme = "light" ya "dark". Pehle localStorage me dekho (purani choice),
  // warna default "light".
  const [theme, setTheme] = useState(
    () => localStorage.getItem("notegenie_theme") || "light"
  );

  // Jab bhi theme badle: <html> pe "dark" class lagao/hatao
  // aur choice ko localStorage me save kar do (taaki refresh ke baad bhi yaad rahe).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("notegenie_theme", theme);
  }, [theme]);

  // toggleTheme: light <-> dark switch karta hai.
  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// useTheme: kahin bhi "const { theme, toggleTheme } = useTheme()" likho.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

