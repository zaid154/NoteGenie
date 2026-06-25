// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: DocumentGeneration calls this as the main material pipeline. Source data comes from PDF buffer or extracted link text, Gemini creates notes/flashcards, Document is saved, and progress phases go back to SSE/UI.

import { Document } from "../models/Document.js";
import { generateNotesWithMode, generateAssignment, generateGuessPaper, generateFlashcards, pdfPart, mediaPart, pickKeyForSlot } from "./gemini.js";
import { extractTextFromUrl } from "./linkExtractor.js";
import { extractTextFromFile } from "./fileExtractor.js";
import { resolveUploadType } from "../config/uploadTypes.js";
import { indexDocumentSafe } from "./rag.js";
import { normalizeOutputLanguage } from "../config/languages.js";
import { normalizeDetailLevel, clampFlashcardCount } from "../config/detailLevel.js";
import { shouldUseChunkedNotes } from "../utils/notesChunk.js";
import { sanitizeFlashcards } from "../utils/textClean.js";
import { initFlashcard } from "./spacedRepetition.js";
import { parseTags } from "../utils/documentTags.js";

const DEFAULT_CARD_BATCH = 5;

export async function withStepRetry(fn, { retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn("[orchestrator] step retry", attempt + 1, err.message?.slice(0, 80));
      }
    }
  }
  throw lastError;
}

async function generateInitialFlashcards(notesText, meta) {
  const notesSource = String(notesText || "").trim();
  if (!notesSource) return [];

  const count = clampFlashcardCount(meta.cardCount ?? DEFAULT_CARD_BATCH);
  const flashKey = await pickKeyForSlot(0);

  const raw = await withStepRetry(
    () =>
      generateFlashcards(notesSource, {
        userId: meta.userId,
        feature: "flashcards",
        preferredKeyId: flashKey.id,
        language: meta.language,
        count,
        existingFronts: [],
      }),
    { retries: 1 }
  );

  return sanitizeFlashcards(raw).map((c) => initFlashcard({ ...c, section: c.section || "" }));
}

async function saveDocument(fields) {
  return Document.create(fields);
}

// Optional IGNOU / distance-learning metadata, normalized from the request body.
function parseCourseMeta(body = {}) {
  return {
    courseCode: String(body.courseCode || "").trim().toUpperCase().slice(0, 40),
    program: String(body.program || "").trim().slice(0, 80),
    session: String(body.session || "").trim().slice(0, 40),
  };
}

// Direct-answer content types (assignment, guess paper): one Gemini call, no
// flashcards, stored as markdown notes. Each maps a contentType to its generator
// and the progress phase shown in the UI.
const DIRECT_ANSWER_TYPES = {
  assignment: { generate: generateAssignment, phase: "assignment", feature: "assignment" },
  guess: { generate: generateGuessPaper, phase: "guess", feature: "guess" },
};

/**
 * Direct-answer pipeline (assignment / guess paper): generate → save.
 * Single Gemini call (cheaper than chunked notes), no flashcards.
 */
async function runDirectAnswerPipeline({
  contentType,
  source,
  sourceType,
  sourceName,
  userId,
  body,
  onProgress,
  outputLanguage,
  courseMeta,
}) {
  const spec = DIRECT_ANSWER_TYPES[contentType];
  onProgress?.({ phase: spec.phase });

  const key = await pickKeyForSlot(0);
  const result = await withStepRetry(
    () =>
      spec.generate(source, {
        userId,
        feature: spec.feature,
        preferredKeyId: key.id,
        language: outputLanguage,
        wordLimit: body.wordLimit,
        count: body.count,
        courseCode: courseMeta.courseCode,
      }),
    { retries: 1 }
  );

  onProgress?.({ phase: "saving" });

  const doc = await saveDocument({
    userId,
    title: result.title || sourceName,
    sourceType,
    sourceName,
    folder: body.folder?.trim() || "",
    tags: parseTags(body),
    contentType,
    ...courseMeta,
    notes: result.notes,
    summary: result.summary,
    keyTakeaways: [],
    glossary: [],
    flashcards: [],
    sourceText: (result.sourceExcerpt || result.notes || "").slice(0, 15000),
    outputLanguage,
    detailLevel: "detailed",
    generationMode: "single",
  });

  indexDocumentSafe(doc);

  return { doc, flashcardsAdded: 0, generationMode: "single" };
}

/**
 * Unified material pipeline: notes → flashcards → save.
 * Flashcard failure is non-fatal (notes still saved).
 */
export async function runMaterialPipeline({
  source,
  sourceType,
  sourceName,
  userId,
  body = {},
  onProgress,
  pdfBytes = 0,
  textLength = 0,
}) {
  const outputLanguage = normalizeOutputLanguage(body.outputLanguage);
  const detailLevel = normalizeDetailLevel(body.detailLevel);
  const contentType = DIRECT_ANSWER_TYPES[body.contentType] ? body.contentType : "notes";
  const courseMeta = parseCourseMeta(body);

  // Assignment / guess-paper modes produce answers instead of summarizing into notes.
  if (DIRECT_ANSWER_TYPES[contentType]) {
    return runDirectAnswerPipeline({
      contentType,
      source,
      sourceType,
      sourceName,
      userId,
      body,
      onProgress,
      outputLanguage,
      courseMeta,
    });
  }

  const chunked = shouldUseChunkedNotes({ pdfBytes, textLength });

  if (chunked) onProgress?.({ phase: "outline" });
  else if (sourceType === "link") onProgress?.({ phase: "notes" });

  const notesKey = await pickKeyForSlot(0);
  const notesResult = await withStepRetry(
    () =>
      generateNotesWithMode(source, {
        userId,
        feature: "notes",
        preferredKeyId: notesKey.id,
        language: outputLanguage,
        detailLevel,
        pdfBytes,
        textLength,
        onProgress,
      }),
    { retries: 1 }
  );

  onProgress?.({ phase: "cards" });

  let flashcards = [];
  try {
    flashcards = await generateInitialFlashcards(notesResult.notes, {
      userId,
      language: outputLanguage,
      cardCount: body.initialCardCount,
    });
  } catch (err) {
    console.warn("[orchestrator] flashcards step failed, saving notes only:", err.message?.slice(0, 120));
  }

  onProgress?.({ phase: "saving" });

  const doc = await saveDocument({
    userId,
    title: notesResult.title || sourceName,
    sourceType,
    sourceName,
    folder: body.folder?.trim() || "",
    tags: parseTags(body),
    contentType: "notes",
    ...courseMeta,
    notes: notesResult.notes,
    summary: notesResult.summary,
    keyTakeaways: Array.isArray(notesResult.keyTakeaways) ? notesResult.keyTakeaways.slice(0, 8) : [],
    glossary: Array.isArray(notesResult.glossary)
      ? notesResult.glossary
          .filter((g) => g?.term && g?.definition)
          .slice(0, 24)
      : [],
    flashcards,
    sourceText: (notesResult.sourceExcerpt || notesResult.notes || "").slice(0, 15000),
    outputLanguage,
    detailLevel,
    generationMode: notesResult.generationMode || "single",
  });

  // Embed the notes for semantic retrieval (best-effort, runs in background).
  indexDocumentSafe(doc);

  return {
    doc,
    flashcardsAdded: flashcards.length,
    generationMode: doc.generationMode,
  };
}

export async function runPdfPipeline({ buffer, originalname, userId, body, onProgress }) {
  const header = buffer.slice(0, 5).toString("latin1");
  if (header !== "%PDF-") {
    const err = new Error("That file isn't a valid PDF.");
    err.statusCode = 400;
    throw err;
  }

  onProgress?.({ phase: "validating" });

  return runMaterialPipeline({
    source: pdfPart(buffer),
    sourceType: "pdf",
    sourceName: originalname,
    userId,
    body,
    onProgress,
    pdfBytes: buffer.length,
  });
}

/**
 * Universal file pipeline. Detects the upload type and routes:
 *  - PDF / image / audio / video → sent to Gemini inline (multimodal).
 *  - DOCX / PPTX / TXT → text extracted first, then the text pipeline.
 */
export async function runFilePipeline({ buffer, originalname, mimetype, userId, body, onProgress }) {
  const type = resolveUploadType(mimetype, originalname);
  if (!type) {
    const err = new Error("Unsupported file type.");
    err.statusCode = 400;
    throw err;
  }

  // PDFs keep their dedicated path (header validation + chunking by size).
  if (type.category === "pdf") {
    return runPdfPipeline({ buffer, originalname, userId, body, onProgress });
  }

  onProgress?.({ phase: "validating" });

  if (type.handling === "extract") {
    const text = await extractTextFromFile(buffer, type.category);
    const source = text.slice(0, 200000);
    onProgress?.({ phase: "notes" });
    return runMaterialPipeline({
      source,
      sourceType: type.sourceType,
      sourceName: originalname,
      userId,
      body,
      onProgress,
      textLength: source.length,
    });
  }

  // Inline media (image / audio / video) — Gemini reads it natively.
  const mime = type.mimes.includes(mimetype) ? mimetype : type.mimes[0];
  onProgress?.({ phase: "notes" });
  return runMaterialPipeline({
    source: mediaPart(buffer, mime),
    sourceType: type.sourceType,
    sourceName: originalname,
    userId,
    body,
    onProgress,
  });
}

export async function runLinkPipeline({ url, userId, body, onProgress }) {
  onProgress?.({ phase: "extracting" });
  const { text } = await extractTextFromUrl(url);

  return runMaterialPipeline({
    source: text,
    sourceType: "link",
    sourceName: url,
    userId,
    body,
    onProgress,
    textLength: text.length,
  });
}

const MIN_TEXT_CHARS = 40;
const MAX_TEXT_CHARS = 200000;

export async function runTextPipeline({ text, title, userId, body, onProgress }) {
  const clean = String(text || "").trim();
  if (clean.length < MIN_TEXT_CHARS) {
    const err = new Error(`Please paste at least ${MIN_TEXT_CHARS} characters of text.`);
    err.statusCode = 400;
    throw err;
  }

  const source = clean.slice(0, MAX_TEXT_CHARS);
  const sourceName = String(title || "").trim() || "Pasted notes";

  onProgress?.({ phase: "notes" });

  return runMaterialPipeline({
    source,
    sourceType: "text",
    sourceName,
    userId,
    body,
    onProgress,
    textLength: source.length,
  });
}

