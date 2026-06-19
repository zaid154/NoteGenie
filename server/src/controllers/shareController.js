// Public read-only shared document view.
import { Document } from "../models/Document.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getSharedDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({
    shareToken: req.params.token,
    shareEnabled: true,
  }).select("title summary notes flashcards createdAt sourceType");
  if (!doc) return res.status(404).json({ message: "Shared document not found" });
  res.json({
    document: {
      title: doc.title,
      summary: doc.summary,
      notes: doc.notes,
      flashcards: doc.flashcards.map((c) => ({ front: c.front, back: c.back })),
      createdAt: doc.createdAt,
      sourceType: doc.sourceType,
    },
  });
});
