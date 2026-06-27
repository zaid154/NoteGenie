// FLOW: Student resource detail. Free → Download. Paid & not owned → Buy (Razorpay) / Add to cart.
// Paid & owned → Download. Ownership via /catalog/me/purchases. Shows a cover, a labelled spec
// list, trust signals, breadcrumbs, a mobile sticky buy bar, and "More from this course".

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconDownload, IconCoins, IconCart, IconCheck, IconChevronRight, IconLock, IconDoc } from "../components/icons.jsx";
import { loadRazorpayScript, downloadResourceFile } from "../lib/razorpay.js";
import { typeLabel, rupees, STORE_CATEGORIES } from "../lib/storeCategories.js";
import { recordView } from "../lib/recentlyViewed.js";
import ResourceCard from "../components/store/ResourceCard.jsx";

function fileFormat(r) {
  if (r.mime?.includes("pdf")) return "PDF";
  const ext = (r.fileName || "").split(".").pop();
  return ext && ext.length <= 5 ? ext.toUpperCase() : "";
}

export default function ResourceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add, has } = useCart();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    Promise.all([
      api.get(`/catalog/resources/${id}`).then((r) => r.data.resource),
      api.get("/catalog/me/purchases").then((r) => r.data.purchases || []).catch(() => []),
    ])
      .then(([res, purchases]) => {
        if (ignore) return;
        setResource(res);
        setOwned(purchases.some((p) => String(p.resource.id) === String(id)));
        recordView(res); // remember for "Recently viewed" / recommendations
      })
      .catch((e) => !ignore && setError(apiError(e)))
      .finally(() => !ignore && setLoading(false));
    return () => { ignore = true; };
  }, [id]);

  // "More from this course" — same course code, falling back to same type (popular) if too few.
  useEffect(() => {
    if (!resource) return;
    let ignore = false;
    async function loadRelated() {
      let list = [];
      if (resource.courseCode) {
        list = await api
          .get("/catalog/resources", { params: { courseCode: resource.courseCode, limit: 8 } })
          .then((r) => r.data.resources || [])
          .catch(() => []);
      }
      list = list.filter((x) => String(x.id) !== String(resource.id));
      if (list.length < 3) {
        const more = await api
          .get("/catalog/resources", { params: { resourceType: resource.resourceType, sort: "popular", limit: 8 } })
          .then((r) => r.data.resources || [])
          .catch(() => []);
        const seen = new Set(list.map((x) => String(x.id)).concat(String(resource.id)));
        for (const m of more) {
          if (!seen.has(String(m.id))) { list.push(m); seen.add(String(m.id)); }
        }
      }
      if (!ignore) setRelated(list.slice(0, 4));
    }
    loadRelated();
    return () => { ignore = true; };
  }, [resource]);

  async function download() {
    setBusy(true); setError("");
    try {
      await downloadResourceFile(api, id, resource.fileName);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    setBusy(true); setError("");
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load Razorpay checkout.");
      const { data: order } = await api.post("/catalog/resources/order", { resourceId: id });
      const rz = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NoteGenie",
        description: resource.title,
        order_id: order.orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#0d9488" },
        handler: async (response) => {
          try {
            await api.post("/catalog/resources/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              resourceId: id,
            });
            setOwned(true);
          } catch (e) {
            setError(apiError(e));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", (r) => { setError(r?.error?.description || "Payment failed."); setBusy(false); });
      rz.open();
    } catch (e) {
      setError(apiError(e));
      setBusy(false);
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;
  if (!resource) return <div className="mx-auto max-w-3xl"><EmptyState title="Resource not found" /></div>;

  const canDownload = !resource.isPaid || owned;
  const inCart = has(resource.id);
  const digital = resource.isDigital !== false;
  const cat = STORE_CATEGORIES.find((c) => c.types.includes(resource.resourceType));
  const sizeMb = resource.size ? (resource.size / 1024 / 1024).toFixed(1) : null;

  const specs = [
    ["Type", typeLabel(resource.resourceType)],
    resource.courseCode && ["Course", resource.courseCode],
    resource.session && ["Session", resource.session],
    !resource.session && resource.year && ["Year", resource.year],
    resource.pages && ["Pages", String(resource.pages)],
    sizeMb && ["File size", `${sizeMb} MB`],
    fileFormat(resource) && ["Format", fileFormat(resource)],
    resource.downloadCount > 0 && ["Downloads", resource.downloadCount.toLocaleString("en-IN")],
  ].filter(Boolean);

  function addToCart() {
    add({
      kind: "resource",
      id: resource.id,
      title: resource.title,
      price: resource.price,
      isPaid: resource.isPaid,
      resourceType: resource.resourceType,
      courseCode: resource.courseCode,
      productType: resource.productType || "digital",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24 sm:pb-0">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link to="/store" className="hover:text-store-700 dark:hover:text-store-300">Store</Link>
        {cat && (
          <>
            <IconChevronRight width={14} height={14} />
            <Link to={`/store/${cat.slug}`} className="hover:text-store-700 dark:hover:text-store-300">{cat.label}</Link>
          </>
        )}
        {resource.courseCode && (
          <>
            <IconChevronRight width={14} height={14} />
            <span className="text-ink">{resource.courseCode}</span>
          </>
        )}
      </nav>

      <div className="panel space-y-4 p-6 shadow-soft">
        {/* Cover */}
        {resource.previewUrl ? (
          <img src={resource.previewUrl} alt="" className="h-44 w-full rounded-xl object-cover" />
        ) : (
          <div className="grid h-44 w-full place-items-center rounded-xl bg-store-50 text-store-600 dark:bg-store-950/40 dark:text-store-300">
            <IconDoc width={40} height={40} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge color="gray">{typeLabel(resource.resourceType)}</Badge>
          {resource.courseCode && <span className="store-pill">{resource.courseCode}</span>}
          {resource.isPaid ? <Badge color="amber">{rupees(resource.price)}</Badge> : <Badge color="green">Free</Badge>}
        </div>

        <h1 className="text-2xl font-semibold text-ink">{resource.title}</h1>
        {resource.description && <p className="text-muted">{resource.description}</p>}

        {/* Product-type highlights */}
        {digital ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="store-pill">Instant download</span>
            {resource.downloadLimit != null && <span className="store-pill">{resource.downloadLimit} downloads</span>}
            {resource.downloadExpiryDays ? <span className="store-pill">{resource.downloadExpiryDays}-day access</span> : null}
            <span className="store-pill">No shipping needed</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={resource.inStock ? "store-pill" : "store-pill bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"}>
              {resource.inStock ? "In stock" : "Out of stock"}
            </span>
            <span className="store-pill">{resource.deliveryCharges > 0 ? `Delivery ₹${(resource.deliveryCharges / 100).toFixed(0)}` : "Free delivery"}</span>
            {resource.codAvailable && <span className="store-pill">Cash on delivery</span>}
            {resource.dimensions && <span className="store-pill">{resource.dimensions}</span>}
          </div>
        )}

        {/* Spec list */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line bg-canvas/40 p-4 text-sm sm:grid-cols-3">
          {specs.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {error && <Alert>{error}</Alert>}

        {canDownload ? (
          <button onClick={download} className="btn-primary w-full py-3" disabled={busy}>
            {busy ? <Spinner /> : <><IconDownload width={16} height={16} /> {resource.isPaid ? "Download" : "Free download"}</>}
          </button>
        ) : digital ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => (inCart ? navigate("/store/cart") : addToCart())}
              className="btn-outline flex-1 py-3"
              disabled={busy}
            >
              {inCart ? <><IconCheck width={16} height={16} /> Go to cart</> : <><IconCart width={16} height={16} /> Add to cart</>}
            </button>
            <button onClick={buy} className="store-btn-accent flex-1 py-3" disabled={busy}>
              {busy ? <Spinner /> : <><IconCoins width={16} height={16} /> Buy now · {rupees(resource.price)}</>}
            </button>
          </div>
        ) : (
          // Physical: address is collected at checkout, so go through the cart (no instant buy).
          <button
            onClick={() => (inCart ? navigate("/store/cart") : addToCart())}
            className="store-btn-accent w-full py-3"
            disabled={busy || !resource.inStock}
            title={!resource.inStock ? "Out of stock" : ""}
          >
            {!resource.inStock ? "Out of stock" : inCart ? <><IconCheck width={16} height={16} /> Go to cart</> : <><IconCart width={16} height={16} /> Add to cart · {rupees(resource.price)}</>}
          </button>
        )}

        {/* Trust row — reassurance at the conversion point */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><IconLock width={12} height={12} /> Secure payment via Razorpay</span>
          <span className="inline-flex items-center gap-1"><IconDownload width={12} height={12} /> Instant download</span>
          <span>You only pay once</span>
        </div>

        {owned && <p className="text-center text-xs text-emerald-600">You own this resource — find it anytime in My downloads.</p>}
      </div>

      {/* More from this course */}
      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-ink">
            {resource.courseCode ? `More from ${resource.courseCode}` : "You might also like"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* Mobile sticky buy/download bar — keeps the primary action on-screen on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface/95 p-3 backdrop-blur sm:hidden">
        <div className="shrink-0">
          <p className="text-lg font-bold text-ink">
            {resource.isPaid ? (owned ? "Owned" : rupees(resource.price)) : "Free"}
          </p>
        </div>
        <div className="flex-1">
          {canDownload ? (
            <button onClick={download} className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? <Spinner /> : <><IconDownload width={16} height={16} /> Download</>}
            </button>
          ) : digital ? (
            <button onClick={buy} className="store-btn-accent w-full py-2.5" disabled={busy}>
              {busy ? <Spinner /> : <><IconCoins width={16} height={16} /> Buy now</>}
            </button>
          ) : (
            <button onClick={() => (inCart ? navigate("/store/cart") : addToCart())} className="store-btn-accent w-full py-2.5" disabled={busy || !resource.inStock}>
              {!resource.inStock ? "Out of stock" : inCart ? "Go to cart" : "Add to cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
