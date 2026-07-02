// FLOW: Storefront results grid. Fetches /catalog/resources with the given params and renders
// a paginated grid of ResourceCards with a result count. Shared by category, search, and course pages.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { EmptyState, MaterialCardSkeleton } from "../ui.jsx";
import { IconSearch } from "../icons.jsx";
import ResourceCard from "./ResourceCard.jsx";
import { StaggerReveal, StaggerItem } from "../motion.jsx";

export default function ResultsGrid({ params, emptyTitle = "No resources found" }) {
  const [resources, setResources] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Serialize params so the effect re-runs when filters change.
  const key = JSON.stringify(params);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.get("/catalog/resources", { params: { ...params, page: 1, limit: 12 } })
      .then(({ data }) => {
        setResources(data.resources || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => { setResources([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const next = page + 1;
    api.get("/catalog/resources", { params: { ...params, page: next, limit: 12 } }).then(({ data }) => {
      setResources((prev) => [...prev, ...(data.resources || [])]);
      setPage(next);
    });
  }

  // Skeleton grid (same columns) instead of a centered spinner, so the page doesn't blank/jump.
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <MaterialCardSkeleton key={i} />)}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={IconSearch}
        title={emptyTitle}
        subtitle="Try another filter, or browse everything in the store."
        action={<Link to="/store" className="btn-outline">Browse all material</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {total > 0 && (
        <p className="text-sm text-muted">{total.toLocaleString("en-IN")} {total === 1 ? "result" : "results"}</p>
      )}
      <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map((r) => (
          <StaggerItem key={r.id} className="h-full">
            <ResourceCard r={r} />
          </StaggerItem>
        ))}
      </StaggerReveal>
      {page < totalPages && (
        <div className="text-center">
          <button type="button" onClick={loadMore} className="btn-outline">Load more</button>
        </div>
      )}
    </div>
  );
}
