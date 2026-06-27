// FLOW: Download audit log. The secure download route writes one row per successful (or attempted)
// digital download so admins can see who downloaded what, when, and from where. `createdAt` is the
// download timestamp. Used by Admin → Order details "Download logs" and abuse monitoring.

import mongoose from "mongoose";

const downloadLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", index: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    device: { type: String, default: "" },  // e.g. "Desktop" / "Mobile"
    browser: { type: String, default: "" },
    ok: { type: Boolean, default: true },    // false = blocked attempt (limit/expiry/unauthorized)
    reason: { type: String, default: "" },   // why blocked, if ok=false
  },
  { timestamps: true }
);

downloadLogSchema.index({ userId: 1, createdAt: -1 });
downloadLogSchema.index({ purchaseId: 1, createdAt: -1 });

export const DownloadLog = mongoose.model("DownloadLog", downloadLogSchema);
