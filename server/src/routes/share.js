// FLOW: Share route map. Public /api/share/:token requests enter here and go to shareController without login because token controls read-only access.

import { Router } from "express";
import { getSharedDocument } from "../controllers/shareController.js";

const router = Router();
router.get("/:token", getSharedDocument);
export default router;
