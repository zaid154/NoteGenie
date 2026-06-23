// FLOW: Error middleware. Unmatched routes and thrown controller errors land here, then a safe JSON error response goes back to the client.

import { formatGeminiError } from "../services/geminiHelpers.js";
import { captureException } from "../config/observability.js";

// Ek hi jagah saari errors handle hoti hain, taaki har controller me try-catch repeat na ho.
export function notFound(req, res, next) {
  res.status(404).json({ message: "Route not found" });
}

// Client ko sirf safe, samajhne layak message bhejte hain. Internal details (schema,
// stack, paths) leak na ho isliye unknown errors ko generic message me badal dete hain.
function friendlyMessage(err) {
  const msg = err.message || "";
  const status = err.statusCode || 500;

  if (status === 503 && /AI is not configured/i.test(msg)) return msg;
  if (status === 402 || err.code === "QUOTA_EXCEEDED") return msg;
  if (/429|quota exceeded|RESOURCE_EXHAUSTED|rate.?limit|Too Many Requests/i.test(msg)) {
    if (/free_tier|FreeTier|per day|daily/i.test(msg)) {
      return "Gemini free tier daily limit reached (20 requests/day for this model). Wait until tomorrow, switch model in Admin → AI keys (e.g. gemini-2.0-flash), or enable billing at ai.google.dev.";
    }
    return "Gemini rate limit hit. Wait a minute and try again, or use a different API key / model.";
  }
  if (/whitelist|MongoServerSelection|ECONNREFUSED/i.test(msg)) {
    return "Database connection failed. Check MongoDB Atlas network access.";
  }
  if (/YoutubeTranscript|Invalid YouTube|no transcript|no captions|Could not fetch YouTube/i.test(msg)) {
    return status >= 400 && status < 500
      ? msg
      : "Could not read this YouTube video. Use a public video with captions enabled.";
  }
  if (/GoogleGenerativeAI|generativelanguage|API key|API_KEY|403|401/i.test(msg)) {
    const formatted = formatGeminiError(err);
    if (/quota|rate limit|free tier|daily limit/i.test(formatted)) return formatted;
    return formatted || "AI request failed. Check the Gemini API key in Admin Settings.";
  }
  if (/503|high demand|overloaded/i.test(msg)) {
    return "AI is busy right now. Please wait a moment and try again.";
  }

  // Client errors (4xx) ke messages developer ne jaan-boojh kar set kiye hote hain — safe.
  if (status >= 400 && status < 500) return msg || "Request could not be processed";

  // 5xx / unknown errors ka raw message kabhi expose na karein.
  return "Something went wrong. Please try again.";
}

export function errorHandler(err, req, res, next) {
  // Poora error sirf server logs me (debugging ke liye).
  console.error("[error]", err.stack || err.message);

  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = "Invalid ID format";
  }

  const status = err.statusCode || 500;
  // Report unexpected server errors to Sentry (no-op unless configured).
  if (status >= 500) captureException(err);
  res.status(status).json({
    message: friendlyMessage(err),
  });
}

// Async controllers ko wrap karke unke errors automatically errorHandler tak pohonchate hain.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
