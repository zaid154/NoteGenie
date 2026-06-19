import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Spinner } from "./ui.jsx";

export default function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!user || user.emailVerified) return null;

  async function resend() {
    setSending(true);
    setError("");
    setMsg("");
    try {
      const { data } = await api.post("/auth/resend-verification");
      setMsg(data.message || "Verification email sent.");
      await refreshUser();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 space-y-2">
      <Alert type="warning">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Please verify your email ({user.email}) with the OTP we sent.
          </span>
          <div className="flex flex-wrap gap-2">
            <Link to={`/verify-email?email=${encodeURIComponent(user.email)}`} className="btn-outline py-1.5 text-xs">
              Enter OTP
            </Link>
            <button type="button" className="btn-outline py-1.5 text-xs" onClick={resend} disabled={sending}>
              {sending ? <Spinner size={14} /> : "Resend OTP"}
            </button>
            <Link to={`/verify-email?email=${encodeURIComponent(user.email)}`} className="btn-outline py-1.5 text-xs">
              Verify with OTP
            </Link>
          </div>
        </div>
      </Alert>
      {msg && <p className="text-xs text-emerald-600 dark:text-emerald-400">{msg}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
