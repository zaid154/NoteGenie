// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Browser starts here. It mounts React, wraps App with router/auth/theme/toast/confirm providers, and calls warmApi from api/client.js for production backend wakeup.

// Yeh file app ka entry point hai. React yahin se start hota hai.
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Apna main App component.
import App from "./App.jsx";

// Context providers — yeh poore app ko data dete hain (login, theme, etc.).
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Saare styles (Tailwind) yahan se load hote hain.
import "./index.css";
import { warmApi } from "./api/client.js";

warmApi();

// Register the PWA service worker in production only (it must not interfere with
// the Vite dev server / HMR). Failures are non-fatal.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// To enable client error tracking: `npm i @sentry/react`, set VITE_SENTRY_DSN, then add a
// static `import * as Sentry from "@sentry/react"` and call `Sentry.init({ dsn: ... })` here.
// (A dynamic/optional import can't be used — Vite must resolve and bundle the package.)

// "root" div index.html me hota hai. Wahin React apna pura app dikhata hai.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode bugs dhoondhne me help karta hai (sirf development me).
  <React.StrictMode>
    {/* ErrorBoundary is outermost so a crash anywhere (even inside a provider)
        shows the recover screen instead of a blank white page. */}
    <ErrorBoundary>
      {/* Providers ek doosre ke andar lagte hain. Andar wala component
          bahar wale providers ka data use kar sakta hai. */}
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <App />
                </ConfirmProvider>
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

