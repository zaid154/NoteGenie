// FLOW: Resource upload middleware. Separate from the Gemini document uploader so its
// size limit and allowed types can differ (admin uploads PDFs/docs for sale). Keeps the
// file in memory (req.file.buffer); resourceController pushes it to services/fileStorage.js.

import multer from "multer";

// Sellable resources are documents (question papers, books, guides). Allow PDFs + office docs.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

const MAX_RESOURCE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_MB = Math.round(MAX_RESOURCE_BYTES / (1024 * 1024));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESOURCE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype) || /\.(pdf|docx?|pptx?)$/i.test(file.originalname || "")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file. Upload a PDF, Word, or PowerPoint file."));
    }
  },
}).single("file");

// File is optional on update, required on create — controllers enforce that.
export function uploadResourceFile(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `File is too large (max ${MAX_MB}MB).` });
      }
      return res.status(400).json({ message: "Could not read that file. Please try again." });
    }
    return res.status(400).json({ message: err.message || "Invalid file." });
  });
}
