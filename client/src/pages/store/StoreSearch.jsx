// FLOW: Storefront search results (/store/search?q=&universityId=&programId=&category=&year=).
// Builds resource search params from the query string + a sort/free-only toolbar and renders a
// results grid. Public. Default sort is "free_first" so free material is surfaced first.

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ResultsGrid from "../../components/store/ResultsGrid.jsx";
import { categoryBySlug } from "../../lib/storeCategories.js";

const SORT_OPTIONS = [
  { value: "free_first", label: "Recommended (free first)" },
  { value: "popular", label: "Most popular" },
  { value: "latest", label: "Newest" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
];

export default function StoreSearch() {
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const cat = categoryBySlug(sp.get("category"));

  const [sort, setSort] = useState("free_first");
  const [freeOnly, setFreeOnly] = useState(false);

  const params = { sort };
  if (q) params.q = q;
  if (sp.get("universityId")) params.universityId = sp.get("universityId");
  if (sp.get("programId")) params.programId = sp.get("programId");
  if (sp.get("courseId")) params.courseId = sp.get("courseId");
  if (sp.get("year")) params.year = sp.get("year");
  if (cat) params.resourceType = cat.types.join(",");
  else if (sp.get("resourceType")) params.resourceType = sp.get("resourceType");
  if (freeOnly) params.price = "free";

  const label = q ? `Results for “${q}”` : cat ? cat.label : "Search results";

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl leading-tight text-ink">{label}</h1>

      {/* Sort + free-only toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">Sort</span>
          <select
            className="input py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort results"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className={
            freeOnly
              ? "rounded-lg bg-store-600 px-3 py-2 text-sm font-semibold text-white"
              : "rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:border-store-300 hover:text-store-700 dark:hover:text-store-300"
          }
        >
          Free only
        </button>
      </div>

      <ResultsGrid params={params} emptyTitle="No matching resources" />
    </div>
  );
}
