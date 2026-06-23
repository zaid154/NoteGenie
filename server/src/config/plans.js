// FLOW: Plan/quota config. Built-in and admin plan limits are loaded here, controllers/middleware read them, and frontend receives usage summaries.

// Yeh file subscription plans aur monthly usage limits manage karti hai.
// Free/Pro/Team limits yahan define hote hain, aur admin DB settings se override ho sakte hain.
import { getAppSettings } from "../models/Settings.js";
import { loadPlanCatalog, invalidatePlanCatalogCache } from "../services/planCatalog.js";

// Built-in fallback limits. Agar DB/admin settings load na ho paye to ye limits use hoti hain.
// Infinity ka matlab unlimited.
export const PLAN_LIMITS = {
  free: { documents: 3, tutorMessages: 20, quizzes: 5 },
  pro: { documents: 50, tutorMessages: Infinity, quizzes: Infinity },
  team: { documents: 200, tutorMessages: Infinity, quizzes: Infinity },
};

const BUILTIN_IDS = ["free", "pro", "team"];

// Limits ko short time ke liye memory me cache karte hain taaki har request DB na hit kare.
let cachedLimits = null;
let cacheLoadedAt = 0;
const CACHE_MS = 30_000;

// Admin UI me -1 unlimited ka signal hai; backend me use Infinity me convert karte hain.
function normalizeLimitValue(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (val === -1) return Infinity;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// DB/settings se aaye raw limits ko backend-friendly format me convert karta hai.
function normalizePlanLimits(raw) {
  if (!raw) return null;
  const out = {};
  for (const plan of BUILTIN_IDS) {
    const entry = raw[plan] || raw.get?.(plan);
    if (!entry) continue;
    out[plan] = {
      documents: normalizeLimitValue(entry.documents, PLAN_LIMITS[plan].documents),
      tutorMessages: normalizeLimitValue(entry.tutorMessages, PLAN_LIMITS[plan].tutorMessages),
      quizzes: normalizeLimitValue(entry.quizzes, PLAN_LIMITS[plan].quizzes),
    };
  }
  return Object.keys(out).length ? out : null;
}

// Admin plan/settings update ke baad cache clear karne ke liye.
export function invalidatePlanLimitsCache() {
  cachedLimits = null;
  cacheLoadedAt = 0;
  invalidatePlanCatalogCache();
}

// DB se latest plan catalog load karke limits cache refresh karta hai.
export async function loadPlanLimitsFromDb() {
  const catalog = await loadPlanCatalog(true);
  const map = {};
  for (const plan of catalog) {
    map[plan.id] = plan.limits;
  }
  cachedLimits = map;
  cacheLoadedAt = Date.now();
  return getEffectivePlanLimits();
}

// Built-in + custom/admin limits ko merge karke final active limits deta hai.
export function getEffectivePlanLimits() {
  if (!cachedLimits) return PLAN_LIMITS;
  return {
    free: cachedLimits.free || PLAN_LIMITS.free,
    pro: cachedLimits.pro || PLAN_LIMITS.pro,
    team: cachedLimits.team || PLAN_LIMITS.team,
    ...Object.fromEntries(
      Object.entries(cachedLimits).filter(([id]) => !BUILTIN_IDS.includes(id))
    ),
  };
}

// Async version request flow ke liye: cache stale ho to DB se refresh karta hai.
export async function getLimits(plan = "free") {
  if (!cachedLimits || Date.now() - cacheLoadedAt > CACHE_MS) {
    await loadPlanLimitsFromDb();
  }
  const all = cachedLimits || {};
  return all[plan] || all.free || PLAN_LIMITS.free;
}

// Sync version tests/simple calculations ke liye: current cache ya fallback limits use karta hai.
export function getLimitsSync(plan = "free") {
  const all = cachedLimits || PLAN_LIMITS;
  return all[plan] || all.free || PLAN_LIMITS.free;
}

// Usage monthly reset hota hai, next month ki first date yahan calculate hoti hai.
export function startOfNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

// Agar user ka monthly usage period expire ho gaya ho to counters reset karta hai.
export async function ensureUsagePeriod(user) {
  const resetAt = user.usageResetAt ? new Date(user.usageResetAt) : null;
  if (!resetAt || resetAt <= new Date()) {
    user.usageThisMonth = { documents: 0, tutorMessages: 0, quizzes: 0 };
    user.usageResetAt = startOfNextMonth();
    await user.save();
  }
  return user;
}

// Frontend ko quota status dikhane ke liye used/limits/resetAt shape banata hai.
// Unlimited values API response me null banate hain, because JSON me Infinity valid nahi hota.
export function usageSummary(user, limitsOverride = null) {
  const limits = limitsOverride || getLimitsSync(user.plan);
  const used = user.usageThisMonth || { documents: 0, tutorMessages: 0, quizzes: 0 };
  return {
    plan: user.plan || "free",
    limits: {
      documents: limits.documents === Infinity ? null : limits.documents,
      tutorMessages: limits.tutorMessages === Infinity ? null : limits.tutorMessages,
      quizzes: limits.quizzes === Infinity ? null : limits.quizzes,
    },
    used,
    resetAt: user.usageResetAt,
  };
}

// DB se latest limits load karke usage summary banata hai.
export async function usageSummaryAsync(user) {
  const limits = await getLimits(user.plan);
  return usageSummary(user, limits);
}

// Admin UI ke liye limits serialize karta hai. Infinity ko wapas -1 banate hain.
export async function serializePlanLimitsForAdmin() {
  await loadPlanLimitsFromDb();
  const toVal = (n) => (n === Infinity ? -1 : n);
  const out = {};
  for (const [id, limits] of Object.entries(cachedLimits || PLAN_LIMITS)) {
    out[id] = {
      documents: toVal(limits.documents),
      tutorMessages: toVal(limits.tutorMessages),
      quizzes: toVal(limits.quizzes),
    };
  }
  return out;
}
