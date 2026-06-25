// FLOW: Tutor API logic. Tutor routes send question/history/document ids here, this controller builds context, calls Gemini stream, saves ChatMessage, and streams response to UI.

// Yeh file AI tutor chat ki request handle karti hai (purani chat + naya jawab stream karna).
import { Document } from "../models/Document.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { tutorStream } from "../services/gemini.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { incrementUsage } from "../middleware/quota.js";
import { recordStudyActivity } from "../services/studyStreak.js";
import { assembleGlobalContext, sourceTitles } from "../services/retrieval.js";
import { vectorSearchChunks, assembleChunkContext } from "../services/rag.js";
import { findReadableDocument } from "../services/workspaceAccess.js";
import { normalizeOutputLanguage } from "../config/languages.js";
import { assertValidObjectId } from "../utils/objectId.js";

// GET /api/tutor/:documentId/history
export const getHistory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.documentId, "document ID");

  const doc = await findReadableDocument(req.params.documentId, req.user);
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

  const doc = await findReadableDocument(req.params.documentId, req.user);
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
      await recordStudyActivity(req.user);
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

// ---- Cross-document ("global") tutor: ask across ALL your materials ----------

// GET /api/tutor/global/history
export const getGlobalHistory = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ userId: req.user._id, scope: "global" })
    .sort({ createdAt: 1 })
    .select("role content createdAt")
    .lean();

  res.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

// DELETE /api/tutor/global/history
export const clearGlobalHistory = asyncHandler(async (req, res) => {
  const result = await ChatMessage.deleteMany({ userId: req.user._id, scope: "global" });
  res.json({ message: "Chat history cleared", deleted: result.deletedCount });
});

// POST /api/tutor/global  body: { question, outputLanguage? }
export async function globalChat(req, res, next) {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ message: "Please enter a question" });
    }
    if (question.length > MAX_QUESTION_LEN) {
      return res.status(400).json({ message: "That question is too long." });
    }

    // Semantic retrieval first: embed the question and find the closest note
    // chunks (Atlas vector search). Falls back to lexical full-text search if RAG
    // is off, embedding fails, or the vector index isn't created yet.
    let context = "";
    let titles = [];

    const chunks = await vectorSearchChunks(req.user._id, question, { limit: 6 });
    if (chunks.length) {
      const built = assembleChunkContext(chunks);
      context = built.context;
      titles = built.titles;
    } else {
      let docs = await Document.find(
        { userId: req.user._id, $text: { $search: question } },
        { score: { $meta: "textScore" }, title: 1, notes: 1, sourceText: 1 }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(3)
        .lean();

      if (!docs.length) {
        docs = await Document.find({ userId: req.user._id })
          .sort({ createdAt: -1 })
          .limit(3)
          .select("title notes sourceText")
          .lean();
      }

      if (!docs.length) {
        return res.status(400).json({ message: "Add some materials first, then ask across them." });
      }

      context = assembleGlobalContext(docs);
      titles = sourceTitles(docs);
    }

    const past = await ChatMessage.find({ userId: req.user._id, scope: "global" })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select("role content")
      .lean();
    const history = past.reverse().map((m) => ({ role: m.role, content: m.content }));

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");

    let fullReply = "";
    const stream = tutorStream({
      context: `The student is asking a question across multiple study materials. The most relevant materials are: ${titles.join(", ")}. When you use a fact, mention which material it came from.\n\n${context}`,
      question,
      history,
      language: normalizeOutputLanguage(req.body?.outputLanguage),
      meta: { userId: req.user._id, feature: "tutor" },
    });

    for await (const chunk of stream) {
      fullReply += chunk;
      res.write(chunk);
    }
    res.end();

    if (fullReply.trim()) {
      await ChatMessage.create([
        { userId: req.user._id, documentId: null, scope: "global", role: "user", content: question },
        { userId: req.user._id, documentId: null, scope: "global", role: "assistant", content: fullReply },
      ]);
      await incrementUsage(req.user, "tutorMessages");
      await recordStudyActivity(req.user);
    }
  } catch (err) {
    if (res.headersSent) {
      console.error("[tutor] global stream error:", err.message);
      res.write("\n\n[The tutor response was interrupted. Please try again.]");
      res.end();
    } else {
      next(err);
    }
  }
}
