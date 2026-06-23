// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Billing and admin plan changes use this to decide paid plan expiry. Plan duration comes from planCatalog, user plan fields are updated, and expired/paid status is returned to controllers.

import { isPaidPlan as catalogIsPaidPlan, planDurationDays } from "./planCatalog.js";

const PLAN_DAYS = 30;

export function planExpiryFromNow(days = PLAN_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function planExpiryForPlan(planId) {
  const days = await planDurationDays(planId);
  return planExpiryFromNow(days);
}

export function isPaidPlan(plan) {
  return plan === "pro" || plan === "team";
}

export async function isPaidPlanAsync(plan) {
  if (!plan || plan === "free") return false;
  return catalogIsPaidPlan(plan);
}

export async function applyPlanExpiry(user) {
  if (!user) return user;
  const paid = await catalogIsPaidPlan(user.plan);
  if (paid && user.planExpiresAt && user.planExpiresAt <= new Date()) {
    user.plan = "free";
    user.planExpiresAt = null;
    await user.save();
  }
  return user;
}

