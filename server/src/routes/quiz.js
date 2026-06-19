// Quiz routes: /api/quiz/... — quiz banana, solve karna, analytics.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireQuota } from "../middleware/quota.js";
import { aiRateLimitMiddleware } from "../middleware/aiRateLimit.js";
import {
  createQuiz,
  getQuiz,
  submitQuiz,
  getAnalytics,
} from "../controllers/quizController.js";

const router = Router();
router.use(requireAuth);

router.get("/analytics/overview", getAnalytics);
router.post("/document/:documentId", aiRateLimitMiddleware, requireQuota("quizzes"), createQuiz);
router.get("/:id", getQuiz);
router.post("/:id/submit", submitQuiz);

export default router;
