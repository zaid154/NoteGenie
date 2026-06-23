// FLOW: Upload middleware. Multipart PDF file comes from Upload page, multer validates/stores it in memory, then documentController receives req.file.

import multer from "multer";

// File ko disk pe save karne ke bajaye memory me rakhte hain (buffer),
// kyunki hum seedha Gemini ko bhej dete hain. Sirf PDF allow, max 15MB.
const storage = multer.memoryStorage();

const MAX_BYTES = 15 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
}).single("file");

// Multer errors (file too large, wrong type) ko saaf 400 JSON me badalte hain,
// warna ye unformatted 500 ban jaate hain.
export function uploadPdf(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "PDF is too large (max 15MB)." });
      }
      return res.status(400).json({ message: "Could not read that file. Please try again." });
    }
    // fileFilter se aaya custom message.
    return res.status(400).json({ message: err.message || "Invalid file." });
  });
}
