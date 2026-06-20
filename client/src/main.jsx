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

// Saare styles (Tailwind) yahan se load hote hain.
import "./index.css";
import { warmApi } from "./api/client.js";

warmApi();

// To enable client error tracking: `npm i @sentry/react`, set VITE_SENTRY_DSN, then add a
// static `import * as Sentry from "@sentry/react"` and call `Sentry.init({ dsn: ... })` here.
// (A dynamic/optional import can't be used — Vite must resolve and bundle the package.)

// "root" div index.html me hota hai. Wahin React apna pura app dikhata hai.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode bugs dhoondhne me help karta hai (sirf development me).
  <React.StrictMode>
    {/* Providers ek doosre ke andar lagte hain. Andar wala component
        bahar wale providers ka data use kar sakta hai. */}
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
