import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUsage,
  createBillingOrder,
  verifyPayment,
  createPortal,
  stripeWebhook,
  publicBillingConfig,
  billingStatus,
} from "../controllers/billingController.js";

const router = Router();

router.get("/public-config", publicBillingConfig);
router.post("/webhook", stripeWebhook);

router.use(requireAuth);
router.get("/status", billingStatus);
router.get("/usage", getUsage);
router.post("/create-order", createBillingOrder);
router.post("/verify-payment", verifyPayment);
router.post("/portal", createPortal);

export default router;
