import { Document } from "../models/Document.js";
import { generateNotesWithMode, generateFlashcards, pdfPart, pickKeyForSlot } from "./gemini.js";
import { extractTextFromUrl } from "./linkExtractor.js";
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
