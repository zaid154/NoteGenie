// FLOW: AdminAuditLog Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminEmail: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "", index: true },
    targetId: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);
