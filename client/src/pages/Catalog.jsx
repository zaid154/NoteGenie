// FLOW: Student catalog browse. Cascading University → Program → Course picker (public
// /api/catalog/*). Selecting a course links to its resources page.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconLayers, IconChevronRight } from "../components/icons.jsx";

export default function Catalog() {
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [uni, setUni] = useState(null);
  const [prog, setProg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/universities").then(({ data }) => setUniversities(data.universities || [])).finally(() => setLoading(false));
  }, []);

  function pickUni(u) {
    setUni(u); setProg(null); setCourses([]);
    api.get(`/catalog/universities/${u._id}/programs`).then(({ data }) => setPrograms(data.programs || []));
  }
  function pickProg(p) {
    setProg(p);
    api.get(`/catalog/programs/${p._id}/courses`).then(({ data }) => setCourses(data.courses || []));
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Study material catalog</h1>
        <p className="mt-1 text-sm text-muted">Browse question papers, solved assignments, books & guides by university and course.</p>
      </div>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <button onClick={() => { setUni(null); setProg(null); }} className="hover:text-ink">All universities</button>
        {uni && <><IconChevronRight width={14} height={14} /><button onClick={() => setProg(null)} className="hover:text-ink">{uni.name}</button></>}
        {prog && <><IconChevronRight width={14} height={14} /><span className="text-ink">{prog.name}</span></>}
      </div>

      {!uni && (
        <div className="grid gap-3 sm:grid-cols-2">
          {universities.length === 0 && <EmptyState title="No universities yet" subtitle="Check back soon." />}
          {universities.map((u) => (
            <button key={u._id} onClick={() => pickUni(u)} className="flex items-center gap-3 rounded-xl border border-line p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><IconLayers width={18} height={18} /></span>
              <span><span className="block font-semibold text-ink">{u.name}</span>{u.shortName && <span className="block text-xs text-muted">{u.shortName}</span>}</span>
            </button>
          ))}
        </div>
      )}

      {uni && !prog && (
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.length === 0 && <EmptyState title="No programs yet" />}
          {programs.map((p) => (
            <button key={p._id} onClick={() => pickProg(p)} className="flex items-center justify-between rounded-xl border border-line p-4 text-left transition hover:border-indigo-300">
              <span><span className="block font-semibold text-ink">{p.name}</span>{p.level && <Badge color="gray">{p.level}</Badge>}</span>
              <IconChevronRight width={16} height={16} className="text-muted" />
            </button>
          ))}
        </div>
      )}

      {prog && (
        <ul className="space-y-2">
          {courses.length === 0 && <EmptyState title="No courses yet" />}
          {courses.map((c) => (
            <li key={c._id}>
              <Link to={`/catalog/courses/${c._id}`} className="flex items-center justify-between rounded-xl border border-line p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30">
                <span className="flex items-center gap-2"><Badge color="brand">{c.code}</Badge><span className="font-medium text-ink">{c.name}</span></span>
                <IconChevronRight width={16} height={16} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
