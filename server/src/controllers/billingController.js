import { User } from "../models/User.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { usageSummary, usageSummaryAsync } from "../config/plans.js";
import { env } from "../config/env.js";
import {
  createOrder,
  fetchOrder,
  isBillingConfigured,
  verifyPaymentSignature,
  amountForPlan,
} from "../services/razorpay.js";
import { getPublicPlans, getPublicCatalog } from "../services/billingPricing.js";
import { applyPlanExpiry, planExpiryForPlan } from "../services/planExpiry.js";
import { isValidPlanId, isPaidPlan } from "../services/planCatalog.js";
import {
  createPortalSession,
  handleWebhook,
  isBillingConfigured as isStripeConfigured,
} from "../services/stripe.js";

export const getUsage = asyncHandler(async (req, res) => {
  await applyPlanExpiry(req.user);
  res.json({ usage: await usageSummaryAsync(req.user) });
});

export const createBillingOrder = asyncHandler(async (req, res) => {
  const plan = String(req.body.plan || "").toLowerCase();
  if (!(await isValidPlanId(plan)) || !(await isPaidPlan(plan))) {
    return res.status(400).json({ message: "Invalid or non-billable plan" });
  }
  if (!isBillingConfigured()) {
    const err = new Error("Billing is not configured. Add Razorpay keys to .env.");
    err.statusCode = 503;
    throw err;
  }
  const order = await createOrder(req.user, plan);
  res.json({ ...order, plan });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, plan } = req.body;
  const selectedPlan = String(plan || "").toLowerCase();

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ message: "orderId, paymentId, and signature are required" });
  }
  if (!(await isValidPlanId(selectedPlan)) || !(await isPaidPlan(selectedPlan))) {
    return res.status(400).json({ message: "Invalid plan" });
  }
  if (!isBillingConfigured()) {
    const err = new Error("Billing is not configured");
    err.statusCode = 503;
    throw err;
  }
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ message: "Invalid payment signature" });
  }

  const order = await fetchOrder(orderId);
  if (!order) return res.status(400).json({ message: "Order not found" });
  if (String(order.notes?.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Order does not belong to this account" });
  }
  if (order.notes?.plan !== selectedPlan) {
    return res.status(400).json({ message: "Plan mismatch for this order" });
  }
  if (Number(order.amount) !== (await amountForPlan(selectedPlan))) {
    return res.status(400).json({ message: "Invalid order amount" });
  }

  req.user.plan = selectedPlan;
  req.user.planExpiresAt = await planExpiryForPlan(selectedPlan);
  await req.user.save();

  await PaymentEvent.create({
    userId: req.user._id,
    plan: selectedPlan,
    amount: Number(order.amount),
    currency: order.currency || "INR",
    provider: "razorpay",
    orderId: String(orderId),
    paymentId: String(paymentId),
    status: "completed",
  });

  res.json({
    message: "Payment verified",
    user: req.user.toSafeObject(),
    planExpiresAt: req.user.planExpiresAt,
  });
});

/** @deprecated Use /checkout page + Razorpay create-order flow */
export const createCheckout = asyncHandler(async (req, res) => {
  const err = new Error("Use POST /billing/create-order and Razorpay checkout.");
  err.statusCode = 410;
  throw err;
});

export const createPortal = asyncHandler(async (req, res) => {
  if (!isStripeConfigured() || !req.user.stripeCustomerId) {
    const err = new Error("Subscription management is only available for Stripe billing accounts.");
    err.statusCode = 400;
    throw err;
  }
  const session = await createPortalSession(req.user);
  res.json({ url: session.url });
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = await handleWebhook(req.body, sig);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (!event) return res.status(503).json({ message: "Stripe not configured" });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan || "pro";
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        plan,
        stripeSubscriptionId: session.subscription || "",
      });
      await PaymentEvent.create({
        userId,
        plan,
        amount: session.amount_total || 0,
        currency: (session.currency || "usd").toUpperCase(),
        provider: "stripe",
        orderId: session.id,
        paymentId: session.payment_intent || "",
        status: "completed",
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const user = await User.findOne({ stripeCustomerId: sub.customer });
    if (user) {
      if (sub.status === "active" || sub.status === "trialing") {
        const priceId = sub.items?.data?.[0]?.price?.id;
        if (priceId === process.env.STRIPE_PRICE_TEAM) user.plan = "team";
        else user.plan = "pro";
        user.stripeSubscriptionId = sub.id;
      } else {
        user.plan = "free";
        user.stripeSubscriptionId = "";
      }
      await user.save();
    }
  }

  res.json({ received: true });
});

export const billingStatus = asyncHandler(async (req, res) => {
  await applyPlanExpiry(req.user);
  res.json({
    configured: isBillingConfigured(),
    plan: req.user.plan || "free",
    planExpiresAt: req.user.planExpiresAt || null,
    usage: await usageSummaryAsync(req.user),
    hasStripePortal: Boolean(req.user.stripeCustomerId && isStripeConfigured()),
  });
});

export const publicBillingConfig = asyncHandler(async (req, res) => {
  const configured = isBillingConfigured();
  const plans = await getPublicPlans();
  const catalog = await getPublicCatalog();
  res.json({
    configured,
    keyId: configured ? env.razorpayKeyId : null,
    currency: "INR",
    plans,
    catalog,
    supportEmail: env.supportEmail || null,
  });
});
