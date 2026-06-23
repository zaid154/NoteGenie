// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Billing/admin/quota code uses this as the plan source of truth. Built-in plans plus Settings custom plans are merged, cached, validated, and returned to pricing, checkout, quota, and admin pages.

import { getAppSettings } from "../models/Settings.js";
import { env } from "../config/env.js";
import { PLAN_LIMITS } from "../config/plans.js";

export const BUILTIN_PLAN_IDS = ["free", "pro", "team"];
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function displayInr(paise) {
  if (!paise) return null;
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

async function getBuiltinAmounts(settings) {
  return {
    pro: settings.billingProAmount ?? env.razorpayProAmount,
    team: settings.billingTeamAmount ?? env.razorpayTeamAmount,
  };
}

const DEFAULT_FEATURES = {
  free: ["3 documents / month", "20 tutor messages", "5 quizzes", "Flashcards & notes"],
  pro: ["50 documents / month", "Unlimited tutor chat", "Unlimited quizzes", "Priority AI failover"],
  team: ["200 documents / month", "5 team seats (soon)", "Everything in Pro", "Shared library"],
};

let catalogCache = null;
let cacheAt = 0;
const CACHE_MS = 30_000;

function normalizeLimits(raw, fallback) {
  const toNum = (v, fb) => {
    if (v === null || v === undefined) return fb;
    if (v === -1) return Infinity;
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  return {
    documents: toNum(raw?.documents, fallback.documents),
    tutorMessages: toNum(raw?.tutorMessages, fallback.tutorMessages),
    quizzes: toNum(raw?.quizzes, fallback.quizzes),
  };
}

function limitsFromSettingsMap(settings, planId) {
  const raw = settings.planLimits;
  const entry =
    raw instanceof Map ? raw.get(planId) : raw?.[planId];
  return normalizeLimits(entry, PLAN_LIMITS[planId] || PLAN_LIMITS.free);
}

function serializeCustomPlan(entry) {
  return {
    id: entry.id,
    name: entry.name,
    amount: entry.amount,
    rupees: entry.amount / 100,
    displayPrice: displayInr(entry.amount),
    durationDays: entry.durationDays ?? 30,
    limits: normalizeLimits(entry.limits, PLAN_LIMITS.pro),
    features: entry.features?.length ? entry.features : [],
    popular: Boolean(entry.popular),
    enabled: entry.enabled !== false,
    builtIn: false,
    billingEnabled: entry.amount > 0,
    sortOrder: entry.sortOrder ?? 100,
  };
}

export function invalidatePlanCatalogCache() {
  catalogCache = null;
  cacheAt = 0;
}

export async function loadPlanCatalog(force = false) {
  if (!force && catalogCache && Date.now() - cacheAt < CACHE_MS) {
    return catalogCache;
  }

  const settings = await getAppSettings();
  const amounts = await getBuiltinAmounts(settings);

  const builtIn = [
    {
      id: "free",
      name: "Free",
      amount: 0,
      rupees: 0,
      displayPrice: "₹0",
      durationDays: null,
      limits: limitsFromSettingsMap(settings, "free"),
      features: DEFAULT_FEATURES.free,
      popular: false,
      enabled: true,
      builtIn: true,
      billingEnabled: false,
      sortOrder: 0,
    },
    {
      id: "pro",
      name: "Pro",
      amount: amounts.pro,
      rupees: amounts.pro / 100,
      displayPrice: displayInr(amounts.pro),
      durationDays: 30,
      limits: limitsFromSettingsMap(settings, "pro"),
      features: DEFAULT_FEATURES.pro,
      popular: true,
      enabled: true,
      builtIn: true,
      billingEnabled: true,
      sortOrder: 1,
    },
    {
      id: "team",
      name: "Team",
      amount: amounts.team,
      rupees: amounts.team / 100,
      displayPrice: displayInr(amounts.team),
      durationDays: 30,
      limits: limitsFromSettingsMap(settings, "team"),
      features: DEFAULT_FEATURES.team,
      popular: false,
      enabled: true,
      builtIn: true,
      billingEnabled: true,
      sortOrder: 2,
    },
  ];

  const custom = (settings.customPlans || [])
    .map(serializeCustomPlan)
    .filter((p) => p.enabled);

  catalogCache = [...builtIn, ...custom].sort((a, b) => a.sortOrder - b.sortOrder);
  cacheAt = Date.now();
  return catalogCache;
}

export async function getAllPlanIds() {
  const catalog = await loadPlanCatalog();
  return catalog.map((p) => p.id);
}

export async function getPlanById(planId) {
  const catalog = await loadPlanCatalog();
  return catalog.find((p) => p.id === planId) || null;
}

export async function isValidPlanId(planId) {
  if (!planId || typeof planId !== "string") return false;
  return Boolean(await getPlanById(planId));
}

export async function isPaidPlan(planId) {
  const plan = await getPlanById(planId);
  return Boolean(plan && plan.id !== "free" && plan.billingEnabled && plan.amount > 0);
}

export async function getPublicCatalog() {
  const catalog = await loadPlanCatalog();
  return catalog.map((p) => ({
    id: p.id,
    name: p.name,
    amount: p.amount,
    displayPrice: p.displayPrice,
    currency: "INR",
    period: p.id === "free" ? "forever" : `/ ${p.durationDays || 30} days`,
    features: p.features,
    popular: p.popular,
    billingEnabled: p.billingEnabled,
    builtIn: p.builtIn,
    limits: {
      documents: p.limits.documents === Infinity ? null : p.limits.documents,
      tutorMessages: p.limits.tutorMessages === Infinity ? null : p.limits.tutorMessages,
      quizzes: p.limits.quizzes === Infinity ? null : p.limits.quizzes,
    },
  }));
}

export function validateCustomPlanSlug(id) {
  if (!id || typeof id !== "string") return "Plan id is required";
  const slug = id.toLowerCase().trim();
  if (!SLUG_RE.test(slug)) return "Plan id must be 2–31 chars: lowercase letters, numbers, hyphens";
  if (BUILTIN_PLAN_IDS.includes(slug)) return "This id is reserved (free, pro, team)";
  return null;
}

export function parseCustomPlanBody(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.id !== undefined) {
    const slugErr = validateCustomPlanSlug(body.id);
    if (slugErr) errors.push(slugErr);
    else out.id = body.id.toLowerCase().trim();
  }

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) errors.push("Name is required");
    else out.name = name.slice(0, 60);
  }

  if (!partial || body.rupees !== undefined || body.amount !== undefined) {
    const paise = body.amount != null ? Number(body.amount) : rupeesToPaise(body.rupees);
    if (!paise || paise <= 0) errors.push("Price must be greater than ₹0");
    else out.amount = paise;
  }

  if (body.durationDays !== undefined) {
    const days = Number(body.durationDays);
    if (!Number.isFinite(days) || days < 1 || days > 365) errors.push("Duration must be 1–365 days");
    else out.durationDays = Math.round(days);
  } else if (!partial) {
    out.durationDays = 30;
  }

  if (body.limits !== undefined) {
    out.limits = {
      documents: body.limits.documents ?? -1,
      tutorMessages: body.limits.tutorMessages ?? -1,
      quizzes: body.limits.quizzes ?? -1,
    };
  } else if (!partial) {
    out.limits = { documents: 50, tutorMessages: -1, quizzes: -1 };
  }

  if (body.features !== undefined) {
    out.features = Array.isArray(body.features)
      ? body.features.map((f) => String(f).trim()).filter(Boolean).slice(0, 12)
      : String(body.features || "")
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean)
          .slice(0, 12);
  } else if (!partial) {
    out.features = [];
  }

  if (body.popular !== undefined) out.popular = Boolean(body.popular);
  if (body.enabled !== undefined) out.enabled = Boolean(body.enabled);
  if (body.sortOrder !== undefined) out.sortOrder = Number(body.sortOrder) || 100;

  return { errors, data: out };
}

export async function amountForPlanId(planId) {
  const plan = await getPlanById(planId);
  if (!plan || !plan.billingEnabled) return null;
  return plan.amount;
}

export async function planDurationDays(planId) {
  const plan = await getPlanById(planId);
  return plan?.durationDays || 30;
}

