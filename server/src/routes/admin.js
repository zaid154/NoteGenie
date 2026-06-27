// FLOW: Admin route map. /api/admin requests enter here, auth/admin middleware checks access, then requests are forwarded to adminController functions.

// Admin routes: /api/admin/... — sirf admin role wale user ke liye.
import { Router } from "express";
import { requireAuth, requireAdmin, requireStaff, requirePermission } from "../middleware/auth.js";
import { uploadResourceFile } from "../middleware/uploadResource.js";
import {
  listUniversities, createUniversity, updateUniversity, deleteUniversity,
  listPrograms, createProgram, updateProgram, deleteProgram,
  listCourses, createCourse, updateCourse, deleteCourse,
} from "../controllers/catalogController.js";
import {
  listResourcesAdmin, createResource, updateResource, deleteResource,
} from "../controllers/resourceController.js";
import {
  listCombosAdmin, createCombo, updateCombo, deleteCombo,
} from "../controllers/comboController.js";
import { listOrdersAdmin, getOrderAdmin, updateOrderAdmin } from "../controllers/marketplaceController.js";
import {
  getStats,
  getUsage,
  resetUsage,
  listUsers,
  getUser,
  createUser,
  updateUser,
  getPermissions,
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

// Sab admin routes login-protected hain. Per-route role gating neeche:
//   requireStaff = staff ya admin (read stats, content moderation, user usage reset)
//   requireAdmin = sirf admin (settings/API keys, billing, user create/delete/role change)
router.use(requireAuth);

// --- Dashboard / stats (staff + admin can view) ---
router.get("/stats", requireStaff, getStats);
// API usage & cost analytics + global usage reset = admin-only (cost/billing-adjacent).
router.get("/usage", requireAdmin, getUsage);
router.delete("/usage", requireAdmin, resetUsage);
router.get("/audit-log", requireAdmin, getAuditLog);

// Permission catalog (for the admin assignment UI).
router.get("/permissions", requireStaff, getPermissions);

// --- Users: staff can VIEW + reset a user's usage; admin manages everything else ---
router.get("/users", requireStaff, listUsers);
router.post("/users", requireAdmin, createUser);
router.get("/users/:id", requireStaff, getUser);
router.patch("/users/:id", requireAdmin, updateUser);
router.patch("/users/:id/plan", requireAdmin, updateUserPlan);
router.post("/users/:id/reset-usage", requireStaff, resetUserUsage);
router.post("/users/:id/reset-password", requireAdmin, resetUserPassword);
router.delete("/users/:id", requireAdmin, deleteUser);

// --- Billing (admin-only) ---
router.get("/billing/pricing", requireAdmin, getBillingPricing);
router.put("/billing/pricing", requireAdmin, updateBillingPricing);
router.get("/billing/plans", requireAdmin, getBillingPlans);
router.put("/billing/plans", requireAdmin, updateBillingPlans);
router.delete("/billing/pricing", requireAdmin, clearBillingPricing);
router.get("/billing/payments", requireAdmin, listPaymentsAdmin);
router.post("/billing/users/:id/grant", requireAdmin, grantPlanAdmin);
router.post("/billing/users/:id/revoke", requireAdmin, revokePlanAdmin);
router.post("/billing/custom-plans", requireAdmin, createCustomPlan);
router.patch("/billing/custom-plans/:id", requireAdmin, updateCustomPlan);
router.delete("/billing/custom-plans/:id", requireAdmin, deleteCustomPlan);

// --- System settings / API keys (admin-only) ---
router.get("/settings", requireAdmin, getSettings);
router.put("/settings", requireAdmin, updateSettings);
router.post("/settings/keys", requireAdmin, addApiKey);
router.patch("/settings/keys/:keyId", requireAdmin, patchApiKey);
router.delete("/settings/keys/:keyId", requireAdmin, removeApiKey);
router.post("/settings/reset-rate-limit", requireAdmin, resetRateLimit);
router.post("/settings/test", requireAdmin, testSettings);
router.post("/settings/test-all", requireAdmin, testAllSettings);
router.post("/models", requireAdmin, getModels);
router.get("/models", requireAdmin, getModels);

// --- Content moderation (staff + admin) ---
router.get("/documents", requireStaff, listAllDocuments);
router.get("/documents/:id", requireStaff, getDocumentAdmin);
router.patch("/documents/:id", requireStaff, updateDocumentAdmin);
router.delete("/documents/:id", requireStaff, deleteDocumentAdmin);

router.get("/quizzes", requireStaff, listQuizzesAdmin);
router.delete("/quizzes/:id", requireStaff, deleteQuizAdmin);
router.get("/chat", requireStaff, listChatAdmin);
router.delete("/chat/:id", requireStaff, deleteChatAdmin);
router.get("/shares", requireStaff, listSharesAdmin);
router.delete("/shares/:id", requireStaff, revokeShareAdmin);

// --- Catalog: universities / programs / courses (manage_catalog) ---
router.get("/catalog/universities", requirePermission("manage_catalog"), listUniversities);
router.post("/catalog/universities", requirePermission("manage_catalog"), createUniversity);
router.patch("/catalog/universities/:id", requirePermission("manage_catalog"), updateUniversity);
router.delete("/catalog/universities/:id", requirePermission("manage_catalog"), deleteUniversity);

router.get("/catalog/programs", requirePermission("manage_catalog"), listPrograms);
router.post("/catalog/programs", requirePermission("manage_catalog"), createProgram);
router.patch("/catalog/programs/:id", requirePermission("manage_catalog"), updateProgram);
router.delete("/catalog/programs/:id", requirePermission("manage_catalog"), deleteProgram);

router.get("/catalog/courses", requirePermission("manage_catalog"), listCourses);
router.post("/catalog/courses", requirePermission("manage_catalog"), createCourse);
router.patch("/catalog/courses/:id", requirePermission("manage_catalog"), updateCourse);
router.delete("/catalog/courses/:id", requirePermission("manage_catalog"), deleteCourse);

// --- Resources (manage_resources) ---
router.get("/resources", requirePermission("manage_resources"), listResourcesAdmin);
router.post("/resources", requirePermission("manage_resources"), uploadResourceFile, createResource);
router.patch("/resources/:id", requirePermission("manage_resources"), uploadResourceFile, updateResource);
router.delete("/resources/:id", requirePermission("manage_resources"), deleteResource);

// --- Combos (manage_combos) ---
router.get("/combos", requirePermission("manage_combos"), listCombosAdmin);
router.post("/combos", requirePermission("manage_combos"), createCombo);
router.patch("/combos/:id", requirePermission("manage_combos"), updateCombo);
router.delete("/combos/:id", requirePermission("manage_combos"), deleteCombo);

// --- Orders (manage_orders) ---
router.get("/orders", requirePermission("manage_orders"), listOrdersAdmin);
router.get("/orders/:id", requirePermission("manage_orders"), getOrderAdmin);
router.patch("/orders/:id", requirePermission("manage_orders"), updateOrderAdmin);

export default router;
