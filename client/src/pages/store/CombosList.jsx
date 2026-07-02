// FLOW: Storefront combos list (/store/combos). Grid of bundle cards. Public.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { Spinner, EmptyState, Badge } from "../../components/ui.jsx";
import { rupees } from "../../lib/storeCategories.js";
import { StaggerReveal, StaggerItem } from "../../components/motion.jsx";
import { IconCards } from "../../components/icons.jsx";
import { DOT_PATTERN, COMBO_VISUAL } from "../../lib/resourceVisuals.js";

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
        <h1 className="font-display text-3xl leading-tight text-ink lg:text-4xl">Combo packs</h1>
        <p className="mt-1 text-sm text-muted">Bundles of assignments, papers & books — at a lower price.</p>
      </div>
      {combos.length === 0 ? (
        <EmptyState title="No combos yet" subtitle="Check back soon." />
      ) : (
        <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((c) => (
            <StaggerItem key={c.id} className="h-full">
              <Link to={`/store/combos/${c.id}`} className="material-card group">
                <div className="mb-3 h-36 w-full overflow-hidden rounded-xl">
                  {c.coverUrl ? (
                    <div className="relative h-full w-full">
                      <img src={c.coverUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent" />
                    </div>
                  ) : (
                    <div style={{ background: COMBO_VISUAL.bg }} className="relative h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                      <div className="absolute inset-0 opacity-20" style={DOT_PATTERN} />
                      <IconCards className="absolute -bottom-5 -right-4 text-white/15" width={104} height={104} />
                      <div className="relative flex h-full flex-col justify-between p-3.5">
                        <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                          Combo pack
                        </span>
                        <span className="font-display text-[1.7rem] leading-none tabular-nums text-white drop-shadow-sm">{c.resourceCount} items</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="flex-1 font-semibold text-ink group-hover:text-store-700 dark:group-hover:text-store-300">{c.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold tabular-nums text-ink">{c.price > 0 ? rupees(c.price) : "Free"}</span>
                    {c.savings > 0 && c.originalTotal > c.price && (
                      <span className="text-sm tabular-nums text-muted line-through">{rupees(c.originalTotal)}</span>
                    )}
                  </div>
                  {c.savings > 0 ? (
                    <span className="store-pill bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Save {rupees(c.savings)}</span>
                  ) : (
                    <Badge color="gray">{c.resourceCount} items</Badge>
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
