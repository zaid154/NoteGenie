// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Frontend copy of note detail options. Upload UI imports these values, sends selected detailLevel to backend, and backend config/detailLevel.js validates it again.

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

