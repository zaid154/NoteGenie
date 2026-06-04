import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  generateNotes,
  generateFlashcards,
  pdfPart,
} from "../services/gemini.js";
import { extractTextFromUrl } from "../services/linkExtractor.js";

// PDF se notes + flashcards banakar ek naya Document save karta hai.
// POST /api/documents/upload
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Koi PDF file nahi mili" });
  }

  const source = pdfPart(req.file.buffer);
  const [notesResult, flashcards] = await Promise.all([
    generateNotes(source),
    generateFlashcards(source),
  ]);

  const doc = await Document.create({
    userId: req.user._id,
    title: notesResult.title || req.file.originalname,
    sourceType: "pdf",
    sourceName: req.file.originalname,
    notes: notesResult.notes,
    summary: notesResult.summary,
    flashcards,
    // Quiz/tutor ke liye notes ko hi context bana lete hain (PDF store nahi karte).
    sourceText: notesResult.notes,
  });

  res.status(201).json({ document: doc });
});

// Web/YouTube link se notes + flashcards banata hai.
// POST /api/documents/link   body: { url }
export const createFromLink = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "URL daalo" });

  const { text } = await extractTextFromUrl(url);
  const [notesResult, flashcards] = await Promise.all([
    generateNotes(text),
    generateFlashcards(text),
  ]);

  const doc = await Document.create({
    userId: req.user._id,
    title: notesResult.title || url,
    sourceType: "link",
    sourceName: url,
    notes: notesResult.notes,
    summary: notesResult.summary,
    flashcards,
    sourceText: text.slice(0, 15000),
  });

  res.status(201).json({ document: doc });
});

// User ke saare documents (list ke liye chhota data).
// GET /api/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ userId: req.user._id })
    .select("title sourceType sourceName summary createdAt")
    .sort({ createdAt: -1 });
  res.json({ documents: docs });
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

  const [notesResult, flashcards] = await Promise.all([
    generateNotes(source),
    generateFlashcards(source),
  ]);

  doc.title = notesResult.title || doc.title;
  doc.summary = notesResult.summary;
  doc.notes = notesResult.notes;
  doc.flashcards = flashcards;
  doc.sourceText = notesResult.notes;
  await doc.save();

  res.json({ document: doc });
});
