// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Landing). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";
import { MarketingFooter } from "../components/MarketingShell.jsx";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/motion.jsx";

const features = [
  { n: "01", title: "Upload", desc: "PDF, article, or YouTube — we extract the content." },
  { n: "02", title: "Study", desc: "Notes, flashcards with spaced repetition, and practice quizzes." },
  { n: "03", title: "Ask", desc: "Chat with a tutor grounded in your uploaded material." },
  { n: "04", title: "Track", desc: "See quiz scores and what needs review." },
];

const benefits = [
  "Structured notes from any source",
  "Spaced-repetition flashcards",
  "AI tutor that read your material",
];

function ProductPreview() {
  return (
    <div className="panel overflow-hidden shadow-soft">
      <div className="border-b border-line bg-canvas/60 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs text-muted">NoteGenie — Dashboard</span>
        </div>
      </div>
      <div className="grid gap-px bg-line lg:grid-cols-3">
        <div className="space-y-3 bg-surface p-5 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Materials", value: "12" },
              { label: "Avg score", value: "84%" },
              { label: "Due cards", value: "7" },
            ].map((s) => (
              <div key={s.label} className="stat-card py-3">
                <p className="text-xs text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-ink">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-8 text-center dark:border-indigo-900 dark:bg-indigo-950/20">
            <p className="text-sm font-medium text-ink">Drop PDF or paste a link</p>
            <p className="mt-1 text-xs text-muted">Notes · flashcards · quiz in minutes</p>
          </div>
        </div>
        <div className="space-y-3 bg-surface p-5">
          <p className="text-xs font-semibold uppercase text-muted">Quiz preview</p>
          <div className="rounded-lg border border-line p-3">
            <p className="text-sm font-medium text-ink">What is photosynthesis?</p>
            <div className="mt-3 space-y-1.5">
              {["Converting light to energy", "Cell division", "Water evaporation"].map((opt, i) => (
                <div
                  key={opt}
                  className={`rounded-md border px-2 py-1.5 text-xs ${
                    i === 0 ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40" : "border-line text-muted"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [prices, setPrices] = useState({ pro: "₹749", team: "₹2,499" });

  useEffect(() => {
    api
      .get("/billing/public-config")
      .then((r) => {
        const pro = r.data.plans?.find((p) => p.id === "pro");
        const team = r.data.plans?.find((p) => p.id === "team");
        setPrices({
          pro: pro?.displayPrice || "₹749",
          team: team?.displayPrice || "₹2,499",
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="mesh-bg" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/pricing" className="btn-ghost hidden sm:inline-flex">
            Pricing
          </Link>
          <Link to="/login" className="btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-24 pt-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <section>
            <StaggerContainer>
              <StaggerItem>
                <p className="text-sm font-medium uppercase tracking-widest text-muted">For students & self-learners</p>
              </StaggerItem>
              <StaggerItem>
                <h1 className="font-display mt-4 text-5xl leading-[1.1] text-ink lg:text-6xl">
                  Turn any source into a study kit
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-6 text-lg leading-relaxed text-muted">
                  Drop in a PDF or link. NoteGenie writes structured notes, builds flashcards,
                  generates quizzes, and gives you an AI tutor that actually read your material.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/register" className="btn-primary px-6 py-3">
                    Start free — no card needed
                  </Link>
                  <Link to="/login" className="btn-outline px-6 py-3">
                    I have an account
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </section>

          <ScrollReveal delay={0.15} className="mt-12 lg:mt-0">
            <ProductPreview />
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.05}>
          <section className="mt-16 rounded-xl border border-line bg-surface px-6 py-5">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
              PDF · YouTube · Articles
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-ink">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="text-indigo-600">✓</span> {b}
                </li>
              ))}
            </ul>
          </section>
        </ScrollReveal>

        <section className="mt-20 overflow-hidden rounded-xl border border-line bg-line shadow-soft sm:grid sm:grid-cols-2 sm:gap-px">
          {features.map(({ n, title, desc }, i) => (
            <ScrollReveal key={n} delay={i * 0.08}>
              <div className="bg-surface p-8">
                <span className="text-xs font-semibold tabular-nums text-muted">{n}</span>
                <h3 className="mt-3 font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </section>

        <ScrollReveal delay={0.1}>
          <section className="mt-16 grid gap-4 sm:grid-cols-2">
            <div className="panel p-6">
              <p className="text-xs font-semibold uppercase text-muted">Pro</p>
              <p className="mt-2 text-3xl font-bold text-ink">
                {prices.pro}
                <span className="text-base font-normal text-muted"> / 30 days</span>
              </p>
              <p className="mt-2 text-sm text-muted">50 uploads · unlimited tutor & quizzes</p>
              <Link to="/pricing" className="btn-outline mt-4 inline-flex text-sm">
                View Pro
              </Link>
            </div>
            <div className="panel p-6">
              <p className="text-xs font-semibold uppercase text-muted">Team</p>
              <p className="mt-2 text-3xl font-bold text-ink">
                {prices.team}
                <span className="text-base font-normal text-muted"> / 30 days</span>
              </p>
              <p className="mt-2 text-sm text-muted">200 uploads · shared library (soon)</p>
              <Link to="/pricing" className="btn-outline mt-4 inline-flex text-sm">
                View Team
              </Link>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <section className="cta-glow mt-16 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-8 py-10 dark:border-indigo-900 dark:bg-indigo-950/30">
            <div>
              <h2 className="text-2xl font-semibold text-ink">Free to start</h2>
              <p className="mt-1 text-muted">3 uploads/month. Upgrade when you need more.</p>
            </div>
            <Link to="/pricing" className="btn-outline">
              See pricing
            </Link>
          </section>
        </ScrollReveal>
      </main>

      <MarketingFooter />
    </div>
  );
}

