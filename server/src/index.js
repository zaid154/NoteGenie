import express from "express";
import cors from "cors";
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

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// AI endpoints mehenge hote hain, isliye basic rate limiting laga dete hain.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] NoteGenie API running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err.message);
  process.exit(1);
});
