// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (ResetPassword). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import FormField, { passwordStrength } from "../components/FormField.jsx";
import { Alert, EmptyState, Spinner } from "../components/ui.jsx";
import { IconLock } from "../components/icons.jsx";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const email = params.get("email");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  if (!token || !email) {
    return (
      <AuthShell>
        <EmptyState
          title="Invalid reset link"
          subtitle="This password reset link is missing information or has expired."
          action={<Link to="/forgot-password" className="btn-primary">Request new link</Link>}
        />
      </AuthShell>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, email, password });
      navigate("/login", { state: { message: "Password updated. You can log in now." } });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Reset password</h2>
      <p className="mt-1 text-sm text-muted">Choose a new password (min 8 characters).</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <FormField
            label="New password"
            icon={IconLock}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {password && (
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
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : "Update password"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/login" className="text-ink underline underline-offset-2 hover:no-underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}

