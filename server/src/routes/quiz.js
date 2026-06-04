import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createQuiz,
  getQuiz,
  submitQuiz,
  getAnalytics,
} from "../controllers/quizController.js";

const router = Router();

router.use(requireAuth);

router.get("/analytics/overview", getAnalytics);
router.post("/document/:documentId", createQuiz);
router.get("/:id", getQuiz);
router.post("/:id/submit", submitQuiz);

export default router;
