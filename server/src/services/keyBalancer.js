// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: gemini.js uses this to avoid overloading one API key. The key pool comes from env/admin settings, this tracks in-flight calls per key, picks the least busy key, and releases it after the call.

/** In-memory Gemini key load balancer — least-loaded selection with in-flight tracking. */

const inFlight = new Map();

export function getInFlightCount(keyId) {
  return inFlight.get(keyId) || 0;
}

export function releaseKey(keyId) {
  if (!keyId) return;
  const next = (inFlight.get(keyId) || 0) - 1;
  if (next <= 0) inFlight.delete(keyId);
  else inFlight.set(keyId, next);
}

function incrementKey(keyId) {
  inFlight.set(keyId, (inFlight.get(keyId) || 0) + 1);
}

/** Pick the least-loaded key from pool and mark it in-flight. */
export function pickLeastLoaded(pool) {
  if (!pool?.length) return null;

  const ranked = pool
    .map((entry, index) => ({
      entry,
      load: getInFlightCount(entry.id),
      priority: entry.priority ?? 0,
      index,
    }))
    .sort((a, b) => a.load - b.load || a.priority - b.priority || a.index - b.index);

  const best = ranked[0].entry;
  incrementKey(best.id);
  return best;
}

/** Acquire a key using getKeyPool (injected for tests). */
export async function acquireKey(getPoolFn) {
  const { pool } = await getPoolFn();
  const picked = pickLeastLoaded(pool);
  if (!picked) {
    const err = new Error("AI is not configured. Ask an admin to set the Gemini API key in Admin Settings.");
    err.statusCode = 503;
    throw err;
  }
  return picked;
}

/** Mark a specific pool key in-flight (failover path). */
export function acquireSpecificKey(keyEntry) {
  if (!keyEntry?.id) return;
  incrementKey(keyEntry.id);
}

/** Sort pool by current load for failover ordering. */
export function sortPoolByLoad(pool) {
  return [...pool].sort(
    (a, b) =>
      getInFlightCount(a.id) - getInFlightCount(b.id) ||
      a.priority - b.priority ||
      a.id.localeCompare(b.id)
  );
}

/** Test helper — reset counters. */
export function resetKeyBalancer() {
  inFlight.clear();
}

