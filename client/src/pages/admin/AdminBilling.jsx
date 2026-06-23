// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminBilling). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner, PageLoader, PageHeader, SectionTitle } from "../../components/ui.jsx";
import AdminTableToolbar from "../../components/AdminTableToolbar.jsx";
import { CustomPlanModal, CustomPlanList } from "../../components/admin/CustomPlanForm.jsx";
import { IconCoins, IconPlus } from "../../components/icons.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const SECTIONS = {
  pricing: { title: "Pricing", subtitle: "Built-in Pro and Team plan prices." },
  plans: { title: "Custom plans", subtitle: "Add plans beyond Free, Pro, and Team." },
  limits: { title: "Plan limits", subtitle: "Monthly quotas per plan." },
  payments: { title: "Payments", subtitle: "Payment history across all users." },
  grant: { title: "Manual grant", subtitle: "Grant a plan to a user without checkout." },
};

const LIMIT_KEYS = ["documents", "tutorMessages", "quizzes"];

export default function AdminBilling() {
  const { section: sectionParam = "pricing" } = useParams();
  const invalidSection = sectionParam && !SECTIONS[sectionParam];
  const section = SECTIONS[sectionParam] ? sectionParam : "pricing";
  const { title, subtitle } = SECTIONS[section];
  const tab = section;
  const { toast } = useToast();
  const confirm = useConfirm();
  const [proRupees, setProRupees] = useState("");
  const [teamRupees, setTeamRupees] = useState("");
  const [limits, setLimits] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState("pro");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadPlans() {
    const { data } = await api.get("/admin/billing/plans");
    setProRupees(String(data.proRupees ?? ""));
    setTeamRupees(String(data.teamRupees ?? ""));
    setLimits(data.limits);
    setCustomPlans(data.customPlans || []);
    setPlanOptions(data.planOptions || []);
    const paid = (data.planOptions || []).filter((p) => p.id !== "free");
    if (paid.length && !paid.find((p) => p.id === grantPlan)) {
      setGrantPlan(paid[0].id);
    }
  }

  async function loadPayments(p = 1) {
    const { data } = await api.get("/admin/billing/payments", { params: { page: p, limit: 20 } });
    setPayments(data.payments);
    setPayPage(data.page);
    setPayTotalPages(data.totalPages || 1);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (tab !== "payments") await loadPlans();
      else await loadPayments(payPage);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [section]);

  useEffect(() => {
    if (tab === "payments") loadPayments(payPage);
  }, [tab, payPage]);

  async function savePricing(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put("/admin/billing/plans", {
        proRupees: Number(proRupees),
        teamRupees: Number(teamRupees),
      });
      toast("Prices updated", "success");
      await loadPlans();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function resetPricing() {
    const ok = await confirm({
      title: "Reset prices?",
      message: "Clears admin overrides and falls back to .env defaults.",
      confirmText: "Reset",
      danger: true,
    });
    if (!ok) return;
    try {
      const { data } = await api.delete("/admin/billing/pricing");
      setProRupees(String(data.proRupees));
      setTeamRupees(String(data.teamRupees));
      toast("Prices reset to defaults", "success");
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function saveLimits(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/billing/plans", { limits });
      toast("Plan limits updated", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  function updateLimit(plan, key, val) {
    setLimits((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [key]: val === "" ? -1 : Number(val) },
    }));
  }

  async function saveCustomPlan(payload, { editing, id }) {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const { id: _slug, ...body } = payload;
        await api.patch(`/admin/billing/custom-plans/${id}`, body);
        toast("Plan updated", "success");
      } else {
        await api.post("/admin/billing/custom-plans", payload);
        toast("Custom plan created", "success");
      }
      setPlanModalOpen(false);
      setEditingPlan(null);
      await loadPlans();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustom(id) {
    const ok = await confirm({
      title: "Delete this plan?",
      message: "Only works if no users are currently on this plan.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeletingPlanId(id);
    setError("");
    try {
      await api.delete(`/admin/billing/custom-plans/${id}`);
      toast("Plan deleted", "success");
      await loadPlans();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeletingPlanId(null);
    }
  }

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanModalOpen(true);
  }

  function openEditPlan(plan) {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  }

  async function handleGrant(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.get("/admin/users", { params: { search: grantEmail, limit: 20 } });
      const user = data.users?.find((u) => u.email.toLowerCase() === grantEmail.toLowerCase());
      if (!user) {
        setError("User not found");
        return;
      }
      await api.post(`/admin/billing/users/${user.id}/grant`, {
        plan: grantPlan,
        expiresAt: grantExpiry || undefined,
      });
      toast(`Granted ${grantPlan} to ${user.email}`, "success");
      setGrantEmail("");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  const limitPlanKeys = limits ? Object.keys(limits) : [];
  const grantablePlans = planOptions.filter((p) => p.id !== "free");

  if (loading && tab !== "payments" && !limits) return <PageLoader />;
  if (loading && tab === "payments" && !payments.length) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {invalidSection && <Navigate to="/admin/billing/pricing" replace />}
      <PageHeader title={title} subtitle={subtitle} />

      {error && <Alert>{error}</Alert>}

      {tab === "pricing" && (
        <>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <IconCoins width={22} height={22} />
            </span>
            <div>
              <SectionTitle>Built-in plan prices</SectionTitle>
              <p className="mt-0.5 text-sm text-muted">Pro & Team — custom plans have their own price on the Custom plans page.</p>
            </div>
          </div>
          <form onSubmit={savePricing} className="card space-y-4 p-6">
            <div>
              <label className="label">Pro plan (₹ / 30 days)</label>
              <input type="number" min="1" className="input" value={proRupees} onChange={(e) => setProRupees(e.target.value)} required />
            </div>
            <div>
              <label className="label">Team plan (₹ / 30 days)</label>
              <input type="number" min="1" className="input" value={teamRupees} onChange={(e) => setTeamRupees(e.target.value)} required />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner /> : "Save prices"}</button>
              <button type="button" className="btn-outline" onClick={resetPricing}>Reset to .env defaults</button>
            </div>
          </form>
        </>
      )}

      {tab === "plans" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionTitle>Custom plans</SectionTitle>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Add plans beyond Free, Pro, and Team — e.g. Student, Annual, Enterprise.
                Each plan gets its own price, limits, and Pricing page card.
              </p>
            </div>
            <button type="button" className="btn-primary text-sm" onClick={openCreatePlan}>
              <IconPlus width={16} height={16} />
              New plan
            </button>
          </div>

          <CustomPlanList
            plans={customPlans}
            onEdit={openEditPlan}
            onDelete={deleteCustom}
            deletingId={deletingPlanId}
          />

          <CustomPlanModal
            open={planModalOpen}
            editingPlan={editingPlan}
            saving={saving}
            onClose={() => {
              setPlanModalOpen(false);
              setEditingPlan(null);
            }}
            onSubmit={saveCustomPlan}
          />
        </div>
      )}

      {tab === "limits" && limits && (
        <form onSubmit={saveLimits} className="card space-y-4 p-6">
          <SectionTitle>Monthly quotas per plan</SectionTitle>
          <p className="text-sm text-muted">Blank = unlimited. Applies to built-in and custom plans.</p>
          {limitPlanKeys.map((plan) => (
            <div key={plan} className="rounded-lg border border-line p-4">
              <p className="mb-3 font-600 capitalize">{plan}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {LIMIT_KEYS.map((key) => (
                  <div key={key}>
                    <label className="label capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                    <input
                      type="number"
                      className="input"
                      value={limits[plan]?.[key] === -1 ? "" : limits[plan]?.[key] ?? ""}
                      placeholder="∞"
                      onChange={(e) => updateLimit(plan, key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner /> : "Save limits"}</button>
        </form>
      )}

      {tab === "payments" && (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/50">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.user?.email || "—"}</td>
                  <td className="px-4 py-3 capitalize">{p.plan}</td>
                  <td className="px-4 py-3">{p.amount ? `₹${(p.amount / 100).toFixed(0)}` : "—"}</td>
                  <td className="px-4 py-3">{p.provider}</td>
                  <td className="px-4 py-3 text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminTableToolbar page={payPage} totalPages={payTotalPages} onPageChange={setPayPage} />
        </div>
      )}

      {tab === "grant" && (
        <form onSubmit={handleGrant} className="card max-w-md space-y-4 p-6">
          <SectionTitle>Grant plan manually</SectionTitle>
          <input className="input" type="email" placeholder="User email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} required />
          <select className="input capitalize" value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}>
            {grantablePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="date" className="input" value={grantExpiry} onChange={(e) => setGrantExpiry(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner /> : "Grant plan"}</button>
        </form>
      )}
    </div>
  );
}

