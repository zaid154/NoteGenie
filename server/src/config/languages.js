export const DEFAULT_OUTPUT_LANGUAGE = "English";

export const OUTPUT_LANGUAGES = [
  "English",
  "Hindi",
  "Urdu",
  "Arabic",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
];

export function normalizeOutputLanguage(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return DEFAULT_OUTPUT_LANGUAGE;
  const match = OUTPUT_LANGUAGES.find((l) => l.toLowerCase() === trimmed.toLowerCase());
  return match || DEFAULT_OUTPUT_LANGUAGE;
}
