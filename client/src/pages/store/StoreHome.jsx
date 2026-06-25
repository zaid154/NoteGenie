// FLOW: Storefront home. Hero + dual-dropdown search (University → Degree), category tiles,
// shop-by-degree grid, popular resources strip, how-it-works. Public (no auth).

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { Spinner } from "../../components/ui.jsx";
import ResourceCard from "../../components/store/ResourceCard.jsx";
import { STORE_CATEGORIES } from "../../lib/storeCategories.js";
import { IconSearch, IconLayers, IconDownload, IconCheck, IconChat } from "../../components/icons.jsx";
import { whatsappLink } from "../../lib/storeConfig.js";
import { useStorefront } from "../../lib/useStorefront.js";

const STEPS = [
  { n: "1", t: "Find your course", d: "Search by university, degree or course code." },
  { n: "2", t: "Add to cart", d: "Pick assignments, papers, books — buy together." },
  { n: "3", t: "Pay securely", d: "UPI / cards via Razorpay. Instant access." },
  { n: "4", t: "Download instantly", d: "Files in My downloads forever." },
];

export default function StoreHome() {
  const navigate = useNavigate();
  const store = useStorefront();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uni, setUni] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/catalog/universities").then((r) => r.data.universities || []).catch(() => []),
      api.get("/catalog/programs/flat").then((r) => r.data.programs || []).catch(() => []),
      api.get("/catalog/resources", { params: { sort: "popular", limit: 8 } }).then((r) => r.data.resources || []).catch(() => []),
    ]).then(([u, p, pop]) => {
      setUniversities(u); setPrograms(p); setPopular(pop);
    }).finally(() => setLoading(false));
  }, []);

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
        <span className="store-pill">India's #1 IGNOU & distance-learning store</span>
        <h1 className="font-display mt-4 text-4xl leading-tight text-ink sm:text-5xl">
          {store.heroTitle || "Solved assignments, question papers & books — instantly."}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {store.heroSubtitle || "Everything you need to score better, in one place. Pick your university and degree to get started."}
        </p>

        <form onSubmit={search} className="mt-6 grid gap-3 rounded-xl border border-line bg-surface p-3 shadow-soft sm:grid-cols-[1fr_1fr_auto]">
          <select className="input" value={uni} onChange={(e) => setUni(e.target.value)}>
            <option value="">Select university</option>
            {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
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
          {STORE_CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/store/${c.slug}`} className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"><IconLayers width={20} height={20} /></span>
              <span className="text-sm font-semibold text-ink">{c.label}</span>
            </Link>
          ))}
          <Link to="/store/combos" className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-storeaccent-100 text-storeaccent-600 dark:bg-store-950"><IconCheck width={20} height={20} /></span>
            <span className="text-sm font-semibold text-ink">Combo packs</span>
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="grid place-items-center py-12"><Spinner size={24} /></div>
      ) : (
        <>
          {/* Popular */}
          {popular.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-ink">Most downloaded</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {popular.map((r) => <ResourceCard key={r.id} r={r} />)}
              </div>
            </section>
          )}

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

      {/* Trust / WhatsApp CTA */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-store-200 bg-store-50 p-6 dark:border-store-800 dark:bg-store-950/40">
        <div>
          <p className="text-lg font-bold text-ink">Need help choosing?</p>
          <p className="text-sm text-muted">Chat with us on WhatsApp — we'll find the right material for your course.</p>
        </div>
        <a href={whatsappLink("Hi, I need help choosing study material")} target="_blank" rel="noreferrer" className="store-btn-accent"><IconChat width={16} height={16} /> WhatsApp us</a>
      </section>
    </div>
  );
}
