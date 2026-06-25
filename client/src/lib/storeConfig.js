// FLOW: Storefront static config (v1 fallback). Phase 5 wires these from admin Settings via
// GET /api/catalog/storefront; until then StoreLayout/StoreHome read these defaults.

export const STORE_CONFIG = {
  brandName: "NoteGenie Store",
  utilityBarText: "India's #1 study material store — instant download",
  whatsappNumber: "919350849407", // E.164 without '+', used in https://wa.me/<num>
  supportEmail: "support@notegenie.app",
  socials: { instagram: "", facebook: "", youtube: "", telegram: "" },
};

export function whatsappLink(text = "", number = STORE_CONFIG.whatsappNumber) {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
