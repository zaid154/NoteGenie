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

export function decryptKey(stored) {
  if (!stored?.trim()) return "";
  if (!stored.startsWith("enc:")) return stored.trim();
  const key = getKey();
  if (!key) return stored.trim();
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return stored.trim();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
