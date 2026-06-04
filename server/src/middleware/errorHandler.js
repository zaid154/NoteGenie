// Ek hi jagah saari errors handle hoti hain, taaki har controller me try-catch repeat na ho.
export function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function friendlyMessage(err) {
  const msg = err.message || "";
  if (err.statusCode === 503 && /AI is not configured/i.test(msg)) {
    return msg;
  }
  if (/GoogleGenerativeAI|generativelanguage|API key|API_KEY|403|401/i.test(msg)) {
    return "AI request failed. Check the Gemini API key in Admin Settings.";
  }
  if (/503|429|high demand|overloaded/i.test(msg)) {
    return "AI is busy right now. Please wait a moment and try again.";
  }
  if (/whitelist|MongoServerSelection|ECONNREFUSED/i.test(msg)) {
    return "Database connection failed. Check MongoDB Atlas network access.";
  }
  return msg || "Something went wrong";
}

export function errorHandler(err, req, res, next) {
  console.error("[error]", err.message);

  const status = err.statusCode || 500;
  res.status(status).json({
    message: friendlyMessage(err),
  });
}

// Async controllers ko wrap karke unke errors automatically errorHandler tak pohonchate hain.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
