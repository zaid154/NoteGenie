// Stripe billing — checkout, portal, webhooks.
import Stripe from "stripe";
import { env } from "../config/env.js";

let stripe = null;

export function getStripe() {
  if (!env.stripeSecretKey) return null;
  if (!stripe) stripe = new Stripe(env.stripeSecretKey);
  return stripe;
}

export function priceForPlan(plan) {
  if (plan === "pro") return env.stripePricePro;
  if (plan === "team") return env.stripePriceTeam;
  return null;
}

export function isBillingConfigured() {
  return Boolean(getStripe() && env.stripePricePro);
}

export async function createCheckoutSession(user, plan) {
  const s = getStripe();
  const priceId = priceForPlan(plan);
  if (!s || !priceId) {
    const err = new Error("Billing is not configured yet.");
    err.statusCode = 503;
    throw err;
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  return s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.clientUrl}/billing?success=1`,
    cancel_url: `${env.clientUrl}/pricing?canceled=1`,
    metadata: { userId: String(user._id), plan },
  });
}

export async function createPortalSession(user) {
  const s = getStripe();
  if (!s || !user.stripeCustomerId) {
    const err = new Error("No billing account found.");
    err.statusCode = 400;
    throw err;
  }
  return s.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${env.clientUrl}/billing`,
  });
}

export async function handleWebhook(rawBody, signature) {
  const s = getStripe();
  if (!s || !env.stripeWebhookSecret) return null;
  return s.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}
