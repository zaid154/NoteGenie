// Google Gemini AI — notes, quiz, flashcards, tutor. Multi-key pool with failover.
// Uses the current @google/genai SDK. All SDK-shape differences are isolated in the
// callModel / generateJson adapters and the tutorStream loop below.
import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";
import {
  getAppSettings,
  migrateLegacyKey,
  decryptApiKeyEntry,
  markKeyCooldown,
  clearKeyError,
  maskKey,
} from "../models/Settings.js";
import { ApiUsage } from "../models/ApiUsage.js";
import { isTransient, shouldFailoverToNextKey, formatGeminiError, geminiErrorDetail, sourceLabel, parseJson, isTruncatedGeminiResponse, isModelNotFoundError } from "./geminiHelpers.js";
import { acquireKey, releaseKey, acquireSpecificKey, sortPoolByLoad } from "./keyBalancer.js";
import { CHUNKED_SECTION_LIMIT, CHUNKED_SECTION_CONCURRENCY } from "../config/detailLevel.js";
import { shouldUseChunkedNotes, mergeSectionNotes, mergeSourceExcerpts, mapWithConcurrency } from "../utils/notesChunk.js";

const AI_NOT_CONFIGURED =
  "AI is not configured. Ask an admin to set the Gemini API key in Admin Settings.";

// Known-good model to retry with when the configured model id is rejected.
const FALLBACK_MODEL = "gemini-2.5-flash";

// Max output tokens a model family can emit. We set generous request ceilings on
// notes (below) and clamp them to the model's real ceiling so capable models
// (2.5) can produce long, untruncated notes while older models stay within limits.
function modelOutputCeiling(modelName = "") {
  if (/2\.5/.test(modelName)) return 32768;
  return 8192;
}

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

/** Shorter cooldown for RPM-style 429s; longer for invalid keys / daily quota. */
function cooldownMsForError(err) {
  const msg = String(err?.message || err?.status || "");
  if (/429|rate.?limit/i.test(msg) && !/daily|per day|free.?tier/i.test(msg)) {
    return 60 * 1000;
  }
  return 5 * 60 * 1000;
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

// Runs `operation({ ai, modelName, keyEntry })` against each key in the pool until
// one succeeds, failing over on quota/transient errors. `ai` is a GoogleGenAI client.
async function withKeyFailover(operation, { preferredKeyId, overrides = {} } = {}) {
  const { pool, model: defaultModel } = await getKeyPool();
  if (!pool.length) throw notConfiguredError();

  const modelName = overrides.model?.trim() || defaultModel;
  let ordered = sortPoolByLoad(pool);
  if (preferredKeyId) {
    const pref = pool.find((k) => k.id === preferredKeyId);
    if (pref) ordered = [pref, ...ordered.filter((k) => k.id !== preferredKeyId)];
  }

  let lastError;
  for (const keyEntry of ordered) {
    const preAcquired = preferredKeyId === keyEntry.id;
    if (!preAcquired) acquireSpecificKey(keyEntry);

    try {
      const ai = new GoogleGenAI({ apiKey: keyEntry.apiKey });
      let usedModel = modelName;
      let out;
      try {
        out = await withRetry(() => operation({ ai, modelName, keyEntry }));
      } catch (err) {
        // Configured model id rejected → retry once with a known-good fallback.
        if (isModelNotFoundError(err) && modelName !== FALLBACK_MODEL) {
          console.warn(`[gemini] model "${modelName}" unavailable — falling back to ${FALLBACK_MODEL}`);
          usedModel = FALLBACK_MODEL;
          out = await withRetry(() => operation({ ai, modelName: FALLBACK_MODEL, keyEntry }));
        } else {
          throw err;
        }
      }
      if (keyEntry.source === "db" && keyEntry.id !== "legacy") {
        clearKeyError(keyEntry.id).catch(() => {});
      }
      return { ...out, keyId: keyEntry.id, modelName: usedModel };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] key ${keyEntry.label} failed:`, err.message?.slice(0, 80));
      if (shouldFailoverToNextKey(err)) {
        if (keyEntry.source === "db" && keyEntry.id !== "legacy") {
          await markKeyCooldown(keyEntry.id, formatGeminiError(err), cooldownMsForError(err));
        }
        continue;
      }
      throw err;
    } finally {
      releaseKey(keyEntry.id);
    }
  }
  throw lastError;
}

export async function getKeyPool({ includeCooldown = false } = {}) {
  const settings = await getAppSettings();
  await migrateLegacyKey(settings);
  const now = Date.now();
  const seen = new Set();
  const pool = [];

  for (const entry of settings.apiKeys || []) {
    if (entry.disabled) continue;
    if (!includeCooldown && entry.cooldownUntil && new Date(entry.cooldownUntil).getTime() > now) continue;
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

export async function pickKeyForSlot(_slotIndex = 0) {
  return acquireKey(getKeyPool);
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

// --- @google/genai adapters -------------------------------------------------
// One call into the SDK. Returns the raw GenerateContentResponse (response.text
// getter, response.usageMetadata, response.candidates[].finishReason).
function callModel(ai, { model, contents, config }) {
  return ai.models.generateContent({ model, contents, config });
}

function parseJsonResponse(response, { retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return parseJson(response.text);
    } catch (err) {
      lastError = err;
      if (isTruncatedGeminiResponse(response)) {
        const truncErr = new Error(
          "AI response was cut off (too much content). Try Standard note depth or a smaller PDF."
        );
        truncErr.statusCode = 422;
        throw truncErr;
      }
      if (attempt < retries) {
        console.warn("[gemini] JSON parse retry", attempt + 1, response.text?.slice(0, 100));
      }
    }
  }
  throw lastError;
}

async function generateJson(ai, { model, contents, config }, { parseRetries = 1, genRetries = 1 } = {}) {
  // Clamp a requested output ceiling to what this model can actually emit.
  const tunedConfig =
    config?.maxOutputTokens
      ? { ...config, maxOutputTokens: Math.min(config.maxOutputTokens, modelOutputCeiling(model)) }
      : config;
  let lastError;
  for (let gen = 0; gen <= genRetries; gen++) {
    const response = await callModel(ai, { model, contents, config: tunedConfig });
    try {
      return { response, parsed: parseJsonResponse(response, { retries: parseRetries }) };
    } catch (err) {
      lastError = err;
      if (err.statusCode === 422) throw err;
      console.warn(`[gemini] JSON generation retry ${gen + 1}:`, err.message?.slice(0, 80));
    }
  }
  throw lastError;
}

export async function testApiKey(apiKey, model = "gemini-2.5-flash", meta = {}) {
  if (!apiKey?.trim()) throw new Error("API key is required");
  const trimmedModel = model.trim();
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const response = await ai.models.generateContent({
    model: trimmedModel,
    contents: "Reply with exactly: OK",
  });
  const text = response.text;
  await recordUsage({ feature: "test", ...meta }, trimmedModel, response.usageMetadata);
  return { ok: true, reply: text?.slice(0, 50) || "OK" };
}

export async function testAllKeys(meta = {}) {
  // Test every enabled key, including those on cooldown — a tiny probe should not hit RPM.
  const { pool, model } = await getKeyPool({ includeCooldown: true });
  const results = [];
  for (const entry of pool) {
    const masked = maskKey(entry.apiKey);
    const base = {
      id: entry.id,
      label: entry.label || "Key",
      masked,
      source: entry.source,
      sourceLabel: sourceLabel(entry.source),
      model,
    };
    try {
      const r = await testApiKey(entry.apiKey, model, meta);
      if (entry.source === "db" && entry.id !== "legacy") {
        await clearKeyError(entry.id);
      }
      results.push({ ...base, ok: true, reply: r.reply });
    } catch (err) {
      results.push({
        ...base,
        ok: false,
        error: formatGeminiError(err),
        errorDetail: geminiErrorDetail(err),
      });
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

function notesDepthGuide(detailLevel = "detailed") {
  if (detailLevel === "standard") {
    return {
      // Requested ceiling; clamped per-model in generateJson (so 2.5 gets full room).
      maxOutputTokens: 8192,
      excerptLimit: 4000,
      notesRules: `Create a concise exam-ready summary:
- Use 4–8 ## sections covering the main themes only.
- Prefer bullet lists; keep paragraphs short.
- Highlight key terms with **bold**; skip minor tangents.
- Each bullet must add new information — never restate the same fact in different words.
- Do NOT over-summarize into a single page if the source has multiple distinct topics — still cover each major topic briefly.`,
    };
  }
  return {
    maxOutputTokens: 16384,
    excerptLimit: 5000,
    notesRules: `Create comprehensive, exam-ready study notes:
- Use a ## section for EVERY major topic, chapter, or theme in the source.
- For long documents, produce proportionally long notes — do NOT compress a large source into a short summary.
- Include definitions, examples, cause-effect relationships, and comparisons (use markdown tables when comparing concepts).
- Use bullet lists and sub-bullets for detail; add **bold** for key terms.
- Cover edge cases, formulas, dates, names, and specific facts from the source.
- Do not repeat the same point across sections — each section must cover distinct material.`,
  };
}

export async function generateNotes(source, meta = {}) {
  const language = meta.language || "English";
  const detailLevel = meta.detailLevel === "standard" ? "standard" : "detailed";
  const depth = notesDepthGuide(detailLevel);

  const config = {
    maxOutputTokens: depth.maxOutputTokens,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        notes: { type: Type.STRING },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ["term", "definition"],
          },
        },
        sourceExcerpt: { type: Type.STRING },
      },
      required: ["title", "summary", "notes", "keyTakeaways", "glossary", "sourceExcerpt"],
    },
  };

  const prompt = `You are an expert study assistant. Read the provided content and produce study notes.
Return JSON with:
- "title": a short descriptive title for this material.
- "summary": a 2-3 sentence overview in plain text (no markdown in summary).
- "notes": well-structured study notes in GitHub-flavored Markdown. Use ## headings, bullet lists, and **bold** for key terms.
${depth.notesRules}
- "keyTakeaways": 3-6 of the single most important points a student must remember, each a short plain-text sentence (no markdown).
- "glossary": the key terms/definitions from the material as {term, definition} pairs (plain text, no markdown). Include 5-12 entries when the material has distinct terminology; use an empty array only if there are genuinely no notable terms.
- "sourceExcerpt": the most important factual passages from the source rewritten as plain text (no markdown), up to ${depth.excerptLimit} characters, for regeneration and tutoring context. Include names, definitions, and plot points.${outputLanguageInstruction(language)}`;

  const contents = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ ai, modelName }) => generateJson(ai, { model: modelName, contents, config }),
    { preferredKeyId: meta.preferredKeyId }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.response.usageMetadata);
  return out.parsed;
}

export async function generateNotesOutline(source, meta = {}) {
  const language = meta.language || "English";
  const config = {
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ["term", "definition"],
          },
        },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              pageHint: { type: Type.STRING },
            },
            required: ["id", "title"],
          },
        },
      },
      required: ["title", "summary", "keyTakeaways", "glossary", "sections"],
    },
  };

  const prompt = `Analyze the provided study material and produce a structured outline for comprehensive study notes.
Return JSON with:
- "title": short descriptive title
- "summary": 2-3 sentence overview (plain text, no markdown)
- "keyTakeaways": 3-6 of the single most important points a student must remember (short plain-text sentences, no markdown).
- "glossary": key terms/definitions as {term, definition} pairs (plain text). 5-12 entries when applicable; empty array only if there are no notable terms.
- "sections": array of major topics/chapters to cover. Each item needs "id" (short slug), "title" (section heading), optional "pageHint".
List EVERY major topic from the source — for long documents use 6–${CHUNKED_SECTION_LIMIT} sections. Order logically.${outputLanguageInstruction(language)}`;

  const contents = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ ai, modelName }) => generateJson(ai, { model: modelName, contents, config }),
    { preferredKeyId: meta.preferredKeyId }
  );

  await recordUsage({ ...meta, feature: "notes-outline", keyId: out.keyId }, out.modelName, out.response.usageMetadata);
  return out.parsed;
}

export async function expandNotesSection(source, sectionTitle, meta = {}) {
  const language = meta.language || "English";
  const detailLevel = meta.detailLevel === "standard" ? "standard" : "detailed";

  const config = {
    maxOutputTokens: detailLevel === "detailed" ? 4096 : 2048,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        excerpt: { type: Type.STRING },
      },
      required: ["content", "excerpt"],
    },
  };

  const prompt = `Expand ONLY the section "${sectionTitle}" from the provided material into detailed study notes.
Return JSON with:
- "content": GitHub-flavored Markdown for this section ONLY. Use bullet lists, **bold** key terms, and examples. Do NOT include a ## heading — content body only.
- "excerpt": plain-text key facts from this section (no markdown), up to 1200 characters.
Use concise bullet-style facts in "content" — avoid huge tables that bloat JSON output.
Focus exclusively on "${sectionTitle}".${outputLanguageInstruction(language)}`;

  const contents = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ ai, modelName }) => generateJson(ai, { model: modelName, contents, config }),
    { preferredKeyId: meta.preferredKeyId }
  );

  await recordUsage({ ...meta, feature: "notes-section", keyId: out.keyId }, out.modelName, out.response.usageMetadata);
  return out.parsed;
}

export async function generateNotesChunked(source, meta = {}) {
  const onProgress = meta.onProgress;
  onProgress?.({ phase: "outline" });

  const outline = await generateNotesOutline(source, meta);
  const sections = (outline.sections || []).slice(0, CHUNKED_SECTION_LIMIT);
  if (!sections.length) {
    const fallback = await generateNotes(source, meta);
    return { ...fallback, generationMode: "single" };
  }

  let slot = 0;
  const expandedResults = await mapWithConcurrency(
    sections,
    CHUNKED_SECTION_CONCURRENCY,
    async (section, i) => {
      onProgress?.({
        phase: "section",
        current: i + 1,
        total: sections.length,
        title: section.title,
      });

      const key = await pickKeyForSlot(slot++);
      const part = await expandNotesSection(source, section.title, {
        ...meta,
        preferredKeyId: key.id,
      });

      return {
        title: section.title,
        content: part.content || "",
        excerpt: part.excerpt?.trim() || "",
      };
    }
  );

  const expanded = expandedResults.map(({ title, content }) => ({ title, content }));
  const excerpts = expandedResults.map((r) => r.excerpt).filter(Boolean);

  const depth = notesDepthGuide(meta.detailLevel === "standard" ? "standard" : "detailed");
  const notes = mergeSectionNotes(expanded);
  const sourceExcerpt = mergeSourceExcerpts(excerpts, depth.excerptLimit);

  return {
    title: outline.title,
    summary: outline.summary,
    keyTakeaways: Array.isArray(outline.keyTakeaways) ? outline.keyTakeaways : [],
    glossary: Array.isArray(outline.glossary) ? outline.glossary : [],
    notes,
    sourceExcerpt,
    generationMode: "chunked",
  };
}

export async function generateNotesWithMode(source, meta = {}) {
  const useChunked = shouldUseChunkedNotes({
    pdfBytes: meta.pdfBytes || 0,
    textLength: meta.textLength || (typeof source === "string" ? source.length : 0),
  });

  if (useChunked) {
    return generateNotesChunked(source, meta);
  }

  const result = await generateNotes(source, meta);
  return { ...result, generationMode: "single" };
}

export async function generateQuiz(source, { difficulty = "medium", count = 5, preferredKeyId, language = "English", ...meta } = {}) {
  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctIndex", "explanation"],
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
Each question must have exactly 4 options, exactly one correct answer (correctIndex 0-3), and a short explanation of why it is correct.${outputLanguageInstruction(language)}`;

  const contents = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ ai, modelName }) => generateJson(ai, { model: modelName, contents, config }),
    { preferredKeyId: preferredKeyId || meta.preferredKeyId }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.response.usageMetadata);
  const quiz = out.parsed;
  return quiz.filter(
    (q) => Array.isArray(q.options) && q.options.length >= 2 && q.correctIndex < q.options.length
  );
}

export async function generateFlashcards(source, { count = 5, preferredKeyId, language = "English", existingFronts = [], sectionTitle = "", ...meta } = {}) {
  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
          section: { type: Type.STRING },
        },
        required: ["front", "back"],
      },
    },
  };

  const dedupeBlock =
    existingFronts.length > 0
      ? `\nDo NOT repeat or rephrase these existing card fronts:\n${existingFronts.map((f) => `- ${f}`).join("\n")}\n`
      : "";

  const sectionBlock = sectionTitle
    ? `\nAll cards MUST test concepts from the section "${sectionTitle}" only.\n`
    : "";

  const prompt = `Create exactly ${count} study flashcards based ONLY on the study notes / material below.
Rules:
- Every card must test a specific concept, fact, or definition that appears in the material — no generic filler.
- "front" = a clear question or term (plain text only — NO markdown, NO asterisks, NO bullet symbols).
- "back" = a concise answer or definition (plain text only — NO markdown).
- "section" = optional section/topic label this card belongs to.
- Cover different ideas; mix definitions, facts, and short "why/how" questions.
- Keep each side under 200 characters when possible.${sectionBlock}${dedupeBlock}${outputLanguageInstruction(language)}`;

  const contents = [{ text: prompt }, normalizeSource(source)];
  const out = await withKeyFailover(
    async ({ ai, modelName }) => generateJson(ai, { model: modelName, contents, config }),
    { preferredKeyId }
  );

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, out.response.usageMetadata);
  const cards = out.parsed;
  return Array.isArray(cards) ? cards.slice(0, count) : [];
}

export async function* tutorStream({ context, question, history = [], language = "English", meta = {} }) {
  const prompt = `You are NoteGenie, a friendly AI tutor. Answer the student's question using the study material below.
If the answer isn't in the material, say so and give your best general explanation. Be clear and concise.
Reply in ${language}.${outputLanguageInstruction(language)}

--- STUDY MATERIAL ---
${context?.slice(0, 12000) || "(no material provided)"}

--- CONVERSATION SO FAR ---
${history.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`).join("\n")}

Student: ${question}
Tutor:`;

  const out = await withKeyFailover(
    async ({ ai, modelName }) => ({
      stream: await withRetry(() =>
        ai.models.generateContentStream({ model: modelName, contents: prompt })
      ),
    }),
    { preferredKeyId: meta.preferredKeyId }
  );

  let usageMetadata;
  for await (const chunk of out.stream) {
    if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
    const text = chunk.text;
    if (text) yield text;
  }

  await recordUsage({ ...meta, keyId: out.keyId }, out.modelName, usageMetadata);
}

function normalizeSource(source) {
  if (typeof source === "string") return { text: source };
  if (source?.text !== undefined) return { text: source.text };
  return source;
}

function outputLanguageInstruction(language = "English") {
  return `\nIMPORTANT: Write ALL generated text exclusively in ${language} (titles, summaries, notes, questions, flashcard text, and explanations). Even if the source is in another language, output must be in ${language}. Keep proper nouns from the source when appropriate.`;
}
