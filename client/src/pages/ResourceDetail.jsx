// FLOW: Student resource detail. Free → Download. Paid & not owned → Buy (Razorpay) / Add to cart.
// Paid & owned → Download. Ownership via /catalog/me/purchases. Shows a cover, a labelled spec
// list, trust signals, breadcrumbs, a mobile sticky buy bar, and "More from this course".

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import {
  IconDownload,
  IconCoins,
  IconCart,
  IconCheck,
  IconChevronRight,
  IconLock,
  IconShield,
  IconSparkles,
  IconFileText,
  IconFlame,
} from "../components/icons.jsx";
import { loadRazorpayScript, downloadResourceFile } from "../lib/razorpay.js";
import { typeLabel, rupees, STORE_CATEGORIES } from "../lib/storeCategories.js";
import { recordView, removeViewed, getRecentlyViewed } from "../lib/recentlyViewed.js";
import ResourceCard from "../components/store/ResourceCard.jsx";
import { typeVisual, DOT_PATTERN } from "../lib/resourceVisuals.js";

function fileFormat(r) {
  if (r.mime?.includes("pdf")) return "PDF Document";
  const ext = (r.fileName || "").split(".").pop();
  return ext && ext.length <= 5 ? `${ext.toUpperCase()} File` : "Digital File";
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
    setError("");

    // Try fetching the specific resource ID
    api.get(`/catalog/resources/${id}`)
      .then((r) => {
        if (ignore) return;
        const res = r.data.resource;
        setResource(res);
        recordView(res);
        api.get("/catalog/me/purchases")
          .then((pr) => {
            if (ignore) return;
            const purchases = pr.data.purchases || [];
            setOwned(purchases.some((p) => String(p.resource.id) === String(id)));
          })
          .catch(() => {});
      })
      .catch(async () => {
        if (ignore) return;
        // Purge stale ID from recently viewed
        removeViewed(id);

        // Smart fallback: Check if recently viewed had a courseCode or title for this ID
        const recent = getRecentlyViewed();
        const staleItem = recent.find((r) => String(r.id) === String(id));
        const searchTerm = staleItem?.courseCode || staleItem?.title;

        try {
          const params = searchTerm ? { q: searchTerm, limit: 1 } : { limit: 1 };
          const fallbackRes = await api.get("/catalog/resources", { params }).then((r) => r.data.resources?.[0]);
          if (fallbackRes && fallbackRes.id) {
            // Auto-redirect to the active resource in the catalog
            navigate(`/resources/${fallbackRes.id}`, { replace: true });
            return;
          }
        } catch {
          // Ignore
        }
        setResource(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [id, navigate]);

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
    if (!user) return navigate("/register");
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
    if (!user) return navigate("/register");
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
        theme: { color: "#1d52d9" },
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

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={24} /></div>;
  if (!resource) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="card-solid p-8 rounded-3xl border border-line bg-surface shadow-card space-y-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-store-100 text-store-600 mx-auto dark:bg-store-950 dark:text-store-400">
            <IconSparkles width={24} height={24} />
          </span>
          <h2 className="font-display text-2xl font-extrabold text-ink">Material link updated</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            Yeh ID purana hai jo seed reset se refresh ho gaya. Naye updated IGNOU &amp; University material dekhne ke liye catalog par click karein.
          </p>
          <div className="pt-2">
            <Link to="/store" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 font-bold text-sm">
              Explore Store Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canDownload = !resource.isPaid || owned;
  const inCart = has(resource.id);
  const digital = resource.isDigital !== false;
  const cat = STORE_CATEGORIES.find((c) => c.types.includes(resource.resourceType));
  const sizeMb = resource.size ? (resource.size / 1024 / 1024).toFixed(1) : null;
  const visual = typeVisual(resource.resourceType);
  const WatermarkIcon = visual.Icon;

  const formattedDate = resource.createdAt
    ? new Date(resource.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Verified Recent Upload";

  const specs = [
    ["Resource Type", typeLabel(resource.resourceType)],
    resource.courseCode && ["Course Code", resource.courseCode],
    ["Product Format", resource.productType === "physical" ? "Printed Hard-Copy Book" : fileFormat(resource)],
    resource.session && ["Academic Session", resource.session],
    !resource.session && resource.year && ["Session Year", resource.year],
    ["Edition / Syllabus", resource.edition || "2024-2025 Syllabus Verified"],
    ["Language Medium", resource.language || "English Medium"],
    resource.pages && ["Page Count", `${resource.pages} Pages`],
    sizeMb && ["File Size", `${sizeMb} MB`],
    resource.weightGrams && ["Book Weight", `${resource.weightGrams} grams`],
    resource.dimensions && ["Dimensions", resource.dimensions],
    resource.sku && ["SKU Code", resource.sku],
    ["Published Date", formattedDate],
    ["Availability", resource.productType === "physical" ? (resource.inStock ? `In Stock (${resource.stock || 50} copies)` : "Out of Stock") : "Instant Digital Download"],
    resource.downloadCount > 0 && ["Total Downloads", `${resource.downloadCount.toLocaleString("en-IN")} Students`],
  ].filter(Boolean);

  const uniName = resource.courseCode?.startsWith("BHU")
    ? "Banaras Hindu University (BHU)"
    : resource.courseCode?.startsWith("DU")
    ? "Delhi University (DU)"
    : resource.courseCode?.startsWith("JNU")
    ? "Jawaharlal Nehru University (JNU)"
    : resource.courseCode?.startsWith("AMU")
    ? "Aligarh Muslim University (AMU)"
    : resource.courseCode?.startsWith("JMI")
    ? "Jamia Millia Islamia (JMI)"
    : "IGNOU & Distance Learning";

  let desc = resource.description || "";
  if (desc.includes("IGNOU.") && !resource.courseCode?.startsWith("BCS") && !resource.courseCode?.startsWith("MHI") && !resource.courseCode?.startsWith("MMPC") && !resource.courseCode?.startsWith("BCOC") && !resource.courseCode?.startsWith("MEG") && !resource.courseCode?.startsWith("MCS")) {
    desc = desc.replace(/IGNOU\./g, `${uniName}.`);
  }
  if (!desc) {
    desc = `Verified, high-quality study material for ${resource.courseCode || resource.title}. Prepared according to the official ${uniName} syllabus and examination pattern. Includes complete chapter-wise solutions, key formulas, and exam practice questions.`;
  }

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
    <div className="mx-auto max-w-6xl space-y-6 pb-20 sm:pb-0">
      {/* Tight Breadcrumb Bar */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted">
        <Link to="/store" className="hover:text-store-700 dark:hover:text-store-300 font-medium">Store</Link>
        {cat && (
          <>
            <IconChevronRight width={12} height={12} />
            <Link to={`/store/${cat.slug}`} className="hover:text-store-700 dark:hover:text-store-300 font-medium">{cat.label}</Link>
          </>
        )}
        {resource.courseCode && (
          <>
            <IconChevronRight width={12} height={12} />
            <span className="font-semibold text-ink">{resource.courseCode}</span>
          </>
        )}
      </nav>

      {/* Main 2-Column Product Detail Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (6/12 width) — Cover Graphic + Details + Specifications */}
        <div className="lg:col-span-6 space-y-5">
          {/* Handcrafted Ultra-Premium Book Cover Graphic */}
          {resource.previewUrl ? (
            <img src={resource.previewUrl} alt="" className="h-60 sm:h-72 w-full rounded-2xl object-cover shadow-card border border-line" />
          ) : (
            <div
              style={{ background: visual.bg }}
              className="relative h-60 sm:h-72 w-full overflow-hidden rounded-2xl shadow-2xl border-l-[8px] border-amber-400/80 border-y border-r border-white/15 group"
            >
              <div className="absolute inset-0 opacity-25" style={DOT_PATTERN} />
              {/* Subtle Book Spine Inner Shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/25 z-10" />

              <WatermarkIcon className="absolute -bottom-10 -right-8 text-white/10" width={180} height={180} />

              <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-7 text-white">
                {/* Top Badge Header */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
                    {typeLabel(resource.resourceType)}
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 bg-black/30 px-3 py-1 rounded-full backdrop-blur-md border border-amber-400/30">
                    {uniName.split(" ")[0]} OFFICIAL
                  </span>
                </div>

                {/* Center Title & Course Code */}
                <div className="my-auto space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-200/90">{resource.session || resource.year || "2024-2025 SESSION"}</span>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
                    {resource.courseCode || typeLabel(resource.resourceType)}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-white/95 line-clamp-2 leading-relaxed max-w-md drop-shadow">
                    {resource.title}
                  </p>
                </div>

                {/* Bottom Status Ribbon */}
                <div className="flex items-center justify-between border-t border-white/20 pt-3 text-xs text-white/90">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                    <IconCheck width={12} height={12} /> 100% Verified Syllabus
                  </span>
                  <span className="text-[11px] font-medium opacity-80">
                    {resource.pages ? `${resource.pages} Pages` : "PDF Download"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* About this material */}
          <div className="card-solid p-5 space-y-2.5 rounded-2xl border border-line bg-surface shadow-soft">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <IconFileText width={16} height={16} className="text-store-600" />
              About this material
            </h3>
            <p className="text-muted leading-relaxed text-xs sm:text-sm">
              {desc}
            </p>
          </div>

          {/* Detailed Specifications Table */}
          <div className="card-solid p-5 space-y-3 rounded-2xl border border-line bg-surface shadow-soft">
            <h3 className="text-sm font-bold text-ink">Resource specifications</h3>
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-canvas/50 p-3.5 text-xs sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="border-b border-line/60 pb-2 last:border-0 sm:last:border-b-0">
                  <dt className="text-[11px] text-muted font-medium">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right Column (6/12 width) — Product Title + Price + Sticky Action Card */}
        <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-4">
          <div className="card-solid p-5 space-y-4 rounded-2xl border border-line bg-surface shadow-card">
            {/* Badges & Course Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="brand">{typeLabel(resource.resourceType)}</Badge>
              {resource.courseCode && <span className="store-pill font-extrabold">{resource.courseCode}</span>}
              {resource.session && <Badge color="gray">{resource.session}</Badge>}
              {resource.downloadCount > 150 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-storeaccent-100 px-2 py-0.5 text-[10px] font-semibold text-storeaccent-700 dark:bg-store-950 dark:text-storeaccent-300">
                  <IconFlame width={10} height={10} /> Popular
                </span>
              )}
            </div>

            {/* Main Product Title H1 */}
            <h1 className="font-display text-xl sm:text-2xl font-extrabold leading-snug tracking-tight text-ink">
              {resource.title}
            </h1>

            {/* Price Header Row */}
            <div className="flex items-baseline justify-between border-t border-line/70 pt-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Access Price</span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tabular-nums text-ink">
                    {resource.isPaid ? rupees(resource.price) : "Free"}
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <IconCheck width={13} height={13} /> Instant Access
              </span>
            </div>

            {error && <Alert>{error}</Alert>}

            {/* Action Buttons */}
            {canDownload ? (
              <button onClick={download} className="btn-primary cta-sheen w-full py-3 text-sm font-bold" disabled={busy}>
                {busy ? <Spinner /> : <><IconDownload width={16} height={16} /> {resource.isPaid ? "Download Purchased File" : "Download PDF Instantly"}</>}
              </button>
            ) : digital ? (
              <div className="space-y-2.5">
                <button onClick={buy} className="btn-primary cta-sheen w-full py-3 text-sm font-bold" disabled={busy}>
                  {busy ? <Spinner /> : <><IconCoins width={16} height={16} /> Buy Now · {rupees(resource.price)}</>}
                </button>
                <button
                  onClick={() => (inCart ? navigate("/store/cart") : addToCart())}
                  className="btn-outline w-full py-2.5 text-xs font-semibold"
                  disabled={busy}
                >
                  {inCart ? <><IconCheck width={14} height={14} /> Go to cart</> : <><IconCart width={14} height={14} /> Add to cart</>}
                </button>
              </div>
            ) : (
              <button
                onClick={() => (inCart ? navigate("/store/cart") : addToCart())}
                className="btn-primary w-full py-3 font-bold text-sm"
                disabled={busy || !resource.inStock}
              >
                {!resource.inStock ? "Out of stock" : inCart ? <><IconCheck width={14} height={14} /> Go to cart</> : <><IconCart width={14} height={14} /> Add to cart · {rupees(resource.price)}</>}
              </button>
            )}

            {/* Guarantee Signals */}
            <div className="space-y-2.5 rounded-2xl border border-line bg-canvas/50 p-4 text-xs text-muted">
              <div className="flex items-center gap-2">
                <IconShield width={15} height={15} className="text-emerald-600 shrink-0" />
                <span className="font-medium text-ink">Official {uniName.split(" ")[0]} Verified Syllabus Solutions</span>
              </div>
              <div className="flex items-center gap-2">
                <IconLock width={15} height={15} className="text-store-600 shrink-0" />
                <span className="font-medium text-ink">
                  {resource.isPaid ? "Instant & Secure payment via UPI, Cards & NetBanking" : "100% Free Download — No Payment / Card Required"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IconSparkles width={15} height={15} className="text-amber-500 shrink-0" />
                <span className="font-medium text-ink">Saved permanently in My Downloads for unlimited access</span>
              </div>
            </div>

            {owned && (
              <p className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
                ✓ You own this material. Access it anytime in My downloads.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section — More From This Course */}
      {related.length > 0 && (
        <section className="pt-6 border-t border-line space-y-4">
          <h2 className="text-lg font-extrabold text-ink">
            {resource.courseCode ? `More material for ${resource.courseCode}` : "Recommended study material"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* Mobile Sticky Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface/95 p-3 backdrop-blur-md sm:hidden">
        <div>
          <p className="text-[10px] text-muted">Price</p>
          <p className="text-base font-extrabold text-ink">
            {resource.isPaid ? (owned ? "Owned" : rupees(resource.price)) : "Free"}
          </p>
        </div>
        <div className="flex-1 max-w-[180px]">
          {canDownload ? (
            <button onClick={download} className="btn-primary w-full py-2 text-xs font-bold" disabled={busy}>
              {busy ? <Spinner /> : <><IconDownload width={13} height={13} /> Download</>}
            </button>
          ) : digital ? (
            <button onClick={buy} className="btn-primary cta-sheen w-full py-2 text-xs font-bold" disabled={busy}>
              {busy ? <Spinner /> : <><IconCoins width={13} height={13} /> Buy Now</>}
            </button>
          ) : (
            <button onClick={() => (inCart ? navigate("/store/cart") : addToCart())} className="btn-primary w-full py-2 text-xs font-bold" disabled={busy || !resource.inStock}>
              {!resource.inStock ? "Out of stock" : inCart ? "Go to cart" : "Add to cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
