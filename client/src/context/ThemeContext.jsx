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
