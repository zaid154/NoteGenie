export const DETAIL_LEVELS = [
  { id: "detailed", label: "Detailed", hint: "Full coverage for large PDFs" },
  { id: "standard", label: "Standard", hint: "Concise summary" },
];
export const DEFAULT_DETAIL_LEVEL = "detailed";
export const CHUNKED_PDF_BYTES = 1_572_864;

export function normalizeDetailLevel(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  return trimmed === "standard" ? "standard" : DEFAULT_DETAIL_LEVEL;
}
