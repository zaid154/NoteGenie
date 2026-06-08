// Login page: user email/password daal kar andar aata hai.
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError } from "../api/client.js";
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
  // from = login ke baad kahan jana hai (jis page se aaya tha wahin, warna /app).
  const from = location.state?.from?.pathname || "/app";

  // form = input fields ki value. email pehle se bhar do agar yaad hai.
  const [form, setForm] = useState({
    email: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
  });
  const [remember, setRemember] = useState(
    Boolean(localStorage.getItem(REMEMBER_KEY))
  );
  const [fieldErrors, setFieldErrors] = useState({}); // har field ki alag galti
  const [error, setError] = useState("");              // upar dikhne wali badi galti
  const [loading, setLoading] = useState(false);       // login chal raha hai?

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
      setError(apiError(err)); // galat password, etc. dikhao
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="font-display text-2xl font-700 text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Log in to continue to NoteGenie.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

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
            className="h-4 w-4 rounded border-line accent-brand-600"
          />
          Remember my email
        </label>

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link to="/register" className="font-500 text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
