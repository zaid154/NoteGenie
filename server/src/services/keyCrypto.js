// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Admin settings use this when API keys are saved/read. ENCRYPTION_SECRET comes from config/env.js, plaintext keys become encrypted DB values, and decrypt helpers return usable keys for Gemini calls.

// Encrypt/decrypt Gemini API keys at rest using AES-256-GCM.
import crypto from "crypto";
import { env } from "../config/env.js";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey() {
  const secret = env.encryptionSecret || env.jwtSecret || "";
  if (!secret || secret.length < 16) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptKey(plaintext) {
  if (!plaintext?.trim()) return "";
  const key = getKey();
  if (!key) return plaintext.trim();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function tryDecryptKey(stored) {
  if (!stored?.trim()) return { ok: true, value: "" };
  if (!stored.startsWith("enc:")) return { ok: true, value: stored.trim() };
  const key = getKey();
  if (!key) return { ok: true, value: stored.trim() };
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return { ok: true, value: stored.trim() };
  try {
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return { ok: true, value: dec.toString("utf8") };
  } catch {
    return { ok: false, value: null };
  }
}

export function decryptKey(stored) {
  const result = tryDecryptKey(stored);
  return result.ok ? result.value : "";
}

