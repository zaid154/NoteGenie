// FLOW: Workspace API. Create/list/join workspaces, manage members + invite code,
// and list materials shared into a workspace. Membership grants read/study access
// to shared documents (enforced via services/workspaceAccess.js in other controllers).

import { Workspace } from "../models/Workspace.js";
import { Document } from "../models/Document.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId } from "../utils/objectId.js";

function roleOf(ws, userId) {
  const m = (ws.members || []).find((x) => String(x.userId?._id || x.userId) === String(userId));
  return m?.role || null;
}

function serialize(ws, userId) {
  return {
    _id: ws._id,
    name: ws.name,
    inviteCode: ws.inviteCode,
    memberCount: (ws.members || []).length,
    role: roleOf(ws, userId) || "member",
    isOwner: String(ws.ownerId) === String(userId),
    createdAt: ws.createdAt,
  };
}

function requireOwner(ws, userId, res) {
  if (String(ws.ownerId) !== String(userId)) {
    res.status(403).json({ message: "Only the workspace owner can do that." });
    return false;
  }
  return true;
}

// POST /api/workspaces  { name }
export const createWorkspace = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Workspace name is required" });

  const ws = await Workspace.create({
    name,
    ownerId: req.user._id,
    members: [{ userId: req.user._id, role: "owner" }],
    inviteCode: Workspace.newInviteCode(),
  });
  res.status(201).json({ workspace: serialize(ws, req.user._id) });
});

// GET /api/workspaces
export const listWorkspaces = asyncHandler(async (req, res) => {
  const list = await Workspace.find({ "members.userId": req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ workspaces: list.map((w) => serialize(w, req.user._id)) });
});

// GET /api/workspaces/:id
export const getWorkspace = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findOne({ _id: req.params.id, "members.userId": req.user._id })
    .populate("members.userId", "name email avatar")
    .lean();
  if (!ws) return res.status(404).json({ message: "Workspace not found" });

  const documentCount = await Document.countDocuments({ workspaceId: ws._id });
  res.json({
    workspace: {
      _id: ws._id,
      name: ws.name,
      inviteCode: ws.inviteCode,
      isOwner: String(ws.ownerId) === String(req.user._id),
      documentCount,
      members: ws.members.map((m) => ({
        userId: m.userId?._id || m.userId,
        name: m.userId?.name || "User",
        email: m.userId?.email || "",
        avatar: m.userId?.avatar || "",
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    },
  });
});

// POST /api/workspaces/join  { code }
export const joinWorkspace = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim().toLowerCase();
  if (!code) return res.status(400).json({ message: "Enter an invite code" });

  const ws = await Workspace.findOne({ inviteCode: code });
  if (!ws) return res.status(404).json({ message: "Invalid invite code" });

  if (ws.members.some((m) => String(m.userId) === String(req.user._id))) {
    return res.json({ workspace: serialize(ws, req.user._id), already: true });
  }
  ws.members.push({ userId: req.user._id, role: "member" });
  await ws.save();
  res.json({ workspace: serialize(ws, req.user._id) });
});

// POST /api/workspaces/:id/leave
export const leaveWorkspace = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findById(req.params.id);
  if (!ws || !ws.members.some((m) => String(m.userId) === String(req.user._id))) {
    return res.status(404).json({ message: "Workspace not found" });
  }
  if (String(ws.ownerId) === String(req.user._id)) {
    return res.status(400).json({ message: "Owners can't leave — delete the workspace instead." });
  }
  ws.members = ws.members.filter((m) => String(m.userId) !== String(req.user._id));
  await ws.save();
  res.json({ message: "Left workspace" });
});

// PATCH /api/workspaces/:id  { name }  (owner)
export const updateWorkspace = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: "Workspace not found" });
  if (!requireOwner(ws, req.user._id, res)) return undefined;

  const name = String(req.body.name || "").trim();
  if (name) ws.name = name;
  await ws.save();
  res.json({ workspace: serialize(ws, req.user._id) });
});

// POST /api/workspaces/:id/regenerate-code  (owner)
export const regenerateInviteCode = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: "Workspace not found" });
  if (!requireOwner(ws, req.user._id, res)) return undefined;

  ws.inviteCode = Workspace.newInviteCode();
  await ws.save();
  res.json({ inviteCode: ws.inviteCode });
});

// DELETE /api/workspaces/:id/members/:userId  (owner removes a member)
export const removeMember = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: "Workspace not found" });
  if (!requireOwner(ws, req.user._id, res)) return undefined;
  if (String(req.params.userId) === String(ws.ownerId)) {
    return res.status(400).json({ message: "Can't remove the owner." });
  }
  ws.members = ws.members.filter((m) => String(m.userId) !== String(req.params.userId));
  await ws.save();
  res.json({ message: "Member removed" });
});

// DELETE /api/workspaces/:id  (owner) — unshares its documents, then deletes.
export const deleteWorkspace = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findById(req.params.id);
  if (!ws) return res.status(404).json({ message: "Workspace not found" });
  if (!requireOwner(ws, req.user._id, res)) return undefined;

  await Document.updateMany({ workspaceId: ws._id }, { $set: { workspaceId: null } });
  await ws.deleteOne();
  res.json({ message: "Workspace deleted" });
});

// GET /api/workspaces/:id/documents  (member) — materials shared into the workspace.
export const listWorkspaceDocuments = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "workspace ID");
  const ws = await Workspace.findOne({ _id: req.params.id, "members.userId": req.user._id })
    .select("_id")
    .lean();
  if (!ws) return res.status(404).json({ message: "Workspace not found" });

  const docs = await Document.find({ workspaceId: ws._id })
    .sort({ createdAt: -1 })
    .select("title sourceType folder tags createdAt userId")
    .populate("userId", "name email")
    .lean();

  res.json({
    documents: docs.map((d) => ({
      _id: d._id,
      title: d.title,
      sourceType: d.sourceType,
      folder: d.folder,
      tags: d.tags,
      createdAt: d.createdAt,
      owner: { name: d.userId?.name || "User", email: d.userId?.email || "" },
      isOwner: String(d.userId?._id || d.userId) === String(req.user._id),
    })),
  });
});
