// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (MarketingShell). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Footer columns link only to pages that already exist as routes (no broken links).
// Phase 6 makes these admin-manageable; for now they are static but complete.
const FOOTER_COLUMNS = [
  {
    title: "Store",
    links: [
      { label: "Browse store", to: "/store" },
      { label: "Combo packs", to: "/store/combos" },
      { label: "How to buy", to: "/store/how-to-buy" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Support", to: "/support" },
    ],
  },
  {
    title: "Help & Legal",
    links: [
      { label: "FAQ", to: "/faq" },
      { label: "Terms", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Refund & Billing", to: "/refund" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative mt-16 border-t border-line bg-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              A study material marketplace for students — notes, question papers, guides and more.
              Mostly free, premium optional. Plus AI study tools inside your dashboard.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-ink/80 transition hover:text-accent-600 dark:hover:text-accent-400">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">© {new Date().getFullYear()} NoteGenie. All rights reserved.</p>
          <p className="text-xs text-muted">Made for students · Secure payments via Razorpay</p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingShell({
  children,
  backTo = "/",
  backLabel = "Home",
  extraHeader,
  maxWidth = "max-w-5xl",
}) {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen">
      <div className="mesh-bg" aria-hidden="true" />
      <header className={`relative mx-auto flex ${maxWidth} items-center justify-between px-5 py-5`}>
        <Logo />
        <div className="flex items-center gap-2">
          {extraHeader}
          <Link to="/pricing" className="btn-ghost hidden sm:inline-flex">
            Pricing
          </Link>
          {/* Auth-aware: logged-in users go to their dashboard instead of seeing "Log in". */}
          {user ? (
            <Link to="/app" className="btn-ghost hidden sm:inline-flex">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
          )}
          <Link to={backTo} className="btn-ghost text-sm">
            ← {backLabel}
          </Link>
        </div>
      </header>
      <main className={`relative mx-auto ${maxWidth} px-5 pb-16 pt-4`}>{children}</main>
      <MarketingFooter />
    </div>
  );
}

