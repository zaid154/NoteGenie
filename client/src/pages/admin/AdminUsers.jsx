// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminUsers). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

// AdminUsers: full CRUD — search, create, plan expiry, detail page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import {
  Alert,
  Badge,
  Spinner,
  PageHeader,
  TableSkeleton,
  EmptyState,
} from "../../components/ui.jsx";
import AdminTableToolbar from "../../components/AdminTableToolbar.jsx";
import { IconTrash, IconUsers, IconPlus } from "../../components/icons.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const PLANS = ["free", "pro", "team"];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  // Staff has read-only access to users (can view + reset usage); writes are admin-only.
  const canManageUsers = currentUser?.role === "admin";
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [savingPlan, setSavingPlan] = useState(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    plan: "free",
    role: "user",
    emailVerified: true,
  });
  const [plans, setPlans] = useState(PLANS);
  const confirm = useConfirm();
  const { toast } = useToast();

  useEffect(() => {
    api.get("/admin/billing/plans").then(({ data }) => {
      if (data.planOptions?.length) setPlans(data.planOptions.map((p) => p.id));
    }).catch(() => {});
  }, []);

  async function load(p = page) {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          page: p,
          limit: 20,
          search: search || undefined,
          plan: planFilter || undefined,
          role: roleFilter || undefined,
        },
      });
      setUsers(data.users);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || p);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search, planFilter, roleFilter]);

  useEffect(() => {
    if (page > 1) load(page);
  }, [page]);

  async function remove(id) {
    const ok = await confirm({
      title: "Delete this user?",
      message: "This permanently removes the user along with all their materials, quizzes, and chat history.",
      confirmText: "Delete user",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((u) => u.filter((x) => x.id !== id));
      toast("User deleted", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  async function changePlan(userId, plan) {
    setSavingPlan(userId);
    setError("");
    try {
      const { data } = await api.patch(`/admin/users/${userId}/plan`, { plan, expiresAt: null });
      setUsers((list) =>
        list.map((u) =>
          u.id === userId ? { ...u, plan: data.user.plan, planExpiresAt: data.user.planExpiresAt } : u
        )
      );
      toast(`Plan updated to ${plan}`, "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSavingPlan(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/admin/users", createForm);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", plan: "free", role: "user", emailVerified: true });
      toast("User created", "success");
      load(1);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setCreating(false);
    }
  }

  if (loading && !users.length && !search) {
    return (
      <div className="space-y-4">
        <PageHeader title="Users" subtitle="Manage accounts, plans, and access." />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Users" subtitle="Manage accounts, plans, and access." />

      <AdminTableToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search name or email…"
        filters={[
          {
            id: "plan",
            value: planFilter,
            onChange: (v) => { setPlanFilter(v); setPage(1); },
            options: [
              { value: "", label: "All plans" },
              ...plans.map((p) => ({ value: p, label: p })),
            ],
          },
          {
            id: "role",
            value: roleFilter,
            onChange: (v) => { setRoleFilter(v); setPage(1); },
            options: [
              { value: "", label: "All roles" },
              { value: "user", label: "user" },
              { value: "staff", label: "staff" },
              { value: "admin", label: "admin" },
            ],
          },
        ]}
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
        actions={
          canManageUsers ? (
            <button type="button" className="btn-primary text-sm" onClick={() => setShowCreate(true)}>
              <IconPlus width={16} height={16} />
              Create user
            </button>
          ) : null
        }
      />

      {error && <Alert>{error}</Alert>}

      {showCreate && (
        <form onSubmit={handleCreate} className="card space-y-4 p-6">
          <h3 className="font-display font-600">Create user</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
            <input className="input" type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            <input className="input" type="password" placeholder="Password (min 8)" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={8} />
            <select className="input capitalize" value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}>
              {plans.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              <option value="user">user</option>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createForm.emailVerified} onChange={(e) => setCreateForm({ ...createForm, emailVerified: e.target.checked })} />
              Email verified
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={creating}>{creating ? <Spinner /> : "Create"}</button>
            <button type="button" className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/50">
            <tr>
              <th className="px-4 py-3 font-600 text-ink">Name</th>
              <th className="px-4 py-3 font-600 text-ink">Email</th>
              <th className="px-4 py-3 font-600 text-ink">Plan</th>
              <th className="px-4 py-3 font-600 text-ink">Role</th>
              <th className="px-4 py-3 font-600 text-ink">Materials</th>
              <th className="px-4 py-3 font-600 text-ink">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-ink/[0.02]">
                <td className="px-4 py-3 font-500">
                  <Link to={`/admin/users/${u.id}`} className="text-accent-600 hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  {canManageUsers ? (
                    <select
                      className="input py-1.5 text-sm capitalize"
                      value={u.plan || "free"}
                      disabled={savingPlan === u.id}
                      onChange={(e) => changePlan(u.id, e.target.value)}
                    >
                      {plans.map((plan) => (
                        <option key={plan} value={plan}>{plan}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize text-sm text-muted">{u.plan || "free"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge color={u.role === "admin" ? "brand" : "gray"}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">{u.documentCount}</td>
                <td className="px-4 py-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {canManageUsers && u.role !== "admin" && (
                    <button
                      onClick={() => remove(u.id)}
                      disabled={deleting === u.id}
                      className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-600"
                      title="Delete user"
                    >
                      {deleting === u.id ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <EmptyState compact icon={IconUsers} title="No users found" subtitle="Try different filters." />
        )}
      </div>
    </div>
  );
}

