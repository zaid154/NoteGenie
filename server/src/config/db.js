// FLOW: Database config. MONGO_URI comes from config/env.js, mongoose connects to MongoDB, and all models/controllers use this single connection.

// Yeh file MongoDB database se connect karti hai (mongoose ke through).
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
  if (!env.mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Add your MongoDB connection string to the root .env file."
    );
  }

  // Connection state changes ko log karte hain taaki drop/reconnect dikh jaye.
  mongoose.connection.on("disconnected", () => console.warn("[db] MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[db] MongoDB reconnected"));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, {
        // MongoDB server 8 seconds me select/connect na ho to current attempt fail.
        serverSelectionTimeoutMS: 8000,
        // Ek server process max 10 DB connections pool me rakhega.
        maxPoolSize: 10,
        // Minimum 2 connections warm rakhta hai, taaki common queries fast start ho.
        minPoolSize: 2,
        // Ek socket operation 45 seconds se zyada atka rahe to timeout.
        socketTimeoutMS: 45000,
      });
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
