import { Router } from "express";
import { getSharedDocument } from "../controllers/shareController.js";

const router = Router();
router.get("/:token", getSharedDocument);
export default router;
