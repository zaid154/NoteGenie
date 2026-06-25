// FLOW: Storefront Support hub (public, under StoreLayout). Links to the help resources.

import { Link } from "react-router-dom";
import { IconChat, IconDownload, IconChart } from "../../components/icons.jsx";

const LINKS = [
  { to: "/store/how-to-buy", label: "How to buy & download", desc: "Step-by-step guide", icon: IconDownload },
  { to: "/faq", label: "FAQ", desc: "Common questions answered", icon: IconChart },
  { to: "/contact", label: "Contact us", desc: "WhatsApp or email support", icon: IconChat },
];

export default function Support() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">Help center</h1>
      <div className="space-y-2">
        {LINKS.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-store-300">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"><Icon width={18} height={18} /></span>
            <span>
              <span className="block font-semibold text-ink">{label}</span>
              <span className="text-sm text-muted">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
