import mongoose from "mongoose";
import crypto from "crypto";
import { encryptKey, decryptKey, tryDecryptKey } from "../services/keyCrypto.js";

const apiKeyEntrySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
    key: { type: String, required: true },
    priority: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    lastError: { type: String, default: "" },
    lastErrorAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: null },
  },
  { _id: false }
);

const planLimitSchema = new mongoose.Schema(
  {
    documents: { type: Number, default: null },
    tutorMessages: { type: Number, default: null },
    quizzes: { type: Number, default: null },
  },
  { _id: false }
);

const customPlanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    durationDays: { type: Number, default: 30 },
    limits: { type: planLimitSchema, default: () => ({}) },
    features: { type: [String], default: [] },
    popular: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },
    geminiApiKey: { type: String, default: "" },
    geminiModel: { type: String, default: "gemini-2.5-flash" },
    apiKeys: { type: [apiKeyEntrySchema], default: [] },
    billingProAmount: { type: Number, default: null },
    billingTeamAmount: { type: Number, default: null },
    planLimits: {
      type: Map,
      of: planLimitSchema,
      default: undefined,
    },
    customPlans: { type: [customPlanSchema], default: [] },
    aiRateLimitMax: { type: Number, default: null },
    aiRateLimitWindowMinutes: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

export async function getAppSettings() {
  let doc = await Settings.findOne({ key: "app" });
  if (!doc) {
    doc = await Settings.create({ key: "app" });
  }
  return doc;
}

export function maskKey(key) {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function decryptApiKeyEntry(entry) {
  return decryptKey(entry?.key);
}

export function tryDecryptApiKeyEntry(entry) {
  return tryDecryptKey(entry?.key);
}

const UNREADABLE_KEY_MSG =
  "Cannot decrypt — ENCRYPTION_SECRET may have changed. Remove and re-add this key.";

export { UNREADABLE_KEY_MSG };

export function encryptApiKeyValue(plaintext) {
  return encryptKey(plaintext);
}

export async function migrateLegacyKey(settings) {
  if (settings.geminiApiKey?.trim() && settings.apiKeys.length === 0) {
    settings.apiKeys.push({
      id: crypto.randomUUID(),
      label: "Primary",
      key: encryptApiKeyValue(settings.geminiApiKey.trim()),
      priority: 0,
      disabled: false,
    });
    await settings.save();
  }
}

export async function markKeyCooldown(keyId, errorMessage, cooldownMs = 5 * 60 * 1000) {
  const settings = await getAppSettings();
  const entry = settings.apiKeys.find((k) => k.id === keyId);
  if (!entry) return;
  entry.lastError = String(errorMessage || "").slice(0, 200);
  entry.lastErrorAt = new Date();
  entry.failureCount = (entry.failureCount || 0) + 1;
  entry.cooldownUntil = new Date(Date.now() + cooldownMs);
  await settings.save();
}

export async function clearKeyError(keyId) {
  const settings = await getAppSettings();
  const entry = settings.apiKeys.find((k) => k.id === keyId);
  if (!entry) return;
  entry.lastError = "";
  entry.failureCount = 0;
  entry.cooldownUntil = null;
  await settings.save();
}
