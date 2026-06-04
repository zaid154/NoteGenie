import mongoose from "mongoose";
import { env } from "./env.js";

// Agar error IP-whitelist se related lage to user ko clear hint dete hain.
function hint(message) {
  if (/whitelist|IP that isn't|ECONNREFUSED|querySrv|getaddrinfo/i.test(message)) {
    return (
      "\n       Tip: MongoDB Atlas -> Network Access me apna current IP (ya 0.0.0.0/0) " +
      "add karo. IP badalne par yeh error aata hai."
    );
  }
  return "";
}

// MongoDB Atlas se connect. Turant crash hone ke bajaye kuch baar retry karte hain,
// taaki IP whitelist hote hi server khud connect ho jaye.
export async function connectDB({ retries = 5, delayMs = 5000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log("[db] MongoDB connected");
      return;
    } catch (err) {
      const last = attempt === retries;
      console.error(
        `[db] MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}` +
          (last ? hint(err.message) : "")
      );
      if (last) throw err;
      console.log(`[db] ${delayMs / 1000}s me dobara try kar raha hoon...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
