// FLOW: Storefront category page (/store/:category). Resolves the category slug to its resource
// types and shows a filterable results grid. Public.

import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { api } from "../../api/client.js";
import ResultsGrid from "../../components/store/ResultsGrid.jsx";
import { categoryBySlug } from "../../lib/storeCategories.js";

export default function StoreCategory() {
  const { category } = useParams();
  const cat = categoryBySlug(category);
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [uni, setUni] = useState("");
  const [programId, setProgramId] = useState("");

  useEffect(() => {
    api.get("/catalog/universities").then((r) => setUniversities(r.data.universities || [])).catch(() => {});
    api.get("/catalog/programs/flat").then((r) => setPrograms(r.data.programs || [])).catch(() => {});
  }, []);

  if (!cat) return <Navigate to="/store" replace />;

  const filteredPrograms = uni ? programs.filter((p) => String(p.universityId) === String(uni)) : programs;
  const params = { resourceType: cat.types.join(",") };
  if (programId) params.programId = programId;
  else if (uni) params.universityId = uni;

  const CatIcon = cat.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3.5">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${cat.tint || "bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"}`}>
            {CatIcon ? <CatIcon width={24} height={24} /> : null}
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-ink lg:text-4xl">{cat.label}</h1>
            <p className="mt-1 text-sm text-muted">Filter by university and degree to find your study material.</p>
          </div>
        </div>
      </div>

      <div className="card-solid p-4 bg-surface/90 shadow-soft border-line">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <div>
            <label className="label text-xs">University</label>
            <select className="input text-sm" value={uni} onChange={(e) => { setUni(e.target.value); setProgramId(""); }}>
              <option value="">All universities</option>
              {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Degree / Program</label>
            <select className="input text-sm" value={programId} onChange={(e) => setProgramId(e.target.value)}>
              <option value="">All degrees</option>
              {filteredPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}{p.universityShort ? ` — ${p.universityShort}` : ""}</option>)}
            </select>
          </div>
        </div>
      </div>

      <ResultsGrid params={params} emptyTitle={`No ${cat.label.toLowerCase()} yet`} />
    </div>
  );
}
