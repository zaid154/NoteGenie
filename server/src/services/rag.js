// FLOW: Vector RAG service. Splits a document's notes into chunks, embeds them
// (Gemini text-embedding-004), stores them in DocumentChunk, and runs Atlas
// $vectorSearch for the Ask / global tutor. Every path is best-effort: if RAG is
// disabled, embedding fails, or the Atlas vector index is missing, callers fall
// back to the existing lexical (full-text) retrieval — the app never breaks.

import { DocumentChunk } from "../models/DocumentChunk.js";
import { embedTexts } from "./gemini.js";
import { parseNoteSections } from "../utils/parseNoteSections.js";
import { env } from "../config/env.js";

const MAX_CHUNK_CHARS = 1200;
const MAX_CHUNKS_PER_DOC = 40;

/** Split notes into bounded, section-aware chunks for embedding. Pure + testable. */
export function chunkNotes(notes, { maxLen = MAX_CHUNK_CHARS } = {}) {
  const chunks = [];

  const pushPieces = (title, body) => {
    const clean = String(body || "").trim();
    if (!clean) return;
    const prefix = title ? `${title}\n` : "";
    const paras = clean.split(/\n{2,}/);
    let buf = "";
    for (const p of paras) {
      const piece = p.trim();
      if (!piece) continue;
      if (buf && buf.length + piece.length + 2 > maxLen) {
        chunks.push({ section: title, text: prefix + buf });
        buf = piece;
      } else {
        buf = buf ? `${buf}\n\n${piece}` : piece;
      }
    }
    if (buf) chunks.push({ section: title, text: prefix + buf });
  };

  const sections = parseNoteSections(notes);
  if (sections.length) {
    for (const s of sections) pushPieces(s.title, s.body);
  } else {
    pushPieces("", notes);
  }

  return chunks.slice(0, MAX_CHUNKS_PER_DOC);
}

/**
 * Re-embed and store chunks for a document. Best-effort: returns the number of
 * chunks indexed, or 0 if RAG is off / embedding failed. Never throws to callers
 * that fire-and-forget it.
 */
export async function indexDocument(doc) {
  if (!env.ragEnabled || !doc?.notes?.trim()) return 0;
  const chunks = chunkNotes(doc.notes);
  if (!chunks.length) return 0;

  const vectors = await embedTexts(chunks.map((c) => c.text));
  const rows = chunks
    .map((c, i) => ({
      userId: doc.userId,
      documentId: doc._id,
      title: doc.title || "",
      section: c.section || "",
      text: c.text,
      embedding: vectors[i] || [],
    }))
    .filter((r) => Array.isArray(r.embedding) && r.embedding.length);

  await DocumentChunk.deleteMany({ documentId: doc._id });
  if (rows.length) await DocumentChunk.insertMany(rows);
  return rows.length;
}

/** Fire-and-forget indexing; logs but never rejects. Use after save/regenerate. */
export function indexDocumentSafe(doc) {
  if (!env.ragEnabled) return;
  Promise.resolve()
    .then(() => indexDocument(doc))
    .then((n) => {
      if (n) console.log(`[rag] indexed ${n} chunks for "${doc.title}"`);
    })
    .catch((err) => console.warn("[rag] indexing failed (non-fatal):", err.message?.slice(0, 120)));
}

/** Remove a document's chunks (on delete). Best-effort. */
export async function removeDocumentIndex(documentId) {
  try {
    await DocumentChunk.deleteMany({ documentId });
  } catch (err) {
    console.warn("[rag] failed to remove chunks:", err.message?.slice(0, 120));
  }
}

/**
 * Semantic retrieval. Returns top matching chunks for the user's question, or an
 * empty array on any failure (missing index, embedding error, RAG disabled) so the
 * caller can fall back to lexical search.
 */
export async function vectorSearchChunks(userId, question, { limit = 6, numCandidates = 100 } = {}) {
  if (!env.ragEnabled) return [];
  let queryVector;
  try {
    [queryVector] = await embedTexts([question]);
  } catch (err) {
    console.warn("[rag] query embed failed, falling back:", err.message?.slice(0, 120));
    return [];
  }
  if (!queryVector?.length) return [];

  try {
    return await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: env.ragVectorIndex,
          path: "embedding",
          queryVector,
          numCandidates,
          limit,
          filter: { userId },
        },
      },
      {
        $project: {
          _id: 0,
          documentId: 1,
          title: 1,
          section: 1,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  } catch (err) {
    // Most common cause: the Atlas vector index hasn't been created yet.
    console.warn("[rag] $vectorSearch unavailable, falling back to lexical:", err.message?.slice(0, 140));
    return [];
  }
}

/** Build a bounded tutor context + citation titles from retrieved chunks. */
export function assembleChunkContext(chunks = [], { totalChars = 12000 } = {}) {
  const parts = [];
  const titles = [];
  let used = 0;
  for (const c of chunks) {
    if (used >= totalChars) break;
    const body = String(c?.text || "").trim();
    if (!body) continue;
    const title = c?.title || "Untitled";
    const block = `### ${title}${c?.section ? ` — ${c.section}` : ""}\n${body}`;
    parts.push(block);
    used += block.length;
    if (!titles.includes(title)) titles.push(title);
  }
  return { context: parts.join("\n\n---\n\n"), titles };
}
