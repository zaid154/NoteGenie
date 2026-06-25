// FLOW: Document route map. /api/documents requests enter here, auth/quota/upload middleware runs, then documentController handles upload/link/list/share/flashcards.

// Document routes with quota enforcement on AI endpoints.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import { requireAiEnabled } from "../middleware/aiEnabled.js";
import { uploadFile } from "../middleware/upload.js";
import {
  uploadDocument,
  uploadDocumentStream,
  createFromLink,
  createFromLinkStream,
  createFromText,
  createFromTextStream,
  createSampleDocument,
  listDocuments,
  listFolders,
  getDueCards,
  getDocument,
  deleteDocument,
  regenerateDocument,
  generateFlashcardsBatch,
  updateDocumentMeta,
  setDocumentWorkspace,
  rateFlashcard,
  updateFlashcard,
  deleteFlashcard,
  clearAllFlashcards,
  toggleShare,
} from "../controllers/documentController.js";

const router = Router();
router.use(requireAuth);

router.get("/review/due", getDueCards);
router.get("/folders/list", listFolders);
router.post("/upload/stream", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), uploadFile, uploadDocumentStream);
router.post("/upload", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), uploadFile, uploadDocument);
router.post("/link/stream", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), createFromLinkStream);
router.post("/link", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), createFromLink);
router.post("/text/stream", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), createFromTextStream);
router.post("/text", requireAiEnabled, aiRateLimitMiddleware, requireQuota("documents"), createFromText);
router.post("/sample", createSampleDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.patch("/:id/meta", updateDocumentMeta);
router.patch("/:id/workspace", setDocumentWorkspace);
router.post("/:id/share", toggleShare);
router.post("/:id/flashcards/generate", requireAiEnabled, aiRateLimitMiddleware, generateFlashcardsBatch);
router.delete("/:id/flashcards", clearAllFlashcards);
router.patch("/:id/flashcards/:cardId", updateFlashcard);
router.delete("/:id/flashcards/:cardId", deleteFlashcard);
router.post("/:id/flashcards/:cardId/rate", rateFlashcard);
router.post("/:id/regenerate", requireAiEnabled, aiRateLimitMiddleware, regenerateDocument);
router.delete("/:id", deleteDocument);

export default router;
