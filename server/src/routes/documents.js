import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  uploadDocument,
  createFromLink,
  listDocuments,
  getDocument,
  deleteDocument,
  regenerateDocument,
} from "../controllers/documentController.js";

const router = Router();

router.use(requireAuth); // saare document routes login-protected hain

router.post("/upload", uploadPdf, uploadDocument);
router.post("/link", createFromLink);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.post("/:id/regenerate", regenerateDocument);
router.delete("/:id", deleteDocument);

export default router;
