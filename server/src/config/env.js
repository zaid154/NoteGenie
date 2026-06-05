import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// .env project root me rehti hai. Yahan se (server/src/config/) root teen level upar hai.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Saari environment values ek jagah, taaki poore app me consistent rahe.
export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

// Startup pe hi check kar lete hain ki zaroori keys maujood hain.
export function validateEnv() {
  const missing = [];
  if (!env.mongoUri || env.mongoUri.includes("<user>")) missing.push("MONGO_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (!env.geminiApiKey) missing.push("GEMINI_API_KEY");

  if (missing.length) {
    console.warn(
      `\n[warn] Yeh env values set nahi hain: ${missing.join(", ")}.` +
        `\n       Root .env file me inhe bharo, warna kuch features kaam nahi karenge.\n`
    );
  }
}
