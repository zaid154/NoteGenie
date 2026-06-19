// Yeh file AI tutor chat ki request handle karti hai (purani chat + naya jawab stream karna).
import { Document } from "../models/Document.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { tutorStream } from "../services/gemini.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { incrementUsage } from "../middleware/quota.js";
import { normalizeOutputLanguage } from "../config/languages.js";
import { assertValidObjectId } from "../utils/objectId.js";

// GET /api/tutor/:documentId/history
export const getHistory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.documentId, "document ID");

  const doc = await Document.findOne({
    _id: req.params.documentId,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const messages = await ChatMessage.find({
    userId: req.user._id,
    documentId: doc._id,
  })
    .sort({ createdAt: 1 })
    .select("role content createdAt");

  res.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

// DELETE /api/tutor/:documentId/history
export const clearHistory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.documentId, "document ID");

  const doc = await Document.findOne({
    _id: req.params.documentId,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const result = await ChatMessage.deleteMany({
    userId: req.user._id,
    documentId: doc._id,
  });

  res.json({ message: "Chat history cleared", deleted: result.deletedCount });
});

// Context ke liye DB se kitne purane messages lene hain (prompt bloat se bachne ke liye).
const HISTORY_LIMIT = 20;
const MAX_QUESTION_LEN = 2000;

// POST /api/tutor/:documentId
export async function chat(req, res, next) {
  try {
    assertValidObjectId(req.params.documentId, "document ID");

    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ message: "Please enter a question" });
    }
    if (question.length > MAX_QUESTION_LEN) {
      return res.status(400).json({ message: "That question is too long." });
    }

    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user._id,
    });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // History client se nahi, DB se laate hain (prompt injection se bachne ke liye).
    const past = await ChatMessage.find({
      userId: req.user._id,
      documentId: doc._id,
    })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select("role content");
    const history = past.reverse().map((m) => ({ role: m.role, content: m.content }));

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    let fullReply = "";
    const stream = tutorStream({
      context: doc.sourceText || doc.notes,
      question,
      history,
      language: normalizeOutputLanguage(req.body?.outputLanguage || doc.outputLanguage),
      meta: { userId: req.user._id, feature: "tutor" },
    });

    for await (const chunk of stream) {
      fullReply += chunk;
      res.write(chunk);
    }
    res.end();

    // Stream safal hone par hi dono messages save karte hain (consistent chat state).
    if (fullReply.trim()) {
      await ChatMessage.create([
        { userId: req.user._id, documentId: doc._id, role: "user", content: question },
        { userId: req.user._id, documentId: doc._id, role: "assistant", content: fullReply },
      ]);
      await incrementUsage(req.user, "tutorMessages");
    }
  } catch (err) {
    if (res.headersSent) {
      // Stream beech me toot gaya — client ko ek saaf notice bhej kar band karte hain.
      console.error("[tutor] stream error:", err.message);
      res.write("\n\n[The tutor response was interrupted. Please try again.]");
      res.end();
    } else {
      next(err);
    }
  }
}
