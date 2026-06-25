// FLOW: Workspace routes. All require auth. Membership/ownership checks live in the
// controller. /join is declared before /:id so it isn't captured as an id.
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  joinWorkspace,
  leaveWorkspace,
  updateWorkspace,
  regenerateInviteCode,
  removeMember,
  deleteWorkspace,
  listWorkspaceDocuments,
} from "../controllers/workspaceController.js";

const router = Router();
router.use(requireAuth);

router.post("/", createWorkspace);
router.get("/", listWorkspaces);
router.post("/join", joinWorkspace);
router.get("/:id", getWorkspace);
router.patch("/:id", updateWorkspace);
router.delete("/:id", deleteWorkspace);
router.post("/:id/leave", leaveWorkspace);
router.post("/:id/regenerate-code", regenerateInviteCode);
router.delete("/:id/members/:userId", removeMember);
router.get("/:id/documents", listWorkspaceDocuments);

export default router;
