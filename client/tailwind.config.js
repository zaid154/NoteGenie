/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Font pairing: characterful serif headings + clean sans body.
      // (index.html me Google Fonts load hote hain.)
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      // Numeric font-weight utilities (font-400, font-500, font-600, font-700).
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      // Brand palette: bright sky-blue primary + warm amber accent.
      // CSS variables se light/dark dono themes handle hote hain.
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#daeefe",
          200: "#bde2fe",
          300: "#90d0fd",
          400: "#5bb6f9",
          500: "#329bef",
          600: "#1d83d4",
          700: "#1868ac",
          800: "#1a578c",
          900: "#1b4a74",
        },
        accent: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
      },
      boxShadow: {
        // Soft, neutral shadows for a clean look on white.
        card: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px -10px rgba(15,23,42,0.10)",
        lift: "0 10px 34px -12px rgba(29,131,212,0.25)",
      },
      borderRadius: {
        // Thode tighter corners — har cheez pill-shaped nahi, zyada deliberate lagta hai.
        xl: "0.625rem",
        "2xl": "0.875rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        fade: "fade 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
