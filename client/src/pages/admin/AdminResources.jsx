// FLOW: Admin resources manager. Uploads/edits/deletes sellable resources via /api/admin/resources
// (multipart). Resources attach to a Course (cascading university → program → course picker).

import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner, Badge, PageHeader, EmptyState } from "../../components/ui.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { IconTrash, IconUpload } from "../../components/icons.jsx";

const RESOURCE_TYPES = [
  ["question_paper", "Question paper"],
  ["solved_assignment", "Solved assignment"],
  ["assignment", "Assignment"],
  ["book", "Book"],
  ["guide", "Guide"],
  ["notes", "Notes"],
  ["project", "Project"],
  ["synopsis", "Synopsis"],
];

const blank = { title: "", description: "", resourceType: "question_paper", year: "", session: "", isPaid: false, priceRupees: "" };

export default function AdminResources() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selUni, setSelUni] = useState("");
  const [selProg, setSelProg] = useState("");
  const [courseId, setCourseId] = useState("");
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/admin/catalog/universities").then(({ data }) => setUniversities(data.universities || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!selUni) { setPrograms([]); return; }
    api.get("/admin/catalog/programs", { params: { universityId: selUni } }).then(({ data }) => setPrograms(data.programs || [])).catch(() => {});
  }, [selUni]);
  useEffect(() => {
    if (!selProg) { setCourses([]); return; }
    api.get("/admin/catalog/courses", { params: { programId: selProg } }).then(({ data }) => setCourses(data.courses || [])).catch(() => {});
  }, [selProg]);
  useEffect(() => {
    if (!courseId) { setResources([]); return; }
    api.get("/admin/resources", { params: { courseId } }).then(({ data }) => setResources(data.resources || [])).catch(() => {});
  }, [courseId]);

  function reloadResources() {
    if (!courseId) return Promise.resolve();
    return api.get("/admin/resources", { params: { courseId } }).then(({ data }) => setResources(data.resources || []));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!courseId) { setError("Pick a course first."); return; }
    if (!file) { setError("Choose a file to upload."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("courseId", courseId);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("resourceType", form.resourceType);
      fd.append("year", form.year);
      fd.append("session", form.session);
      fd.append("isPaid", String(form.isPaid));
      if (form.isPaid) fd.append("price", String(Math.round(Number(form.priceRupees || 0) * 100)));
      fd.append("file", file);
      await api.post("/admin/resources", fd);
      setForm(blank);
      setFile(null);
      await reloadResources();
      toast("Resource uploaded", "success");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const ok = await confirm({ title: "Delete resource?", message: "The file will be removed too.", confirmText: "Delete", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/resources/${id}`);
      await reloadResources();
      toast("Deleted", "success");
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Resources" subtitle="Upload question papers, assignments, books & guides to sell or share" />
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">University</label>
          <select className="input" value={selUni} onChange={(e) => { setSelUni(e.target.value); setSelProg(""); setCourseId(""); }}>
            <option value="">— select —</option>
            {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Program</label>
          <select className="input" value={selProg} onChange={(e) => { setSelProg(e.target.value); setCourseId(""); }} disabled={!selUni}>
            <option value="">— select —</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Course</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!selProg}>
            <option value="">— select —</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
      </div>

      {courseId && (
        <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="input" value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}>
            {RESOURCE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input" placeholder="Year (e.g. 2024)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input className="input" placeholder="Session (e.g. June 2024)" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} /> Paid resource
          </label>
          {form.isPaid && (
            <input className="input" type="number" min="1" step="1" placeholder="Price (₹)" value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: e.target.value })} />
          )}
          <div className="sm:col-span-2">
            <label className="label">File (PDF / Word / PPT, max 30MB)</label>
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <><IconUpload width={16} height={16} /> Upload resource</>}
            </button>
          </div>
        </form>
      )}

      {courseId && (
        <ul className="space-y-2">
          {resources.length === 0 && <EmptyState title="No resources for this course yet" />}
          {resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{r.title}</span>
                <Badge color="gray">{r.resourceType.replace(/_/g, " ")}</Badge>
                {r.year && <Badge color="gray">{r.year}</Badge>}
                {r.isPaid ? <Badge color="brand">₹{(r.price / 100).toFixed(0)}</Badge> : <Badge color="green">Free</Badge>}
                {!r.isActive && <Badge color="amber">hidden</Badge>}
                <span className="text-xs text-muted">{r.downloadCount} downloads</span>
              </span>
              <button onClick={() => remove(r.id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
