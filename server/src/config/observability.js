// FLOW: Observability config. SENTRY_DSN comes from env, initSentry optionally enables monitoring, and requestLogger sends request timing to server logs.

// Optional error tracking + lightweight request logging.
// Sentry dynamic import se load hota hai, isliye dependency tabhi required hai
// jab SENTRY_DSN set ho aur @sentry/node installed ho.
import { env } from "./env.js";

let sentry = null;

// Server start hote waqt optional Sentry initialize karta hai.
// Agar SENTRY_DSN empty hai to monitoring skip ho jati hai.
export async function initSentry() {
  if (!env.sentryDsn) return;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.nodeEnv || "development",
      tracesSampleRate: 0.1,
    });
    sentry = Sentry;
    console.log("[server] Sentry error tracking initialized");
  } catch {
    console.warn(
      "[server] SENTRY_DSN is set but @sentry/node is not installed; run `npm i @sentry/node` to enable error tracking"
    );
  }
}

// Error ko monitoring service me bhejta hai.
// Telemetry fail ho to app response break nahi hota.
export function captureException(err) {
  try {
    sentry?.captureException?.(err);
  } catch {
    /* never let telemetry break a response */
  }
}

// Har API request ka small log: method, path, status, duration.
// Health checks skip hain, warna logs me noise badh jata hai.
export function requestLogger(req, res, next) {
  if (req.path === "/api/health") return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const slow = ms > 2000 ? " SLOW" : "";
    console.log(
      `[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms${slow}`
    );
  });
  next();
}
