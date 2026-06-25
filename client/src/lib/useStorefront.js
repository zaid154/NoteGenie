// FLOW: Loads public storefront config (GET /catalog/storefront) once, merged with the static
// STORE_CONFIG fallback. Used by StoreLayout (utility bar, WhatsApp) and StoreHome (hero).

import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { STORE_CONFIG } from "./storeConfig.js";

let cache = null;
let inflight = null;

function fetchStorefront() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api
      .get("/catalog/storefront")
      .then((r) => {
        cache = r.data.storefront || {};
        return cache;
      })
      .catch(() => ({}));
  }
  return inflight;
}

export function useStorefront() {
  const [data, setData] = useState(cache);

  useEffect(() => {
    let on = true;
    fetchStorefront().then((d) => on && setData(d));
    return () => { on = false; };
  }, []);

  const s = data || {};
  return {
    utilityBarText: s.utilityBarText || STORE_CONFIG.utilityBarText,
    whatsappNumber: s.whatsappNumber || STORE_CONFIG.whatsappNumber,
    supportEmail: s.supportEmail || STORE_CONFIG.supportEmail,
    heroTitle: s.heroTitle || "",
    heroSubtitle: s.heroSubtitle || "",
    heroBannerUrl: s.heroBannerUrl || "",
    socials: s.socials || STORE_CONFIG.socials,
  };
}
