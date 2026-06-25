// FLOW: Storefront Contact page (public, under StoreLayout). WhatsApp + email from storefront config.

import { IconChat, IconMail } from "../../components/icons.jsx";
import { whatsappLink } from "../../lib/storeConfig.js";
import { useStorefront } from "../../lib/useStorefront.js";

export default function Contact() {
  const store = useStorefront();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">Contact us</h1>
      <p className="text-muted">Have a question about an order or which material you need? Reach out — we usually reply within a few hours.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={whatsappLink("Hi, I have a question", store.whatsappNumber)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5 hover:border-store-300">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"><IconChat width={20} height={20} /></span>
          <span>
            <span className="block font-semibold text-ink">WhatsApp</span>
            <span className="text-sm text-muted">Chat with us now</span>
          </span>
        </a>
        {store.supportEmail && (
          <a href={`mailto:${store.supportEmail}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5 hover:border-store-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300"><IconMail width={20} height={20} /></span>
            <span>
              <span className="block font-semibold text-ink">Email</span>
              <span className="text-sm text-muted">{store.supportEmail}</span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
