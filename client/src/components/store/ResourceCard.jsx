// FLOW: Storefront product card. Shows a resource with price + Add-to-cart. Used by category,
// course, and search grids. Add-to-cart works logged-out (cart is local); login is required
// only at checkout/download.

import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { Badge } from "../ui.jsx";
import { IconCart, IconCheck, IconDownload } from "../icons.jsx";
import { typeLabel, rupees } from "../../lib/storeCategories.js";

export default function ResourceCard({ r }) {
  const { add, has } = useCart();
  const inCart = has(r.id);

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
    });
  }

  return (
    <Link to={`/resources/${r.id}`} className="material-card group">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color="gray">{typeLabel(r.resourceType)}</Badge>
        {r.year && <Badge color="gray">{r.year}</Badge>}
        {r.courseCode && <span className="store-pill">{r.courseCode}</span>}
      </div>
      <p className="mt-2 line-clamp-2 flex-1 font-semibold text-ink group-hover:text-store-700 dark:group-hover:text-store-300">
        {r.title}
      </p>
      <div className="mt-3 flex items-center justify-between">
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
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted"><IconDownload width={13} height={13} /> Download</span>
        )}
      </div>
    </Link>
  );
}
