// Optional error tracking + lightweight request logging.
// Sentry is loaded dynamically so the dependency is only required when SENTRY_DSN is set
// AND @sentry/node is installed — otherwise this degrades to a no-op.
import { env } from "./env.js";

let sentry = null;

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
      "[server] SENTRY_DSN is set but @sentry/node is not installed — run `npm i @sentry/node` to enable error tracking"
    );
  }
}

export function captureException(err) {
  try {
    sentry?.captureException?.(err);
  } catch {
    /* never let telemetry break a response */
  }
}

// Concise per-request logging: method, path, status, duration. Skips health checks.
export function requestLogger(req, res, next) {
  if (req.path === "/api/health") return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const slow = ms > 2000 ? " SLOW" : "";
    console.log(`[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms${slow}`);
  });
  next();
}
