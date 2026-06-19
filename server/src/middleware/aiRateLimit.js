import { getAppSettings } from "../models/Settings.js";
import { env } from "../config/env.js";

const hits = new Map();

let cache = { max: env.aiRateLimitMax, windowMs: env.aiRateLimitWindowMs, loadedAt: 0 };

export function invalidateAiRateLimitCache() {
  cache.loadedAt = 0;
}

async function getConfig() {
  if (Date.now() - cache.loadedAt < 30_000) {
    return cache;
  }
  try {
    const settings = await getAppSettings();
    const max =
      settings.aiRateLimitMax != null && settings.aiRateLimitMax > 0
        ? settings.aiRateLimitMax
        : env.aiRateLimitMax;
    const windowMinutes =
      settings.aiRateLimitWindowMinutes != null && settings.aiRateLimitWindowMinutes > 0
        ? settings.aiRateLimitWindowMinutes
        : env.aiRateLimitWindowMinutes;
    cache = {
      max,
      windowMs: windowMinutes * 60 * 1000,
      loadedAt: Date.now(),
    };
  } catch {
    cache = {
      max: env.aiRateLimitMax,
      windowMs: env.aiRateLimitWindowMs,
      loadedAt: Date.now(),
    };
  }
  return cache;
}

function clientKey(req) {
  return req.user?._id ? `user:${req.user._id}` : `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

function pruneExpired(now) {
  if (hits.size < 5000) return;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

/** AI routes rate limit — max/window configurable in Admin → AI Settings (DB) or .env */
export async function aiRateLimitMiddleware(req, res, next) {
  if (req.user?.role === "admin") return next();

  const { max, windowMs } = await getConfig();
  const key = clientKey(req);
  const now = Date.now();
  pruneExpired(now);

  let entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  hits.set(key, entry);

  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", "0");
    return res.status(429).json({
      message: "You're generating a lot right now. Please wait a moment and try again.",
      retryAfter,
    });
  }

  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
  next();
}

export async function getAiRateLimitPublicConfig() {
  const { max, windowMs } = await getConfig();
  return {
    max,
    windowMinutes: Math.round(windowMs / 60_000),
  };
}
