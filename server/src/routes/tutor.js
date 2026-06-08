// Tutor routes: /api/tutor/... — AI tutor chat aur purani chat history.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chat, getHistory } from "../controllers/tutorController.js";

const router = Router();

router.get("/:documentId/history", requireAuth, getHistory); // purani messages
router.post("/:documentId", requireAuth, chat);              // naya sawal (streaming jawab)

export default router;
