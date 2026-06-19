// Yeh server ka entry point hai. Express app banata hai, security/rate-limit lagata hai,
// saare routes jodta hai, DB se connect karta hai aur server chalu karta hai.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env, validateEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { aiRateLimitMiddleware } from "./middleware/aiRateLimit.js";

import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import quizRoutes from "./routes/quiz.js";
import tutorRoutes from "./routes/tutor.js";
import adminRoutes from "./routes/admin.js";
import billingRoutes from "./routes/billing.js";
import shareRoutes from "./routes/share.js";

validateEnv();

if (env.sentryDsn) {
  console.log("[server] Sentry DSN configured (add @sentry/node package to enable full tracing)");
}

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Stripe webhook needs raw body — mount before JSON parser.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "1mb" }));

// Saare API par ek baseline limiter.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// AI routes — limit admin-configurable (Admin → AI Settings). Admin users are exempt.
app.get("/api/health", async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.json({ status: "ok", db: dbOk ? "connected" : "disconnected" });
});

// Har URL group ko uske routes file se jodte hain (aur upar wale limiters lagate hain).
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/share", shareRoutes);

// Inhe sabse last me lagana zaroori hai:
app.use(notFound);      // koi route match na ho to 404
app.use(errorHandler);  // kahin bhi error aaye to use yahan handle karte hain

// start: pehle DB connect, fir server ko port pe sunne lagao.
async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] NoteGenie API running on http://localhost:${env.port}`);
  });

  // Port already busy hone par saaf-saaf bataate hain (ugly crash ke bajaye).
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n[server] Port ${env.port} already in use.` +
          `\n         Koi aur process is port pe chal raha hai. Do options:` +
          `\n         1) Root .env me PORT badlo (e.g. PORT=5001) aur dubara chalao.` +
          `\n         2) Ya purana process band karo:` +
          `\n            Windows:  netstat -ano | findstr ":${env.port}"  →  taskkill /PID <PID> /F\n`
      );
    } else {
      console.error("[server] Server error:", err.message);
    }
    process.exit(1);
  });
}

// Stray errors ko log karke graceful behavior dete hain (silent crash se bachne ke liye).
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

start().catch((err) => {
  console.error("[server] Failed to start:", err.message);
  process.exit(1);
});
