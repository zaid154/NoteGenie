// ============================================================================
// FLOW: Login Page
//
// User email aur password enter karta hai.
// Form validate hota hai.
// AuthContext ke login() function ko call karta hai.
// Login successful hone par JWT save hota hai aur user Dashboard (/app)
// ya jis page se aaya tha us page par redirect ho jata hai.
// ============================================================================

import { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { apiError, isRateLimitError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

import AuthShell from "../components/AuthShell.jsx";
import FormField from "../components/FormField.jsx";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconMail, IconLock, IconChevronRight } from "../components/icons.jsx";

// ============================================================================
// LocalStorage Key
//
// Agar user "Remember my email" select karega
// to email isi key ke naam se browser me save hoga.
// ============================================================================
const REMEMBER_KEY = "notegenie_last_email";

export default function Login() {

  // ==========================================================================
  // AuthContext se login() function milta hai.
  // Yeh backend ko login request bhejta hai.
  // ==========================================================================
  const { login } = useAuth();

  // Toast notification
  const { toast } = useToast();

  // React Router helpers
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ==========================================================================
  // Login ke baad user kis page par jayega?
  //
  // Agar protected page se login pe bheja gaya tha
  // to wahi page open karo.
  //
  // Nahi to "/app"
  // ==========================================================================
  const from =
    location.state?.from?.pathname ||
    searchParams.get("redirect") ||
    "/app";

  // ==========================================================================
  // Form State
  //
  // Agar Remember Email enabled hai
  // to email pehle hi fill kar do.
  // ==========================================================================
  const [form, setForm] = useState({
    email: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
  });

  // Remember checkbox state
  const [remember, setRemember] = useState(
    Boolean(localStorage.getItem(REMEMBER_KEY))
  );

  // Har input field ki validation error
  const [fieldErrors, setFieldErrors] = useState({});

  // Backend error message
  const [error, setError] = useState("");

  // Rate Limit flag
  const [rateLimited, setRateLimited] = useState(false);

  // Login loading state
  const [loading, setLoading] = useState(false);

  // ==========================================================================
  // update()
  //
  // Jab user kisi input me type karta hai
  // tab ye function call hota hai.
  //
  // 1. Form update karo
  // 2. Us field ki purani error hata do
  // ==========================================================================
  function update(e) {

    const { name, value } = e.target;

    setForm((f) => ({
      ...f,
      [name]: value,
    }));

    setFieldErrors((fe) => ({
      ...fe,
      [name]: "",
    }));
  }

  // ==========================================================================
  // validate()
  //
  // Backend ko request bhejne se pehle
  // form check karo.
  //
  // Email valid hai?
  // Password empty to nahi?
  // ==========================================================================
  function validate() {

    const errs = {};

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }

    // Password validation
    if (!form.password) {
      errs.password = "Please enter your password.";
    }

    setFieldErrors(errs);

    // True => sab sahi
    // False => error hai
    return Object.keys(errs).length === 0;
  }

  // ==========================================================================
  // handleSubmit()
  //
  // Login button press karte hi ye function chalta hai.
  //
  // Flow:
  //
  // Button Click
  //      ↓
  // Validation
  //      ↓
  // login()
  //      ↓
  // Backend
  //      ↓
  // JWT
  //      ↓
  // Dashboard
  // ==========================================================================
  async function handleSubmit(e) {

    // Page reload mat hone do
    e.preventDefault();

    // Purani errors hata do
    setError("");
    setRateLimited(false);

    // Validation fail
    if (!validate()) return;

    // Spinner dikhao
    setLoading(true);

    try {

      // ==========================================================
      // AuthContext login()
      //
      // Backend:
      // POST /auth/login
      // ==========================================================
      await login(
        form.email,
        form.password
      );

      // ==========================================================
      // Remember Email
      // ==========================================================
      if (remember)
        localStorage.setItem(
          REMEMBER_KEY,
          form.email
        );
      else
        localStorage.removeItem(
          REMEMBER_KEY
        );

      // Success Toast
      toast(
        "Welcome back!",
        "success"
      );

      // Dashboard redirect
      navigate(from, {
        replace: true,
      });

    } catch (err) {

      // Backend ne 429 diya?
      const limited =
        isRateLimitError(err);

      setRateLimited(limited);

      // Friendly error message
      setError(apiError(err));

    } finally {

      // Spinner hide
      setLoading(false);
    }
  }

  // ==========================================================================
  // UI Rendering
  //
  // Login Form Screen
  // ==========================================================================
  return (
    <AuthShell activeTab="login">
      <div>
        <h2 className="font-sans text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
          Welcome back
        </h2>
        <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">
          Log in to continue to NoteGenie.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2.5" noValidate>
        {error && (
          <Alert type={rateLimited ? "warning" : "error"}>
            {error}
          </Alert>
        )}

        {rateLimited && import.meta.env.DEV && (
          <p className="text-xs text-muted">Dev tip: restart API server.</p>
        )}

        {/* Email Field */}
        <FormField
          compact={true}
          label="Email Id"
          icon={IconMail}
          type="email"
          name="email"
          value={form.email}
          onChange={update}
          placeholder="you@example.com"
          error={fieldErrors.email}
          autoComplete="email"
        />

        {/* Password Field with inline Forgot password link */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <FormField
            compact={true}
            icon={IconLock}
            type="password"
            name="password"
            value={form.password}
            onChange={update}
            placeholder="Enter your password"
            error={fieldErrors.password}
            autoComplete="current-password"
          />
        </div>

        {/* Remember Email Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            Remember my email
          </label>
        </div>

        {/* Primary Log In Button */}
        <button
          type="submit"
          className="mt-2.5 w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-4 font-bold text-xs sm:text-sm text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-blue-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 group"
          disabled={loading || rateLimited}
        >
          {loading ? (
            <Spinner className="mx-auto" />
          ) : rateLimited ? (
            "Try again later"
          ) : (
            <>
              <span>Log In</span>
              <IconChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}