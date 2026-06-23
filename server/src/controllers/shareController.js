// FLOW: Share API logic. Public share routes send token here, this controller finds shared Document safely and returns read-only data for ShareView.

// Public read-only shared document view.
import { Document } from "../models/Document.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getSharedDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({
    shareToken: req.params.token,
    shareEnabled: true,
  })
    .select("title summary notes keyTakeaways glossary flashcards createdAt updatedAt sourceType")
    .lean();
  if (!doc) return res.status(404).json({ message: "Shared document not found" });

  // Public read-only resource → let the browser/CDN cache it briefly and revalidate.
  // Express' default ETag handles 304s; Last-Modified gives a stable revalidation token.
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  if (doc.updatedAt) res.set("Last-Modified", new Date(doc.updatedAt).toUTCString());

  res.json({
    document: {
      title: doc.title,
      summary: doc.summary,
      notes: doc.notes,
      keyTakeaways: doc.keyTakeaways || [],
      glossary: doc.glossary || [],
      flashcards: (doc.flashcards || []).map((c) => ({ front: c.front, back: c.back })),
      createdAt: doc.createdAt,
      sourceType: doc.sourceType,
    },
  });
});
