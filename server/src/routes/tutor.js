import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chat, getHistory } from "../controllers/tutorController.js";

const router = Router();

router.get("/:documentId/history", requireAuth, getHistory);
router.post("/:documentId", requireAuth, chat);

export default router;
