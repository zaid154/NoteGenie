// FLOW: Shared access checks for collaboration. A document is readable by its
// creator OR by any member of the workspace it's shared into. Edit/delete stays
// owner-only (controllers keep using { userId } filters for those).

import { Workspace } from "../models/Workspace.js";
import { Document } from "../models/Document.js";

/** All workspace ids the user belongs to. */
export async function getUserWorkspaceIds(userId) {
  const ws = await Workspace.find({ "members.userId": userId }).select("_id").lean();
  return ws.map((w) => w._id);
}

export function isWorkspaceMember(workspace, userId) {
  return (workspace?.members || []).some((m) => String(m.userId) === String(userId));
}

export function isWorkspaceOwner(workspace, userId) {
  return workspace && String(workspace.ownerId) === String(userId);
}

/**
 * Return the document (mongoose doc) if the user may READ/STUDY it — i.e. they own
 * it, or it's shared into a workspace they belong to. Otherwise null.
 */
export async function findReadableDocument(documentId, user) {
  const doc = await Document.findById(documentId);
  if (!doc) return null;
  if (String(doc.userId) === String(user._id)) return doc;
  if (doc.workspaceId) {
    const ws = await Workspace.findOne({
      _id: doc.workspaceId,
      "members.userId": user._id,
    }).select("_id");
    if (ws) return doc;
  }
  return null;
}
