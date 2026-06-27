// FLOW: Storefront combos list (/store/combos). Grid of bundle cards. Public.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Spinner, EmptyState, Badge } from "../../components/ui.jsx";
import { rupees } from "../../lib/storeCategories.js";

export default function CombosList() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/combos").then(({ data }) => setCombos(data.combos || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-16"><Spinner size={24} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">Combo packs</h1>
        <p className="mt-1 text-sm text-muted">Bundles of assignments, papers & books — at a lower price.</p>
      </div>
      {combos.length === 0 ? (
        <EmptyState title="No combos yet" subtitle="Check back soon." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((c) => (
            <Link key={c.id} to={`/store/combos/${c.id}`} className="material-card group">
              {c.coverUrl ? (
                <img src={c.coverUrl} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 grid h-32 w-full place-items-center rounded-lg bg-store-50 text-store-600 dark:bg-store-950/40">
                  <span className="store-pill">{c.resourceCount} items</span>
                </div>
              )}
              <p className="flex-1 font-semibold text-ink group-hover:text-store-700 dark:group-hover:text-store-300">{c.title}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-ink">{c.price > 0 ? rupees(c.price) : "Free"}</span>
                  {c.savings > 0 && c.originalTotal > c.price && (
                    <span className="text-sm text-muted line-through">{rupees(c.originalTotal)}</span>
                  )}
                </div>
                {c.savings > 0 ? (
                  <span className="store-pill bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Save {rupees(c.savings)}</span>
                ) : (
                  <Badge color="gray">{c.resourceCount} items</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
