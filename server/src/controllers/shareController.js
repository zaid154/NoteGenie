// FLOW: Share API logic. Public share routes send token here, this controller finds shared Document safely and returns read-only data for ShareView.

import { Document } from "../models/Document.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getSharedDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({
    shareToken: req.params.token,
    shareEnabled: true,
  })
    .select("title summary notes keyTakeaways glossary flashcards createdAt updatedAt sourceType outputLanguage")
    .lean();

  if (!doc) return res.status(404).json({ message: "Shared document not found" });

  // Ensure browser fetches fresh data without stale 5-minute HTTP caching
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");

  res.json({
    document: {
      title: doc.title,
      summary: doc.summary,
      notes: doc.notes,
      keyTakeaways: doc.keyTakeaways || [],
      glossary: doc.glossary || [],
      flashcards: doc.flashcards || [],
      createdAt: doc.createdAt,
      sourceType: doc.sourceType,
      outputLanguage: doc.outputLanguage,
    },
  });
});
