// FLOW: Environment config. Raw process.env values from root .env are normalized here, then imported by DB, auth, billing, email, Gemini, and server startup code.

// Yeh file .env ki saari values ek jagah load karti hai aur check karti hai
// ki zaroori cheezein (DB, JWT secret, etc.) maujood hain.
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// .env project root me rehti hai. Yahan se (server/src/config/) root teen level upar hai.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const isProduction = process.env.NODE_ENV === "production";

// Saari environment values ek jagah, taaki poore app me consistent rahe.
// Baaki files direct process.env use karne ke bajaye isi `env` object ko import karti hain.
export const env = {
  isProduction,
  port: process.env.PORT || 5000,
  // CLIENT_URL me ek ya comma-separated multiple origins ho sakte hain.
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  geminiApiKey: process.env.GEMINI_API_KEY,
  // Multiple Gemini keys comma-separated aa sakti hain. Empty strings remove kar dete hain.
  geminiApiKeys: (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  encryptionSecret: process.env.ENCRYPTION_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePricePro: process.env.STRIPE_PRICE_PRO,
  stripePriceTeam: process.env.STRIPE_PRICE_TEAM,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  // Razorpay amounts paise me store hote hain: 74900 means Rs 749.
  razorpayProAmount: Number(process.env.RAZORPAY_PRO_AMOUNT) || 74900,
  razorpayTeamAmount: Number(process.env.RAZORPAY_TEAM_AMOUNT) || 249900,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  // SMTP_SECURE explicitly true/false ho sakta hai; unset ho to nodemailer default decide karega.
  smtpSecure:
    process.env.SMTP_SECURE === "true"
      ? true
      : process.env.SMTP_SECURE === "false"
        ? false
        : undefined,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.SMTP_FROM || process.env.EMAIL_FROM,
  otpExpiresMin: Number(process.env.OTP_EXPIRES_MIN) || 10,
  otpLength: Number(process.env.OTP_LENGTH) || 6,
  supportEmail: process.env.SUPPORT_EMAIL || "",
  sentryDsn: process.env.SENTRY_DSN,
  aiRateLimitMax: Number(process.env.AI_RATE_LIMIT_MAX) || 120,
  aiRateLimitWindowMinutes: Number(process.env.AI_RATE_LIMIT_WINDOW_MIN) || 15,
};

// Pehla origin default/primary client URL ke roop me (CORS, links, etc.).
env.clientUrl = env.clientUrls[0];

// Startup pe hi check kar lete hain ki zaroori keys maujood hain.
// Production me missing/weak secrets par fail-fast karte hain; dev me sirf warn.
export function validateEnv() {
  const problems = [];
  if (!env.mongoUri || env.mongoUri.includes("<user>")) problems.push("MONGO_URI is missing");
  if (!env.jwtSecret) problems.push("JWT_SECRET is missing");
  if (!env.geminiApiKey) problems.push("GEMINI_API_KEY is missing (admin can still set it in the UI)");

  // Weak/placeholder JWT secret ek silent security hole hai.
  if (env.jwtSecret && (env.jwtSecret.length < 32 || /change[_-]?me/i.test(env.jwtSecret))) {
    problems.push("JWT_SECRET is weak; use a long random value (e.g. `openssl rand -hex 32`)");
  }

  if (!problems.length) return;

  const message =
    `\n[env] Configuration problems:\n` +
    problems.map((p) => `       - ${p}`).join("\n") +
    `\n       Set these in the root .env file.\n`;

  // GEMINI_API_KEY ke alawa baaki sab production me hard error hai.
  const fatal = problems.some((p) => !p.startsWith("GEMINI_API_KEY"));
  if (isProduction && fatal) {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}
