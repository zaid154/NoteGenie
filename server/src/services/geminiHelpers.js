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

/**
 * Whether the error is "this model isn't available" (bad/legacy model id, or not
 * enabled for the project) — a signal to retry once with a known-good fallback model.
 */
export function isModelNotFoundError(err) {
  const msg = collectGeminiErrorText(err) || String(err || "");
  if (!/\bmodels?\b/i.test(msg)) return false;
  return /\b404\b|not\s*found|not\s*supported|unsupported|is not available|NOT_FOUND/i.test(msg);
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

/** Extract first balanced JSON object or array from text. */
export function extractBalancedJson(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  for (const [open, close] of [
    ["{", "}"],
    ["[", "]"],
  ]) {
    let searchFrom = 0;
    while (searchFrom < s.length) {
      const start = s.indexOf(open, searchFrom);
      if (start === -1) break;
      const slice = sliceBalancedJson(s, start, open, close);
      if (slice) return slice;
      searchFrom = start + 1;
    }
  }
  return null;
}

function sliceBalancedJson(s, start, open, close) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === open) depth++;
    if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function repairJsonString(jsonStr) {
  return String(jsonStr || "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\u0000/g, "");
}

/** Parse Gemini JSON output with fence/balance fallbacks. */
export function parseJson(text) {
  if (text == null || String(text).trim() === "") {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const candidates = [];
  const trimmed = String(text).trim();
  candidates.push(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) candidates.push(fenced[1].trim());

  const balanced = extractBalancedJson(trimmed);
  if (balanced) candidates.push(balanced);

  const seen = new Set();
  for (const raw of candidates) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    for (const attempt of [raw, repairJsonString(raw)]) {
      try {
        return JSON.parse(attempt);
      } catch {
        /* try next */
      }
    }
  }

  throw new Error("AI returned invalid JSON. Please try again.");
}

export function geminiFinishReason(response) {
  return response?.candidates?.[0]?.finishReason || "";
}

export function isTruncatedGeminiResponse(response) {
  const reason = geminiFinishReason(response);
  return reason === "MAX_TOKENS" || reason === "LENGTH";
}

