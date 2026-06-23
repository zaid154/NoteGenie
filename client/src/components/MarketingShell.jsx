// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (MarketingShell). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-line py-8 text-center text-sm text-muted">
      <div className="flex justify-center gap-6">
        <Link to="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link to="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link to="/pricing" className="hover:text-ink">
          Pricing
        </Link>
      </div>
      <p className="mt-4">© {new Date().getFullYear()} NoteGenie</p>
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
          <Link to="/login" className="btn-ghost hidden sm:inline-flex">
            Log in
          </Link>
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

