// FLOW: Storefront combo detail (/store/combos/:id). Shows the bundle, included resources, and
// savings. Add-to-cart (kind:'combo') or Buy now (add + go to cart). Public.

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { useCart } from "../../context/CartContext.jsx";
import { Spinner, EmptyState, Badge } from "../../components/ui.jsx";
import { IconArrowLeft, IconCart, IconCheck, IconCards } from "../../components/icons.jsx";
import { rupees, typeLabel } from "../../lib/storeCategories.js";
import { DOT_PATTERN, COMBO_VISUAL } from "../../lib/resourceVisuals.js";

export default function ComboDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, has } = useCart();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/catalog/combos/${id}`).then(({ data }) => setCombo(data.combo)).catch(() => setCombo(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;
  if (!combo) return <div className="mx-auto max-w-3xl"><EmptyState title="Combo not found" /></div>;

  const inCart = has(combo.id);
  const cartItem = { kind: "combo", id: combo.id, title: combo.title, price: combo.price, isPaid: combo.price > 0 };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/store/combos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-store-700">
        <IconArrowLeft width={16} height={16} /> All combos
      </Link>

      <div className="panel space-y-4 p-6 shadow-soft">
        {combo.coverUrl ? (
          <img src={combo.coverUrl} alt="" className="h-48 w-full rounded-xl object-cover" />
        ) : (
          <div style={{ background: COMBO_VISUAL.bg }} className="relative h-40 w-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 opacity-20" style={DOT_PATTERN} />
            <IconCards className="absolute -bottom-6 -right-4 text-white/15" width={140} height={140} />
            <div className="relative flex h-full flex-col justify-between p-5">
              <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                Combo pack
              </span>
              <span className="font-display text-3xl leading-none text-white drop-shadow-sm">{combo.resources.length} items · save more</span>
            </div>
          </div>
        )}
        <h1 className="font-display text-3xl leading-tight text-ink">{combo.title}</h1>
        {combo.description && <p className="text-muted">{combo.description}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold text-ink">{rupees(combo.price)}</span>
          {combo.savings > 0 && (
            <span className="text-sm text-muted">
              <span className="line-through">{rupees(combo.originalTotal)}</span>{" "}
              <span className="store-pill">Save {rupees(combo.savings)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={() => (inCart ? navigate("/store/cart") : add(cartItem))} className="btn-outline flex-1 py-3">
            {inCart ? <><IconCheck width={16} height={16} /> Go to cart</> : <><IconCart width={16} height={16} /> Add to cart</>}
          </button>
          <button onClick={() => { if (!inCart) add(cartItem); navigate("/store/cart"); }} className="store-btn-accent flex-1 py-3">
            Buy now · {rupees(combo.price)}
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">What's included ({combo.resources.length})</h2>
        <ul className="space-y-2">
          {combo.resources.map((r) => (
            <li key={r.id}>
              <Link to={`/resources/${r.id}`} className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 hover:border-store-300">
                <span className="flex items-center gap-2">
                  <Badge color="gray">{typeLabel(r.resourceType)}</Badge>
                  <span className="font-medium text-ink">{r.title}</span>
                </span>
                {r.courseCode && <span className="store-pill">{r.courseCode}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
