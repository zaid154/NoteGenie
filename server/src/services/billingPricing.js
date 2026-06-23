// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Billing controllers use this to convert rupees/paise and expose public plan prices. Values come from Settings/admin pricing first, then env Razorpay defaults, then go back to checkout/pricing APIs.

import { getAppSettings } from "../models/Settings.js";
import { env } from "../config/env.js";
import { loadPlanCatalog, amountForPlanId } from "./planCatalog.js";

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  return Math.round(Number(paise)) / 100;
}

export function displayInr(paise) {
  if (!paise) return null;
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export async function getPlanAmounts() {
  const settings = await getAppSettings();
  return {
    pro: settings.billingProAmount ?? env.razorpayProAmount,
    team: settings.billingTeamAmount ?? env.razorpayTeamAmount,
  };
}

export async function getPublicPlans() {
  const catalog = await loadPlanCatalog();
  return catalog
    .filter((p) => p.billingEnabled && p.amount > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      displayPrice: p.displayPrice,
      currency: "INR",
    }));
}

export async function amountForPlan(plan) {
  return amountForPlanId(plan);
}

export { getPublicCatalog } from "./planCatalog.js";

