// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminUserDetail). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import {
  Alert,
  Badge,
  Spinner,
  PageLoader,
  PageHeader,
  SectionTitle,
} from "../../components/ui.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  // Staff can view a user + reset usage; profile/plan/password/delete are admin-only.
  const canManage = currentUser?.role === "admin";

  const [plans, setPlans] = useState(["free", "pro", "team"]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState("free");
  const [expiresAt, setExpiresAt] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "user", bio: "", emailVerified: false, permissions: [] });
  const [permCatalog, setPermCatalog] = useState({ keys: [], labels: {} });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.get(`/admin/users/${id}`);
      setData(res);
      setPlan(res.user.plan || "free");
      setExpiresAt(res.user.planExpiresAt ? res.user.planExpiresAt.slice(0, 10) : "");
      setForm({
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        bio: res.user.bio || "",
        emailVerified: res.user.emailVerified,
        permissions: res.user.permissions || [],
      });
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    // Permission catalog for the staff-permission checkboxes.
    api.get("/admin/permissions").then(({ data }) => {
      setPermCatalog({ keys: data.keys || [], labels: data.labels || {} });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Plan catalog endpoint is admin-only; staff falls back to the default plan list.
    if (!canManage) return;
    api.get("/admin/billing/plans").then(({ data }) => {
      if (data.planOptions?.length) setPlans(data.planOptions.map((p) => p.id));
    }).catch(() => {});
  }, [canManage]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data: res } = await api.patch(`/admin/users/${id}`, form);
      setData((d) => ({ ...d, user: { ...d.user, ...res.user } }));
      toast("Profile updated", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data: res } = await api.patch(`/admin/users/${id}/plan`, {
        plan,
        expiresAt: plan === "free" ? null : expiresAt || null,
      });
      setData((d) => ({ ...d, user: { ...d.user, ...res.user } }));
      toast("Plan updated", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function resetUsage() {
    const ok = await confirm({
      title: "Reset usage?",
      message: "This resets monthly document, tutor, and quiz counters for this user.",
      confirmText: "Reset",
    });
    if (!ok) return;
    try {
      const { data: res } = await api.post(`/admin/users/${id}/reset-usage`);
      setData((d) => ({ ...d, usage: res.usage }));
      toast("Usage reset", "success");
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function resetPassword(sendEmail) {
    const ok = await confirm({
      title: sendEmail ? "Send reset email?" : "Set temporary password?",
      message: sendEmail
        ? "User will receive a password reset link by email."
        : "A temporary password will be shown once — copy it now.",
      confirmText: sendEmail ? "Send email" : "Generate password",
    });
    if (!ok) return;
    try {
      const { data: res } = await api.post(`/admin/users/${id}/reset-password`, { sendEmail });
      if (res.tempPassword) {
        await confirm({
          title: "Temporary password",
          message: `Give this to the user: ${res.tempPassword}`,
          confirmText: "OK",
        });
      } else {
        toast(res.message, "success");
      }
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function removeUser() {
    const ok = await confirm({
      title: "Delete this user?",
      message: "Permanently removes the user and all their data.",
      confirmText: "Delete user",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast("User deleted", "success");
      navigate("/admin/users");
    } catch (e) {
      setError(apiError(e));
    }
  }

  if (loading) return <PageLoader />;
  if (!data) return <Alert>{error || "User not found"}</Alert>;

  const { user, stats, usage } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        subtitle={user.email}
        action={
          <Link to="/admin/users" className="btn-outline text-sm">
            Back to users
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-muted">Materials</p>
          <p className="text-2xl font-700">{stats.documentCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Quizzes</p>
          <p className="text-2xl font-700">{stats.quizCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Chat messages</p>
          <p className="text-2xl font-700">{stats.chatCount}</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="card space-y-4 p-6">
        <SectionTitle>Profile</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} disabled={!canManage} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} disabled={!canManage} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} disabled={!canManage} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">user</option>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.emailVerified}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, emailVerified: e.target.checked })}
              />
              Email verified
            </label>
            <Badge color={user.role === "admin" ? "brand" : "gray"}>{user.role}</Badge>
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[80px]" value={form.bio} disabled={!canManage} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>

        {form.role === "staff" && (
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-ink">Staff permissions</p>
            <p className="mb-3 text-xs text-muted">
              What this staff member can manage. Admins always have everything.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {permCatalog.keys.map((key) => {
                const meta = permCatalog.labels[key] || { label: key, description: "" };
                const checked = form.permissions.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                      checked
                        ? "border-accent-300 bg-accent-50/60 dark:border-accent-700 dark:bg-accent-950/30"
                        : "border-line"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      disabled={!canManage}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          permissions: e.target.checked
                            ? [...f.permissions, key]
                            : f.permissions.filter((p) => p !== key),
                        }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{meta.label}</span>
                      {meta.description && <span className="block text-xs text-muted">{meta.description}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {canManage && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner /> : "Save profile"}
          </button>
        )}
      </form>

      <form onSubmit={savePlan} className="card space-y-4 p-6">
        <SectionTitle>Plan</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Plan</label>
            <select className="input capitalize" value={plan} disabled={!canManage} onChange={(e) => setPlan(e.target.value)}>
              {plans.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {plan !== "free" && (
            <div>
              <label className="label">Expires (optional)</label>
              <input type="date" className="input" value={expiresAt} disabled={!canManage} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          )}
        </div>
        {canManage && (
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner /> : "Save plan"}
          </button>
        )}
      </form>

      <div className="card space-y-4 p-6">
        <SectionTitle>Monthly usage</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          {["documents", "tutorMessages", "quizzes"].map((key) => (
            <div key={key} className="rounded-lg border border-line p-3">
              <p className="capitalize text-muted">{key.replace(/([A-Z])/g, " $1")}</p>
              <p className="mt-1 font-600">
                {usage.used[key] ?? 0}
                {usage.limits[key] != null ? ` / ${usage.limits[key]}` : " / ∞"}
              </p>
            </div>
          ))}
        </div>
        <button type="button" className="btn-outline" onClick={resetUsage}>
          Reset usage counters
        </button>
      </div>

      {canManage && (
        <div className="card space-y-3 p-6">
          <SectionTitle>Account actions</SectionTitle>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-outline" onClick={() => resetPassword(false)}>
              Set temp password
            </button>
            <button type="button" className="btn-outline" onClick={() => resetPassword(true)}>
              Send reset email
            </button>
            {user.role !== "admin" && (
              <button type="button" className="btn-outline text-red-600" onClick={removeUser}>
                Delete user
              </button>
            )}
          </div>
          {(user.stripeCustomerId || user.stripeSubscriptionId) && (
            <p className="text-xs text-muted">
              Stripe: {user.stripeCustomerId || "—"} · Sub: {user.stripeSubscriptionId || "—"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

