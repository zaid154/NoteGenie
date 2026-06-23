// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Frontend supported output languages. Upload/document/tutor UIs import this list, selected value goes in API body, and backend config/languages.js normalizes it.

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

