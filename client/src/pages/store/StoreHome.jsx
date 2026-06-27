// FLOW: Storefront home. Hero + dual-dropdown search (University → Degree), category tiles,
// personalised strips (recently viewed / recommended), free + popular + latest resources,
// shop-by-degree grid, how-it-works. Public (no auth). Free material is surfaced first.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { Spinner } from "../../components/ui.jsx";
import ResourceCard from "../../components/store/ResourceCard.jsx";
import { STORE_CATEGORIES } from "../../lib/storeCategories.js";
import { IconSearch, IconCheck, IconChat, IconChevronRight } from "../../components/icons.jsx";
import { whatsappLink } from "../../lib/storeConfig.js";
import { useStorefront } from "../../lib/useStorefront.js";
import { getRecentlyViewed, viewedResourceTypes } from "../../lib/recentlyViewed.js";
import { getSaved } from "../../lib/savedResources.js";

const STEPS = [
  { n: "1", t: "Find your course", d: "Search by university, degree or course code." },
  { n: "2", t: "Add to cart", d: "Pick assignments, papers, books — buy together." },
  { n: "3", t: "Pay securely", d: "UPI / cards via Razorpay. Instant access." },
  { n: "4", t: "Download instantly", d: "Files in My downloads forever." },
];

// A titled horizontal-ish grid of resource cards with an optional "view all" link.
function ResourceStrip({ title, subtitle, to, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-store-700 hover:text-store-800 dark:text-store-300">
            View all <IconChevronRight width={15} height={15} />
          </Link>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r) => <ResourceCard key={r.id} r={r} />)}
      </div>
    </section>
  );
}

export default function StoreHome() {
  const navigate = useNavigate();
  const store = useStorefront();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [popular, setPopular] = useState([]);
  const [latest, setLatest] = useState([]);
  const [free, setFree] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uni, setUni] = useState("");
  const [cat, setCat] = useState("");
  // Read browsing history + wishlist once (localStorage) for personalised strips.
  const [recent] = useState(() => getRecentlyViewed());
  const [saved] = useState(() => getSaved());

  useEffect(() => {
    const types = viewedResourceTypes().slice(0, 3);
    const recReq = types.length
      ? api.get("/catalog/resources", { params: { resourceType: types.join(","), sort: "popular", limit: 4 } })
          .then((r) => r.data.resources || []).catch(() => [])
      : Promise.resolve([]);

    Promise.all([
      api.get("/catalog/universities").then((r) => r.data.universities || []).catch(() => []),
      api.get("/catalog/programs/flat").then((r) => r.data.programs || []).catch(() => []),
      api.get("/catalog/resources", { params: { sort: "popular", limit: 8 } }).then((r) => r.data.resources || []).catch(() => []),
      api.get("/catalog/resources", { params: { sort: "latest", limit: 4 } }).then((r) => r.data.resources || []).catch(() => []),
      api.get("/catalog/resources", { params: { price: "free", sort: "popular", limit: 4 } }).then((r) => r.data.resources || []).catch(() => []),
      recReq,
    ]).then(([u, p, pop, lat, fr, rec]) => {
      setUniversities(u); setPrograms(p); setPopular(pop); setLatest(lat); setFree(fr);
      // Don't recommend something the user is literally looking at right now.
      const recentIds = new Set(recent.map((r) => String(r.id)));
      setRecommended(rec.filter((r) => !recentIds.has(String(r.id))));
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function search(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (uni) params.set("universityId", uni);
    if (cat) params.set("category", cat);
    navigate(`/store/search?${params.toString()}`);
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-store-50 to-storeaccent-50 p-6 dark:from-store-950/40 dark:to-store-900/20 sm:p-10">
        <span className="store-pill">Free solved assignments, papers &amp; guides — IGNOU &amp; distance learning</span>
        <h1 className="font-display mt-4 text-4xl leading-tight text-ink sm:text-5xl">
          {store.heroTitle || "Solved assignments, question papers & books — instantly."}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {store.heroSubtitle || "Everything you need to score better, in one place. Most material is free — pick your university and degree to get started."}
        </p>

        <form onSubmit={search} className="mt-6 grid gap-3 rounded-xl border border-line bg-surface p-3 shadow-soft sm:grid-cols-[1fr_1fr_auto]">
          <select className="input" value={uni} onChange={(e) => setUni(e.target.value)} aria-label="Select university">
            <option value="">Select university</option>
            {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="What do you want">
            <option value="">What do you want?</option>
            {STORE_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
          <button type="submit" className="btn-primary"><IconSearch width={16} height={16} /> Search</button>
        </form>
      </section>

      {/* Category tiles */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STORE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.slug} to={`/store/${c.slug}`} className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.tint}`}><Icon width={20} height={20} /></span>
                <span className="text-sm font-semibold text-ink">{c.label}</span>
              </Link>
            );
          })}
          <Link to="/store/combos" className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-storeaccent-100 text-storeaccent-600 dark:bg-store-950"><IconCheck width={20} height={20} /></span>
            <span className="text-sm font-semibold text-ink">Combo packs</span>
          </Link>
        </div>
      </section>

      {/* Saved (wishlist) */}
      <ResourceStrip title="Saved" subtitle="Your wishlist — tap the heart on any card." items={saved} />

      {/* Recently viewed (from browsing history) */}
      <ResourceStrip title="Recently viewed" subtitle="Pick up where you left off." items={recent} />

      {loading ? (
        <div className="grid place-items-center py-12"><Spinner size={24} /></div>
      ) : (
        <>
          {/* Recommended (based on what you've browsed) */}
          <ResourceStrip
            title="Recommended for you"
            subtitle="Based on what you've been looking at."
            to="/store/search?sort=popular"
            items={recommended}
          />

          {/* Free first */}
          <ResourceStrip
            title="Free study material"
            subtitle="Download these at no cost."
            to="/store/search?price=free"
            items={free}
          />

          {/* Popular */}
          <ResourceStrip
            title="Most downloaded"
            subtitle="What students are grabbing most."
            to="/store/search?sort=popular"
            items={popular.slice(0, 4)}
          />

          {/* Latest */}
          <ResourceStrip
            title="Just added"
            subtitle="Fresh uploads to the store."
            to="/store/search?sort=latest"
            items={latest}
          />

          {/* Shop by degree */}
          {programs.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-ink">Shop by degree</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {programs.slice(0, 16).map((p) => (
                  <Link key={p.id} to={`/store/search?programId=${p.id}`} className="rounded-xl border border-line bg-surface p-4 transition hover:border-store-300">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-muted">{p.universityShort || p.universityName}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* How it works */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-line bg-surface p-5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-store-600 text-sm font-bold text-white">{s.n}</span>
              <p className="mt-3 font-semibold text-ink">{s.t}</p>
              <p className="text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / WhatsApp CTA — only shown when a support number is configured */}
      {store.whatsappNumber && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-store-200 bg-store-50 p-6 dark:border-store-800 dark:bg-store-950/40">
          <div>
            <p className="text-lg font-bold text-ink">Need help choosing?</p>
            <p className="text-sm text-muted">Chat with us on WhatsApp — we'll find the right material for your course.</p>
          </div>
          <a href={whatsappLink("Hi, I need help choosing study material", store.whatsappNumber)} target="_blank" rel="noreferrer" className="store-btn-accent"><IconChat width={16} height={16} /> WhatsApp us</a>
        </section>
      )}
    </div>
  );
}
