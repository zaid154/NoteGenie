// FLOW: Storefront FAQ page (public, under StoreLayout). Simple accordion.

import { useState } from "react";

const FAQS = [
  ["How do I buy study material?", "Browse the store, add items to your cart, then sign in and pay once via Razorpay (UPI / cards). Your files appear in My downloads instantly."],
  ["Can I browse without an account?", "Yes — browsing is fully open. You only need to sign in to buy or download."],
  ["Are downloads instant?", "Yes. After a successful payment the files are available immediately and stay in My downloads forever."],
  ["What are combo packs?", "Combos bundle several resources (assignments, papers, books) at a lower total price than buying them separately."],
  ["What payment methods are supported?", "All Indian payment methods via Razorpay — UPI, debit/credit cards, and netbanking."],
  ["I need help choosing — can I talk to someone?", "Yes, message us on WhatsApp from the Contact page and we'll guide you to the right material."],
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">Frequently asked questions</h1>
      <div className="space-y-2">
        {FAQS.map(([q, a], i) => (
          <div key={q} className="rounded-xl border border-line bg-surface">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium text-ink">
              {q}
              <span className="text-muted">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-muted">{a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
