// FLOW: Public storefront chrome. Wraps all /store/* routes (layout route via <Outlet/>).
// Works logged-out and logged-in. Scopes the teal/amber palette with .store-theme so the
// indigo app is untouched. Header = logo + category nav + search + account + cart badge.

import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { DrawerPanel } from "./motion.jsx";
import Logo from "./Logo.jsx";
import { STORE_CATEGORIES } from "../lib/storeCategories.js";
import { STORE_CONFIG, whatsappLink } from "../lib/storeConfig.js";
import { useStorefront } from "../lib/useStorefront.js";
import {
  IconSearch, IconCart, IconMenu, IconX, IconChat, IconUser, IconDownload, IconHome,
} from "./icons.jsx";

const NAV = [
  { to: "/store", label: "Home", end: true },
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
          <Link to="/store" className="shrink-0"><Logo /></Link>

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
                {acctOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-line bg-surface p-1 shadow-card" onMouseLeave={() => setAcctOpen(false)}>
                    <Link to="/app" className="store-nav-idle block" onClick={() => setAcctOpen(false)}><IconHome width={16} height={16} className="mr-2 inline" />Dashboard</Link>
                    <Link to="/my-downloads" className="store-nav-idle block" onClick={() => setAcctOpen(false)}><IconDownload width={16} height={16} className="mr-2 inline" />My downloads</Link>
                    <button type="button" onClick={signOut} className="store-nav-idle block w-full text-left text-red-600">Sign out</button>
                  </div>
                )}
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
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-storeaccent-500 px-1 text-[10px] font-bold text-white">{count}</span>
              )}
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

      {/* Page content (key on pathname for a subtle remount) */}
      <main key={location.pathname} className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-bold uppercase tracking-wide text-ink">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}><Link to={l.to} className="text-sm text-muted hover:text-store-700 dark:hover:text-store-300">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Legal links */}
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 text-xs text-muted">
            <Link to="/terms" className="hover:text-store-700 dark:hover:text-store-300">Terms &amp; Conditions</Link>
            <Link to="/privacy" className="hover:text-store-700 dark:hover:text-store-300">Privacy Policy</Link>
            <Link to="/refund" className="hover:text-store-700 dark:hover:text-store-300">Refund &amp; Billing Policy</Link>
            <Link to="/contact" className="hover:text-store-700 dark:hover:text-store-300">Contact</Link>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 text-sm text-muted">
            <span>© {new Date().getFullYear()} {STORE_CONFIG.brandName}</span>
            {store.whatsappNumber && (
              <a href={whatsappLink("Hi, I need help", store.whatsappNumber)} target="_blank" rel="noreferrer" className="store-btn-accent">
                <IconChat width={16} height={16} /> Join our WhatsApp
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
