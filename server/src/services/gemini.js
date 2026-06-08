// Yeh file Google Gemini AI se baat karti hai.
// Notes, quiz, flashcards aur tutor chat — sab yahan se generate hota hai.
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { env } from "../config/env.js";
import { getAppSettings } from "../models/Settings.js";
import { ApiUsage } from "../models/ApiUsage.js";

// Agar API key set nahi hai to yeh message user ko dikhega.
const AI_NOT_CONFIGURED =
  "AI is not configured. Ask an admin to set the Gemini API key in Admin Settings.";

// Approximate USD per 1M tokens (Google pricing — may change).
export const PRICE_PER_MILLION = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
};
export const DEFAULT_PRICING = { input: 0.3, output: 2.5 };

// Sabse exact match pehle, phir substring match, warna default.
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

// Fire-and-forget — logging failure must never break generation.
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
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: estimateCost(modelName, promptTokens, completionTokens),
    });
  } catch (err) {
    console.warn("[gemini] usage log failed:", err.message);
  }
}

// DB settings pehle, phir .env fallback.
export async function resolveConfig(overrides = {}) {
  const settings = await getAppSettings();
  const apiKey =
    overrides.apiKey?.trim() ||
    settings.geminiApiKey?.trim() ||
    env.geminiApiKey?.trim() ||
    "";
  const model =
    overrides.model?.trim() ||
    settings.geminiModel?.trim() ||
    env.geminiModel ||
    "gemini-2.5-flash";

  if (!apiKey) {
    const err = new Error(AI_NOT_CONFIGURED);
    err.statusCode = 503;
    throw err;
  }
  return { apiKey, model };
}

async function getModel(config = {}, overrides = {}) {
  const { apiKey, model } = await resolveConfig(overrides);
  const genAI = new GoogleGenerativeAI(apiKey);
  return {
    modelName: model,
    instance: genAI.getGenerativeModel({ model, ...config }),
  };
}

// Gemini kabhi-kabhi 503 (high demand) ya 429 (rate limit) deta hai - temporary.
async function withRetry(fn, { retries = 3, baseDelayMs = 1200 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || "");
      const transient = /\b(503|429|overloaded|high demand|temporarily|unavailable)\b/i.test(msg);
      if (!transient || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[gemini] transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function pdfPart(buffer) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: "application/pdf",
    },
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Common failure: model ne ```json ... ``` code fence me wrap kar diya.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // niche generic fallback try karte hain
      }
    }
    // Pehle balanced object/array nikaalne ki koshish (greedy match galat data de sakta hai).
    const match = text.match(/[[{][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}

// Admin: test a key without saving.
export async function testApiKey(apiKey, model = "gemini-2.5-flash", meta = {}) {
  if (!apiKey?.trim()) {
    throw new Error("API key is required");
  }
  const trimmedModel = model.trim();
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const m = genAI.getGenerativeModel({ model: trimmedModel });
  const result = await m.generateContent("Reply with exactly: OK");
  const text = result.response.text();
  await recordUsage({ feature: "test", ...meta }, trimmedModel, result.response.usageMetadata);
  return { ok: true, reply: text?.slice(0, 50) || "OK" };
}

// Admin: list models for dropdown.
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
  const { modelName, instance } = await getModel({
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          notes: { type: SchemaType.STRING },
        },
        required: ["title", "summary", "notes"],
      },
    },
  });

  const prompt = `You are an expert study assistant. Read the provided content and produce study notes.
Return JSON with:
- "title": a short descriptive title for this material.
- "summary": a 2-3 sentence overview.
- "notes": well-structured study notes in GitHub-flavored Markdown. Use headings, bullet points, **bold** key terms, and short examples. Keep it clear and student-friendly.`;

  const parts = [{ text: prompt }, normalizeSource(source)];
  const result = await withRetry(() => instance.generateContent(parts));
  await recordUsage(meta, modelName, result.response.usageMetadata);
  return parseJson(result.response.text());
}

export async function generateQuiz(source, { difficulty = "medium", count = 5, meta = {} } = {}) {
  const { modelName, instance } = await getModel({
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
  });

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
  const result = await withRetry(() => instance.generateContent(parts));
  await recordUsage(meta, modelName, result.response.usageMetadata);
  const quiz = parseJson(result.response.text());
  return quiz.filter(
    (q) => Array.isArray(q.options) && q.options.length >= 2 && q.correctIndex < q.options.length
  );
}

export async function generateFlashcards(source, { count = 8, meta = {} } = {}) {
  const { modelName, instance } = await getModel({
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
  });

  const prompt = `Create ${count} study flashcards from the provided content.
"front" = a concept, term, or question. "back" = a concise, clear answer/definition.`;

  const parts = [{ text: prompt }, normalizeSource(source)];
  const result = await withRetry(() => instance.generateContent(parts));
  await recordUsage(meta, modelName, result.response.usageMetadata);
  return parseJson(result.response.text());
}

export async function* tutorStream({ context, question, history = [], meta = {} }) {
  const { modelName, instance } = await getModel();

  const historyText = history
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const prompt = `You are NoteGenie, a friendly AI tutor. Answer the student's question using the study material below.
If the answer isn't in the material, say so and give your best general explanation. Be clear and concise.

--- STUDY MATERIAL ---
${context?.slice(0, 12000) || "(no material provided)"}

--- CONVERSATION SO FAR ---
${historyText}

Student: ${question}
Tutor:`;

  // Stream shuru hone se pehle transient errors par retry karte hain (chunks aane ke baad nahi).
  const result = await withRetry(() => instance.generateContentStream(prompt));
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }

  const response = await result.response;
  await recordUsage(meta, modelName, response.usageMetadata);
}

function normalizeSource(source) {
  if (typeof source === "string") return { text: source };
  if (source?.text !== undefined) return { text: source.text };
  return source;
}
