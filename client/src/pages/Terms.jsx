import { Link } from "react-router-dom";
import MarketingShell from "../components/MarketingShell.jsx";

export default function Terms() {
  return (
    <MarketingShell backTo="/" backLabel="Home">
      <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
        <h1>Terms of Service</h1>
        <p>Last updated: June 2026</p>
        <p>
          By using NoteGenie, you agree to these terms. The service converts uploaded PDFs and links
          into AI-generated study materials. You retain ownership of your content; we process it only
          to provide the service.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Do not upload illegal content, abuse the API, or attempt to bypass usage limits. We may suspend
          accounts that violate these rules.
        </p>
        <h2>Subscriptions</h2>
        <p>
          Paid plans (Pro and Team) are billed in INR through Razorpay. Each payment activates your plan
          for 30 days. Plans do not auto-renew unless you pay again. Refunds follow our support policy —
          contact us if you believe a charge was made in error.
        </p>
        <h2>Disclaimer</h2>
        <p>
          AI-generated notes and quizzes may contain errors. Always verify important facts against your
          source material.
        </p>
        <p className="not-prose mt-8">
          <Link to="/privacy" className="text-indigo-600 underline dark:text-indigo-400">
            Privacy Policy
          </Link>
        </p>
      </article>
    </MarketingShell>
  );
}
