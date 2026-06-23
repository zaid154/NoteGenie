// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Billing controller uses this for Razorpay checkout. Keys come from config/env.js, amount comes from planCatalog, order/payment data goes to Razorpay, and signature verification confirms payment.

import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env.js";
import { amountForPlan as resolveAmountForPlan } from "./billingPricing.js";

let client = null;

function getClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) return null;
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    });
  }
  return client;
}

export function isBillingConfigured() {
  return Boolean(getClient());
}

export async function createOrder(user, plan) {
  const rz = getClient();
  const amount = await resolveAmountForPlan(plan);
  if (!rz || !amount) {
    throw Object.assign(new Error("Billing is not configured"), { statusCode: 503 });
  }

  const order = await rz.orders.create({
    amount,
    currency: "INR",
    receipt: `plan_${String(user._id).slice(-8)}_${Date.now()}`,
    notes: {
      userId: String(user._id),
      plan,
    },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.razorpayKeyId,
  };
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.razorpayKeySecret) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", env.razorpayKeySecret).update(body).digest("hex");
  return expected === signature;
}

export async function fetchOrder(orderId) {
  const rz = getClient();
  if (!rz) return null;
  return rz.orders.fetch(orderId);
}

export { resolveAmountForPlan as amountForPlan };

