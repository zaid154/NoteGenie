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
  if (/GoogleGenerativeAI|generativelanguage|API key|API_KEY|403|401/i.test(msg)) {
    return "AI request failed. Check the Gemini API key in Admin Settings.";
  }
  if (/503|429|high demand|overloaded/i.test(msg)) {
    return "AI is busy right now. Please wait a moment and try again.";
  }
  if (/whitelist|MongoServerSelection|ECONNREFUSED/i.test(msg)) {
    return "Database connection failed. Check MongoDB Atlas network access.";
  }

  // Client errors (4xx) ke messages developer ne jaan-boojh kar set kiye hote hain — safe.
  if (status >= 400 && status < 500) return msg || "Request could not be processed";

  // 5xx / unknown errors ka raw message kabhi expose na karein.
  return "Something went wrong. Please try again.";
}

export function errorHandler(err, req, res, next) {
  // Poora error sirf server logs me (debugging ke liye).
  console.error("[error]", err.stack || err.message);

  const status = err.statusCode || 500;
  res.status(status).json({
    message: friendlyMessage(err),
  });
}

// Async controllers ko wrap karke unke errors automatically errorHandler tak pohonchate hain.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
