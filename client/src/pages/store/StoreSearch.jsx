// FLOW: Storefront search results (/store/search?q=&universityId=&programId=&category=&year=).
// Builds resource search params from the query string and renders a results grid. Public.

import { useSearchParams } from "react-router-dom";
import ResultsGrid from "../../components/store/ResultsGrid.jsx";
import { categoryBySlug } from "../../lib/storeCategories.js";

export default function StoreSearch() {
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const cat = categoryBySlug(sp.get("category"));

  const params = {};
  if (q) params.q = q;
  if (sp.get("universityId")) params.universityId = sp.get("universityId");
  if (sp.get("programId")) params.programId = sp.get("programId");
  if (sp.get("courseId")) params.courseId = sp.get("courseId");
  if (sp.get("year")) params.year = sp.get("year");
  if (cat) params.resourceType = cat.types.join(",");
  else if (sp.get("resourceType")) params.resourceType = sp.get("resourceType");

  const label = q ? `Results for “${q}”` : cat ? cat.label : "Search results";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{label}</h1>
      <ResultsGrid params={params} emptyTitle="No matching resources" />
    </div>
  );
}
