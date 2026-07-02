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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-ink lg:text-4xl">{cat.label}</h1>
        <p className="mt-1 text-sm text-muted">Filter by university and degree to find your material.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <select className="input" value={uni} onChange={(e) => { setUni(e.target.value); setProgramId(""); }}>
          <option value="">All universities</option>
          {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <select className="input" value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">All degrees</option>
          {filteredPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}{p.universityShort ? ` — ${p.universityShort}` : ""}</option>)}
        </select>
      </div>

      <ResultsGrid params={params} emptyTitle={`No ${cat.label.toLowerCase()} yet`} />
    </div>
  );
}
