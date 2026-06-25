// FLOW: A collaborative workspace. Members can view materials that owners have
// shared into the workspace (Document.workspaceId). Documents still belong to their
// creator (userId); workspace membership only grants read/study access.

import mongoose from "mongoose";
import crypto from "crypto";

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: { type: [memberSchema], default: [] },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

workspaceSchema.index({ "members.userId": 1 });

// 10-char invite code (short enough to share, large enough to not guess).
workspaceSchema.statics.newInviteCode = function newInviteCode() {
  return crypto.randomBytes(5).toString("hex");
};

export const Workspace = mongoose.model("Workspace", workspaceSchema);
