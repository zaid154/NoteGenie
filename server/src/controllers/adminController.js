// Yeh file admin area ki saari request handle karti hai:
// stats, users, documents, AI settings, usage log, etc.
import { User } from "../models/User.js";
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ApiUsage } from "../models/ApiUsage.js";
import { getAppSettings } from "../models/Settings.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  testApiKey,
  listModels,
  PRICE_PER_MILLION,
  DEFAULT_PRICING,
} from "../services/gemini.js";

// API key ko screen pe dikhane ke liye beech ka hissa chhupa do (jaise abcd••••wxyz).
function maskKey(key) {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// Query se safe page/limit nikaalta hai (clamp karke).
function parsePaging(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [users, documents, quizzes, attempts, aiTotals] = await Promise.all([
    User.countDocuments(),
    Document.countDocuments(),
    Quiz.countDocuments(),
    QuizAttempt.countDocuments(),
    ApiUsage.aggregate([
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          cost: { $sum: "$estimatedCost" },
        },
      },
    ]),
  ]);

  const ai = aiTotals[0] || { calls: 0, cost: 0 };

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
    aiCalls: ai.calls,
    aiCost: Math.round(ai.cost * 1_000_000) / 1_000_000,
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

// GET /api/admin/usage
export const getUsage = asyncHandler(async (req, res) => {
  const [totalsAgg, byFeature, byUser, recent] = await Promise.all([
    ApiUsage.aggregate([
      {
        $group: {
          _id: null,
          calls: { $sum: 1 },
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
          totalTokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
    ]),
    ApiUsage.aggregate([
      {
        $group: {
          _id: "$feature",
          calls: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
      { $sort: { calls: -1 } },
    ]),
    ApiUsage.aggregate([
      { $match: { userId: { $ne: null } } },
      {
        $group: {
          _id: "$userId",
          calls: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 20 },
    ]),
    ApiUsage.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("userId", "name email")
      .select("feature model promptTokens completionTokens totalTokens estimatedCost createdAt userId"),
  ]);

  const totals = totalsAgg[0] || {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
  };

  const userIds = byUser.map((u) => u._id);
  const users = await User.find({ _id: { $in: userIds } }).select("name email");
  const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

  res.json({
    totals: {
      calls: totals.calls,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      totalTokens: totals.totalTokens,
      cost: Math.round(totals.cost * 1_000_000) / 1_000_000,
    },
    byFeature: byFeature.map((f) => ({
      feature: f._id,
      calls: f.calls,
      totalTokens: f.totalTokens,
      cost: Math.round(f.cost * 1_000_000) / 1_000_000,
    })),
    byUser: byUser.map((u) => {
      const user = userMap[String(u._id)];
      return {
        userId: u._id,
        name: user?.name || "Unknown",
        email: user?.email || "—",
        calls: u.calls,
        totalTokens: u.totalTokens,
        cost: Math.round(u.cost * 1_000_000) / 1_000_000,
      };
    }),
    recent: recent.map((r) => ({
      id: r._id,
      feature: r.feature,
      model: r.model,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      cost: r.estimatedCost,
      createdAt: r.createdAt,
      user: r.userId ? { name: r.userId.name, email: r.userId.email } : null,
    })),
  });
});

// DELETE /api/admin/usage — clears the app's own API usage log (not Google's).
export const resetUsage = asyncHandler(async (req, res) => {
  // Destructive hai isliye explicit confirm flag maangte hain.
  if (req.body?.confirm !== true) {
    return res.status(400).json({ message: "Confirmation required to reset usage." });
  }
  const { deletedCount } = await ApiUsage.deleteMany({});
  console.log(`[admin] usage log reset by ${req.user.email} (${deletedCount} records)`);
  res.json({ message: "Usage log cleared", deletedCount });
});

// GET /api/admin/users?page=&limit=
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);

  const [users, total] = await Promise.all([
    User.find().select("name email role createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

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
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
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

  await Promise.all([
    ChatMessage.deleteMany({ userId: targetId }),
    Quiz.deleteMany({ userId: targetId }),
    QuizAttempt.deleteMany({ userId: targetId }),
    Document.deleteMany({ userId: targetId }),
    ApiUsage.deleteMany({ userId: targetId }),
  ]);

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
    pricing: PRICE_PER_MILLION,
    defaultPricing: DEFAULT_PRICING,
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

  const result = await testApiKey(apiKey, model, { userId: req.user._id });
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

// GET /api/admin/documents?page=&limit=
export const listAllDocuments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);

  const [docs, total] = await Promise.all([
    Document.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .select("title sourceType sourceName summary createdAt userId"),
    Document.countDocuments(),
  ]);

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
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
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
