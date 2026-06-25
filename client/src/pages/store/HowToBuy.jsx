// FLOW: Storefront "How to buy & download" page (public, under StoreLayout).

import { Link } from "react-router-dom";

const STEPS = [
  ["Find your material", "Use the search or browse by category, university and degree. Open any resource to see details."],
  ["Add to cart", "Add one or more resources (or a combo pack) to your cart. You can keep browsing."],
  ["Sign in & pay", "Go to your cart and Proceed to pay. Sign in if you haven't, then pay once via Razorpay (UPI / cards)."],
  ["Download instantly", "Your files unlock immediately and are saved in My downloads — re-download anytime."],
];

export default function HowToBuy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">How to buy & download</h1>
      <ol className="space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-store-600 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold text-ink">{t}</p>
              <p className="text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link to="/store" className="btn-primary">Browse the store</Link>
        <Link to="/faq" className="btn-outline">Read FAQ</Link>
      </div>
    </div>
  );
}
