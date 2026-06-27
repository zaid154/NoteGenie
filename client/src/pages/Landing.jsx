// FLOW: App.jsx route renders this page (Landing). Public, store-first marketing page.
// Emphasises the study-material marketplace (mostly free), previews categories + popular
// resources from the catalog API, and presents AI tools as a dashboard add-on (not the
// main product). Library/Upload/Ask AI/Billing are intentionally NOT in the public nav.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";
import { MarketingFooter } from "../components/MarketingShell.jsx";
import ResourceCard from "../components/store/ResourceCard.jsx";
import { STORE_CATEGORIES } from "../lib/storeCategories.js";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/motion.jsx";
import {
  IconSearch,
  IconCheck,
  IconDownload,
  IconSparkles,
  IconBrain,
  IconChat,
  IconCards,
  IconChart,
  IconShield,
  IconHeadphones,
  IconChevronRight,
} from "../components/icons.jsx";

// AI tools are add-ons that live inside the dashboard — never the headline product.
const AI_TOOLS = [
  { icon: IconChat, title: "Ask AI", desc: "Ask questions, grounded in your material." },
  { icon: IconSparkles, title: "Upload & summarize", desc: "Drop a PDF or link — get a clean summary." },
  { icon: IconBrain, title: "Generate notes", desc: "Structured notes from any source." },
  { icon: IconCards, title: "Flashcards", desc: "Auto-built cards with spaced repetition." },
  { icon: IconChart, title: "Quizzes", desc: "Practice quizzes to test yourself." },
];

const BENEFITS = [
  { icon: IconDownload, title: "Instant download", desc: "Get your files the moment you grab them — yours forever in My Downloads." },
  { icon: IconCheck, title: "Mostly free", desc: "Most notes, papers and guides are 100% free. Premium material is optional." },
  { icon: IconShield, title: "Secure payments", desc: "Pay safely via UPI or cards through Razorpay. No card needed to start." },
  { icon: IconHeadphones, title: "Student support", desc: "Stuck finding the right material? Our team helps you pick." },
];

// A small reusable category tile — each category gets its own icon + colour tint.
function CategoryTile({ to, label, icon: Icon, tint }) {
  return (
    <Link
      to={to}
      className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300"
    >
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tint || "bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"}`}>
        {Icon ? <Icon width={20} height={20} /> : null}
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </Link>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get("/catalog/resources", { params: { sort: "popular", limit: 8 } })
      .then((r) => setPopular(r.data.resources || []))
      .catch(() => setPopular([]))
      .finally(() => setLoadingPopular(false));
  }, []);

  function search(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/store/search?q=${encodeURIComponent(term)}` : "/store");
  }

  return (
    <div className="relative min-h-screen">
      <div className="mesh-bg" aria-hidden="true" />

      {/* Header — public nav is store-first. No Library/Upload/Ask AI/Billing here. */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/store" className="btn-ghost hidden sm:inline-flex">Open Store</Link>
          <Link to="/pricing" className="btn-ghost hidden sm:inline-flex">Pricing</Link>
          <Link to="/login" className="btn-ghost">Log in</Link>
          <Link to="/register" className="btn-primary">Sign up</Link>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-8">
        {/* Hero — store-themed (teal) marketplace messaging */}
        <section className="store-theme mt-6 overflow-hidden rounded-3xl border border-store-200 bg-gradient-to-br from-store-50 via-surface to-storeaccent-50 px-6 py-12 dark:border-store-900 dark:from-store-950/40 dark:via-surface dark:to-store-900/20 sm:px-12 sm:py-16">
          <StaggerContainer>
            <StaggerItem>
              <span className="store-pill">Study material marketplace for students</span>
            </StaggerItem>
            <StaggerItem>
              <h1 className="font-display mt-5 max-w-3xl text-4xl leading-[1.1] text-ink sm:text-6xl">
                Free notes, papers &amp; guides — for every course.
              </h1>
            </StaggerItem>
            <StaggerItem>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                Browse thousands of study resources by subject, class, exam and topic. Most material
                is <span className="font-semibold text-store-700 dark:text-store-300">100% free</span> —
                premium guides are optional. AI study tools come built in once you sign up.
              </p>
            </StaggerItem>

            {/* Search box → store search */}
            <StaggerItem>
              <form
                onSubmit={search}
                className="mt-7 flex max-w-xl gap-2 rounded-xl border border-line bg-surface p-2 shadow-soft"
              >
                <input
                  className="input flex-1 border-0 bg-transparent focus:ring-0"
                  placeholder="Search notes, subjects, courses…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search study materials"
                />
                <button type="submit" className="btn-primary shrink-0">
                  <IconSearch width={16} height={16} /> Search
                </button>
              </form>
            </StaggerItem>

            {/* Primary CTAs */}
            <StaggerItem>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/store" className="btn-primary px-6 py-3">
                  <IconDownload width={16} height={16} /> Browse Free Study Materials
                </Link>
                <Link to="/register" className="btn-outline px-6 py-3">
                  Sign up — it's free
                </Link>
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5"><IconCheck width={15} height={15} className="text-store-600" /> Instant download</span>
                <span className="inline-flex items-center gap-1.5"><IconCheck width={15} height={15} className="text-store-600" /> No card to start</span>
                <span className="inline-flex items-center gap-1.5"><IconCheck width={15} height={15} className="text-store-600" /> Secure UPI / cards</span>
              </p>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* Categories preview */}
        <section className="store-theme mt-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl text-ink sm:text-3xl">Browse by category</h2>
              <p className="mt-1 text-sm text-muted">Find material by what you need.</p>
            </div>
            <Link to="/store" className="hidden items-center gap-1 text-sm font-medium text-store-700 hover:text-store-800 dark:text-store-300 sm:inline-flex">
              View all <IconChevronRight width={15} height={15} />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {STORE_CATEGORIES.map((c) => (
              <CategoryTile key={c.slug} to={`/store/${c.slug}`} label={c.label} icon={c.icon} tint={c.tint} />
            ))}
            <Link
              to="/store/combos"
              className="card-solid flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:border-store-300"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-storeaccent-100 text-storeaccent-600 dark:bg-store-950">
                <IconCheck width={20} height={20} />
              </span>
              <span className="text-sm font-semibold text-ink">Combo packs</span>
            </Link>
          </div>
        </section>

        {/* Popular resources preview */}
        {(loadingPopular || popular.length > 0) && (
          <section className="store-theme mt-16">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink sm:text-3xl">Popular right now</h2>
                <p className="mt-1 text-sm text-muted">Most-downloaded study material this week.</p>
              </div>
              <Link to="/store" className="hidden items-center gap-1 text-sm font-medium text-store-700 hover:text-store-800 dark:text-store-300 sm:inline-flex">
                Open store <IconChevronRight width={15} height={15} />
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loadingPopular
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card-solid h-40 animate-pulse bg-canvas/60" />
                  ))
                : popular.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          </section>
        )}

        {/* AI tools — clearly an add-on, inside the dashboard */}
        <ScrollReveal>
          <section className="mt-20 rounded-3xl border border-accent-100 bg-accent-50/40 p-8 dark:border-accent-900 dark:bg-accent-950/20 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">
                <IconSparkles width={13} height={13} /> Bonus, included free
              </span>
            </div>
            <h2 className="font-display mt-4 text-2xl text-ink sm:text-3xl">AI study tools in your dashboard</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Beyond the store, every account gets a set of AI tools to study smarter. They're extras —
              the marketplace is the main event.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {AI_TOOLS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-line bg-surface p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">
                    <Icon width={18} height={18} />
                  </span>
                  <p className="mt-3 font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
            <Link to="/register" className="btn-primary mt-7 inline-flex">
              Create a free account
            </Link>
          </section>
        </ScrollReveal>

        {/* Trust / benefits */}
        <section className="mt-20">
          <h2 className="font-display text-center text-2xl text-ink sm:text-3xl">Why students use NoteGenie</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <ScrollReveal key={title} delay={i * 0.06}>
                <div className="panel h-full p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300">
                    <Icon width={20} height={20} />
                  </span>
                  <p className="mt-4 font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <ScrollReveal>
          <section className="store-theme cta-glow mt-20 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-store-200 bg-gradient-to-br from-store-600 to-store-700 px-8 py-12 text-white sm:px-12">
            <div>
              <h2 className="font-display text-3xl">Start with free study material today</h2>
              <p className="mt-2 max-w-xl text-store-50/90">
                Browse the store free, or sign up to save resources and unlock AI study tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/store" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-store-700 shadow-soft transition hover:bg-store-50">
                Open Store
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Sign Up
              </Link>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <MarketingFooter />
    </div>
  );
}
