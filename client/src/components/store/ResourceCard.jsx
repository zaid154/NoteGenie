// FLOW: Storefront product card. Shows a resource with cover, trust signals (downloads/pages/size),
// price + Add-to-cart. Used by category, course, search and home grids. Add-to-cart works
// logged-out (cart is local); login is required only at checkout/download.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { Badge } from "../ui.jsx";
import { IconCart, IconCheck, IconDownload, IconFlame, IconHeart } from "../icons.jsx";
import { typeLabel, rupees } from "../../lib/storeCategories.js";
import { isSaved, toggleSaved } from "../../lib/savedResources.js";
import { typeVisual, DOT_PATTERN } from "../../lib/resourceVisuals.js";

// Downloads at/above this count earn a "Popular" chip — a zero-backend social-proof signal.
const POPULAR_THRESHOLD = 200;

export default function ResourceCard({ r }) {
  const { add, has } = useCart();
  const inCart = has(r.id);
  // Only surface a size once it's meaningful — avoids the ugly "0.0 MB" on tiny/missing files.
  const sizeMbNum = r.size ? r.size / 1024 / 1024 : 0;
  const sizeMb = sizeMbNum >= 0.1 ? sizeMbNum.toFixed(1) : null;
  const [saved, setSaved] = useState(() => isSaved(r.id));
  const visual = typeVisual(r.resourceType);
  const WatermarkIcon = visual.Icon;

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
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-surface/80 shadow-sm backdrop-blur transition-colors"
      >
        <IconHeart width={16} height={16} fill={saved ? "currentColor" : "none"} className={saved ? "text-red-500" : "text-muted"} />
      </button>
      {/* Cover — real preview if present, else a designed gradient cover (colour-coded by type,
          with a subtle dot texture + watermark + course code) so coverless cards still look
          intentional and premium. Wrapper clips the hover zoom so nothing spills. */}
      <div className="mb-3 h-40 w-full overflow-hidden rounded-xl">
        {r.previewUrl ? (
          <div className="relative h-full w-full">
            <img src={r.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent" />
          </div>
        ) : (
          <div style={{ background: visual.bg }} className="relative h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]">
            <div className="absolute inset-0 opacity-20" style={DOT_PATTERN} />
            <WatermarkIcon className="absolute -bottom-5 -right-4 text-white/15" width={104} height={104} />
            {r.courseCode ? (
              <div className="relative flex h-full flex-col justify-between p-3.5">
                <span className="inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {typeLabel(r.resourceType)}
                </span>
                <span className="font-display text-[1.7rem] leading-none tabular-nums text-white drop-shadow-sm">{r.courseCode}</span>
              </div>
            ) : (
              <div className="relative flex h-full flex-col items-center justify-center gap-2 p-3.5 text-center">
                <WatermarkIcon width={34} height={34} className="text-white/95" />
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {typeLabel(r.resourceType)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-[24px] flex-wrap items-center gap-1.5">
        {r.year && <Badge color="gray">{r.year}</Badge>}
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
            <span className="inline-flex items-center gap-1 tabular-nums">
              <IconDownload width={12} height={12} /> {r.downloadCount.toLocaleString("en-IN")} downloads
            </span>
          )}
          {r.pages ? <span>{r.pages} pages</span> : null}
          {sizeMb ? <span>{sizeMb} MB</span> : null}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-lg font-bold tabular-nums text-ink">
          {r.isPaid ? rupees(r.price) : <span className="text-store-700 dark:text-store-300">Free</span>}
        </span>
        {r.isPaid ? (
          <button
            type="button"
            onClick={addToCart}
            disabled={inCart}
            className={inCart ? "store-pill" : "btn-primary px-3 py-1.5 text-xs"}
          >
            {inCart ? <><IconCheck width={13} height={13} /> In cart</> : <><IconCart width={13} height={13} /> Add</>}
          </button>
        ) : (
          <span className="store-pill">
            <IconDownload width={13} height={13} /> Free download
          </span>
        )}
      </div>
    </Link>
  );
}
