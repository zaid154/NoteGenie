// FLOW: Language config. Frontend sends output language, this file validates it, and Gemini prompts use the normalized language.

// Yeh file output language settings rakhti hai.
// User notes/flashcards/quiz/tutor kis language me chahta hai, usko yahan validate karte hain.

// Agar user language select na kare ya invalid value bheje to English use hogi.
export const DEFAULT_OUTPUT_LANGUAGE = "English";

// App me officially supported output languages.
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

// Frontend/API se aayi language ko clean karke supported language se match karta hai.
// Matching case-insensitive hai: "hindi", "Hindi", "HINDI" sab Hindi banenge.
// Agar match na mile to default English return hoti hai.
export function normalizeOutputLanguage(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return DEFAULT_OUTPUT_LANGUAGE;
  const match = OUTPUT_LANGUAGES.find((l) => l.toLowerCase() === trimmed.toLowerCase());
  return match || DEFAULT_OUTPUT_LANGUAGE;
}
