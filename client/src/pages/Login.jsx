// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Login). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

// Login page: user email/password daal kar andar aata hai.
import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError, isRateLimitError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import FormField from "../components/FormField.jsx";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconMail, IconLock } from "../components/icons.jsx";

// "Remember email" wala email is naam se localStorage me save hota hai.
const REMEMBER_KEY = "notegenie_last_email";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from?.pathname || searchParams.get("redirect") || "/app";

  // form = input fields ki value. email pehle se bhar do agar yaad hai.
  const [form, setForm] = useState({
    email: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
  });
  const [remember, setRemember] = useState(
    Boolean(localStorage.getItem(REMEMBER_KEY))
  );
  const [fieldErrors, setFieldErrors] = useState({}); // har field ki alag galti
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);

  // update: jab user kuch type kare to form me wahi field update karo.
  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: "" })); // type karte hi purani galti hata do
  }

  // validate: bhejne se pehle check karo ki email/password sahi hain.
  function validate() {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!form.password) {
      errs.password = "Please enter your password.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0; // koi galti nahi to true
  }

  // handleSubmit: form bhejne par chalta hai.
  async function handleSubmit(e) {
    e.preventDefault(); // page reload mat karo
    setError("");
    setRateLimited(false);
    if (!validate()) return; // galti hai to ruk jao
    setLoading(true);
    try {
      await login(form.email, form.password); // backend ko bhejo
      // email yaad rakhna hai to save, warna hata do.
      if (remember) localStorage.setItem(REMEMBER_KEY, form.email);
      else localStorage.removeItem(REMEMBER_KEY);
      toast("Welcome back!", "success");
      navigate(from, { replace: true }); // andar le jao
    } catch (err) {
      const limited = isRateLimitError(err);
      setRateLimited(limited);
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Log in to continue to NoteGenie.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert type={rateLimited ? "warning" : "error"}>{error}</Alert>}
        {rateLimited && import.meta.env.DEV && (
          <p className="text-xs text-muted">
            Dev tip: restart the API server to reset the limit. Demo login credentials are in your{" "}
            <code className="text-xs">.env</code> file.
          </p>
        )}

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

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-indigo-600"
          />
          Remember my email
        </label>

        <p className="text-right text-sm">
          <Link to="/forgot-password" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">Forgot password?</Link>
        </p>

        <button className="btn-primary w-full" disabled={loading || rateLimited}>
          {loading ? <Spinner /> : rateLimited ? "Try again later" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link to="/register" className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

