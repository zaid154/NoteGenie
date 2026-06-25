// FLOW: App.jsx route renders this (WorkspaceDetail, /workspaces/:id). Shows members,
// the invite code, and materials shared into the workspace. Owners can remove members,
// regenerate the code, rename, or delete; members can leave. Shared docs link to the
// normal document view (access is granted server-side by membership).

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { sourceMeta } from "../utils/sourceMeta.jsx";
import { IconArrowLeft, IconTrash, IconUsers, IconCheck } from "../components/icons.jsx";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [ws, setWs] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [wsRes, docsRes] = await Promise.all([
        api.get(`/workspaces/${id}`),
        api.get(`/workspaces/${id}/documents`).catch(() => ({ data: { documents: [] } })),
      ]);
      setWs(wsRes.data.workspace);
      setDocs(docsRes.data.documents || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copyCode() {
    try {
      await navigator.clipboard?.writeText(ws.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy — select it manually", "error");
    }
  }

  async function regenerate() {
    setBusy(true);
    try {
      const { data } = await api.post(`/workspaces/${id}/regenerate-code`);
      setWs((w) => ({ ...w, inviteCode: data.inviteCode }));
      toast("New invite code generated", "success");
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId, name) {
    const ok = await confirm({
      title: `Remove ${name}?`,
      message: "They'll lose access to materials shared in this workspace.",
      confirmText: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/workspaces/${id}/members/${userId}`);
      setWs((w) => ({ ...w, members: w.members.filter((m) => String(m.userId) !== String(userId)) }));
      toast("Member removed", "success");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  async function leave() {
    const ok = await confirm({
      title: "Leave this workspace?",
      message: "You'll lose access to its shared materials.",
      confirmText: "Leave",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.post(`/workspaces/${id}/leave`);
      toast("Left workspace", "success");
      navigate("/workspaces");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  async function deleteWorkspace() {
    const ok = await confirm({
      title: "Delete this workspace?",
      message: "Members will lose access. Your materials are not deleted — just unshared.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/workspaces/${id}`);
      toast("Workspace deleted", "success");
      navigate("/workspaces");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={24} />
      </div>
    );
  }

  if (error || !ws) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <IconArrowLeft width={16} height={16} /> Workspaces
        </Link>
        <Alert>{error || "Workspace not found"}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <IconArrowLeft width={16} height={16} /> Workspaces
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{ws.name}</h1>
          <Badge color={ws.isOwner ? "brand" : "gray"}>{ws.isOwner ? "Owner" : "Member"}</Badge>
        </div>
      </div>

      <div className="panel space-y-3 p-5 shadow-soft">
        <p className="text-sm font-semibold text-ink">Invite code</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink">{ws.inviteCode}</code>
          <button type="button" onClick={copyCode} className="btn-outline text-sm">
            {copied ? <IconCheck width={16} height={16} /> : null} {copied ? "Copied" : "Copy"}
          </button>
          {ws.isOwner && (
            <button type="button" onClick={regenerate} disabled={busy} className="btn-ghost text-sm">
              Regenerate
            </button>
          )}
        </div>
        <p className="text-xs text-muted">Share this code so others can join the workspace.</p>
      </div>

      <div className="panel p-5 shadow-soft">
        <p className="mb-3 text-sm font-semibold text-ink">Members ({ws.members.length})</p>
        <ul className="divide-y divide-line">
          {ws.members.map((m) => (
            <li key={String(m.userId)} className="flex items-center gap-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                {(m.name?.[0] || "U").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <Badge color={m.role === "owner" ? "brand" : "gray"}>{m.role}</Badge>
              {ws.isOwner && m.role !== "owner" && (
                <button
                  type="button"
                  onClick={() => removeMember(m.userId, m.name)}
                  className="text-muted transition hover:text-red-600"
                  aria-label={`Remove ${m.name}`}
                >
                  <IconTrash width={16} height={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-5 shadow-soft">
        <p className="mb-3 text-sm font-semibold text-ink">Shared materials ({docs.length})</p>
        {docs.length === 0 ? (
          <EmptyState
            compact
            icon={IconUsers}
            title="Nothing shared yet"
            subtitle="Open one of your materials and use “Share to workspace”."
          />
        ) : (
          <ul className="divide-y divide-line">
            {docs.map((d) => {
              const meta = sourceMeta(d.sourceType);
              const Icon = meta.Icon;
              return (
                <li key={d._id}>
                  <Link to={`/document/${d._id}`} className="group flex items-center gap-3 py-2.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                      <Icon width={16} height={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink group-hover:text-accent-600 dark:group-hover:text-accent-400">{d.title}</p>
                      <p className="truncate text-xs text-muted">Shared by {d.isOwner ? "you" : d.owner?.name}</p>
                    </div>
                    <Badge color={meta.badge}>{meta.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {ws.isOwner ? (
          <button type="button" onClick={deleteWorkspace} className="btn-outline text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            <IconTrash width={16} height={16} /> Delete workspace
          </button>
        ) : (
          <button type="button" onClick={leave} className="btn-outline text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            Leave workspace
          </button>
        )}
      </div>
    </div>
  );
}
