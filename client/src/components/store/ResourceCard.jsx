// FLOW: Storefront product card. Shows a resource with cover, trust signals (downloads/pages/size),
// price + Add-to-cart. Used by category, course, search and home grids. Add-to-cart works
// logged-out (cart is local); login is required only at checkout/download.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { Badge } from "../ui.jsx";
import { IconCart, IconCheck, IconDownload, IconDoc, IconFlame, IconHeart } from "../icons.jsx";
import { typeLabel, rupees } from "../../lib/storeCategories.js";
import { isSaved, toggleSaved } from "../../lib/savedResources.js";

// Downloads at/above this count earn a "Popular" chip — a zero-backend social-proof signal.
const POPULAR_THRESHOLD = 200;

export default function ResourceCard({ r }) {
  const { add, has } = useCart();
  const inCart = has(r.id);
  const sizeMb = r.size ? (r.size / 1024 / 1024).toFixed(1) : null;
  const [saved, setSaved] = useState(() => isSaved(r.id));

  function addToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    add({
      kind: "resource",
      id: r.id,
      title: r.title,
      price: r.price,
      isPaid: r.isPaid,
      resourceType: r.resourceType,
      courseCode: r.courseCode,
      productType: r.productType || "digital",
    });
  }

  function toggleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleSaved(r));
  }

  return (
    <Link to={`/resources/${r.id}`} className="material-card group relative">
      {/* Wishlist toggle */}
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save for later"}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 dark:bg-slate-900/80"
      >
        <IconHeart width={16} height={16} fill={saved ? "currentColor" : "none"} className={saved ? "text-red-500" : "text-muted"} />
      </button>
      {/* Cover — real preview if present, else a typed placeholder so the grid isn't flat text */}
      {r.previewUrl ? (
        <img src={r.previewUrl} alt="" loading="lazy" className="mb-3 h-32 w-full rounded-lg object-cover" />
      ) : (
        <div className="mb-3 grid h-32 w-full place-items-center rounded-lg bg-store-50 text-store-600 dark:bg-store-950/40 dark:text-store-300">
          <IconDoc width={30} height={30} />
        </div>
      )}

      <div className="flex min-h-[28px] flex-wrap items-center gap-1.5">
        <Badge color="gray">{typeLabel(r.resourceType)}</Badge>
        {r.year && <Badge color="gray">{r.year}</Badge>}
        {r.courseCode && <span className="store-pill max-w-[8rem] truncate">{r.courseCode}</span>}
        {r.downloadCount >= POPULAR_THRESHOLD && (
          <span className="inline-flex items-center gap-1 rounded-full bg-storeaccent-100 px-2 py-0.5 text-[11px] font-semibold text-storeaccent-600 dark:bg-store-950 dark:text-storeaccent-400">
            <IconFlame width={11} height={11} /> Popular
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.75rem] font-semibold text-ink group-hover:text-store-700 dark:group-hover:text-store-300">
        {r.title}
      </p>

      {/* Trust row — uses data the API already returns; the missing piece that read as a template */}
      {(r.downloadCount > 0 || r.pages || sizeMb) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {r.downloadCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <IconDownload width={12} height={12} /> {r.downloadCount.toLocaleString("en-IN")} downloads
            </span>
          )}
          {r.pages ? <span>{r.pages} pages</span> : null}
          {sizeMb ? <span>{sizeMb} MB</span> : null}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-lg font-bold text-ink">
          {r.isPaid ? rupees(r.price) : <span className="text-store-700 dark:text-store-300">Free</span>}
        </span>
        {r.isPaid ? (
          <button
            type="button"
            onClick={addToCart}
            disabled={inCart}
            className={inCart ? "store-pill" : "store-btn-accent px-3 py-1.5 text-xs"}
          >
            {inCart ? <><IconCheck width={13} height={13} /> In cart</> : <><IconCart width={13} height={13} /> Add</>}
          </button>
        ) : (
          <span className="store-pill bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:group-hover:bg-emerald-900/60">
            <IconDownload width={13} height={13} /> Free download
          </span>
        )}
      </div>
    </Link>
  );
}
