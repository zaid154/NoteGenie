// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Admin controllers call this after an admin action. Data comes from req.user plus action metadata, then it is saved into AdminAuditLog. Failure only logs a warning so admin work does not break.

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

