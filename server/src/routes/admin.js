import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getStats,
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

router.use(requireAuth, requireAdmin);

router.get("/stats", getStats);
router.get("/users", listUsers);
router.delete("/users/:id", deleteUser);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/settings/test", testSettings);
router.get("/models", getModels);
router.get("/documents", listAllDocuments);
router.delete("/documents/:id", deleteDocumentAdmin);

export default router;
