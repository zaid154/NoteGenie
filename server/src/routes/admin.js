// Admin routes: /api/admin/... — sirf admin role wale user ke liye.
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getStats,
  getUsage,
  resetUsage,
  listUsers,
  deleteUser,
  getSettings,
  updateSettings,
  testSettings,
  getModels,
  listAllDocuments,
  deleteDocumentAdmin,
} from "../controllers/adminController.js";

const router = Router();

// Pehle login check, phir admin role check — dono pass hone chahiye.
router.use(requireAuth, requireAdmin);

router.get("/stats", getStats);
router.get("/usage", getUsage);
router.delete("/usage", resetUsage);
router.get("/users", listUsers);
router.delete("/users/:id", deleteUser);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/settings/test", testSettings);
router.get("/models", getModels);
router.get("/documents", listAllDocuments);
router.delete("/documents/:id", deleteDocumentAdmin);

export default router;
