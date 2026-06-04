import { Document } from "../models/Document.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { tutorStream } from "../services/gemini.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/tutor/:documentId/history
export const getHistory = asyncHandler(async (req, res) => {
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

// POST /api/tutor/:documentId
export async function chat(req, res, next) {
  try {
    const { question, history = [] } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ message: "Please enter a question" });
    }

    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user._id,
    });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    await ChatMessage.create({
      userId: req.user._id,
      documentId: doc._id,
      role: "user",
      content: question.trim(),
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    let fullReply = "";
    const stream = tutorStream({
      context: doc.sourceText || doc.notes,
      question: question.trim(),
      history,
    });

    for await (const chunk of stream) {
      fullReply += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullReply.trim()) {
      await ChatMessage.create({
        userId: req.user._id,
        documentId: doc._id,
        role: "assistant",
        content: fullReply,
      });
    }
  } catch (err) {
    if (res.headersSent) {
      res.end();
    } else {
      next(err);
    }
  }
}
