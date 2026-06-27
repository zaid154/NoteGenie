// FLOW: Settings Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

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

// Feature flags — admin can disable a feature so it disappears from the nav, its route shows
// an "unavailable" message, and (where wired) its API is blocked. Default true = enabled.
const featureFlagsSchema = new mongoose.Schema(
  {
    upload: { type: Boolean, default: true },
    askAi: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    billing: { type: Boolean, default: true },
    store: { type: Boolean, default: true },
    workspaces: { type: Boolean, default: true },
  },
  { _id: false }
);

// Canonical list + labels, reused by the admin UI and the public config endpoint.
export const FEATURE_KEYS = ["upload", "askAi", "analytics", "billing", "store", "workspaces"];
export const FEATURE_LABELS = {
  upload: "Upload",
  askAi: "Ask AI",
  analytics: "Analytics",
  billing: "Billing",
  store: "Store",
  workspaces: "Workspaces",
};

export function resolveFeatures(settings) {
  const f = settings?.features || {};
  const out = {};
  for (const key of FEATURE_KEYS) out[key] = f[key] !== false; // default enabled
  return out;
}

// Theme: admin-chosen site default. Accent presets match the [data-accent] blocks in the
// client index.css; mode is the default light/dark for users who haven't picked their own.
const themeSchema = new mongoose.Schema(
  {
    accent: { type: String, default: "indigo" },
    mode: { type: String, default: "light" },
  },
  { _id: false }
);

export const THEME_ACCENTS = ["indigo", "violet", "blue", "emerald"];
export const THEME_MODES = ["light", "dark"];

export function resolveTheme(settings) {
  const t = settings?.theme || {};
  return {
    accent: THEME_ACCENTS.includes(t.accent) ? t.accent : "indigo",
    mode: THEME_MODES.includes(t.mode) ? t.mode : "light",
  };
}

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },
    features: { type: featureFlagsSchema, default: () => ({}) },
    theme: { type: themeSchema, default: () => ({}) },
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
    // Master switch for all AI generation (notes, assignment, guess, quiz, tutor,
    // flashcards). Admin can turn AI off when the free API is unreliable; non-AI
    // features (viewing, review, browsing) keep working.
    aiEnabled: { type: Boolean, default: true },
    // Public storefront content (utility bar, hero, contact). Exposed via
    // GET /api/catalog/storefront; editable in Admin → Settings → Storefront.
    storefront: {
      type: new mongoose.Schema(
        {
          utilityBarText: { type: String, default: "" },
          whatsappNumber: { type: String, default: "" },
          supportEmail: { type: String, default: "" },
          heroTitle: { type: String, default: "" },
          heroSubtitle: { type: String, default: "" },
          heroBannerUrl: { type: String, default: "" },
          instagram: { type: String, default: "" },
          facebook: { type: String, default: "" },
          youtube: { type: String, default: "" },
          telegram: { type: String, default: "" },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
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
