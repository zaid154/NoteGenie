/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,css}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
        display: ["\"Instrument Serif\"", "Georgia", "serif"],
        // Store-only display face (Bricolage Grotesque). The indigo app keeps Instrument Serif.
        "display-store": ["\"Bricolage Grotesque\"", "\"Plus Jakarta Sans\"", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        // Swappable accent — resolves to the --accent-* CSS vars (see index.css),
        // so data-accent="indigo|violet|blue|emerald" on <html> recolors the whole app.
        accent: {
          50: "rgb(var(--accent-50) / <alpha-value>)",
          100: "rgb(var(--accent-100) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
          800: "rgb(var(--accent-800) / <alpha-value>)",
          900: "rgb(var(--accent-900) / <alpha-value>)",
          950: "rgb(var(--accent-950) / <alpha-value>)",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        // Storefront-only palette (teal primary + amber accent). Scoped under .store-theme
        // so the indigo app is untouched. See the .store-* layer in index.css.
        // Storefront primary — COBALT (the single "action" colour: Search, Add, Buy, Register).
        store: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb5ff",
          400: "#598dfb",
          500: "#2e6bf0",
          600: "#1d52d9",
          700: "#1a43b0",
          800: "#1b3a8c",
          900: "#1c3470",
          950: "#121f45",
        },
        // Storefront signal — SAFFRON (rare accent only: cart badge, savings, "Popular" seal).
        storeaccent: {
          50: "#fff7ed",
          100: "#ffead1",
          200: "#fed2a4",
          300: "#fdb36b",
          400: "#fb8f32",
          500: "#f5760b",
          600: "#d65e06",
          700: "#b14807",
          800: "#8f3a0e",
          900: "#74310f",
          950: "#3f1705",
        },
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        card: "0 4px 20px -6px rgba(15, 23, 42, 0.1), 0 2px 6px -2px rgba(15, 23, 42, 0.05)",
        hover: "0 8px 28px -8px rgba(79, 70, 229, 0.12), 0 4px 10px -4px rgba(15, 23, 42, 0.06)",
        lift: "0 12px 40px -12px rgba(15, 23, 42, 0.15)",
        // Storefront navy-tinted elevation ladder (additive — indigo app never uses these).
        "store-e1": "0 1px 2px rgba(14,26,51,0.06), 0 6px 16px -6px rgba(14,26,51,0.12)",
        "store-e2": "0 4px 10px -2px rgba(14,26,51,0.10), 0 18px 40px -12px rgba(14,26,51,0.20)",
        "store-e3": "0 12px 24px -8px rgba(14,26,51,0.14), 0 40px 64px -20px rgba(14,26,51,0.28)",
        "store-cta": "0 6px 18px -4px rgba(29,82,217,0.42)",
        "store-header": "0 4px 20px -8px rgba(14,26,51,0.14)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.75rem",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "fade-up": "fadeUp 0.35s ease-out",
        fade: "fade 0.2s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "progress-indeterminate": "progressIndeterminate 1.4s ease-in-out infinite",
        "mesh-drift": "meshDrift 18s ease-in-out infinite alternate",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        progressIndeterminate: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        meshDrift: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "100%": { transform: "translate(30px, -20px) scale(1.05)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(79, 70, 229, 0)" },
          "50%": { boxShadow: "0 0 24px 2px rgba(79, 70, 229, 0.12)" },
        },
      },
    },
  },
  plugins: [],
};
