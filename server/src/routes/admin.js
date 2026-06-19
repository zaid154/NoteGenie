// Admin routes: /api/admin/... — sirf admin role wale user ke liye.
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getStats,
  getUsage,
  resetUsage,
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserUsage,
  resetUserPassword,
  getBillingPricing,
  updateBillingPricing,
  getBillingPlans,
  updateBillingPlans,
  clearBillingPricing,
  listPaymentsAdmin,
  grantPlanAdmin,
  revokePlanAdmin,
  createCustomPlan,
  updateCustomPlan,
  deleteCustomPlan,
  updateUserPlan,
  deleteUser,
  getSettings,
  updateSettings,
  addApiKey,
  patchApiKey,
  removeApiKey,
  resetRateLimit,
  getAuditLog,
  testSettings,
  testAllSettings,
  getModels,
  listAllDocuments,
  getDocumentAdmin,
  updateDocumentAdmin,
  deleteDocumentAdmin,
  listQuizzesAdmin,
  deleteQuizAdmin,
  listChatAdmin,
  deleteChatAdmin,
  listSharesAdmin,
  revokeShareAdmin,
} from "../controllers/adminController.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", getStats);
router.get("/usage", getUsage);
router.delete("/usage", resetUsage);
router.get("/audit-log", getAuditLog);

router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/users/:id", getUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/plan", updateUserPlan);
router.post("/users/:id/reset-usage", resetUserUsage);
router.post("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);

router.get("/billing/pricing", getBillingPricing);
router.put("/billing/pricing", updateBillingPricing);
router.get("/billing/plans", getBillingPlans);
router.put("/billing/plans", updateBillingPlans);
router.delete("/billing/pricing", clearBillingPricing);
router.get("/billing/payments", listPaymentsAdmin);
router.post("/billing/users/:id/grant", grantPlanAdmin);
router.post("/billing/users/:id/revoke", revokePlanAdmin);
router.post("/billing/custom-plans", createCustomPlan);
router.patch("/billing/custom-plans/:id", updateCustomPlan);
router.delete("/billing/custom-plans/:id", deleteCustomPlan);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/settings/keys", addApiKey);
router.patch("/settings/keys/:keyId", patchApiKey);
router.delete("/settings/keys/:keyId", removeApiKey);
router.post("/settings/reset-rate-limit", resetRateLimit);
router.post("/settings/test", testSettings);
router.post("/settings/test-all", testAllSettings);
router.post("/models", getModels);
router.get("/models", getModels);

router.get("/documents", listAllDocuments);
router.get("/documents/:id", getDocumentAdmin);
router.patch("/documents/:id", updateDocumentAdmin);
router.delete("/documents/:id", deleteDocumentAdmin);

router.get("/quizzes", listQuizzesAdmin);
router.delete("/quizzes/:id", deleteQuizAdmin);
router.get("/chat", listChatAdmin);
router.delete("/chat/:id", deleteChatAdmin);
router.get("/shares", listSharesAdmin);
router.delete("/shares/:id", revokeShareAdmin);

export default router;
