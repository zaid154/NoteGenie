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

  function search(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (uni) params.set("universityId", uni);
    if (cat) params.set("category", cat);
    navigate(`/store/search?${params.toString()}`);
  }

  // Load resources – try API, fallback to static samples if it fails.
  useEffect(() => {
    const types = viewedResourceTypes().slice(0, 3);
    const recReq = types.length
      ? api
          .get("/catalog/resources", {
            params: { resourceType: types.join(","), sort: "popular", limit: 4 },
          })
          .then((r) => r.data.resources || [])
          .catch(() => [])
      : Promise.resolve([]);

    Promise.all([
      api.get("/catalog/universities").then((r) => r.data.universities || []).catch(() => []),
      api.get("/catalog/programs/flat").then((r) => r.data.programs || []).catch(() => []),
      api.get("/catalog/resources", { params: { sort: "popular", limit: 8 } })
        .then((r) => r.data.resources || [])
        .catch(() => []),
      api.get("/catalog/resources", { params: { sort: "latest", limit: 4 } })
        .then((r) => r.data.resources || [])
        .catch(() => []),
      api.get("/catalog/resources", { params: { price: "free", sort: "popular", limit: 4 } })
        .then((r) => r.data.resources || [])
        .catch(() => []),
      recReq,
    ])
      .then(([u, p, pop, lat, fr, rec]) => {
        setUniversities(u);
        setPrograms(p);
        setPopular(pop);
        setLatest(lat);
        setFree(fr);
        const recentIds = new Set(recent.map((r) => String(r.id)));
        setRecommended(rec.filter((r) => !recentIds.has(String(r.id))));
      })
      .catch((err) => {
        console.error("API fetch error, loading sample data:", err);
        const sampleResources = [
          {
            _id: "sample-note-1",
            title: "Advanced Calculus Notes",
            description: "Comprehensive notes covering limits, derivatives, integrals, and series.",
            resourceType: "notes",
            price: 0,
            isPaid: false,
            previewUrl: "",
            fileUrl: "#",
          },
          {
            _id: "sample-project-1",
            title: "Machine Learning Project – Predictive Analytics",
            description:
              "Full project files, dataset, notebooks, and report for a predictive analytics case study.",
            resourceType: "project",
            price: 49900,
            isPaid: true,
            previewUrl: "",
            fileUrl: "#",
          },
        ];
        setUniversities([]);
        setPrograms([]);
        setPopular(sampleResources);
        setLatest(sampleResources);
        setFree(sampleResources.filter((r) => !r.isPaid));
        setRecommended(sampleResources);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Hero — Signature Dark Cobalt Vault */}
      <section className="rounded-2xl border border-store-200 bg-gradient-to-br from-store-50 to-white p-6 shadow-sm sm:p-8">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: headline + search */}
          <motion.div {...heroLeft}>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-store-700">
              <IconSparkles width={13} height={13} className="text-store-600" />
              Premium free solved assignments, exam papers & guides for IGNOU & distance learning – curated by experts.
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {store.heroTitle || "Solved assignments, question papers & books — instantly."}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">Explore expertly curated solved assignments and exam guides for IGNOU, all free and instantly downloadable.</p>
            <form onSubmit={search} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select className="input border-0 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:ring-2 focus:ring-storeaccent-400 py-2" value={uni} onChange={(e) => setUni(e.target.value)} aria-label="Select university">
                  <option value="" className="text-slate-900">Select university</option>
                  {universities.map((u) => <option key={u._id} value={u._id} className="text-slate-900">{u.name}</option>)}
                </select>
                <select className="input border-0 bg-white text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 focus:ring-2 focus:ring-storeaccent-400 py-2" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="What do you want">
                  <option value="" className="text-slate-900">What do you want?</option>
                  {STORE_CATEGORIES.map((c) => <option key={c.slug} value={c.slug} className="text-slate-900">{c.label}</option>)}
                </select>
                <button type="submit" className="btn-primary px-5 py-2 text-sm">
                  <IconSearch width={15} height={15} /> Search
                </button>
            </form>

            {/* Trust row */}
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
              <li className="inline-flex items-center gap-1.5"><IconDownload width={14} height={14} className="text-store-600" /> Instant download</li>
              <li className="inline-flex items-center gap-1.5"><IconCheck width={14} height={14} className="text-store-600" /> Free material available</li>
              <li className="inline-flex items-center gap-1.5"><IconShield width={14} height={14} className="text-store-600" /> Secure UPI / cards</li>
            </ul>
          </motion.div>

          {/* Right: product preview mockup */}
          <motion.div className="hidden lg:block" {...heroRight}>
            <div className="rounded-lg border border-store-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-ink">What you can find</p>
              <ul className="mt-3 space-y-3 text-sm text-muted">
                <li>• Solved assignments</li>
                <li>• Question papers and notes</li>
                <li>• Help books and projects</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category tiles */}
      <section>
        <ScrollReveal>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-store-200/80 bg-store-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-store-700 shadow-2xs backdrop-blur-xs dark:border-store-800/60 dark:bg-store-950/60 dark:text-store-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-store-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-store-500"></span>
                </span>
                Study material
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Browse by category
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Choose a category to explore material for your course.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Updated for 2024–25 Session</span>
            </div>
          </div>
        </ScrollReveal>

        <StaggerReveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_STORE_CATEGORIES.map((c) => {
            const Icon = c.icon;
            const toPath = c.slug === "combos" ? "/store/combos" : `/store/${c.slug}`;
            return (
              <StaggerItem key={c.slug} className="h-full">
                <Link
                  to={toPath}
                  className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-store-300 hover:shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-store-600 text-white">
                      <Icon width={20} height={20} className="stroke-[2]" />
                    </span>
                    <span className="font-semibold text-ink group-hover:text-store-700">
                      {c.label}
                    </span>
                  </div>

                  {c.description && <span className="mt-2 text-xs text-muted line-clamp-2">{c.description}</span>}
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
