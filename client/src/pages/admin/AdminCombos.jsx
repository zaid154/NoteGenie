// FLOW: Admin combos manager (/admin/combos, manage_combos). Create bundles by picking resources
// (cascading university → program → course), set a price, and list/delete combos.

import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner, Badge, PageHeader, EmptyState } from "../../components/ui.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { IconPlus, IconTrash, IconCheck } from "../../components/icons.jsx";

export default function AdminCombos() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [combos, setCombos] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [poolResources, setPoolResources] = useState([]);
  const [selUni, setSelUni] = useState("");
  const [selProg, setSelProg] = useState("");
  const [courseId, setCourseId] = useState("");
  const [picked, setPicked] = useState([]); // [{id, title}]
  const [form, setForm] = useState({ title: "", description: "", priceRupees: "", coverUrl: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reloadCombos() { return api.get("/admin/combos").then(({ data }) => setCombos(data.combos || [])); }

  useEffect(() => {
    reloadCombos().catch(() => {});
    api.get("/admin/catalog/universities").then(({ data }) => setUniversities(data.universities || [])).catch(() => {});
  }, []);
  useEffect(() => { if (selUni) api.get("/admin/catalog/programs", { params: { universityId: selUni } }).then(({ data }) => setPrograms(data.programs || [])); else setPrograms([]); }, [selUni]);
  useEffect(() => { if (selProg) api.get("/admin/catalog/courses", { params: { programId: selProg } }).then(({ data }) => setCourses(data.courses || [])); else setCourses([]); }, [selProg]);
  useEffect(() => { if (courseId) api.get("/admin/resources", { params: { courseId } }).then(({ data }) => setPoolResources(data.resources || [])); else setPoolResources([]); }, [courseId]);

  function togglePick(r) {
    setPicked((prev) => prev.some((p) => p.id === r.id) ? prev.filter((p) => p.id !== r.id) : [...prev, { id: r.id, title: r.title }]);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!picked.length) { setError("Pick at least one resource for the combo."); return; }
    setSaving(true);
    try {
      await api.post("/admin/combos", {
        title: form.title,
        description: form.description,
        coverUrl: form.coverUrl,
        price: Math.round(Number(form.priceRupees || 0) * 100),
        resourceIds: picked.map((p) => p.id),
      });
      setForm({ title: "", description: "", priceRupees: "", coverUrl: "" });
      setPicked([]);
      await reloadCombos();
      toast("Combo created", "success");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const ok = await confirm({ title: "Delete combo?", message: "This removes the bundle (not the resources).", confirmText: "Delete", danger: true });
    if (!ok) return;
    try { await api.delete(`/admin/combos/${id}`); await reloadCombos(); toast("Deleted", "success"); }
    catch (err) { setError(apiError(err)); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Combos" subtitle="Bundle resources into a discounted pack" />
      {error && <Alert>{error}</Alert>}

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Combo title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="input" type="number" min="0" placeholder="Price (₹)" value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: e.target.value })} required />
          <input className="input sm:col-span-2" placeholder="Cover image URL (optional)" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        {/* Resource picker */}
        <div className="rounded-xl border border-line p-4">
          <p className="mb-2 text-sm font-semibold text-ink">Add resources</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="input" value={selUni} onChange={(e) => { setSelUni(e.target.value); setSelProg(""); setCourseId(""); }}>
              <option value="">University</option>
              {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <select className="input" value={selProg} onChange={(e) => { setSelProg(e.target.value); setCourseId(""); }} disabled={!selUni}>
              <option value="">Program</option>
              {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!selProg}>
              <option value="">Course</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.code}</option>)}
            </select>
          </div>
          {poolResources.length > 0 && (
            <ul className="mt-3 space-y-1">
              {poolResources.map((r) => {
                const on = picked.some((p) => p.id === r.id);
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => togglePick(r)} className={`flex w-full items-center justify-between rounded-lg border p-2 text-left text-sm ${on ? "border-store-400 bg-store-50 dark:bg-store-950/40" : "border-line"}`}>
                      <span className="text-ink">{r.title}</span>
                      {on ? <IconCheck width={15} height={15} className="text-store-600" /> : <IconPlus width={15} height={15} className="text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {picked.map((p) => (
              <span key={p.id} className="store-pill">
                {p.title}
                <button type="button" onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))} className="ml-1.5 text-store-700">×</button>
              </span>
            ))}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner /> : <><IconPlus width={16} height={16} /> Create combo ({picked.length})</>}
        </button>
      </form>

      <ul className="space-y-2">
        {combos.length === 0 && <EmptyState title="No combos yet" />}
        {combos.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-line p-3">
            <span className="flex items-center gap-2">
              <span className="font-medium text-ink">{c.title}</span>
              <Badge color="brand">₹{(c.price / 100).toFixed(0)}</Badge>
              <Badge color="gray">{c.resourceCount} items</Badge>
              {!c.isActive && <Badge color="amber">hidden</Badge>}
            </span>
            <button onClick={() => remove(c.id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
