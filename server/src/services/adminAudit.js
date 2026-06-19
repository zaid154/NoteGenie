import { AdminAuditLog } from "../models/AdminAuditLog.js";

export async function logAdminAction(req, action, targetType = "", targetId = "", meta = {}) {
  try {
    await AdminAuditLog.create({
      adminId: req.user._id,
      adminEmail: req.user.email,
      action,
      targetType,
      targetId: targetId ? String(targetId) : "",
      meta,
    });
  } catch (err) {
    console.warn("[admin-audit] failed to log:", err.message);
  }
}
