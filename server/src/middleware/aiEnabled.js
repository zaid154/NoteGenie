// FLOW: AI master-switch middleware. AI generation routes call this first; it reads
// the admin "aiEnabled" setting and blocks generation with a friendly 503 when off,
// so the admin can disable AI (e.g. when the free API is unreliable) without breaking
// the rest of the app (viewing, review, browsing keep working).

import { getAppSettings } from "../models/Settings.js";

const AI_DISABLED_MESSAGE =
  "AI features are temporarily turned off by the administrator. Please try again later.";

// Short in-memory cache so every AI request doesn't hit the DB.
let cached = null;
let cachedAt = 0;
const CACHE_MS = 15_000;

export function invalidateAiEnabledCache() {
  cached = null;
  cachedAt = 0;
}

async function isAiEnabled() {
  const now = Date.now();
  if (cached !== null && now - cachedAt < CACHE_MS) return cached;
  try {
    const settings = await getAppSettings();
    cached = settings.aiEnabled !== false; // default ON
    cachedAt = now;
  } catch {
    // If settings can't load, fail open (don't block AI on a transient DB hiccup).
    cached = true;
    cachedAt = now;
  }
  return cached;
}

export async function requireAiEnabled(req, res, next) {
  // Admins/staff can still use AI while it's off for regular users (so they can test).
  if (req.user?.role === "admin" || req.user?.role === "staff") return next();
  if (await isAiEnabled()) return next();
  return res.status(503).json({ message: AI_DISABLED_MESSAGE, code: "AI_DISABLED" });
}
