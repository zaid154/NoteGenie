// FLOW: Notes detail config. Frontend sends detailLevel/count values, this file normalizes them, and generation services use the safe values for notes/flashcards.

// Yeh file notes generation ki detail settings rakhti hai.
// "config" ka matlab hai app ke common settings/values jo multiple files use karti hain.
// Isse magic numbers/string values code ke andar scattered nahi rehte.

// User notes ko normal length me chahta hai ya zyada detailed version me.
export const DETAIL_LEVELS = ["standard", "detailed"];
export const DEFAULT_DETAIL_LEVEL = "detailed";

// Large PDF/text ke liye backend notes ko sections me todkar generate karta hai.
// Ye limits batati hain kab chunked generation use hogi aur kitni parallel requests chalengi.
export const CHUNKED_SECTION_LIMIT = 5;
export const CHUNKED_SECTION_CONCURRENCY = 2;
export const CHUNKED_PDF_BYTES = 1_572_864;
export const CHUNKED_TEXT_CHARS = 30_000;

// User/frontend se jo value aaye use safe valid detail level me convert karta hai.
// Agar invalid ya empty value aaye to default "detailed" return hota hai.
export function normalizeDetailLevel(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (trimmed === "standard") return "standard";
  return DEFAULT_DETAIL_LEVEL;
}

// Flashcards count ko allowed range me rakhta hai.
// Example: 99 aaye to 10 ban jayega, 0 aaye to 1, invalid aaye to fallback 5.
export function clampFlashcardCount(value, { min = 1, max = 10, fallback = 5 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
