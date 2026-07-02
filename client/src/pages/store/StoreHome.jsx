// FLOW: Storefront home. Hero + dual-dropdown search (University → Degree), category tiles,
// personalised strips (recently viewed / recommended), free + popular + latest resources,
// shop-by-degree grid, how-it-works. Public (no auth). Free material is surfaced first.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { Spinner } from "../../components/ui.jsx";
import {
  motion, useReducedMotion, ScrollReveal, StaggerReveal, StaggerItem,
} from "../../components/motion.jsx";
import ResourceCard from "../../components/store/ResourceCard.jsx";
import { STORE_CATEGORIES } from "../../lib/storeCategories.js";
import {
  IconSearch, IconCheck, IconChat, IconChevronRight,
  IconDownload, IconFileText, IconCards, IconSparkles, IconShield,
} from "../../components/icons.jsx";
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

// Decorative hero visual — a faux "solved assignment" preview with floating AI chips.
// Pure JSX/CSS (no image assets) so it stays crisp at any size and themes with the app.
// aria-hidden on the wrapper; it carries no information a screen reader needs.
function HeroPreview() {
  const reduced = useReducedMotion();
  const float = reduced ? {} : { animate: { y: [0, -8, 0] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } };
  const floatSlow = reduced ? {} : { animate: { y: [0, 8, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="relative mx-auto max-w-md">
      <div className="absolute -inset-8 -z-10 rounded-full bg-store-300/30 blur-3xl dark:bg-store-500/20" />

      {/* Main document card */}
      <div className="rotate-1 rounded-2xl border border-line bg-surface p-5 shadow-lift">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate text-xs font-medium text-muted">Solved-Assignment.pdf</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <IconCheck width={11} height={11} /> Solved
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-4 w-3/4 rounded bg-gradient-to-r from-store-500 to-store-400" />
          <div className="h-2.5 w-full rounded bg-line" />
          <div className="h-2.5 w-11/12 rounded bg-line" />
          <div className="h-2.5 w-full rounded bg-store-200 dark:bg-store-800" />
          <div className="h-2.5 w-5/6 rounded bg-line" />
          <div className="h-2.5 w-2/3 rounded bg-line" />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><IconFileText width={12} height={12} /> 24 pages</span>
          <span className="inline-flex items-center gap-1"><IconDownload width={12} height={12} /> 1,240 downloads</span>
        </div>
      </div>

      {/* Floating flashcard chip */}
      <motion.div {...float} className="absolute -right-6 -top-6 w-40 -rotate-3 rounded-xl border border-line bg-surface p-3 shadow-card">
        <span className="inline-flex items-center gap-1 rounded-full bg-store-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-store-700 dark:bg-store-950/60 dark:text-store-300">
          <IconCards width={10} height={10} /> Flashcard
        </span>
        <p className="mt-2 text-xs font-semibold text-ink">What is osmosis?</p>
        <div className="mt-2 h-1.5 w-2/3 rounded bg-line" />
      </motion.div>

      {/* Floating "AI notes ready" chip */}
      <motion.div {...floatSlow} className="absolute -bottom-5 -left-6 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-card">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-store-600 text-white">
          <IconSparkles width={15} height={15} />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-ink">AI notes ready</p>
          <p className="text-[10px] text-muted">in 8 seconds</p>
        </div>
      </motion.div>
    </div>
  );
}

// A titled horizontal-ish grid of resource cards with an optional "view all" link.
// The heading fades up as it enters view; the cards cascade in with a stagger.
function ResourceStrip({ title, subtitle, to, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <ScrollReveal>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[1.7rem] leading-tight text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {to && (
            <Link to={to} className="group inline-flex items-center gap-1 text-sm font-medium text-store-700 transition-colors hover:text-store-800 dark:text-store-300">
              View all
              <IconChevronRight width={15} height={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </ScrollReveal>
      <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r) => (
          <StaggerItem key={r.id} className="h-full">
            <ResourceCard r={r} />
          </StaggerItem>
        ))}
      </StaggerReveal>
    </section>
  );
}

export default function StoreHome() {
  const navigate = useNavigate();
  const store = useStorefront();
  const reduced = useReducedMotion();
  // Hero entrance — content slides in from the left, the preview from the right.
  const heroEase = [0.25, 0.1, 0.25, 1];
  const heroLeft = reduced ? {} : { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.5, ease: heroEase } };
  const heroRight = reduced ? {} : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.5, delay: 0.1, ease: heroEase } };
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
      <section className="relative overflow-hidden rounded-3xl border border-store-100 bg-gradient-to-br from-store-50 via-surface to-storeaccent-50/50 p-6 shadow-soft dark:border-store-900/50 dark:from-store-950/50 dark:via-surface dark:to-store-900/20 sm:p-12">
        {/* Decorative depth — soft themed glows behind the content. */}
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-store-300/40 blur-3xl dark:bg-store-500/10" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-storeaccent-300/30 blur-3xl dark:bg-storeaccent-500/10" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: headline + search */}
          <motion.div {...heroLeft}>
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

            {/* Trust row — honest signals, no fabricated counts */}
            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <li className="inline-flex items-center gap-1.5"><IconDownload width={15} height={15} className="text-store-600" /> Instant download</li>
              <li className="inline-flex items-center gap-1.5"><IconCheck width={15} height={15} className="text-store-600" /> No card to start</li>
              <li className="inline-flex items-center gap-1.5"><IconShield width={15} height={15} className="text-store-600" /> Secure UPI / cards</li>
              <li className="inline-flex items-center gap-1.5"><IconSparkles width={15} height={15} className="text-store-600" /> AI tools included</li>
            </ul>
          </motion.div>

          {/* Right: product preview mockup (decorative, desktop only) */}
          <motion.div className="hidden lg:block" aria-hidden="true" {...heroRight}>
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* Category tiles */}
      <section>
        <ScrollReveal>
          <h2 className="mb-4 font-display text-[1.7rem] leading-tight text-ink">Browse by category</h2>
        </ScrollReveal>
        <StaggerReveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STORE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <StaggerItem key={c.slug} className="h-full">
                <Link to={`/store/${c.slug}`} className="group card-solid flex h-full flex-col items-center gap-2 p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-store-300 hover:shadow-card">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-110 ${c.tint}`}><Icon width={20} height={20} /></span>
                  <span className="text-sm font-semibold text-ink">{c.label}</span>
                </Link>
              </StaggerItem>
            );
          })}
          <StaggerItem className="h-full">
            <Link to="/store/combos" className="group card-solid flex h-full flex-col items-center gap-2 p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-store-300 hover:shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-storeaccent-100 text-storeaccent-600 transition-transform duration-200 group-hover:scale-110 dark:bg-store-950"><IconCheck width={20} height={20} /></span>
              <span className="text-sm font-semibold text-ink">Combo packs</span>
            </Link>
          </StaggerItem>
        </StaggerReveal>
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
              <ScrollReveal>
                <h2 className="mb-4 font-display text-[1.7rem] leading-tight text-ink">Shop by degree</h2>
              </ScrollReveal>
              <StaggerReveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {programs.slice(0, 16).map((p) => (
                  <StaggerItem key={p.id} className="h-full">
                    <Link to={`/store/search?programId=${p.id}`} className="block h-full rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-store-300 hover:shadow-card">
                      <p className="font-semibold text-ink">{p.name}</p>
                      <p className="text-xs text-muted">{p.universityShort || p.universityName}</p>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerReveal>
            </section>
          )}
        </>
      )}

      {/* How it works */}
      <section>
        <ScrollReveal>
          <h2 className="mb-4 font-display text-[1.7rem] leading-tight text-ink">How it works</h2>
        </ScrollReveal>
        <StaggerReveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="h-full">
              <div className="group h-full rounded-xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-store-300 hover:shadow-card">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-store-600 text-sm font-bold text-white transition-transform duration-200 group-hover:scale-110">{s.n}</span>
                <p className="mt-3 font-semibold text-ink">{s.t}</p>
                <p className="text-sm text-muted">{s.d}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </section>

      {/* Trust / WhatsApp CTA — only shown when a support number is configured */}
      {store.whatsappNumber && (
        <ScrollReveal>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-store-200 bg-store-50 p-6 dark:border-store-800 dark:bg-store-950/40">
            <div>
              <p className="text-lg font-bold text-ink">Need help choosing?</p>
              <p className="text-sm text-muted">Chat with us on WhatsApp — we'll find the right material for your course.</p>
            </div>
            <a href={whatsappLink("Hi, I need help choosing study material", store.whatsappNumber)} target="_blank" rel="noreferrer" className="store-btn-accent"><IconChat width={16} height={16} /> WhatsApp us</a>
          </section>
        </ScrollReveal>
      )}
    </div>
  );
}
