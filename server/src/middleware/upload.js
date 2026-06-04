import multer from "multer";

// File ko disk pe save karne ke bajaye memory me rakhte hain (buffer),
// kyunki hum seedha Gemini ko bhej dete hain. Sirf PDF allow, max 15MB.
const storage = multer.memoryStorage();

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Sirf PDF files allowed hain"));
    }
  },
}).single("file");
