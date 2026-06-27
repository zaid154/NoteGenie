// FLOW: Loads public storefront config (GET /catalog/storefront) once, merged with the static
// STORE_CONFIG fallback. Used by StoreLayout (utility bar, WhatsApp), StoreHome (hero), and the
// app shell (feature flags → which nav items / routes are enabled).

import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { STORE_CONFIG } from "./storeConfig.js";

// Features default to enabled until the config loads (and the backend also enforces flags),
// so nothing flickers as "unavailable" on first paint.
export const DEFAULT_FEATURES = {
  upload: true,
  askAi: true,
  analytics: true,
  billing: true,
  store: true,
  workspaces: true,
};

let cache = null;
let inflight = null;

function fetchStorefront() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api
      .get("/catalog/storefront")
      .then((r) => {
        cache = r.data || {};
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

  const root = data || {};
  const s = root.storefront || {};
  return {
    utilityBarText: s.utilityBarText || STORE_CONFIG.utilityBarText,
    whatsappNumber: s.whatsappNumber || STORE_CONFIG.whatsappNumber,
    supportEmail: s.supportEmail || STORE_CONFIG.supportEmail,
    heroTitle: s.heroTitle || "",
    heroSubtitle: s.heroSubtitle || "",
    heroBannerUrl: s.heroBannerUrl || "",
    socials: s.socials || STORE_CONFIG.socials,
    features: { ...DEFAULT_FEATURES, ...(root.features || {}) },
    aiEnabled: root.aiEnabled !== false,
  };
}

// Convenience: just the feature flags (same cached fetch).
export function useFeatures() {
  return useStorefront().features;
}

// Convenience: the AI master switch (false when an admin has turned AI features off).
export function useAiEnabled() {
  return useStorefront().aiEnabled;
}
