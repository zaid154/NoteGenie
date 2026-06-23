// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (ForgotPassword). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import AuthShell from "../components/AuthShell.jsx";
import FormField from "../components/FormField.jsx";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconMail } from "../components/icons.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Forgot password</h2>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a reset link.</p>
      <div className="mt-6">
        {sent ? (
          <Alert type="success">If that email exists, a reset link was sent.</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <FormField
              label="Email"
              icon={IconMail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner /> : "Send reset link"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/login" className="text-ink underline underline-offset-2 hover:no-underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

