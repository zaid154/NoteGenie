// FLOW: Upload middleware. A file comes from the Upload page, multer validates the
// type/size and keeps it in memory (buffer), then documentController receives req.file.

import multer from "multer";
import { isSupportedUpload, MAX_UPLOAD_BYTES, SUPPORTED_LABEL } from "../config/uploadTypes.js";

// File ko disk pe save karne ke bajaye memory me rakhte hain (buffer),
// kyunki hum seedha Gemini / text extractor ko bhej dete hain.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (isSupportedUpload(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Please upload ${SUPPORTED_LABEL}.`));
    }
  },
}).single("file");

const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

// Multer errors (file too large, wrong type) ko saaf 400 JSON me badalte hain,
// warna ye unformatted 500 ban jaate hain.
export function uploadFile(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: `File is too large (max ${MAX_MB}MB).` });
      }
      return res.status(400).json({ message: "Could not read that file. Please try again." });
    }
    // fileFilter se aaya custom message.
    return res.status(400).json({ message: err.message || "Invalid file." });
  });
}

// Backwards-compatible alias (older routes/tests import uploadPdf).
export const uploadPdf = uploadFile;
