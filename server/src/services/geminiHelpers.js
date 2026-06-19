// Exported helpers for tests and gemini service.

export function isKeyExhausted(err) {

  const msg = String(err?.message || err?.status || "");

  return /\b(401|403|429|quota|exceeded|invalid.?api.?key|permission|billing|limit)\b/i.test(msg);

}



export function isTransient(err) {
  const msg = String(err?.message || err?.status || "");
  return /\b(503|overloaded|high demand|temporarily|unavailable)\b/i.test(msg);
}

function isGeminiApiFailure(err) {
  const msg = collectGeminiErrorText(err) || String(err || "");
  if (/GoogleGenerativeAI Error|generativelanguage\.googleapis\.com/i.test(msg)) return true;
  if (/Error fetching from/i.test(msg)) return true;
  if (/\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|EAI_AGAIN)\b/i.test(msg)) return true;
  return false;
}

/** Whether withKeyFailover should try the next key in the pool. */
export function shouldFailoverToNextKey(err) {
  return isKeyExhausted(err) || isTransient(err) || isGeminiApiFailure(err);
}

function collectGeminiErrorText(err) {

  const parts = [];

  if (err?.status != null) parts.push(String(err.status));

  if (err?.statusText) parts.push(String(err.statusText));

  if (err?.message) parts.push(String(err.message));

  if (err?.cause?.message) parts.push(String(err.cause.message));

  if (Array.isArray(err?.errorDetails)) {

    for (const detail of err.errorDetails) {

      if (typeof detail === "string") parts.push(detail);

      else if (detail?.message) parts.push(String(detail.message));

    }

  }

  return parts.join(" ").trim();

}



/** Sanitized raw error snippet for admin debugging (no full API keys). */

export function geminiErrorDetail(err) {

  const msg = collectGeminiErrorText(err) || String(err || "");

  const cleaned = msg

    .replace(/\[GoogleGenerativeAI Error\]:\s*/gi, "")

    .replace(/AIza[A-Za-z0-9_-]{10,}/g, "AIza••••")

    .trim();

  return cleaned.slice(0, 200) || "";

}



/** Short, human-readable message for admin key tests. */

export function formatGeminiError(err) {

  const msg = collectGeminiErrorText(err) || String(err || "");



  if (/429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) {

    return "Quota exceeded — rate limit hit on this key";

  }

  if (/403|401|API key not valid|PERMISSION_DENIED|invalid.?api.?key|API_KEY_INVALID/i.test(msg)) {

    return "Invalid or unauthorized API key";

  }

  if (/404|not found/i.test(msg) && /model/i.test(msg)) {

    return "Model not available for this key or project";

  }

  if (/\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|EAI_AGAIN)\b/i.test(msg)) {

    return "Network error — could not reach Google Gemini API";

  }

  if (/Error fetching from https:\/\/generativelanguage\.googleapis\.com/i.test(msg)) {

    return "Gemini API request failed — check if this key is valid and has API access enabled";

  }

  if (/\bnetwork error\b/i.test(msg) && !/generativelanguage\.googleapis\.com/i.test(msg)) {

    return "Network error — could not reach Google Gemini API";

  }



  const cleaned = msg

    .replace(/\[GoogleGenerativeAI Error\]:\s*/gi, "")

    .replace(/Error fetching from https:\/\/generativelanguage\.googleapis\.com[^\s]*/gi, "Gemini API request failed")

    .trim();

  return cleaned.slice(0, 180) || "Unknown error";

}



const SOURCE_LABELS = {

  db: "Admin pool",

  "db-legacy": "Legacy key",

  env: "Environment (.env)",

};



export function sourceLabel(source) {

  return SOURCE_LABELS[source] || source || "Unknown";

}


