// FLOW: Feature-flag guard. Blocks a route when an admin has disabled the matching feature
// in Admin → Settings → Features. Returns 403 with a friendly message the client can show.
// Settings are cached briefly so this doesn't hit MongoDB on every request.

import { getAppSettings, resolveFeatures } from "../models/Settings.js";

let cache = null;
let cachedAt = 0;
const TTL_MS = 30 * 1000;

export function invalidateFeatureCache() {
  cache = null;
  cachedAt = 0;
}

async function getFeatures() {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  const settings = await getAppSettings();
  cache = resolveFeatures(settings);
  cachedAt = Date.now();
  return cache;
}

export function requireFeature(name) {
  return async function featureGuard(req, res, next) {
    try {
      const features = await getFeatures();
      if (features[name] === false) {
        return res.status(403).json({ message: "This feature is currently unavailable." });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
