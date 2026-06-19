// Google Gemini AI — notes, quiz, flashcards, tutor. Multi-key pool with failover.
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env } from "../config/env.js";
import {
  getAppSettings,
  migrateLegacyKey,
  decryptApiKeyEntry,
  markKeyCooldown,
  clearKeyError,
} from "../models/Settings.js";
import { ApiUsage } from "../models/ApiUsage.js";
import { isKeyExhausted, isTransient } from "./geminiHelpers.js";

const AI_NOT_CONFIGURED =
  "AI is not configured. Ask an admin to set the Gemini API key in Admin Settings.";

let roundRobinIndex = 0;

export const PRICE_PER_MILLION = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
};
export const DEFAULT_PRICING = { input: 0.3, output: 2.5 };

export function getPricing(modelName = "") {
  return (
    PRICE_PER_MILLION[modelName] ||
    Object.entries(PRICE_PER_MILLION).find(([k]) => modelName.includes(k))?.[1] ||
    DEFAULT_PRICING
  );
}

function estimateCost(modelName, promptTokens, completionTokens) {
  const pricing = getPricing(modelName);
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

async function recordUsage(meta, modelName, usageMetadata) {
  if (!meta?.feature) return;
  try {
    const promptTokens = usageMetadata?.promptTokenCount || 0;
    const completionTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens =
      usageMetadata?.totalTokenCount || promptTokens + completionTokens;
    await ApiUsage.create({
      userId: meta.userId || null,
      feature: meta.feature,
      model: modelName,
      keyId: meta.keyId || "",
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: estimateCost(modelName, promptTokens, completionTokens),
    });
  } catch (err) {
    console.warn("[gemini] usage log failed:", err.message);
  }
}

function notConfiguredError() {
  const err = new Error(AI_NOT_CONFIGURED);
  err.statusCode = 503;
  return err;
}

async function resolveModel(overrides = {}) {
  const settings = await getAppSettings();
  await migrateLegacyKey(settings);
  return (
    overrides.model?.trim() ||
    settings.geminiModel?.trim() ||
    env.geminiModel ||
    "gemini-2.5-flash"
  );
}

async function withRetry(fn, { retries = 2, baseDelayMs = 800 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[gemini] retry in ${delay}ms (${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function withKeyFailover(operation, { preferredKeyId, modelConfig = {}, overrides = {} } = {}) {
  const { pool, model: defaultModel } = await getKeyPool();
  if (!pool.length) throw notConfiguredError();

  const modelName = overrides.model?.trim() || defaultModel;
  let ordered = [...pool];
  if (preferredKeyId) {
    const pref = pool.find((k) => k.id === preferredKeyId);
    if (pref) ordered = [pref, ...pool.filter((k) => k.id !== preferredKeyId)];
  }

  let lastError;
  for (const keyEntry of ordered) {
    try {
      const genAI = new GoogleGenerativeAI(keyEntry.apiKey);
      const instance = genAI.getGenerativeModel({ model: modelName, ...modelConfig });
      const out = await withRetry(() => operation({ instance, modelName, keyEntry }));
      if (keyEntry.source === "db" && keyEntry.id !== "legacy") {
        clearKeyError(keyEntry.id).catch(() => {});
      }
      return { ...out, keyId: keyEntry.id, modelName };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] key ${keyEntry.label} failed:`, err.message?.slice(0, 80));
      if (isKeyExhausted(err) && keyEntry.source === "db" && keyEntry.id !== "legacy") {
        await markKeyCooldown(keyEntry.id, err.message, 5 * 60 * 1000);
      }
      if (isKeyExhausted(err) || isTransient(err)) continue;
      throw err;
    }
  }
  throw lastError;
}

export async function getKeyPool() {
  const settings = await getAppSettings();
  await migrateLegacyKey(settings);
  const now = Date.now();
  const seen = new Set();
  const pool = [];

  for (const entry of settings.apiKeys || []) {
    if (entry.disabled) continue;
    if (entry.cooldownUntil && new Date(entry.cooldownUntil).getTime() > now) continue;
    const apiKey = decryptApiKeyEntry(entry);
    if (!apiKey || seen.has(apiKey)) continue;
    seen.add(apiKey);
    pool.push({
      id: entry.id,
      label: entry.label || "Key",
      apiKey,
      priority: entry.priority ?? 0,
      source: "db",
    });
  }

  const legacyKey = settings.geminiApiKey?.trim();
  if (legacyKey && !seen.has(legacyKey)) {
    seen.add(legacyKey);
    pool.push({ id: "legacy", label: "Legacy", apiKey: legacyKey, priority: 999, source: "db-legacy" });
  }

  for (let i = 0; i < env.geminiApiKeys.length; i++) {
    const apiKey = env.geminiApiKeys[i];
    if (!apiKey || seen.has(apiKey)) continue;
    seen.add(apiKey);
    pool.push({ id: `env-${i}`, label: `Env ${i + 1}`, apiKey, priority: 1000 + i, source: "env" });
  }

  const singleEnv = env.geminiApiKey?.trim();
  if (singleEnv && !seen.has(singleEnv)) {
    seen.add(singleEnv);
    pool.push({ id: "env-single", label: "Env", apiKey: singleEnv, priority: 2000, source: "env" });
  }

  pool.sort((a, b) => a.priority - b.priority);
  return { pool, model: await resolveModel() };
}

export async function pickKeyForSlot(slotIndex = 0) {
  const { pool } = await getKeyPool();
  if (!pool.length) throw notConfiguredError();
  const idx = (roundRobinIndex + slotIndex) % pool.length;
  roundRobinIndex = (roundRobinIndex + 1) % Math.max(pool.length, 1);
  return pool[idx];
}

export async function resolveConfig(overrides = {}) {
  const { pool, model } = await getKeyPool();
  const apiKey = overrides.apiKey?.trim() || pool[0]?.apiKey || "";
  if (!apiKey) throw notConfiguredError();
  return { apiKey, model: overrides.model?.trim() || model, keyId: pool[0]?.id || "" };
}

export function pdfPart(buffer) {
  return {
    inlineData: { data: buffer.toString("base64"), mimeType: "application/pdf" },
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fall through */
      }
    }
    const match = text.match(/[[{][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}

export async function testApiKey(apiKey, model = "gemini-2.5-flash", meta = {}) {
  if (!apiKey?.trim()) throw new Error("API key is required");
  const trimmedModel = model.trim();
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const m = genAI.getGenerativeModel({ model: trimmedModel });
  const result = await m.generateContent("Reply with exactly: OK");
  const text = result.response.text();
  await recordUsage({ feature: "test", ...meta }, trimmedModel, result.response.usageMetadata);
  return { ok: true, reply: text?.slice(0, 50) || "OK" };
}

export async function testAllKeys(meta = {}) {
  const { pool, model } = await getKeyPool();
  const results = [];
  for (const entry of pool) {
    try {
      const r = await testApiKey(entry.apiKey, model, meta);
      results.push({ id: entry.id, label: entry.label, ok: true, reply: r.reply });
    } catch (err) {
      results.push({ id: entry.id, label: entry.label, ok: false, error: err.message?.slice(0, 120) });
    }
  }
  return results;
}

export async function listModels(apiKey) {
  const key = apiKey?.trim() || (await resolveConfig()).apiKey;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Could not list models: ${res.status} ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return (data.models || [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => /^gemini/i.test(name))
    .sort();
}

export async function generateNotes(source, meta = {}) {
  const modelConfig = {
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          notes: { type: SchemaType.STRING },
          sourceExcerpt: { type: SchemaType.STRING },
        },
        required: ["title", "summary", "notes", "sourceExcerpt"],
      },
    },
  };

  const prompt = `You are an expert study assistant. Read the provided content and produce study notes.
Return JSON with:
- "title": a short descriptive title for this material.
- "summary": a 2-3 sentence overview in plain text (no markdown in summary).
- "notes": well-structured study notes in GitHub-flavored Markdown. Use ## headings, bullet lists, and **bold** for key terms. Cover all major topics from the source. Be thorough but clear.
- "sourceExcerpt": the most important factual passages from the source rewritten as plain text (no markdown), up to 8000 characters, for regeneration and tutoring context. Include names, definitions, and plot points.`;

  const parts = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ instance }) => ({ result: await instance.generateContent(parts) }),
    { preferredKeyId: meta.preferredKeyId, modelConfig }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.result.response.usageMetadata);
  return parseJson(out.result.response.text());
}

export async function generateQuiz(source, { difficulty = "medium", count = 5, preferredKeyId, ...meta } = {}) {
  const modelConfig = {
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question: { type: SchemaType.STRING },
            options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            correctIndex: { type: SchemaType.NUMBER },
            explanation: { type: SchemaType.STRING },
          },
          required: ["question", "options", "correctIndex", "explanation"],
        },
      },
    },
  };

  const difficultyGuide = {
    easy: "Easy: test basic recall of definitions and stated facts. Keep options clearly distinct.",
    medium: "Medium: test understanding and application of concepts, not just recall. Use plausible distractors.",
    hard: "Hard: test deep analysis, comparison, edge cases, and reasoning. Use subtle, tricky distractors that require careful thought.",
  };

  const prompt = `Create a multiple-choice quiz based ONLY on the provided content.
Generate EXACTLY ${count} questions (no more, no fewer).
Difficulty level: ${difficulty.toUpperCase()}. ${difficultyGuide[difficulty] || difficultyGuide.medium}
Cover different parts of the content so questions are varied (avoid repeating the same idea).
Each question must have exactly 4 options, exactly one correct answer (correctIndex 0-3), and a short explanation of why it is correct.`;

  const parts = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ instance }) => ({ result: await instance.generateContent(parts) }),
    { preferredKeyId: preferredKeyId || meta.preferredKeyId, modelConfig }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.result.response.usageMetadata);
  const quiz = parseJson(out.result.response.text());
  return quiz.filter(
    (q) => Array.isArray(q.options) && q.options.length >= 2 && q.correctIndex < q.options.length
  );
}

export async function generateFlashcards(source, { count = 12, preferredKeyId, ...meta } = {}) {
  const modelConfig = {
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            front: { type: SchemaType.STRING },
            back: { type: SchemaType.STRING },
          },
          required: ["front", "back"],
        },
      },
    },
  };

  const prompt = `Create exactly ${count} study flashcards from the provided content.
Rules:
- "front" = a clear question or term (plain text only — NO markdown, NO asterisks, NO bullet symbols).
- "back" = a concise answer or definition (plain text only — NO markdown).
- Cover different sections of the material; mix definitions, facts, and short "why/how" questions.
- Keep each side under 200 characters when possible.`;

  const parts = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ instance }) => ({ result: await instance.generateContent(parts) }),
    { preferredKeyId, modelConfig }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.result.response.usageMetadata);
  const cards = parseJson(out.result.response.text());
  return Array.isArray(cards) ? cards.slice(0, count) : [];
}

export async function* tutorStream({ context, question, history = [], meta = {} }) {
  const prompt = `You are NoteGenie, a friendly AI tutor. Answer the student's question using the study material below.
If the answer isn't in the material, say so and give your best general explanation. Be clear and concise.

--- STUDY MATERIAL ---
${context?.slice(0, 12000) || "(no material provided)"}

--- CONVERSATION SO FAR ---
${history.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`).join("\n")}

Student: ${question}
Tutor:`;

  const out = await withKeyFailover(
    async ({ instance }) => ({ streamResult: await instance.generateContentStream(prompt) }),
    { preferredKeyId: meta.preferredKeyId }
  );

  for await (const chunk of out.streamResult.stream) {
    const text = chunk.text();
    if (text) yield text;
  }

  const response = await out.streamResult.response;
  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, response.usageMetadata);
}

function normalizeSource(source) {
  if (typeof source === "string") return { text: source };
  if (source?.text !== undefined) return { text: source.text };
  return source;
}
