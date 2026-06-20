// Tutor routes: /api/tutor/... — AI tutor chat aur purani chat history.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import {
  chat,
  getHistory,
  clearHistory,
  globalChat,
  getGlobalHistory,
  clearGlobalHistory,
} from "../controllers/tutorController.js";

const router = Router();

// Cross-document ("global") routes must be registered before the /:documentId param
// routes, otherwise "global" would be matched as a documentId.
router.get("/global/history", requireAuth, getGlobalHistory);
router.delete("/global/history", requireAuth, clearGlobalHistory);
router.post("/global", requireAuth, aiRateLimitMiddleware, requireQuota("tutorMessages"), globalChat);

router.get("/:documentId/history", requireAuth, getHistory);
router.delete("/:documentId/history", requireAuth, clearHistory);
router.post("/:documentId", requireAuth, aiRateLimitMiddleware, requireQuota("tutorMessages"), chat);

export default router;
