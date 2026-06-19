// Tutor routes: /api/tutor/... — AI tutor chat aur purani chat history.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import { chat, getHistory, clearHistory } from "../controllers/tutorController.js";

const router = Router();

router.get("/:documentId/history", requireAuth, getHistory);
router.delete("/:documentId/history", requireAuth, clearHistory);
router.post("/:documentId", requireAuth, aiRateLimitMiddleware, requireQuota("tutorMessages"), chat);

export default router;
