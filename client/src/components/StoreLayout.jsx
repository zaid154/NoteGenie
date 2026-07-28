// FLOW: Public storefront chrome. Wraps all /store/* routes (layout route via <Outlet/>).
// Works logged-out and logged-in. Scopes the teal/amber palette with .store-theme so the
// indigo app is untouched. Header = logo + category nav + search + account + cart badge.

import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { DrawerPanel, PageTransition, motion, AnimatePresence, useReducedMotion } from "./motion.jsx";
import Logo from "./Logo.jsx";
import { STORE_CATEGORIES } from "../lib/storeCategories.js";
import { STORE_CONFIG, whatsappLink } from "../lib/storeConfig.js";
import { useStorefront } from "../lib/useStorefront.js";
import {
  IconSearch, IconCart, IconMenu, IconX, IconChat, IconUser, IconDownload, IconHome,
} from "./icons.jsx";

const NAV = [
  { to: "/", label: "Home", end: true },
  ...STORE_CATEGORIES.map((c) => ({ to: `/store/${c.slug}`, label: c.label })),
  { to: "/store/combos", label: "Combos" },
];

const FOOTER_COLS = [
  {
    title: "About Us",
    links: [
      { to: "/about", label: "About NoteGenie" },
      { to: "/store/how-to-buy", label: "How it works" },
      { to: "/faq", label: "Why choose us" },
    ],
  },
  {
    title: "Student Support",
    links: [
      { to: "/store/how-to-buy", label: "How to buy & download" },
      { to: "/faq", label: "FAQ" },
      { to: "/contact", label: "Contact us" },
      { to: "/support", label: "Help center" },
    ],
  },
  {
    title: "Important Links",
    links: [
      { to: "/store/assignments", label: "Solved assignments" },
      { to: "/store/question-papers", label: "Question papers" },
      { to: "/store/projects", label: "Projects & synopsis" },
      { to: "/store/combos", label: "Combo packs" },
    ],
  },
  {
    title: "Popular Links",
    links: [
      { to: "/store/help-books", label: "Help books" },
      { to: "/store/notes", label: "Study notes" },
      { to: "/store", label: "All universities" },
      { to: "/pricing", label: "AI study plans" },
    ],
  },
];

export default function StoreLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const store = useStorefront();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);

  function submitSearch(e) {
    e.preventDefault();
    navigate(`/store/search?q=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  }

  function signOut() {
    logout();
    setAcctOpen(false);
    navigate("/store");
  }

  return (
    <div className="store-theme min-h-screen bg-canvas">
      {/* A11y: skip past the header/nav straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-store-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>
      {/* Utility bar */}
      {store.utilityBarText && (
        <div className="store-primary">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
            <span className="truncate">{store.utilityBarText}</span>
            {store.whatsappNumber && (
              <a href={whatsappLink("Hi, I need help with study material", store.whatsappNumber)} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 font-semibold hover:underline sm:inline-flex">
                <IconChat width={14} height={14} /> WhatsApp support
              </a>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button type="button" className="btn-ghost rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <IconMenu />
          </button>
          <Link to="/" className="shrink-0"><Logo tone="store" /></Link>

          {/* Search (desktop) */}
          <form onSubmit={submitSearch} className="relative ml-2 hidden flex-1 md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IconSearch width={16} height={16} /></span>
            <input
              className="input pl-9"
              placeholder="Search course code, assignment, book…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Account */}
            {user ? (
              <div className="relative">
                <button type="button" onClick={() => setAcctOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-store-100 text-sm font-bold text-store-700 dark:bg-store-950 dark:text-store-300">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </button>
                <AnimatePresence>
                  {acctOpen && (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
                      animate={reduced ? {} : { opacity: 1, y: 0, scale: 1 }}
                      exit={reduced ? {} : { opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                      style={{ transformOrigin: "top right" }}
                      className="absolute right-0 mt-1 w-48 rounded-xl border border-line bg-surface p-1 shadow-card"
                      onMouseLeave={() => setAcctOpen(false)}
                    >
                      <Link to="/app" className="store-nav-idle block" onClick={() => setAcctOpen(false)}><IconHome width={16} height={16} className="mr-2 inline" />Dashboard</Link>
                      <Link to="/my-downloads" className="store-nav-idle block" onClick={() => setAcctOpen(false)}><IconDownload width={16} height={16} className="mr-2 inline" />My downloads</Link>
                      <button type="button" onClick={signOut} className="store-nav-idle block w-full text-left text-red-600">Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink hover:bg-slate-100 sm:inline-flex dark:hover:bg-slate-800">Sign in</Link>
                <Link to="/register" className="btn-primary px-3 py-1.5 text-sm">Register</Link>
              </>
            )}

            {/* Cart */}
            <Link to="/store/cart" className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cart">
              <IconCart width={20} height={20} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                    animate={reduced ? {} : { scale: 1, opacity: 1 }}
                    exit={reduced ? {} : { scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-storeaccent-500 px-1 text-[10px] font-bold text-white"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>

        {/* Category nav (desktop) */}
        <nav className="mx-auto hidden max-w-7xl items-center gap-1 px-4 pb-2 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "store-nav-active" : "store-nav-idle")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Mobile drawer */}
      <DrawerPanel open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex h-full flex-col p-4 pt-12">
          <form onSubmit={submitSearch} className="relative mb-4">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><IconSearch width={16} height={16} /></span>
            <input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <nav className="space-y-0.5">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `block ${isActive ? "store-nav-active" : "store-nav-idle"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-line pt-3">
            {user ? (
              <>
                <Link to="/my-downloads" onClick={() => setMenuOpen(false)} className="store-nav-idle block">My downloads</Link>
                <button onClick={signOut} className="store-nav-idle block w-full text-left text-red-600">Sign out</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="store-nav-idle block"><IconUser width={16} height={16} className="mr-2 inline" />Sign in</Link>
            )}
          </div>
        </div>
      </DrawerPanel>

      {/* Page content — keyed on pathname so each route fades/slides up on navigation. */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-4 sm:py-6">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>

      {/* Ultra-Premium White / Light Footer */}
      <footer className="relative border-t border-line bg-surface text-ink pt-14 pb-10">
        {/* Subtle Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-store-500/40 to-transparent" />

        <div className="mx-auto max-w-7xl px-4 space-y-12">
          {/* Main Grid */}
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Brand & Creator Column (5/12 width) */}
            <div className="lg:col-span-5 space-y-5">
              <Logo tone="store" />
              <p className="max-w-sm text-sm text-muted leading-relaxed">
                India’s premier study material store &amp; AI study assistant. Download verified solved assignments, question papers, notes &amp; interactive AI tutor.
              </p>

              {/* Creator Badge Box */}
              <div className="rounded-2xl border border-line bg-canvas/60 p-4 space-y-1.5 max-w-sm shadow-soft">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Author: <strong className="text-store-600 dark:text-store-400 font-bold">Mohd Zaid</strong></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-store-100 px-2.5 py-0.5 text-[10px] font-bold text-store-700 dark:bg-store-950 dark:text-store-300">Creator</span>
                </div>
                <p className="text-xs text-muted">
                  Contact: <a href="mailto:zaidm1323@gmail.com" className="text-ink font-medium hover:text-store-600 underline">zaidm1323@gmail.com</a>
                </p>
                <p className="text-xs text-muted">
                  GitHub: <a href="https://github.com/zaid154" target="_blank" rel="noreferrer" className="text-ink font-medium hover:text-store-600 underline">github.com/zaid154</a>
                </p>
              </div>

              {store.whatsappNumber && (
                <div>
                  <a
                    href={whatsappLink("Hi, I need help with study material", store.whatsappNumber)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02] hover:bg-emerald-700"
                  >
                    <IconChat width={16} height={16} /> Instant WhatsApp Support
                  </a>
                </div>
              )}
            </div>

            {/* Links Grid (7/12 width) */}
            <div className="lg:col-span-7 grid gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink">Study Store</p>
                <ul className="mt-4 space-y-2.5 text-sm text-muted">
                  <li><Link to="/store/assignments" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Solved Assignments</Link></li>
                  <li><Link to="/store/question-papers" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Question Papers</Link></li>
                  <li><Link to="/store/help-books" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Help Books &amp; Guides</Link></li>
                  <li><Link to="/store/notes" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Study Notes</Link></li>
                  <li><Link to="/store/combos" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Combo Savings Packs</Link></li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink">Student Support</p>
                <ul className="mt-4 space-y-2.5 text-sm text-muted">
                  <li><Link to="/store/how-to-buy" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">How to Buy &amp; Download</Link></li>
                  <li><Link to="/faq" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Frequently Asked Questions</Link></li>
                  <li><Link to="/contact" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Contact Support Team</Link></li>
                  <li><Link to="/support" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Help &amp; Documentation</Link></li>
                  <li><Link to="/pricing" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Pro AI Study Plans</Link></li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-ink">Legal &amp; Trust</p>
                <ul className="mt-4 space-y-2.5 text-sm text-muted">
                  <li><Link to="/terms" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Terms &amp; Conditions</Link></li>
                  <li><Link to="/privacy" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/refund" className="hover:text-store-700 dark:hover:text-store-300 transition-colors">Refund &amp; Cancellation</Link></li>
                  <li className="pt-2"><span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-lg">✓ Razorpay Secure</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-line flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted">
            <p>© {new Date().getFullYear()} NoteGenie. Crafted for student excellence.</p>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span>Instant PDF Download</span>
              <span>&bull;</span>
              <span>256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
