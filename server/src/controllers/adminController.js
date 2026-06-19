// Admin area: stats, users, documents, AI settings, usage, key pool.
import crypto from "crypto";
import { User } from "../models/User.js";
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ApiUsage } from "../models/ApiUsage.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import {
  getAppSettings,
  maskKey,
  encryptApiKeyValue,
  decryptApiKeyEntry,
  migrateLegacyKey,
} from "../models/Settings.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { invalidateAiRateLimitCache } from "../middleware/aiRateLimit.js";
import { env } from "../config/env.js";
import {
  testApiKey,
  testAllKeys,
  listModels,
  getKeyPool,
  PRICE_PER_MILLION,
  DEFAULT_PRICING,
} from "../services/gemini.js";
import {
  getPlanAmounts,
  rupeesToPaise,
  paiseToRupees,
} from "../services/billingPricing.js";
import { logAdminAction } from "../services/adminAudit.js";
import {
  usageSummary,
  usageSummaryAsync,
  startOfNextMonth,
  PLAN_LIMITS,
  getEffectivePlanLimits,
  loadPlanLimitsFromDb,
  invalidatePlanLimitsCache,
  serializePlanLimitsForAdmin,
} from "../config/plans.js";
import { planExpiryFromNow, planExpiryForPlan } from "../services/planExpiry.js";
import {
  loadPlanCatalog,
  isValidPlanId,
  isPaidPlan,
  invalidatePlanCatalogCache,
  parseCustomPlanBody,
  BUILTIN_PLAN_IDS,
} from "../services/planCatalog.js";
import { sendEmail, resetPasswordHtml } from "../services/email.js";

async function rejectInvalidPlan(plan, res) {
  if (!(await isValidPlanId(plan))) {
    res.status(400).json({ message: "Invalid plan" });
    return true;
  }
  return false;
}

function parsePaging(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userFilterFromQuery(query) {
  const filter = {};
  const search = query.search?.trim();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (query.plan) filter.plan = query.plan;
  if (query.role && ["user", "admin"].includes(query.role)) filter.role = query.role;
  return filter;
}

function documentFilterFromQuery(query) {
  const filter = {};
  const search = query.search?.trim();
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { summary: { $regex: search, $options: "i" } },
    ];
  }
  if (query.userId) filter.userId = query.userId;
  if (query.sourceType && ["pdf", "link"].includes(query.sourceType)) {
    filter.sourceType = query.sourceType;
  }
  if (query.tag?.trim()) filter.tags = query.tag.trim();
  return filter;
}

function serializeUserRow(u, countMap = {}) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    plan: u.plan || "free",
    emailVerified: u.emailVerified,
    planExpiresAt: u.planExpiresAt || null,
    createdAt: u.createdAt,
    documentCount: countMap[String(u._id)] || 0,
  };
}

function keyStatus(entry) {
  if (entry.disabled) return "disabled";
  if (entry.cooldownUntil && new Date(entry.cooldownUntil) > new Date()) return "cooldown";
  if (entry.lastError) return "failed";
  return "ok";
}

function serializeApiKeys(settings) {
  return (settings.apiKeys || []).map((k) => ({
    id: k.id,
    label: k.label,
    masked: maskKey(decryptApiKeyEntry(k)),
    priority: k.priority,
    disabled: k.disabled,
    status: keyStatus(k),
    lastError: k.lastError || "",
    lastErrorAt: k.lastErrorAt,
    failureCount: k.failureCount || 0,
    cooldownUntil: k.cooldownUntil,
  }));
}

// GET /api/admin/stats
export const getStats = asyncHandler(async (req, res) => {
  const [users, documents, quizzes, attempts, aiTotals] = await Promise.all([
    User.countDocuments(),
    Document.countDocuments(),
    Quiz.countDocuments(),
    QuizAttempt.countDocuments(),
    ApiUsage.aggregate([
      { $group: { _id: null, calls: { $sum: 1 }, cost: { $sum: "$estimatedCost" } } },
    ]),
  ]);

  const ai = aiTotals[0] || { calls: 0, cost: 0 };
  const { pool } = await getKeyPool();

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
    activeKeys: pool.length,
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
    supportEmail: env.supportEmail || null,
  });
});

// GET /api/admin/usage
export const getUsage = asyncHandler(async (req, res) => {
  const [totalsAgg, byFeature, byUser, byKey, recent] = await Promise.all([
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
    ApiUsage.aggregate([
      { $match: { keyId: { $ne: "" } } },
      {
        $group: {
          _id: "$keyId",
          calls: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
      { $sort: { calls: -1 } },
    ]),
    ApiUsage.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("userId", "name email")
      .select("feature model keyId promptTokens completionTokens totalTokens estimatedCost createdAt userId"),
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
    byKey: byKey.map((k) => ({
      keyId: k._id,
      calls: k.calls,
      totalTokens: k.totalTokens,
      cost: Math.round(k.cost * 1_000_000) / 1_000_000,
    })),
    recent: recent.map((r) => ({
      id: r._id,
      feature: r.feature,
      model: r.model,
      keyId: r.keyId || "—",
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      cost: r.estimatedCost,
      createdAt: r.createdAt,
      user: r.userId ? { name: r.userId.name, email: r.userId.email } : null,
    })),
  });
});

export const resetUsage = asyncHandler(async (req, res) => {
  if (req.body?.confirm !== true) {
    return res.status(400).json({ message: "Confirmation required to reset usage." });
  }
  const { deletedCount } = await ApiUsage.deleteMany({});
  await logAdminAction(req, "usage.reset", "usage", "", { deletedCount });
  console.log(`[admin] usage log reset by ${req.user.email} (${deletedCount} records)`);
  res.json({ message: "Usage log cleared", deletedCount });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = userFilterFromQuery(req.query);
  const [users, total] = await Promise.all([
    User.find(filter).select("name email role plan emailVerified planExpiresAt createdAt").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const counts = await Document.aggregate([{ $group: { _id: "$userId", count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  res.json({
    users: users.map((u) => serializeUserRow(u, countMap)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const [documentCount, quizCount, chatCount] = await Promise.all([
    Document.countDocuments({ userId: user._id }),
    Quiz.countDocuments({ userId: user._id }),
    ChatMessage.countDocuments({ userId: user._id }),
  ]);

  res.json({
    user: {
      ...user.toSafeObject(),
      stripeCustomerId: user.stripeCustomerId || "",
      stripeSubscriptionId: user.stripeSubscriptionId || "",
    },
    stats: { documentCount, quizCount, chatCount },
    usage: await usageSummaryAsync(user),
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, plan = "free", role = "user", emailVerified = false } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (await rejectInvalidPlan(plan, res)) return;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    plan,
    role,
    emailVerified: Boolean(emailVerified),
    usageResetAt: startOfNextMonth(),
    planExpiresAt: plan !== "free" ? await planExpiryForPlan(plan) : null,
  });

  await logAdminAction(req, "user.create", "user", user._id, { email: user.email, plan, role });
  res.status(201).json({ message: "User created", user: user.toSafeObject() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { name, email, role, emailVerified, bio } = req.body;

  if (name !== undefined) user.name = String(name).trim().slice(0, 80);
  if (email !== undefined) {
    const next = String(email).toLowerCase().trim();
    if (!EMAIL_RE.test(next)) return res.status(400).json({ message: "Invalid email" });
    const dup = await User.findOne({ email: next, _id: { $ne: user._id } });
    if (dup) return res.status(409).json({ message: "Email already in use" });
    user.email = next;
  }
  if (role !== undefined) {
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (String(user._id) === String(req.user._id) && role !== "admin") {
      return res.status(400).json({ message: "You cannot demote your own admin account" });
    }
    user.role = role;
  }
  if (emailVerified !== undefined) user.emailVerified = Boolean(emailVerified);
  if (bio !== undefined) user.bio = String(bio).trim().slice(0, 280);

  await user.save();
  await logAdminAction(req, "user.update", "user", user._id, { name: user.name, role: user.role });
  res.json({ message: "User updated", user: user.toSafeObject() });
});

export const resetUserUsage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.usageThisMonth = { documents: 0, tutorMessages: 0, quizzes: 0 };
  user.usageResetAt = startOfNextMonth();
  await user.save();

  await logAdminAction(req, "user.reset_usage", "user", user._id);
  res.json({ message: "Usage reset", usage: await usageSummaryAsync(user) });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const sendEmailFlag = req.body?.sendEmail === true;
  let tempPassword = null;

  if (sendEmailFlag) {
    const token = user.createPasswordResetToken();
    await user.save();
    const link = `${env.clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your NoteGenie password",
      html: resetPasswordHtml(user.name, link),
    });
    await logAdminAction(req, "user.reset_password_email", "user", user._id);
    return res.json({ message: "Password reset email sent" });
  }

  tempPassword = crypto.randomBytes(6).toString("base64url").slice(0, 10);
  user.passwordHash = await User.hashPassword(tempPassword);
  user.passwordResetToken = "";
  user.passwordResetExpires = null;
  await user.save();

  await logAdminAction(req, "user.reset_password", "user", user._id);
  res.json({ message: "Temporary password set", tempPassword });
});

export const getBillingPricing = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const amounts = await getPlanAmounts();
  res.json({
    proAmount: amounts.pro,
    teamAmount: amounts.team,
    proRupees: paiseToRupees(amounts.pro),
    teamRupees: paiseToRupees(amounts.team),
    adminProSet: settings.billingProAmount != null,
    adminTeamSet: settings.billingTeamAmount != null,
  });
});

export const updateBillingPricing = asyncHandler(async (req, res) => {
  const { proRupees, teamRupees } = req.body;
  const proPaise = rupeesToPaise(proRupees);
  const teamPaise = rupeesToPaise(teamRupees);
  if (!proPaise || !teamPaise) {
    return res.status(400).json({ message: "Pro and Team prices must be greater than ₹0" });
  }
  if (teamPaise < proPaise) {
    return res.status(400).json({ message: "Team price should be higher than Pro price" });
  }

  const settings = await getAppSettings();
  settings.billingProAmount = proPaise;
  settings.billingTeamAmount = teamPaise;
  await settings.save();

  await logAdminAction(req, "billing.pricing_update", "billing", "", {
    proRupees: paiseToRupees(proPaise),
    teamRupees: paiseToRupees(teamPaise),
  });

  res.json({
    message: "Plan prices updated",
    proAmount: proPaise,
    teamAmount: teamPaise,
    proRupees: paiseToRupees(proPaise),
    teamRupees: paiseToRupees(teamPaise),
  });
});

export const updateUserPlan = asyncHandler(async (req, res) => {
  const { plan, expiresAt } = req.body;
  if (await rejectInvalidPlan(plan, res)) return;

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.plan = plan;
  if (plan === "free") {
    user.planExpiresAt = null;
  } else if (expiresAt === null || expiresAt === "") {
    user.planExpiresAt = null;
  } else if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid expiresAt date" });
    }
    user.planExpiresAt = parsed;
  } else {
    user.planExpiresAt = null;
  }

  await user.save();
  await logAdminAction(req, "user.plan_update", "user", user._id, {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
  });
  res.json({
    message: "Plan updated",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    },
  });
});

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

  await logAdminAction(req, "user.delete", "user", targetId, { email: user.email });
  res.json({ message: "User and all their data deleted" });
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  await migrateLegacyKey(settings);
  const { pool } = await getKeyPool();

  res.json({
    geminiApiKeyMasked: maskKey(settings.geminiApiKey),
    hasApiKey: Boolean(pool.length),
    geminiModel: settings.geminiModel || "gemini-2.5-flash",
    updatedAt: settings.updatedAt,
    pricing: PRICE_PER_MILLION,
    defaultPricing: DEFAULT_PRICING,
    apiKeys: serializeApiKeys(settings),
    poolSize: pool.length,
    aiRateLimitMax: settings.aiRateLimitMax ?? env.aiRateLimitMax,
    aiRateLimitWindowMinutes: settings.aiRateLimitWindowMinutes ?? env.aiRateLimitWindowMinutes,
    aiRateLimitAdminSet: settings.aiRateLimitMax != null,
    aiRateLimitDefaults: {
      max: env.aiRateLimitMax,
      windowMinutes: env.aiRateLimitWindowMinutes,
    },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { geminiApiKey, geminiModel, apiKeys, aiRateLimitMax, aiRateLimitWindowMinutes } = req.body;
  const settings = await getAppSettings();
  await migrateLegacyKey(settings);

  if (geminiApiKey !== undefined && geminiApiKey !== "") {
    settings.geminiApiKey = geminiApiKey.trim();
    if (settings.apiKeys.length === 0) {
      settings.apiKeys.push({
        id: crypto.randomUUID(),
        label: "Primary",
        key: encryptApiKeyValue(geminiApiKey.trim()),
        priority: 0,
        disabled: false,
      });
    }
  }

  if (geminiModel) settings.geminiModel = geminiModel.trim();

  if (Array.isArray(apiKeys)) {
    settings.apiKeys = apiKeys.map((k, i) => ({
      id: k.id || crypto.randomUUID(),
      label: k.label || `Key ${i + 1}`,
      key: k.key?.trim() ? encryptApiKeyValue(k.key.trim()) : settings.apiKeys.find((x) => x.id === k.id)?.key || "",
      priority: k.priority ?? i,
      disabled: Boolean(k.disabled),
      lastError: k.lastError || "",
      lastErrorAt: k.lastErrorAt || null,
      failureCount: k.failureCount || 0,
      cooldownUntil: k.cooldownUntil || null,
    })).filter((k) => k.key);
  }

  if (aiRateLimitMax !== undefined) {
    const max = Number(aiRateLimitMax);
    if (!Number.isFinite(max) || max < 1 || max > 10_000) {
      return res.status(400).json({ message: "AI rate limit max must be between 1 and 10000" });
    }
    settings.aiRateLimitMax = Math.round(max);
  }
  if (aiRateLimitWindowMinutes !== undefined) {
    const mins = Number(aiRateLimitWindowMinutes);
    if (!Number.isFinite(mins) || mins < 1 || mins > 1440) {
      return res.status(400).json({ message: "AI rate limit window must be between 1 and 1440 minutes" });
    }
    settings.aiRateLimitWindowMinutes = Math.round(mins);
  }

  await settings.save();
  invalidateAiRateLimitCache();
  await logAdminAction(req, "settings.update", "settings", "", { geminiModel: settings.geminiModel });
  const { pool } = await getKeyPool();

  res.json({
    message: "Settings saved",
    geminiApiKeyMasked: maskKey(settings.geminiApiKey),
    hasApiKey: Boolean(pool.length),
    geminiModel: settings.geminiModel,
    apiKeys: serializeApiKeys(settings),
    poolSize: pool.length,
    aiRateLimitMax: settings.aiRateLimitMax ?? env.aiRateLimitMax,
    aiRateLimitWindowMinutes: settings.aiRateLimitWindowMinutes ?? env.aiRateLimitWindowMinutes,
  });
});

export const addApiKey = asyncHandler(async (req, res) => {
  const { key, label } = req.body;
  if (!key?.trim()) return res.status(400).json({ message: "API key is required" });

  const settings = await getAppSettings();
  await migrateLegacyKey(settings);

  const newEntry = {
    id: crypto.randomUUID(),
    label: label?.trim() || `Key ${settings.apiKeys.length + 1}`,
    key: encryptApiKeyValue(key.trim()),
    priority: settings.apiKeys.length,
    disabled: false,
  };
  settings.apiKeys.push(newEntry);
  await settings.save();

  await logAdminAction(req, "settings.key_add", "settings", newEntry.id, { label: newEntry.label });
  res.status(201).json({ message: "Key added", apiKeys: serializeApiKeys(settings) });
});

export const patchApiKey = asyncHandler(async (req, res) => {
  const { label, priority, disabled } = req.body;
  const settings = await getAppSettings();
  const entry = settings.apiKeys.find((k) => k.id === req.params.keyId);
  if (!entry) return res.status(404).json({ message: "Key not found" });

  if (label !== undefined) entry.label = String(label).trim().slice(0, 80);
  if (priority !== undefined) entry.priority = Number(priority) || 0;
  if (disabled !== undefined) entry.disabled = Boolean(disabled);

  await settings.save();
  await logAdminAction(req, "settings.key_patch", "settings", entry.id, {
    label: entry.label,
    priority: entry.priority,
    disabled: entry.disabled,
  });
  res.json({ message: "Key updated", apiKeys: serializeApiKeys(settings) });
});

export const resetRateLimit = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  settings.aiRateLimitMax = null;
  settings.aiRateLimitWindowMinutes = null;
  await settings.save();
  invalidateAiRateLimitCache();
  await logAdminAction(req, "settings.rate_limit_reset", "settings", "");
  res.json({
    message: "Rate limit reset to defaults",
    aiRateLimitMax: env.aiRateLimitMax,
    aiRateLimitWindowMinutes: env.aiRateLimitWindowMinutes,
  });
});

export const getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, 20, 100);
  const [logs, total] = await Promise.all([
    AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("adminId", "name email"),
    AdminAuditLog.countDocuments(),
  ]);

  res.json({
    logs: logs.map((l) => ({
      id: l._id,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      meta: l.meta,
      createdAt: l.createdAt,
      admin: l.adminId
        ? { name: l.adminId.name, email: l.adminId.email }
        : { name: "—", email: l.adminEmail },
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const removeApiKey = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  settings.apiKeys = settings.apiKeys.filter((k) => k.id !== req.params.keyId);
  await settings.save();
  await logAdminAction(req, "settings.key_remove", "settings", req.params.keyId);
  res.json({ message: "Key removed", apiKeys: serializeApiKeys(settings) });
});

export const testSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const apiKey = req.body.geminiApiKey?.trim() || decryptApiKeyEntry(settings.apiKeys[0] || {}) || settings.geminiApiKey?.trim();
  const model = req.body.geminiModel?.trim() || settings.geminiModel || "gemini-2.5-flash";

  if (!apiKey) {
    return res.status(400).json({ message: "No API key to test. Enter a key first." });
  }

  const result = await testApiKey(apiKey, model, { userId: req.user._id });
  res.json({ message: "API key works", ...result });
});

export const testAllSettings = asyncHandler(async (req, res) => {
  const results = await testAllKeys({ userId: req.user._id });
  res.json({ results, passed: results.filter((r) => r.ok).length, total: results.length });
});

export const getModels = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const bodyKey = req.body?.key?.trim();
  const apiKey =
    bodyKey ||
    req.query.key?.trim() ||
    (settings.apiKeys[0] ? decryptApiKeyEntry(settings.apiKeys[0]) : "") ||
    settings.geminiApiKey?.trim();
  if (!apiKey) {
    return res.status(400).json({ message: "Set an API key first to list models" });
  }
  const models = await listModels(apiKey);
  res.json({ models });
});

export const listAllDocuments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = documentFilterFromQuery(req.query);
  const [docs, total] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .select("title sourceType sourceName summary createdAt userId folder tags shareEnabled shareToken"),
    Document.countDocuments(filter),
  ]);

  res.json({
    documents: docs.map((d) => ({
      id: d._id,
      title: d.title,
      sourceType: d.sourceType,
      sourceName: d.sourceName,
      summary: d.summary,
      folder: d.folder || "",
      tags: d.tags || [],
      shareEnabled: d.shareEnabled,
      createdAt: d.createdAt,
      user: d.userId ? { id: d.userId._id, name: d.userId.name, email: d.userId.email } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getDocumentAdmin = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id).populate("userId", "name email");
  if (!doc) return res.status(404).json({ message: "Document not found" });

  res.json({
    document: {
      id: doc._id,
      title: doc.title,
      sourceType: doc.sourceType,
      sourceName: doc.sourceName,
      folder: doc.folder || "",
      tags: doc.tags || [],
      summary: doc.summary,
      notes: doc.notes,
      flashcards: doc.flashcards,
      shareEnabled: doc.shareEnabled,
      shareToken: doc.shareEnabled ? doc.shareToken : "",
      createdAt: doc.createdAt,
      user: doc.userId
        ? { id: doc.userId._id, name: doc.userId.name, email: doc.userId.email }
        : null,
    },
  });
});

export const updateDocumentAdmin = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const { title, folder, tags, shareEnabled } = req.body;
  if (title !== undefined) doc.title = String(title).trim().slice(0, 200);
  if (folder !== undefined) doc.folder = String(folder).trim().slice(0, 80);
  if (tags !== undefined) {
    doc.tags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : [];
  }
  if (shareEnabled !== undefined) {
    doc.shareEnabled = Boolean(shareEnabled);
    if (!doc.shareEnabled) {
      doc.shareToken = "";
    } else if (!doc.shareToken) {
      doc.shareToken = crypto.randomBytes(16).toString("hex");
    }
  }

  await doc.save();
  await logAdminAction(req, "document.update", "document", doc._id, { title: doc.title });
  res.json({ message: "Document updated", document: { id: doc._id, title: doc.title } });
});

export const listQuizzesAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.documentId) filter.documentId = req.query.documentId;
  const search = req.query.search?.trim();
  if (search) filter.title = { $regex: search, $options: "i" };

  const [quizzes, total] = await Promise.all([
    Quiz.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("documentId", "title")
      .select("title difficulty questions createdAt userId documentId"),
    Quiz.countDocuments(filter),
  ]);

  res.json({
    quizzes: quizzes.map((q) => ({
      id: q._id,
      title: q.title,
      difficulty: q.difficulty,
      questionCount: q.questions?.length || 0,
      createdAt: q.createdAt,
      user: q.userId ? { name: q.userId.name, email: q.userId.email } : null,
      documentTitle: q.documentId?.title || "—",
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const deleteQuizAdmin = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByIdAndDelete(req.params.id);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  await QuizAttempt.deleteMany({ quizId: quiz._id });
  await logAdminAction(req, "quiz.delete", "quiz", quiz._id);
  res.json({ message: "Quiz deleted" });
});

export const listChatAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.documentId) filter.documentId = req.query.documentId;
  const search = req.query.search?.trim();
  if (search) filter.content = { $regex: search, $options: "i" };

  const [messages, total] = await Promise.all([
    ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("documentId", "title")
      .select("role content createdAt userId documentId"),
    ChatMessage.countDocuments(filter),
  ]);

  res.json({
    messages: messages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content.slice(0, 500),
      createdAt: m.createdAt,
      user: m.userId ? { name: m.userId.name, email: m.userId.email } : null,
      documentTitle: m.documentId?.title || "—",
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const deleteChatAdmin = asyncHandler(async (req, res) => {
  const msg = await ChatMessage.findByIdAndDelete(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message not found" });
  await logAdminAction(req, "chat.delete", "chat", msg._id);
  res.json({ message: "Message deleted" });
});

export const listSharesAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = { shareEnabled: true, shareToken: { $ne: "" } };

  const [docs, total] = await Promise.all([
    Document.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .select("title shareToken createdAt userId"),
    Document.countDocuments(filter),
  ]);

  res.json({
    shares: docs.map((d) => ({
      id: d._id,
      title: d.title,
      shareToken: d.shareToken,
      createdAt: d.createdAt,
      user: d.userId ? { name: d.userId.name, email: d.userId.email } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const revokeShareAdmin = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  doc.shareEnabled = false;
  doc.shareToken = "";
  await doc.save();
  await logAdminAction(req, "share.revoke", "document", doc._id);
  res.json({ message: "Share link revoked" });
});

export const deleteDocumentAdmin = asyncHandler(async (req, res) => {
  const doc = await Document.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });

  await ChatMessage.deleteMany({ documentId: doc._id });
  await Quiz.deleteMany({ documentId: doc._id });
  await QuizAttempt.deleteMany({ documentId: doc._id });
  await logAdminAction(req, "document.delete", "document", doc._id, { title: doc.title });
  res.json({ message: "Document deleted" });
});

export const getBillingPlans = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const amounts = await getPlanAmounts();
  await loadPlanLimitsFromDb();
  const catalog = await loadPlanCatalog(true);
  const limits = await serializePlanLimitsForAdmin();

  res.json({
    proAmount: amounts.pro,
    teamAmount: amounts.team,
    proRupees: paiseToRupees(amounts.pro),
    teamRupees: paiseToRupees(amounts.team),
    adminProSet: settings.billingProAmount != null,
    adminTeamSet: settings.billingTeamAmount != null,
    adminLimitsSet:
      settings.planLimits != null &&
      (settings.planLimits instanceof Map
        ? settings.planLimits.size > 0
        : Object.keys(settings.planLimits || {}).length > 0),
    limits,
    defaultLimits: {
      free: { documents: 3, tutorMessages: 20, quizzes: 5 },
      pro: { documents: 50, tutorMessages: -1, quizzes: -1 },
      team: { documents: 200, tutorMessages: -1, quizzes: -1 },
    },
    customPlans: (settings.customPlans || []).map((p) => ({
      ...p.toObject?.() ?? p,
      limits: p.limits || {},
    })),
    planOptions: catalog.map((p) => ({ id: p.id, name: p.name, builtIn: p.builtIn })),
    catalog,
  });
});

export const updateBillingPlans = asyncHandler(async (req, res) => {
  const { proRupees, teamRupees, limits } = req.body;
  const settings = await getAppSettings();

  if (proRupees !== undefined && teamRupees !== undefined) {
    const proPaise = rupeesToPaise(proRupees);
    const teamPaise = rupeesToPaise(teamRupees);
    if (!proPaise || !teamPaise) {
      return res.status(400).json({ message: "Pro and Team prices must be greater than ₹0" });
    }
    if (teamPaise < proPaise) {
      return res.status(400).json({ message: "Team price should be higher than Pro price" });
    }
    settings.billingProAmount = proPaise;
    settings.billingTeamAmount = teamPaise;
  }

  if (limits && typeof limits === "object") {
    const map = settings.planLimits instanceof Map ? settings.planLimits : new Map();
    for (const [planId, entry] of Object.entries(limits)) {
      if (!entry) continue;
      map.set(planId, {
        documents: entry.documents ?? null,
        tutorMessages: entry.tutorMessages ?? null,
        quizzes: entry.quizzes ?? null,
      });
    }
    settings.planLimits = map;
    invalidatePlanLimitsCache();
  }

  await settings.save();
  invalidatePlanCatalogCache();
  await logAdminAction(req, "billing.plans_update", "billing", "", { proRupees, teamRupees });

  const amounts = await getPlanAmounts();
  await loadPlanLimitsFromDb();
  res.json({
    message: "Billing plans updated",
    proRupees: paiseToRupees(amounts.pro),
    teamRupees: paiseToRupees(amounts.team),
    limits: await serializePlanLimitsForAdmin(),
  });
});

export const clearBillingPricing = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  settings.billingProAmount = null;
  settings.billingTeamAmount = null;
  await settings.save();
  await logAdminAction(req, "billing.pricing_clear", "billing", "");
  const amounts = await getPlanAmounts();
  res.json({
    message: "Admin price overrides cleared",
    proRupees: paiseToRupees(amounts.pro),
    teamRupees: paiseToRupees(amounts.team),
  });
});

export const listPaymentsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.provider && ["razorpay", "stripe", "admin"].includes(req.query.provider)) {
    filter.provider = req.query.provider;
  }

  const [events, total] = await Promise.all([
    PaymentEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email"),
    PaymentEvent.countDocuments(filter),
  ]);

  res.json({
    payments: events.map((e) => ({
      id: e._id,
      plan: e.plan,
      amount: e.amount,
      currency: e.currency,
      provider: e.provider,
      status: e.status,
      orderId: e.orderId,
      paymentId: e.paymentId,
      createdAt: e.createdAt,
      user: e.userId ? { id: e.userId._id, name: e.userId.name, email: e.userId.email } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const grantPlanAdmin = asyncHandler(async (req, res) => {
  const { plan, expiresAt } = req.body;
  if (await rejectInvalidPlan(plan, res)) return;
  if (plan === "free") {
    return res.status(400).json({ message: "Use revoke to set free plan" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.plan = plan;
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "Invalid expiresAt date" });
    }
    user.planExpiresAt = parsed;
  } else {
    user.planExpiresAt = await planExpiryForPlan(plan);
  }
  await user.save();

  await PaymentEvent.create({
    userId: user._id,
    plan,
    amount: 0,
    currency: "INR",
    provider: "admin",
    status: "granted",
  });

  await logAdminAction(req, "billing.grant", "user", user._id, { plan, expiresAt: user.planExpiresAt });
  res.json({ message: "Plan granted", user: user.toSafeObject() });
});

export const revokePlanAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.plan = "free";
  user.planExpiresAt = null;
  await user.save();

  await logAdminAction(req, "billing.revoke", "user", user._id);
  res.json({ message: "Plan revoked", user: user.toSafeObject() });
});

export const createCustomPlan = asyncHandler(async (req, res) => {
  const { errors, data } = parseCustomPlanBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join("; ") });

  const settings = await getAppSettings();
  if (settings.customPlans.some((p) => p.id === data.id)) {
    return res.status(409).json({ message: "A plan with this id already exists" });
  }

  settings.customPlans.push(data);
  await settings.save();
  invalidatePlanCatalogCache();
  invalidatePlanLimitsCache();
  await logAdminAction(req, "billing.custom_plan_create", "plan", data.id, { name: data.name });

  res.status(201).json({ message: "Custom plan created", plan: data, customPlans: settings.customPlans });
});

export const updateCustomPlan = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  const idx = settings.customPlans.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Custom plan not found" });

  const { errors, data } = parseCustomPlanBody(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ message: errors.join("; ") });

  const existing = settings.customPlans[idx];
  Object.assign(existing, data);
  existing.id = req.params.id;
  settings.customPlans[idx] = existing;
  await settings.save();
  invalidatePlanCatalogCache();
  invalidatePlanLimitsCache();
  await logAdminAction(req, "billing.custom_plan_update", "plan", req.params.id);

  res.json({ message: "Custom plan updated", plan: settings.customPlans[idx], customPlans: settings.customPlans });
});

export const deleteCustomPlan = asyncHandler(async (req, res) => {
  const planId = req.params.id;
  if (BUILTIN_PLAN_IDS.includes(planId)) {
    return res.status(400).json({ message: "Built-in plans cannot be deleted" });
  }

  const userCount = await User.countDocuments({ plan: planId });
  if (userCount > 0) {
    return res.status(400).json({ message: `${userCount} user(s) still on this plan. Move them first.` });
  }

  const settings = await getAppSettings();
  const before = settings.customPlans.length;
  settings.customPlans = settings.customPlans.filter((p) => p.id !== planId);
  if (settings.customPlans.length === before) {
    return res.status(404).json({ message: "Custom plan not found" });
  }

  await settings.save();
  invalidatePlanCatalogCache();
  invalidatePlanLimitsCache();
  await logAdminAction(req, "billing.custom_plan_delete", "plan", planId);

  res.json({ message: "Custom plan deleted", customPlans: settings.customPlans });
});

export { maskKey };
