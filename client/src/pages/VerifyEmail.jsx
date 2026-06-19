import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Spinner, EmptyState } from "../components/ui.jsx";
import AuthShell from "../components/AuthShell.jsx";
import OtpInput from "../components/OtpInput.jsx";
import { IconMail } from "../components/icons.jsx";

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const email = (params.get("email") || user?.email || "").trim().toLowerCase();

  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user?.emailVerified) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  async function handleVerify(e) {
    e.preventDefault();
    if (!email) {
      setError("Email is missing. Log in or register again.");
      return;
    }
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError("Enter the numeric code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const { data } = await api.post("/auth/verify-email", { email, otp: otp.trim() });
      setMsg(data.message || "Email verified!");
      await refreshUser();
      setTimeout(() => navigate("/app", { replace: true }), 800);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!user) {
      setError("Log in first to resend the OTP.");
      return;
    }
    setResending(true);
    setError("");
    setMsg("");
    try {
      const { data } = await api.post("/auth/resend-verification");
      setMsg(data.message || "New OTP sent to your email.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <AuthShell>
        <EmptyState
          icon={IconMail}
          title="Email not found"
          subtitle="We could not find your email. Please log in or register again."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/login" className="btn-outline">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
            </div>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold tracking-tight text-ink">Verify your email</h2>
      <p className="mt-1 text-sm text-muted">
        Enter the {OTP_LENGTH}-digit code sent to{" "}
        <span className="font-medium text-ink">{email}</span>
      </p>

      <form onSubmit={handleVerify} className="mt-6 space-y-5" noValidate>
        {error && <Alert>{error}</Alert>}
        {msg && <Alert type="success">{msg}</Alert>}

        <div>
          <label className="mb-3 block text-center text-sm font-medium text-ink">Verification code</label>
          <OtpInput length={OTP_LENGTH} value={otp} onChange={setOtp} disabled={loading} id="otp" />
        </div>

        <button className="btn-primary w-full" disabled={loading || otp.length < 4}>
          {loading ? <Spinner /> : "Verify email"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-muted">
        <p>Didn&apos;t get the code?</p>
        {user ? (
          <button
            type="button"
            className="font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
            onClick={resend}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend OTP"}
          </button>
        ) : (
          <Link
            to="/login"
            className="font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
          >
            Log in to resend OTP
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
