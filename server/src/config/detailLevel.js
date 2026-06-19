export const DETAIL_LEVELS = ["standard", "detailed"];
export const DEFAULT_DETAIL_LEVEL = "detailed";

export function normalizeDetailLevel(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (trimmed === "standard") return "standard";
  return DEFAULT_DETAIL_LEVEL;
}

export function clampFlashcardCount(value, { min = 1, max = 10, fallback = 5 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
