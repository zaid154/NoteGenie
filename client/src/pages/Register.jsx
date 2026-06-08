// Register page: naya user account banata hai.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import FormField, { passwordStrength } from "../components/FormField.jsx";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconUser, IconMail, IconLock } from "../components/icons.jsx";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // form = saari input values.
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // password kitna strong hai (bar dikhane ke liye).
  const strength = passwordStrength(form.password);

  // update: koi field type kare to form update karo + us field ki galti hata do.
  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  }

  // validate: bhejne se pehle saari fields check karo.
  function validate() {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }
    if (form.confirm !== form.password) {
      errs.confirm = "Passwords do not match."; // dono password same hone chahiye
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // handleSubmit: account banao, fir app ke andar le jao.
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      toast("Account created. Welcome to NoteGenie!", "success");
      navigate("/app", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="font-display text-2xl font-700 text-ink">Create your account</h2>
      <p className="mt-1 text-sm text-muted">It's free and takes about 30 seconds.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <FormField
          label="Name"
          icon={IconUser}
          name="name"
          value={form.name}
          onChange={update}
          placeholder="Your name"
          error={fieldErrors.name}
          autoComplete="name"
        />

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

        <div>
          <FormField
            label="Password"
            icon={IconLock}
            type="password"
            name="password"
            value={form.password}
            onChange={update}
            placeholder="At least 8 characters"
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          {form.password && !fieldErrors.password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strength.score >= i ? strength.color : "bg-line"
                    }`}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="mt-1 text-xs text-muted">
                  Password strength: <span className="text-ink">{strength.label}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <FormField
          label="Confirm password"
          icon={IconLock}
          type="password"
          name="confirm"
          value={form.confirm}
          onChange={update}
          placeholder="Re-enter your password"
          error={fieldErrors.confirm}
          autoComplete="new-password"
        />

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-500 text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
