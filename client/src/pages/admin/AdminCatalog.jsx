// FLOW: Admin catalog manager. Manages Universities → Programs → Courses via /api/admin/catalog/*.
// The active sub-section comes from the route param (/admin/catalog/:section).

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner, Badge, PageHeader, EmptyState } from "../../components/ui.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { IconPlus, IconTrash } from "../../components/icons.jsx";

const SECTIONS = {
  universities: { title: "Universities", subtitle: "Top level of the catalog (IGNOU, DU SOL…)" },
  programs: { title: "Programs", subtitle: "Courses/degrees under a university (BCA, MCA…)" },
  courses: { title: "Courses", subtitle: "Subjects with codes (BCS-011…) under a program" },
};

export default function AdminCatalog() {
  const { section: sectionParam = "universities" } = useParams();
  const section = SECTIONS[sectionParam] ? sectionParam : "universities";
  const { title, subtitle } = SECTIONS[section];
  const confirm = useConfirm();
  const { toast } = useToast();

  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selUni, setSelUni] = useState("");
  const [selProg, setSelProg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});

  // Universities are needed in every section (for the cascading pickers).
  useEffect(() => {
    api.get("/admin/catalog/universities").then(({ data }) => setUniversities(data.universities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selUni) { setPrograms([]); return; }
    api.get("/admin/catalog/programs", { params: { universityId: selUni } })
      .then(({ data }) => setPrograms(data.programs || [])).catch(() => {});
  }, [selUni]);

  useEffect(() => {
    if (!selProg) { setCourses([]); return; }
    api.get("/admin/catalog/courses", { params: { programId: selProg } })
      .then(({ data }) => setCourses(data.courses || [])).catch(() => {});
  }, [selProg]);

  function reloadUniversities() {
    return api.get("/admin/catalog/universities").then(({ data }) => setUniversities(data.universities || []));
  }
  function reloadPrograms() {
    if (!selUni) return Promise.resolve();
    return api.get("/admin/catalog/programs", { params: { universityId: selUni } }).then(({ data }) => setPrograms(data.programs || []));
  }
  function reloadCourses() {
    if (!selProg) return Promise.resolve();
    return api.get("/admin/catalog/courses", { params: { programId: selProg } }).then(({ data }) => setCourses(data.courses || []));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (section === "universities") {
        await api.post("/admin/catalog/universities", form);
        await reloadUniversities();
      } else if (section === "programs") {
        if (!selUni) throw new Error("Pick a university first.");
        await api.post("/admin/catalog/programs", { ...form, universityId: selUni });
        await reloadPrograms();
      } else {
        if (!selProg) throw new Error("Pick a program first.");
        await api.post("/admin/catalog/courses", { ...form, programId: selProg });
        await reloadCourses();
      }
      setForm({});
      toast("Added", "success");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove(kind, id) {
    const ok = await confirm({ title: "Delete?", message: "This cannot be undone.", confirmText: "Delete", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/catalog/${kind}/${id}`);
      if (kind === "universities") await reloadUniversities();
      else if (kind === "programs") await reloadPrograms();
      else await reloadCourses();
      toast("Deleted", "success");
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      {error && <Alert>{error}</Alert>}

      {/* Cascading pickers */}
      {(section === "programs" || section === "courses") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">University</label>
            <select className="input" value={selUni} onChange={(e) => { setSelUni(e.target.value); setSelProg(""); }}>
              <option value="">— select —</option>
              {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          {section === "courses" && (
            <div>
              <label className="label">Program</label>
              <select className="input" value={selProg} onChange={(e) => setSelProg(e.target.value)} disabled={!selUni}>
                <option value="">— select —</option>
                {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
        {section === "courses" && (
          <input className="input uppercase" placeholder="Code (e.g. BCS-011)" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        )}
        <input className="input" placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        {section === "programs" && (
          <select className="input" value={form.level || ""} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="">Level (optional)</option>
            <option value="UG">UG</option>
            <option value="PG">PG</option>
            <option value="Diploma">Diploma</option>
            <option value="Certificate">Certificate</option>
          </select>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner /> : <><IconPlus width={16} height={16} /> Add {section.slice(0, -1)}</>}
          </button>
        </div>
      </form>

      {/* Lists */}
      {section === "universities" && (
        <ul className="space-y-2">
          {universities.length === 0 && <EmptyState title="No universities yet" />}
          {universities.map((u) => (
            <li key={u._id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="flex items-center gap-2">
                <span className="font-medium text-ink">{u.name}</span>
                {!u.isActive && <Badge color="amber">hidden</Badge>}
                <span className="text-xs text-muted">/{u.slug}</span>
              </span>
              <button onClick={() => remove("universities", u._id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {section === "programs" && selUni && (
        <ul className="space-y-2">
          {programs.length === 0 && <EmptyState title="No programs in this university" />}
          {programs.map((p) => (
            <li key={p._id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="flex items-center gap-2"><span className="font-medium text-ink">{p.name}</span>{p.level && <Badge color="gray">{p.level}</Badge>}</span>
              <button onClick={() => remove("programs", p._id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {section === "courses" && selProg && (
        <ul className="space-y-2">
          {courses.length === 0 && <EmptyState title="No courses in this program" />}
          {courses.map((c) => (
            <li key={c._id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="flex items-center gap-2"><Badge color="brand">{c.code}</Badge><span className="font-medium text-ink">{c.name}</span></span>
              <button onClick={() => remove("courses", c._id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
