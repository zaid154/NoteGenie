// FLOW: Central registry of supported upload file types. Multer fileFilter, the
// generation orchestrator, and the controller all read from here so there is one
// source of truth for what NoteGenie can ingest and how each kind is processed.

// Each category maps to how the bytes are handed to Gemini:
//   - "inline": sent directly as inlineData (PDF, image, audio, video — Gemini is multimodal).
//   - "extract": text is pulled out first (DOCX/PPTX/TXT), then the text pipeline runs.
export const UPLOAD_TYPES = {
  pdf: {
    category: "pdf",
    handling: "inline",
    sourceType: "pdf",
    label: "PDF",
    mimes: ["application/pdf"],
    exts: [".pdf"],
  },
  image: {
    category: "image",
    handling: "inline",
    sourceType: "image",
    label: "Image",
    mimes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"],
    exts: [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"],
  },
  audio: {
    category: "audio",
    handling: "inline",
    sourceType: "audio",
    label: "Audio",
    mimes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac", "audio/webm"],
    exts: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"],
  },
  video: {
    category: "video",
    handling: "inline",
    sourceType: "video",
    label: "Video",
    mimes: ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"],
    exts: [".mp4", ".webm", ".mov", ".mkv"],
  },
  docx: {
    category: "docx",
    handling: "extract",
    sourceType: "text",
    label: "Word doc",
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    exts: [".docx"],
  },
  pptx: {
    category: "pptx",
    handling: "extract",
    sourceType: "text",
    label: "Slides",
    mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    exts: [".pptx"],
  },
  plaintext: {
    category: "plaintext",
    handling: "extract",
    sourceType: "text",
    label: "Text file",
    mimes: ["text/plain", "text/markdown"],
    exts: [".txt", ".md", ".markdown"],
  },
};

const ALL = Object.values(UPLOAD_TYPES);

// Gemini inline request limit is ~20MB total; base64 inflates bytes ~33%, so we
// cap raw uploads at 15MB to stay safely under it.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function extOf(filename = "") {
  const m = String(filename).toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
}

/** Resolve the upload type for a file, or null if unsupported. */
export function resolveUploadType(mimetype = "", filename = "") {
  const mime = String(mimetype || "").toLowerCase();
  const ext = extOf(filename);
  return (
    ALL.find((t) => t.mimes.includes(mime)) ||
    ALL.find((t) => t.exts.includes(ext)) ||
    null
  );
}

export function isSupportedUpload(mimetype, filename) {
  return !!resolveUploadType(mimetype, filename);
}

/** Comma-separated list for the <input accept="..."> attribute. */
export const ACCEPT_ATTR = [
  ...new Set(ALL.flatMap((t) => [...t.mimes, ...t.exts])),
].join(",");

/** Human-readable list of supported formats, for error messages. */
export const SUPPORTED_LABEL = "PDF, Word (.docx), PowerPoint (.pptx), images, audio, video, or text files";
