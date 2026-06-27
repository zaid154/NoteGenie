// FLOW: Storefront static config (client fallback). The real values come from the server via
// GET /api/catalog/storefront (admin DB → server env). These are only last-resort defaults
// for when that fetch hasn't resolved yet. The WhatsApp number is NOT hardcoded — it reads
// from VITE_WHATSAPP_NUMBER (build-time) and is normally overridden by the storefront API.

export const STORE_CONFIG = {
  brandName: "NoteGenie Store",
  utilityBarText: "India's #1 study material store — instant download",
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/[^\d]/g, ""),
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@notegenie.app",
  socials: { instagram: "", facebook: "", youtube: "", telegram: "" },
};

// Returns "" when no number is configured, so callers can hide the link instead of
// rendering a broken https://wa.me/ URL.
export function whatsappLink(text = "", number = STORE_CONFIG.whatsappNumber) {
  if (!number) return "";
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
