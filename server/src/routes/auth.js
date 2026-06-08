// Auth routes: /api/auth/... URLs ko authController se jodta hai.
import { Router } from "express";
import { register, login, me, updateProfile, changePassword } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public routes (login ki zaroorat nahi).
router.post("/register", register);
router.post("/login", login);

// Protected routes (requireAuth = pehle login check).
router.get("/me", requireAuth, me);
router.put("/profile", requireAuth, updateProfile);
router.put("/password", requireAuth, changePassword);

export default router;
