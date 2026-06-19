// Yeh file documents (PDF/link se bane notes) se judi saari request handle karti hai.
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  generateNotes,
  generateFlashcards,
  pdfPart,
  pickKeyForSlot,
} from "../services/gemini.js";
import { extractTextFromUrl } from "../services/linkExtractor.js";
import { incrementUsage } from "../middleware/quota.js";
import { sm2, initFlashcard } from "../services/spacedRepetition.js";
import { sanitizeFlashcards } from "../utils/textClean.js";
import { normalizeOutputLanguage } from "../config/languages.js";
import { normalizeDetailLevel, clampFlashcardCount } from "../config/detailLevel.js";
import crypto from "crypto";

function parseTags(body) {
  if (Array.isArray(body.tags)) {
    return body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
  }
  if (typeof body.tags === "string" && body.tags.trim()) {
    try {
      const parsed = JSON.parse(body.tags);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
      }
    } catch {
      return body.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    }
  }
  return [];
}

// PDF se notes + flashcards banakar ek naya Document save karta hai.
// POST /api/documents/upload
export const uploadDocument = asyncHandler(async (req, res) => {
  // File aayi hi nahi? (multer file ko req.file me daalta hai.)
  if (!req.file) {
    return res.status(400).json({ message: "Koi PDF file nahi mili" });
  }

  // MIME spoof na ho — actual PDF magic bytes (%PDF-) verify karte hain.
  const header = req.file.buffer.slice(0, 5).toString("latin1");
  if (header !== "%PDF-") {
    return res.status(400).json({ message: "That file isn't a valid PDF." });
  }

  // AI ko PDF bhejne layak banao, fir notes aur flashcards generate karo.
  const source = pdfPart(req.file.buffer);
  const userId = req.user._id;
  const outputLanguage = normalizeOutputLanguage(req.body.outputLanguage);
  const detailLevel = normalizeDetailLevel(req.body.detailLevel);
  const notesKey = await pickKeyForSlot(0);
  const notesResult = await generateNotes(source, {
    userId,
    feature: "notes",
    preferredKeyId: notesKey.id,
    language: outputLanguage,
    detailLevel,
  });

  const doc = await Document.create({
    userId: req.user._id,
    title: notesResult.title || req.file.originalname,
    sourceType: "pdf",
    sourceName: req.file.originalname,
    folder: req.body.folder?.trim() || "",
    tags: parseTags(req.body),
    notes: notesResult.notes,
    summary: notesResult.summary,
    flashcards: [],
    sourceText: (notesResult.sourceExcerpt || notesResult.notes || "").slice(0, 15000),
    outputLanguage,
    detailLevel,
  });

  await incrementUsage(req.user, "documents");

  res.status(201).json({ document: doc });
});

// Web/YouTube link se notes + flashcards banata hai.
// POST /api/documents/link   body: { url }
export const createFromLink = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "URL daalo" });

  const { text } = await extractTextFromUrl(url);
  const userId = req.user._id;
  const outputLanguage = normalizeOutputLanguage(req.body.outputLanguage);
  const detailLevel = normalizeDetailLevel(req.body.detailLevel);
  const notesKey = await pickKeyForSlot(0);
  const notesResult = await generateNotes(text, {
    userId,
    feature: "notes",
    preferredKeyId: notesKey.id,
    language: outputLanguage,
    detailLevel,
  });

  const doc = await Document.create({
    userId: req.user._id,
    title: notesResult.title || url,
    sourceType: "link",
    sourceName: url,
    folder: req.body.folder?.trim() || "",
    tags: parseTags(req.body),
    notes: notesResult.notes,
    summary: notesResult.summary,
    flashcards: [],
    sourceText: (notesResult.sourceExcerpt || text).slice(0, 15000),
    outputLanguage,
    detailLevel,
  });

  await incrementUsage(req.user, "documents");

  res.status(201).json({ document: doc });
});

// GET /api/documents?q=&folder=
export const listDocuments = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.folder) filter.folder = req.query.folder;
  if (req.query.q?.trim()) {
    filter.$text = { $search: req.query.trim() };
  }

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        flashcardCount: { $size: { $ifNull: ["$flashcards", []] } },
        ...(req.query.q?.trim() ? { score: { $meta: "textScore" } } : {}),
      },
    },
    {
      $project: {
        title: 1,
        sourceType: 1,
        sourceName: 1,
        summary: 1,
        folder: 1,
        tags: 1,
        createdAt: 1,
        flashcardCount: 1,
        ...(req.query.q?.trim() ? { score: 1 } : {}),
      },
    },
    { $sort: req.query.q?.trim() ? { score: { $meta: "textScore" } } : { createdAt: -1 } },
  ];

  const docs = await Document.aggregate(pipeline);
  res.json({ documents: docs });
});

// GET /api/documents/folders/list
export const listFolders = asyncHandler(async (req, res) => {
  const folders = await Document.distinct("folder", {
    userId: req.user._id,
    folder: { $ne: "" },
  });
  res.json({ folders: folders.sort() });
});

// GET /api/documents/review/due
export const getDueCards = asyncHandler(async (req, res) => {
  const now = new Date();
  const docs = await Document.find({ userId: req.user._id }).select("title flashcards");
  const due = [];
  for (const doc of docs) {
    for (const card of doc.flashcards) {
      if (!card.nextReviewAt || new Date(card.nextReviewAt) <= now) {
        due.push({
          documentId: doc._id,
          documentTitle: doc.title,
          cardId: card._id,
          front: card.front,
          back: card.back,
        });
      }
    }
  }
  res.json({ due, count: due.length });
});

// PATCH /api/documents/:id/meta  body: { folder?, tags? }
export const updateDocumentMeta = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  if (req.body.folder !== undefined) doc.folder = String(req.body.folder).trim().slice(0, 80);
  if (Array.isArray(req.body.tags)) doc.tags = req.body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
  await doc.save();
  res.json({ document: doc });
});

// POST /api/documents/:id/flashcards/:cardId/rate  body: { quality: 0-5 }
export const rateFlashcard = asyncHandler(async (req, res) => {
  const quality = Math.min(5, Math.max(0, Number(req.body.quality) || 0));
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  const card = doc.flashcards.id(req.params.cardId);
  if (!card) return res.status(404).json({ message: "Flashcard not found" });
  Object.assign(card, sm2(card, quality));
  await doc.save();
  res.json({ card });
});

// POST /api/documents/:id/share
export const toggleShare = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  doc.shareEnabled = Boolean(req.body.enabled);
  if (doc.shareEnabled && !doc.shareToken) {
    doc.shareToken = crypto.randomBytes(16).toString("hex");
  }
  await doc.save();
  res.json({
    shareEnabled: doc.shareEnabled,
    shareUrl: doc.shareEnabled ? `/share/${doc.shareToken}` : null,
  });
});

// Ek document ka pura data.
// GET /api/documents/:id
export const getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document nahi mila" });
  res.json({ document: doc });
});

// Document + uske quizzes/attempts delete.
// DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document nahi mila" });

  await Quiz.deleteMany({ documentId: doc._id });
  await QuizAttempt.deleteMany({ documentId: doc._id });
  await ChatMessage.deleteMany({ documentId: doc._id });
  res.json({ message: "Deleted" });
});

// POST /api/documents/:id/regenerate — notes + flashcards dubara banata hai
export const regenerateDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const source = doc.sourceText || doc.notes;
  if (!source?.trim()) {
    return res.status(400).json({ message: "No source content to regenerate from" });
  }

  const userId = req.user._id;
  const outputLanguage = normalizeOutputLanguage(req.body.outputLanguage || doc.outputLanguage);
  const detailLevel = normalizeDetailLevel(req.body.detailLevel || doc.detailLevel);
  const notesKey = await pickKeyForSlot(0);
  const notesResult = await generateNotes(source, {
    userId,
    feature: "notes",
    preferredKeyId: notesKey.id,
    language: outputLanguage,
    detailLevel,
  });

  doc.title = notesResult.title || doc.title;
  doc.summary = notesResult.summary;
  doc.notes = notesResult.notes;
  doc.flashcards = [];
  if (notesResult.sourceExcerpt?.trim()) {
    doc.sourceText = notesResult.sourceExcerpt.slice(0, 15000);
  }
  doc.outputLanguage = outputLanguage;
  doc.detailLevel = detailLevel;
  await doc.save();

  res.json({ document: doc });
});

// POST /api/documents/:id/flashcards/generate  body: { count?: 5|10 }
export const generateFlashcardsBatch = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const notesSource = doc.notes?.trim() || doc.sourceText?.trim();
  if (!notesSource) {
    return res.status(400).json({ message: "No notes available to generate flashcards from" });
  }

  const count = clampFlashcardCount(req.body.count);
  const existingFronts = (doc.flashcards || []).map((c) => c.front).filter(Boolean);
  const outputLanguage = normalizeOutputLanguage(doc.outputLanguage);

  const flashKey = await pickKeyForSlot(0);
  const flashcards = await generateFlashcards(notesSource, {
    userId: req.user._id,
    feature: "flashcards",
    preferredKeyId: flashKey.id,
    language: outputLanguage,
    count,
    existingFronts,
  });

  const cleanCards = sanitizeFlashcards(flashcards);
  doc.flashcards.push(...cleanCards.map(initFlashcard));
  await doc.save();

  res.json({
    flashcards: doc.flashcards,
    added: cleanCards.length,
    total: doc.flashcards.length,
  });
});
