import { User } from "../models/User.js";
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { getAppSettings } from "../models/Settings.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { testApiKey, listModels } from "../services/gemini.js";

function maskKey(key) {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [users, documents, quizzes, attempts] = await Promise.all([
    User.countDocuments(),
    Document.countDocuments(),
    Quiz.countDocuments(),
    QuizAttempt.countDocuments(),
  ]);

  const recentDocs = await Document.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("userId", "name email")
    .select("title sourceType createdAt userId");

  const recentAttempts = await QuizAttempt.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("userId", "name email")
    .populate("documentId", "title");

  res.json({
    users,
    documents,
    quizzes,
    attempts,
    recentDocs: recentDocs.map((d) => ({
      id: d._id,
      title: d.title,
      sourceType: d.sourceType,
      createdAt: d.createdAt,
      user: d.userId ? { name: d.userId.name, email: d.userId.email } : null,
    })),
    recentAttempts: recentAttempts.map((a) => ({
      id: a._id,
      score: a.score,
      total: a.total,
      createdAt: a.createdAt,
      user: a.userId ? { name: a.userId.name, email: a.userId.email } : null,
      documentTitle: a.documentId?.title || "—",
    })),
  });
});

// GET /api/admin/users
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("name email role createdAt").sort({ createdAt: -1 });
  const counts = await Document.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      documentCount: countMap[String(u._id)] || 0,
    })),
  });
});

// DELETE /api/admin/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (String(targetId) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot delete your own admin account" });
  }

  const user = await User.findByIdAndDelete(targetId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const docs = await Document.find({ userId: targetId }).select("_id");
  const docIds = docs.map((d) => d._id);
  await ChatMessage.deleteMany({ userId: targetId });
  await Quiz.deleteMany({ userId: targetId });
  await QuizAttempt.deleteMany({ userId: targetId });
  await Document.deleteMany({ userId: targetId });

  res.json({ message: "User and all their data deleted" });
});

// GET /api/admin/settings
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  res.json({
    geminiApiKeyMasked: maskKey(settings.geminiApiKey),
    hasApiKey: Boolean(settings.geminiApiKey?.trim()),
    geminiModel: settings.geminiModel || "gemini-2.5-flash",
    updatedAt: settings.updatedAt,
  });
});

// PUT /api/admin/settings
export const updateSettings = asyncHandler(async (req, res) => {
  const { geminiApiKey, geminiModel } = req.body;
  const settings = await getAppSettings();

  if (geminiApiKey !== undefined && geminiApiKey !== "") {
    settings.geminiApiKey = geminiApiKey.trim();
  }
  if (geminiModel) {
    settings.geminiModel = geminiModel.trim();
  }
  await settings.save();

  res.json({
    message: "Settings saved",
    geminiApiKeyMasked: maskKey(settings.geminiApiKey),
    hasApiKey: Boolean(settings.geminiApiKey?.trim()),
    geminiModel: settings.geminiModel,
  });
});

// POST /api/admin/settings/test  body: { geminiApiKey?, geminiModel? }
export const testSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const apiKey = req.body.geminiApiKey?.trim() || settings.geminiApiKey?.trim();
  const model = req.body.geminiModel?.trim() || settings.geminiModel || "gemini-2.5-flash";

  if (!apiKey) {
    return res.status(400).json({ message: "No API key to test. Enter a key first." });
  }

  const result = await testApiKey(apiKey, model);
  res.json({ message: "API key works", ...result });
});

// GET /api/admin/models
export const getModels = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const apiKey = req.query.key?.trim() || settings.geminiApiKey?.trim();
  if (!apiKey) {
    return res.status(400).json({ message: "Set an API key first to list models" });
  }
  const models = await listModels(apiKey);
  res.json({ models });
});

// GET /api/admin/documents
export const listAllDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .select("title sourceType sourceName summary createdAt userId");

  res.json({
    documents: docs.map((d) => ({
      id: d._id,
      title: d.title,
      sourceType: d.sourceType,
      sourceName: d.sourceName,
      summary: d.summary,
      createdAt: d.createdAt,
      user: d.userId ? { id: d.userId._id, name: d.userId.name, email: d.userId.email } : null,
    })),
  });
});

// DELETE /api/admin/documents/:id
export const deleteDocumentAdmin = asyncHandler(async (req, res) => {
  const doc = await Document.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  await ChatMessage.deleteMany({ documentId: doc._id });
  await Quiz.deleteMany({ documentId: doc._id });
  await QuizAttempt.deleteMany({ documentId: doc._id });
  res.json({ message: "Document deleted" });
});
