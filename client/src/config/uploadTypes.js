// FLOW: Client mirror of the server's accepted upload formats. Drives the file
// input's accept attribute and client-side validation in Upload.jsx so users get
// instant feedback before a request is sent.

export const MAX_UPLOAD_MB = 15;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Extensions grouped only for the helper text; validation accepts any of them.
export const SUPPORTED_EXTS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".mp4",
  ".webm",
  ".mov",
];

const SUPPORTED_MIME_PREFIXES = ["image/", "audio/", "video/"];
const SUPPORTED_MIME_EXACT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
];

export const ACCEPT_ATTR = [...SUPPORTED_EXTS, ...SUPPORTED_MIME_EXACT, "image/*", "audio/*", "video/*"].join(",");

export function isSupportedFile(file) {
  if (!file) return false;
  const name = (file.name || "").toLowerCase();
  if (SUPPORTED_EXTS.some((ext) => name.endsWith(ext))) return true;
  const mime = (file.type || "").toLowerCase();
  if (SUPPORTED_MIME_EXACT.includes(mime)) return true;
  return SUPPORTED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

export const SUPPORTED_LABEL = "PDF, Word, PowerPoint, text, image, audio, or video";
