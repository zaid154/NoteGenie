// Exported helpers for tests and gemini service.
export function isKeyExhausted(err) {
  const msg = String(err?.message || err?.status || "");
  return /\b(401|403|429|quota|exceeded|invalid.?api.?key|permission|billing|limit)\b/i.test(msg);
}

export function isTransient(err) {
  const msg = String(err?.message || err?.status || "");
  return /\b(503|overloaded|high demand|temporarily|unavailable)\b/i.test(msg);
}
