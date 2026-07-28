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
import { STORE_CATEGORIES, ALL_STORE_CATEGORIES } from "../../lib/storeCategories.js";
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

// Decorative hero visual — 3D stacked handcrafted product preview vault with live activity pills.
function HeroPreview() {
  const reduced = useReducedMotion();
  const float = reduced ? {} : { animate: { y: [0, -6, 0] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-full bg-store-500/25 blur-3xl" />

      {/* Layered Background Card (Right offset - MBA MMPC-001) */}
      <div className="absolute right-2 top-4 w-64 rotate-6 rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-700 to-teal-900 p-4 shadow-xl text-white opacity-85 backdrop-blur-md">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">EXAM GUIDE</span>
        <p className="font-display mt-1 text-lg font-bold text-white">MMPC-001</p>
        <p className="text-[11px] text-emerald-100 line-clamp-1">Management Functions (MBA)</p>
      </div>

      {/* Layered Background Card (Left offset - BCA BCS-011) */}
      <div className="absolute left-2 top-2 w-64 -rotate-6 rounded-2xl border border-white/20 bg-gradient-to-br from-blue-700 to-indigo-900 p-4 shadow-xl text-white opacity-85 backdrop-blur-md">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200">QUESTION PAPER</span>
        <p className="font-display mt-1 text-lg font-bold text-white">BCS-011</p>
        <p className="text-[11px] text-blue-100 line-clamp-1">Computer Basics &amp; PC Software</p>
      </div>

      {/* Main Foreground Hero Card (MHI-04 History) */}
      <div className="relative z-10 mx-auto w-72 sm:w-80 rounded-2xl border border-white/25 bg-gradient-to-br from-amber-800 via-amber-900 to-slate-950 p-5 shadow-2xl backdrop-blur-xl text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-400/30">
            SOLVED ASSIGNMENT 2025
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
            <IconCheck width={11} height={11} /> 100% Solved
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold text-amber-200/90 tracking-wide">IGNOU • MA HISTORY</p>
          <h2 className="font-display text-2xl font-extrabold text-white">MHI-04</h2>
          <p className="text-xs text-amber-100/90 line-clamp-2 leading-relaxed">
            Political Structures in India — Hand-written Solved Assignment PDF
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-amber-500/30 pt-3 text-xs text-amber-200/80">
          <span className="inline-flex items-center gap-1 font-medium"><IconFileText width={13} height={13} /> 36 Pages</span>
          <span className="inline-flex items-center gap-1 font-bold text-white"><IconDownload width={13} height={13} /> 1,420 Downloads</span>
        </div>
      </div>

      {/* Floating Live Activity Badge */}
      <motion.div {...float} className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-xl text-white">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-xs font-bold text-white tracking-wide">⚡ 12,400+ Instant Downloads Today</span>
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
      {/* Hero — Signature Dark Cobalt Vault */}
      <section className="store-hero relative overflow-hidden rounded-3xl border border-slate-700/60 p-5 sm:p-8 lg:p-9 shadow-store-e3 text-white">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: headline + search */}
          <motion.div {...heroLeft}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-storeaccent-500/40 bg-storeaccent-500/15 px-3 py-0.5 text-[11px] font-semibold text-storeaccent-300 backdrop-blur-md">
              <IconSparkles width={13} height={13} className="text-storeaccent-400" />
              Free solved assignments, papers &amp; guides — IGNOU &amp; distance learning
            </span>
            <h1 className="font-display mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {store.heroTitle || "Solved assignments, question papers & books — instantly."}
            </h1>
            <p className="mt-2.5 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              {store.heroSubtitle || "Everything you need to score better, in one place. Most material is free — pick your university and degree to get started."}
            </p>

            <form onSubmit={search} className="mt-5 grid gap-2.5 rounded-2xl border border-white/20 bg-white/10 p-2.5 backdrop-blur-xl shadow-2xl sm:grid-cols-[1fr_1fr_auto]">
              <select className="input border-0 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:ring-2 focus:ring-storeaccent-400 py-2" value={uni} onChange={(e) => setUni(e.target.value)} aria-label="Select university">
                <option value="" className="text-slate-900">Select university</option>
                {universities.map((u) => <option key={u._id} value={u._id} className="text-slate-900">{u.name}</option>)}
              </select>
              <select className="input border-0 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:ring-2 focus:ring-storeaccent-400 py-2" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="What do you want">
                <option value="" className="text-slate-900">What do you want?</option>
                {STORE_CATEGORIES.map((c) => <option key={c.slug} value={c.slug} className="text-slate-900">{c.label}</option>)}
              </select>
              <button type="submit" className="btn-primary cta-sheen bg-storeaccent-500 hover:bg-storeaccent-600 border-0 text-white font-bold px-5 py-2 text-xs sm:text-sm shadow-store-cta">
                <IconSearch width={15} height={15} /> Search
              </button>
            </form>

            {/* Trust row */}
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] sm:text-xs font-medium text-slate-300">
              <li className="inline-flex items-center gap-1.5"><IconDownload width={14} height={14} className="text-storeaccent-400" /> Instant download</li>
              <li className="inline-flex items-center gap-1.5"><IconCheck width={14} height={14} className="text-storeaccent-400" /> No card to start</li>
              <li className="inline-flex items-center gap-1.5"><IconShield width={14} height={14} className="text-storeaccent-400" /> Secure UPI / cards</li>
              <li className="inline-flex items-center gap-1.5"><IconSparkles width={14} height={14} className="text-storeaccent-400" /> AI tools included</li>
            </ul>
          </motion.div>

          {/* Right: product preview mockup */}
          <motion.div className="hidden lg:block" aria-hidden="true" {...heroRight}>
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="relative py-2">
        <ScrollReveal>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-store-200/80 bg-store-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-store-700 shadow-2xs backdrop-blur-xs dark:border-store-800/60 dark:bg-store-950/60 dark:text-store-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-store-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-store-500"></span>
                </span>
                Curated Collections
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Browse by category
              </h2>
              <p className="mt-1 max-w-xl text-xs text-muted sm:text-sm">
                Explore handpicked study materials, verified assignments, exam guides, and project work tailored for your course.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-muted shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Updated for 2024–25 Session</span>
            </div>
          </div>
        </ScrollReveal>

        <StaggerReveal className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_STORE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            const toPath = c.slug === "combos" ? "/store/combos" : `/store/${c.slug}`;
            return (
              <StaggerItem key={c.slug} className="h-full">
                <Link
                  to={toPath}
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-4.5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${c.hoverBorder || "hover:border-store-400"}`}
                >
                  {/* Soft background radial glow blur on hover */}
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${c.glowBg || "bg-store-500/10"} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100`} />

                  {/* Top row: Elevated gradient icon + subtle micro-arrow */}
                  <div className="relative flex items-center justify-between">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl text-white ${c.gradient || "bg-store-600"} ${c.shadow || "shadow-md"} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                      <Icon width={20} height={20} className="stroke-[2]" />
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-400 opacity-0 transition-all duration-200 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-white dark:group-hover:text-slate-900">
                      <IconChevronRight width={12} height={12} />
                    </span>
                  </div>

                  {/* Label & Description & Badge */}
                  <div className="relative mt-3.5 flex flex-1 flex-col justify-between">
                    <div>
                      <span className="block font-display text-sm font-bold text-ink transition-colors group-hover:text-store-600 dark:group-hover:text-store-400">
                        {c.label}
                      </span>
                      {c.description && (
                        <span className="mt-0.5 block text-[11px] font-normal text-muted leading-snug line-clamp-1">
                          {c.description}
                        </span>
                      )}
                    </div>

                    {c.tag && (
                      <div className="mt-2.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide border ${c.badgeStyle || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {c.tag}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom accent glow line on hover */}
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.accentLine || "bg-store-500"} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                </Link>
              </StaggerItem>
            );
          })}
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
