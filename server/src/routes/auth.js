// FLOW: Auth route map. /api/auth requests enter here, rate-limit/auth middleware runs, then requests are forwarded to authController functions.

import { Router } from "express";
import {
  register,
  login,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  completeOnboarding,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { loginRegisterLimiter, passwordResetLimiter } from "../middleware/authRateLimit.js";

const router = Router();

router.post("/register", loginRegisterLimiter, register);
router.post("/login", loginRegisterLimiter, login);
router.post("/verify-email", loginRegisterLimiter, verifyEmail);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);

router.get("/me", requireAuth, me);
router.post("/resend-verification", requireAuth, resendVerification);
router.post("/onboarding/complete", requireAuth, completeOnboarding);
router.put("/profile", requireAuth, updateProfile);
router.put("/password", requireAuth, changePassword);
router.delete("/account", requireAuth, deleteAccount);

export default router;
