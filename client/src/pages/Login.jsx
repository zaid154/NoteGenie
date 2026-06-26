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
import { IconMail, IconLock } from "../components/icons.jsx";

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

    <AuthShell>

      {/* Heading */}
      <h2 className="text-2xl font-semibold tracking-tight text-ink">
        Welcome back
      </h2>

      <p className="mt-1 text-sm text-muted">
        Log in to continue to NoteGenie.
      </p>

      {/* ==========================================================
           Login Form
      ========================================================== */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
        noValidate
      >

        {/* Backend Error */}
        {error && (
          <Alert
            type={
              rateLimited
                ? "warning"
                : "error"
            }
          >
            {error}
          </Alert>
        )}

        {/* Dev Mode Tip */}
        {rateLimited &&
          import.meta.env.DEV && (
            <p className="text-xs text-muted">
              Dev tip: restart API server.
            </p>
          )}

        {/* Email Field */}
        <FormField
          label="Email"
          icon={IconMail}
          type="email"
          name="email"
          value={form.email}
          onChange={update}
          placeholder="you@example.com"
          error={fieldErrors.email}
          autoComplete="email"
        />

        {/* Password Field */}
        <FormField
          label="Password"
          icon={IconLock}
          type="password"
          name="password"
          value={form.password}
          onChange={update}
          placeholder="Enter your password"
          error={fieldErrors.password}
          autoComplete="current-password"
        />

        {/* Remember Email */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">

          <input
            type="checkbox"
            checked={remember}
            onChange={(e) =>
              setRemember(
                e.target.checked
              )
            }
          />

          Remember my email

        </label>

        {/* Forgot Password */}
        <p className="text-right text-sm">

          <Link
            to="/forgot-password"
          >
            Forgot password?
          </Link>

        </p>

        {/* Login Button */}
        <button
          className="btn-primary w-full"
          disabled={
            loading ||
            rateLimited
          }
        >

          {loading
            ? <Spinner />
            : rateLimited
              ? "Try again later"
              : "Log in"}

        </button>

      </form>

      {/* Register Link */}
      <p className="mt-6 text-center text-sm text-muted">

        New here?{" "}

        <Link to="/register">
          Create an account
        </Link>

      </p>

    </AuthShell>
  );
}