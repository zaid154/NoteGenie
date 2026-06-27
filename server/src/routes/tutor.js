// FLOW: Tutor route map. /api/tutor requests enter here, auth/quota/AI middleware runs, then tutorController streams document/global tutor answers.

// Tutor routes: /api/tutor/... — AI tutor chat aur purani chat history.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import { requireAiEnabled } from "../middleware/aiEnabled.js";
import { requireFeature } from "../middleware/requireFeature.js";
import {
  chat,
  getHistory,
  clearHistory,
  globalChat,
  getGlobalHistory,
  clearGlobalHistory,
} from "../controllers/tutorController.js";

const router = Router();

// Admin can disable the "Ask AI" feature entirely (Admin → Settings → Features).
router.use(requireFeature("askAi"));

// Cross-document ("global") routes must be registered before the /:documentId param
// routes, otherwise "global" would be matched as a documentId.
router.get("/global/history", requireAuth, getGlobalHistory);
router.delete("/global/history", requireAuth, clearGlobalHistory);
router.post("/global", requireAuth, requireAiEnabled, aiRateLimitMiddleware, requireQuota("tutorMessages"), globalChat);

router.get("/:documentId/history", requireAuth, getHistory);
router.delete("/:documentId/history", requireAuth, clearHistory);
router.post("/:documentId", requireAuth, requireAiEnabled, aiRateLimitMiddleware, requireQuota("tutorMessages"), chat);

export default router;
