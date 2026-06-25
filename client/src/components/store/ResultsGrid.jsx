// FLOW: Storefront results grid. Fetches /catalog/resources with the given params and renders
// a paginated grid of ResourceCards. Shared by category, search, and course pages.

import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { Spinner, EmptyState } from "../ui.jsx";
import ResourceCard from "./ResourceCard.jsx";

export default function ResultsGrid({ params, emptyTitle = "No resources found" }) {
  const [resources, setResources] = useState([]);
  const [page, setPage] = useState(1);
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
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const next = page + 1;
    api.get("/catalog/resources", { params: { ...params, page: next, limit: 12 } }).then(({ data }) => {
      setResources((prev) => [...prev, ...(data.resources || [])]);
      setPage(next);
    });
  }

  if (loading) return <div className="grid place-items-center py-16"><Spinner size={24} /></div>;
  if (resources.length === 0) return <EmptyState title={emptyTitle} subtitle="Check back soon or try another filter." />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map((r) => <ResourceCard key={r.id} r={r} />)}
      </div>
      {page < totalPages && (
        <div className="text-center">
          <button type="button" onClick={loadMore} className="btn-outline">Load more</button>
        </div>
      )}
    </div>
  );
}
