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

start().catch((err) => {
  console.error("[server] Failed to start:", err.message);
  process.exit(1);
});
