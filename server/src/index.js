import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env, validateEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import quizRoutes from "./routes/quiz.js";
import tutorRoutes from "./routes/tutor.js";
import adminRoutes from "./routes/admin.js";

validateEnv();

const app = express();

// Reverse proxy ke peeche sahi client IP (rate limiting ke liye zaroori).
app.set("trust proxy", 1);

// Basic security headers. API hai isliye CSP off rakhte hain (frontend alag serve hota hai).
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: env.clientUrls (comma-separated) me se koi bhi origin allow.
app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server / curl (no origin) allow.
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// JSON body chhota rakhte hain (PDF multipart se aata hai, JSON nahi).
app.use(express.json({ limit: "1mb" }));

// Saare API par ek baseline limiter.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Login/register par stricter limiter (brute-force/credential stuffing rokne ke liye).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

// AI endpoints mehenge hain — inhe alag, kam budget dete hain.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You're generating a lot right now. Please wait a moment and try again." },
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/documents", aiLimiter, documentRoutes);
app.use("/api/quiz", aiLimiter, quizRoutes);
app.use("/api/tutor", aiLimiter, tutorRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

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
