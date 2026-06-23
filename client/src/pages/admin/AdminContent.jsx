// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminContent). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import {
  Alert,
  Badge,
  Spinner,
  PageHeader,
  TableSkeleton,
  EmptyState,
  SectionTitle,
} from "../../components/ui.jsx";
import AdminTableToolbar from "../../components/AdminTableToolbar.jsx";
import { IconTrash, IconDoc, IconEye } from "../../components/icons.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const SECTIONS = {
  materials: { title: "Materials", subtitle: "Uploaded PDFs and links across all users." },
  quizzes: { title: "Quizzes", subtitle: "Generated quizzes and their owners." },
  chat: { title: "Chat", subtitle: "Tutor messages from all users." },
  shares: { title: "Shares", subtitle: "Active public share links." },
};

export default function AdminContent() {
  const { section: sectionParam = "materials" } = useParams();
  const invalidSection = sectionParam && !SECTIONS[sectionParam];
  const section = SECTIONS[sectionParam] ? sectionParam : "materials";
  const { title, subtitle } = SECTIONS[section];
  const tab = section;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [items, setItems] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const { toast } = useToast();

  async function load(p = page) {
    setLoading(true);
    setError("");
    try {
      let data;
      if (tab === "materials") {
        ({ data } = await api.get("/admin/documents", {
          params: { page: p, limit: 20, search: search || undefined, sourceType: sourceFilter || undefined },
        }));
        setItems(data.documents);
        setTotalPages(data.totalPages || 1);
      } else if (tab === "quizzes") {
        ({ data } = await api.get("/admin/quizzes", {
          params: { page: p, limit: 20, search: search || undefined },
        }));
        setItems(data.quizzes);
        setTotalPages(data.totalPages || 1);
      } else if (tab === "chat") {
        ({ data } = await api.get("/admin/chat", {
          params: { page: p, limit: 20, search: search || undefined },
        }));
        setItems(data.messages);
        setTotalPages(data.totalPages || 1);
      } else {
        ({ data } = await api.get("/admin/shares", { params: { page: p, limit: 20 } }));
        setItems(data.shares);
        setTotalPages(data.totalPages || 1);
      }
      setPage(data.page || p);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [tab, search, sourceFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(page), 250);
    return () => clearTimeout(t);
  }, [tab, page, search, sourceFilter]);

  async function removeMaterial(id) {
    const ok = await confirm({ title: "Delete material?", message: "Quizzes and chat for this material will be removed.", confirmText: "Delete", danger: true });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/documents/${id}`);
      setItems((d) => d.filter((x) => x.id !== id));
      toast("Material deleted", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  async function removeQuiz(id) {
    const ok = await confirm({ title: "Delete quiz?", confirmText: "Delete", danger: true });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/quizzes/${id}`);
      setItems((d) => d.filter((x) => x.id !== id));
      toast("Quiz deleted", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  async function removeChat(id) {
    setDeleting(id);
    try {
      await api.delete(`/admin/chat/${id}`);
      setItems((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  async function revokeShare(id) {
    const ok = await confirm({ title: "Revoke share link?", confirmText: "Revoke", danger: true });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/shares/${id}`);
      setItems((d) => d.filter((x) => x.id !== id));
      toast("Share revoked", "success");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  async function openView(id) {
    try {
      const { data } = await api.get(`/admin/documents/${id}`);
      setViewDoc(data.document);
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function openEdit(doc) {
    setEditDoc({ id: doc.id, title: doc.title, folder: doc.folder || "", tags: (doc.tags || []).join(", "), shareEnabled: doc.shareEnabled });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/documents/${editDoc.id}`, {
        title: editDoc.title,
        folder: editDoc.folder,
        tags: editDoc.tags.split(",").map((t) => t.trim()).filter(Boolean),
        shareEnabled: editDoc.shareEnabled,
      });
      toast("Material updated", "success");
      setEditDoc(null);
      load(page);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {invalidSection && <Navigate to="/admin/content/materials" replace />}
      <PageHeader title={title} subtitle={subtitle} />
      {error && <Alert>{error}</Alert>}

      <AdminTableToolbar
        search={tab !== "shares" ? search : ""}
        onSearchChange={tab !== "shares" ? (v) => setSearch(v) : undefined}
        searchPlaceholder="Search…"
        filters={
          tab === "materials"
            ? [{
                id: "source",
                value: sourceFilter,
                onChange: setSourceFilter,
                options: [
                  { value: "", label: "All types" },
                  { value: "pdf", label: "PDF" },
                  { value: "link", label: "Link" },
                ],
              }]
            : []
        }
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
      />

      {loading && !items.length ? (
        <TableSkeleton rows={5} cols={4} />
      ) : tab === "materials" ? (
        <div className="card divide-y divide-line overflow-hidden">
          {items.length === 0 ? (
            <EmptyState icon={IconDoc} title="No materials" subtitle="Uploads appear here." />
          ) : (
            items.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-ink/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-500 text-ink">{d.title}</p>
                    <Badge color={d.sourceType === "pdf" ? "brand" : "amber"}>{d.sourceType}</Badge>
                    {d.shareEnabled && <Badge color="green">Shared</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {d.user?.name} ({d.user?.email}) · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline text-sm" onClick={() => openView(d.id)}>
                    <IconEye width={14} height={14} /> View
                  </button>
                  <button type="button" className="btn-outline text-sm" onClick={() => openEdit(d)}>Edit</button>
                  <Link to={`/document/${d.id}`} className="btn-outline text-sm">Open</Link>
                  <button type="button" className="btn-outline text-sm text-red-600" disabled={deleting === d.id} onClick={() => removeMaterial(d.id)}>
                    {deleting === d.id ? <Spinner size={14} /> : <IconTrash width={14} height={14} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "quizzes" ? (
        <div className="card divide-y divide-line">
          {items.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-500">{q.title}</p>
                <p className="text-xs text-muted">{q.documentTitle} · {q.questionCount} questions · {q.user?.email}</p>
              </div>
              <button type="button" className="btn-outline text-red-600 text-sm" onClick={() => removeQuiz(q.id)} disabled={deleting === q.id}>
                Delete
              </button>
            </div>
          ))}
          {!items.length && <EmptyState compact title="No quizzes" />}
        </div>
      ) : tab === "chat" ? (
        <div className="card divide-y divide-line">
          {items.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <Badge color={m.role === "user" ? "brand" : "gray"}>{m.role}</Badge>
                <p className="mt-1 text-sm">{m.content}</p>
                <p className="mt-1 text-xs text-muted">{m.documentTitle} · {m.user?.email}</p>
              </div>
              <button type="button" className="btn-ghost text-red-500 p-2" onClick={() => removeChat(m.id)} disabled={deleting === m.id}>
                <IconTrash width={16} height={16} />
              </button>
            </div>
          ))}
          {!items.length && <EmptyState compact title="No messages" />}
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {items.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-500">{s.title}</p>
                <p className="text-xs text-muted">{s.user?.email} · /share/{s.shareToken?.slice(0, 8)}…</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/share/${s.shareToken}`} className="btn-outline text-sm" target="_blank">Open</Link>
                <button type="button" className="btn-outline text-red-600 text-sm" onClick={() => revokeShare(s.id)} disabled={deleting === s.id}>
                  Revoke
                </button>
              </div>
            </div>
          ))}
          {!items.length && <EmptyState compact title="No active shares" />}
        </div>
      )}

      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewDoc(null)}>
          <div className="card max-h-[80vh] max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <SectionTitle>{viewDoc.title}</SectionTitle>
            <p className="mt-2 text-sm text-muted">{viewDoc.summary}</p>
            <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas/50 p-4 text-xs">{viewDoc.notes?.slice(0, 3000)}</pre>
            <p className="mt-2 text-xs text-muted">{viewDoc.flashcards?.length || 0} flashcards</p>
            <button type="button" className="btn-outline mt-4" onClick={() => setViewDoc(null)}>Close</button>
          </div>
        </div>
      )}

      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditDoc(null)}>
          <form className="card w-full max-w-md space-y-4 p-6" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <SectionTitle>Edit material</SectionTitle>
            <input className="input" value={editDoc.title} onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })} required />
            <input className="input" placeholder="Folder" value={editDoc.folder} onChange={(e) => setEditDoc({ ...editDoc, folder: e.target.value })} />
            <input className="input" placeholder="Tags (comma separated)" value={editDoc.tags} onChange={(e) => setEditDoc({ ...editDoc, tags: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editDoc.shareEnabled} onChange={(e) => setEditDoc({ ...editDoc, shareEnabled: e.target.checked })} />
              Share enabled
            </label>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner /> : "Save"}</button>
              <button type="button" className="btn-outline" onClick={() => setEditDoc(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

