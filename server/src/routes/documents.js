// Document routes with quota enforcement on AI endpoints.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  uploadDocument,
  createFromLink,
  listDocuments,
  listFolders,
  getDueCards,
  getDocument,
  deleteDocument,
  regenerateDocument,
  generateFlashcardsBatch,
  updateDocumentMeta,
  rateFlashcard,
  toggleShare,
} from "../controllers/documentController.js";

const router = Router();
router.use(requireAuth);

router.get("/review/due", getDueCards);
router.get("/folders/list", listFolders);
router.post("/upload", aiRateLimitMiddleware, requireQuota("documents"), uploadPdf, uploadDocument);
router.post("/link", aiRateLimitMiddleware, requireQuota("documents"), createFromLink);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id/meta", updateDocumentMeta);
router.post("/:id/share", toggleShare);
router.post("/:id/flashcards/generate", aiRateLimitMiddleware, generateFlashcardsBatch);
router.post("/:id/flashcards/:cardId/rate", rateFlashcard);
router.post("/:id/regenerate", aiRateLimitMiddleware, regenerateDocument);
router.delete("/:id", deleteDocument);

export default router;
