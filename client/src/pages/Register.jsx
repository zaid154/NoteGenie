import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import FormField, { passwordStrength } from "../components/FormField.jsx";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconUser, IconMail, IconLock, IconChevronRight } from "../components/icons.jsx";

export default function Register() {
  const { registerAndHandle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const strength = passwordStrength(form.password);

  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => ({ ...fe, [name]: "" }));
  }

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
      errs.confirm = "Passwords do not match.";
    }
    if (!acceptedTerms) {
      errs.terms = "You must accept the Terms and Privacy Policy.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await registerAndHandle(form.name.trim(), form.email, form.password);
      if (result.autoLoggedIn) {
        toast("Your account is ready!", "success");
        navigate(result.user?.role === "admin" || result.user?.role === "staff" ? "/admin" : "/app", { replace: true });
        return;
      }
      toast("We sent a 6-digit code to your email. Enter it to finish signing up.", "success");
      navigate(`/verify-email?email=${encodeURIComponent(result.email || form.email)}`, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell activeTab="register">
      <div>
        <h2 className="font-sans text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
          Create Account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          It&apos;s free and takes less than 30 seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-3.5 sm:mt-4 space-y-2.5 sm:space-y-3" noValidate>
        {error && <Alert>{error}</Alert>}

        <FormField
          compact={true}
          label="Full Name"
          icon={IconUser}
          name="name"
          value={form.name}
          onChange={update}
          placeholder="Your full name"
          error={fieldErrors.name}
          autoComplete="name"
        />

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

        <div>
          <FormField
            compact={true}
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
          {form.password && (
            <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <span className={strength.score >= 3 ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>✓</span>
                <span>Password Strength : <span className="font-bold text-slate-800">{strength.label || "Weak"}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={form.password.length >= 8 ? "text-emerald-600 font-bold" : "text-slate-400"}>✓</span>
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={/\d|[^A-Za-z0-9]/.test(form.password) ? "text-emerald-600 font-bold" : "text-slate-400"}>✓</span>
                <span>Contains a number or symbol</span>
              </div>
            </div>
          )}
        </div>

        <FormField
          compact={true}
          label="Confirm Password"
          icon={IconLock}
          type="password"
          name="confirm"
          value={form.confirm}
          onChange={update}
          placeholder="Re-enter your password"
          error={fieldErrors.confirm}
          autoComplete="new-password"
        />

        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600 py-0.5">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              setFieldErrors((fe) => ({ ...fe, terms: "" }));
            }}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              Terms
            </Link>
            {" "}and{" "}
            <Link to="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
              Privacy Policy
            </Link>
          </span>
        </label>
        {fieldErrors.terms && <p className="text-xs text-red-600 font-medium">{fieldErrors.terms}</p>}

        <button
          type="submit"
          className="mt-2 w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-4 font-bold text-xs sm:text-sm text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-blue-600 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 group"
          disabled={loading}
        >
          {loading ? (
            <Spinner className="mx-auto" />
          ) : (
            <>
              <span>Create Account</span>
              <IconChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
