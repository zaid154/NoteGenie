// FLOW: App.jsx route renders this page (Refund & Billing Policy). Public legal page linked
// from the footer. Covers paid study-material purchases, AI plan billing, and refund handling.

import { Link } from "react-router-dom";
import MarketingShell from "../components/MarketingShell.jsx";

export default function Refund() {
  return (
    <MarketingShell backTo="/" backLabel="Home">
      <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
        <h1>Refund &amp; Billing Policy</h1>
        <p>Last updated: June 2026</p>
        <p>
          This policy explains how billing works for paid study material and AI plans on NoteGenie,
          and when refunds apply. Most material in our store is free; this policy only concerns paid
          purchases.
        </p>

        <h2>Payments</h2>
        <p>
          Paid resources and AI plans are billed in INR through Razorpay (UPI, cards, net banking).
          Prices are shown before checkout. Once a payment succeeds, access is granted instantly and a
          record appears in your <strong>Billing → Purchase history</strong>.
        </p>

        <h2>Digital goods &amp; refunds</h2>
        <p>
          Study materials are digital downloads delivered immediately, so purchases are generally
          non-refundable once the file has been downloaded. We will, however, issue a refund or
          replacement if:
        </p>
        <ul>
          <li>You were charged but did not receive access to the resource.</li>
          <li>The file is corrupted, unreadable, or materially different from its description.</li>
          <li>You were charged more than once for the same item.</li>
        </ul>

        <h2>AI plans</h2>
        <p>
          Pro and Team plans activate for 30 days and do not auto-renew. If you believe a plan charge
          was made in error, contact us within 7 days and we will review it.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Email us or use the contact page with your registered email and the order details from your
          billing history. We aim to respond within 2–3 business days. Approved refunds are returned to
          the original payment method.
        </p>

        <p className="not-prose mt-8 flex flex-wrap gap-4">
          <Link to="/contact" className="text-accent-600 underline dark:text-accent-400">Contact support</Link>
          <Link to="/terms" className="text-accent-600 underline dark:text-accent-400">Terms of Service</Link>
          <Link to="/privacy" className="text-accent-600 underline dark:text-accent-400">Privacy Policy</Link>
        </p>
      </article>
    </MarketingShell>
  );
}
