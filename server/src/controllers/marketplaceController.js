// FLOW: Marketplace API logic. Per-item buy + download for catalog resources. Mirrors the
// subscription billing flow (services/razorpay.js + PaymentEvent) but keyed on a resourceId via
// the Purchase model. Download is gated: free OR purchased. File bytes stream from fileStorage.

import crypto from "crypto";
import { Resource } from "../models/Resource.js";
import { Combo } from "../models/Combo.js";
import { Purchase } from "../models/Purchase.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import { DownloadLog } from "../models/DownloadLog.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId, isValidObjectId } from "../utils/objectId.js";
import { createResourceOrder as createRzOrder, createCartOrder as createCartRzOrder, verifyPaymentSignature, fetchOrder } from "../services/razorpay.js";
import { openDownloadStream } from "../services/fileStorage.js";
import { logAdminAction } from "../services/adminAudit.js";
import { sendEmail } from "../services/email.js";
import { env } from "../config/env.js";

// Best-effort "payment success / download ready" email after a verified purchase (§10).
function notifyPurchase(user, { digital, count = 1 }) {
  if (!user?.email) return;
  sendEmail({
    to: user.email,
    subject: digital ? "Your NoteGenie download is ready" : "Your NoteGenie order is confirmed",
    html:
      `<p>Hi ${user.name || "there"},</p>` +
      `<p>Your payment was successful for ${count} item${count === 1 ? "" : "s"}.</p>` +
      (digital
        ? `<p>Your download is ready in <a href="${env.clientUrl}/my-downloads">My Downloads</a>.</p>`
        : `<p>Your order is confirmed and will be shipped to your address. Track it in <a href="${env.clientUrl}/my-downloads">My Downloads</a>.</p>`),
    text: `Hi ${user.name || "there"}, your payment succeeded. See ${env.clientUrl}/my-downloads`,
  }).catch(() => {});
}

async function userOwns(userId, resourceId) {
  return Boolean(await Purchase.exists({ userId, resourceId, status: "completed" }));
}

function genDownloadToken() {
  return crypto.randomBytes(24).toString("hex");
}

function genLicenseKey() {
  return crypto.randomBytes(10).toString("hex").toUpperCase().match(/.{1,4}/g).join("-");
}

// Sanitised shipping address for a physical order line.
function pickShipping(s) {
  const out = {};
  for (const k of ["name", "phone", "address", "city", "state", "country", "pincode"]) {
    out[k] = String(s?.[k] || "").trim();
  }
  return out;
}

// Fields that turn a Purchase into a fulfilable order once payment is verified (or a free item is
// granted). Digital items get a secure download token + a limit/expiry snapshot + a license key, so
// the download can NEVER happen before this runs. Physical items just record verification.
function fulfilmentFields(resource) {
  const productType = resource?.productType || "digital";
  const fields = { paymentVerified: true, verificationStatus: "verified", productType };
  if (productType === "digital") {
    fields.downloadEnabled = true;
    fields.downloadToken = genDownloadToken();
    fields.downloadLimit = resource?.downloadLimit ?? null;
    fields.downloadExpiry = resource?.downloadExpiryDays
      ? new Date(Date.now() + Number(resource.downloadExpiryDays) * 86_400_000)
      : null;
    fields.licenseKey = resource?.licenseKey || genLicenseKey();
  }
  return fields;
}

function clientMeta(req) {
  const ua = req.headers["user-agent"] || "";
  const device = /mobi/i.test(ua) ? "Mobile" : "Desktop";
  let browser = "Other";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  return { ua, device, browser, ip: req.ip || req.headers["x-forwarded-for"] || "" };
}

// Shared download gate + stream. `purchase` may be null for a free resource (no per-purchase
// limits then). Every attempt — allowed or blocked — is written to DownloadLog for the audit trail.
async function streamDownload(req, res, resource, purchase) {
  const { ua, device, browser, ip } = clientMeta(req);
  const log = (ok, reason = "") =>
    DownloadLog.create({
      userId: req.user._id,
      purchaseId: purchase?._id || null,
      resourceId: resource._id,
      ip,
      userAgent: ua.slice(0, 300),
      device,
      browser,
      ok,
      reason,
    }).catch(() => {});

  if (purchase) {
    if (!purchase.downloadEnabled) { await log(false, "disabled"); return res.status(403).json({ message: "Downloads for this item are disabled." }); }
    if (purchase.downloadExpiry && purchase.downloadExpiry < new Date()) { await log(false, "expired"); return res.status(403).json({ message: "This download has expired." }); }
    if (purchase.downloadLimit != null && (purchase.downloadCount || 0) >= purchase.downloadLimit) { await log(false, "limit"); return res.status(403).json({ message: "Download limit reached." }); }
  }

  // External-URL products have no stored file — redirect to the URL (still auth/ownership-gated above).
  if (resource.storageProvider !== "gridfs" || !resource.storageKey) {
    if (resource.downloadUrl) { await log(true, "external"); return res.redirect(resource.downloadUrl); }
    return res.status(503).json({ message: "This file isn't available for download yet." });
  }

  Resource.updateOne({ _id: resource._id }, { $inc: { downloadCount: 1 } }).catch(() => {});
  if (purchase) Purchase.updateOne({ _id: purchase._id }, { $inc: { downloadCount: 1 } }).catch(() => {});
  await log(true);

  res.setHeader("Content-Type", resource.mime || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${(resource.fileName || resource.title || "download").replace(/"/g, "")}"`
  );
  const stream = openDownloadStream(resource.storageKey);
  stream.on("error", () => {
    if (!res.headersSent) res.status(404).json({ message: "File not found." });
    else res.end();
  });
  stream.pipe(res);
}

// Grant a free resource immediately (idempotent — skips if already owned).
async function grantFree(userId, resource) {
  if (await userOwns(userId, resource._id)) return;
  await Purchase.create({
    userId,
    resourceId: resource._id,
    amount: 0,
    currency: resource.currency || "INR",
    provider: "free",
    status: "completed",
    transactionId: "free",
    ...fulfilmentFields(resource),
  });
}

// POST /api/catalog/resources/order  body: { resourceId }
export const createResourceOrder = asyncHandler(async (req, res) => {
  const { resourceId } = req.body;
  assertValidObjectId(resourceId, "resource ID");
  const resource = await Resource.findOne({ _id: resourceId, isActive: true });
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (!resource.isPaid || resource.price <= 0) {
    return res.status(400).json({ message: "This resource is free — no payment needed." });
  }
  if (await userOwns(req.user._id, resourceId)) {
    return res.status(409).json({ message: "You already own this resource." });
  }

  const order = await createRzOrder(req.user, resource);
  await Purchase.create({
    userId: req.user._id,
    resourceId: resource._id,
    amount: resource.price,
    currency: resource.currency,
    provider: "razorpay",
    orderId: order.orderId,
    status: "created",
  });

  res.json({ ...order, resourceId: String(resource._id) });
});

// POST /api/catalog/resources/verify  body: { orderId, paymentId, signature, resourceId }
export const verifyResourcePayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, resourceId } = req.body;
  assertValidObjectId(resourceId, "resource ID");

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ message: "Payment verification failed (bad signature)." });
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  // Re-validate against Razorpay's record — never trust client amounts.
  const order = await fetchOrder(orderId);
  if (!order || order.notes?.userId !== String(req.user._id) || order.notes?.resourceId !== String(resourceId)) {
    return res.status(400).json({ message: "Order does not match this purchase." });
  }
  if (Number(order.amount) !== Number(resource.price)) {
    return res.status(400).json({ message: "Payment amount mismatch." });
  }

  const purchase = await Purchase.findOneAndUpdate(
    { orderId, userId: req.user._id, resourceId },
    { status: "completed", paymentId, transactionId: paymentId, ...fulfilmentFields(resource) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Mirror into PaymentEvent so Admin → Payments shows it alongside plan payments.
  await PaymentEvent.create({
    userId: req.user._id,
    plan: `resource:${resource.title}`.slice(0, 60),
    amount: resource.price,
    currency: resource.currency,
    provider: "razorpay",
    orderId,
    paymentId,
    status: "completed",
  });

  notifyPurchase(req.user, { digital: (resource.productType || "digital") !== "physical" });
  res.json({ owned: true, purchaseId: purchase._id });
});

// POST /api/catalog/cart/order  body: { resourceIds: [], comboIds: [] }
// Combos are unrolled to their resources; the combo's bundle price is placed on the first
// not-owned resource (0 on the rest) so verify's sum-of-Purchase-amounts == order.amount.
export const createCartOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const resourceIds = (Array.isArray(req.body.resourceIds) ? req.body.resourceIds : []).filter(isValidObjectId);
  const comboIds = (Array.isArray(req.body.comboIds) ? req.body.comboIds : []).filter(isValidObjectId);
  if (!resourceIds.length && !comboIds.length) return res.status(400).json({ message: "Your cart is empty." });

  const combos = comboIds.length
    ? await Combo.find({ _id: { $in: comboIds }, isActive: true }).populate({ path: "resourceIds", match: { isActive: true } })
    : [];
  const standalone = resourceIds.length ? await Resource.find({ _id: { $in: resourceIds }, isActive: true }) : [];

  // Ownership check across every candidate resource.
  const candidateIds = new Set();
  standalone.forEach((r) => candidateIds.add(String(r._id)));
  combos.forEach((c) => (c.resourceIds || []).forEach((r) => r && candidateIds.add(String(r._id))));
  const ownedRows = await Purchase.find({ userId, resourceId: { $in: [...candidateIds] }, status: "completed" }).select("resourceId").lean();
  const owned = new Set(ownedRows.map((p) => String(p.resourceId)));

  const rows = [];          // { resourceId, amount }
  const freeGranted = [];
  const covered = new Set(); // resourceIds already placed on an order line (dedup)

  // Combos first (they set the bundle price).
  for (const c of combos) {
    const notOwned = (c.resourceIds || []).filter((r) => r && !owned.has(String(r._id)) && !covered.has(String(r._id)));
    if (!notOwned.length) continue;
    if (!c.price || c.price <= 0) {
      for (const r of notOwned) { await grantFree(userId, r); freeGranted.push(String(r._id)); covered.add(String(r._id)); }
      continue;
    }
    notOwned.forEach((r, idx) => {
      rows.push({ resourceId: r._id, amount: idx === 0 ? c.price : 0, currency: c.currency || "INR", productType: r.productType || "digital" });
      covered.add(String(r._id));
    });
  }

  // Standalone resources.
  for (const r of standalone) {
    if (owned.has(String(r._id)) || covered.has(String(r._id))) continue;
    if (!r.isPaid || r.price <= 0) { await grantFree(userId, r); freeGranted.push(String(r._id)); covered.add(String(r._id)); continue; }
    rows.push({ resourceId: r._id, amount: r.price, currency: r.currency || "INR", productType: r.productType || "digital" });
    covered.add(String(r._id));
  }

  const total = rows.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) {
    return res.json({ paid: false, freeGranted });
  }

  // Physical items require a shipping address; digital-only carts skip it (§3).
  const shipping = req.body.shipping && typeof req.body.shipping === "object" ? req.body.shipping : null;
  const hasPhysical = rows.some((p) => p.productType === "physical");
  if (hasPhysical) {
    const required = ["name", "phone", "address", "city", "state", "pincode"];
    if (!shipping || required.some((k) => !String(shipping[k] || "").trim())) {
      return res.status(400).json({ message: "Shipping address (name, phone, address, city, state, pincode) is required for physical items." });
    }
  }

  const order = await createCartRzOrder(req.user, total, { count: String(rows.length) });
  await Purchase.insertMany(
    rows.map((p) => ({
      userId,
      resourceId: p.resourceId,
      amount: p.amount,
      currency: p.currency,
      provider: "razorpay",
      orderId: order.orderId,
      status: "created",
      productType: p.productType,
      ...(p.productType === "physical" && shipping ? { shipping: pickShipping(shipping) } : {}),
    }))
  );

  res.json({ paid: true, ...order, count: rows.length, freeGranted });
});

// POST /api/catalog/cart/verify  body: { orderId, paymentId, signature }
export const verifyCartPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return res.status(400).json({ message: "Payment verification failed (bad signature)." });
  }
  const order = await fetchOrder(orderId);
  if (!order || order.notes?.userId !== String(req.user._id) || order.notes?.kind !== "cart") {
    return res.status(400).json({ message: "Order does not match this cart." });
  }

  // Re-validate total against the server's own pending Purchase rows (never trust the client).
  const rows = await Purchase.find({ orderId, userId: req.user._id });
  if (!rows.length) return res.status(400).json({ message: "No pending items for this order." });
  const expected = rows.reduce((s, p) => s + p.amount, 0);
  if (Number(order.amount) !== expected) {
    return res.status(400).json({ message: "Payment amount mismatch." });
  }

  // Provision each line per its own product (digital items get their own token/limit/expiry/license).
  const lineResources = await Resource.find({ _id: { $in: rows.map((r) => r.resourceId) } }).lean();
  const resById = new Map(lineResources.map((r) => [String(r._id), r]));
  for (const row of rows) {
    Object.assign(row, {
      status: "completed",
      paymentId,
      transactionId: paymentId,
      ...fulfilmentFields(resById.get(String(row.resourceId))),
    });
    await row.save();
  }
  await PaymentEvent.create({
    userId: req.user._id,
    plan: `cart:${rows.length} item(s)`,
    amount: expected,
    currency: "INR",
    provider: "razorpay",
    orderId,
    paymentId,
    status: "completed",
  });

  notifyPurchase(req.user, { digital: rows.some((r) => (r.productType || "digital") !== "physical"), count: rows.length });
  res.json({ owned: true, count: rows.length });
});

// GET /api/catalog/resources/:id/download  — gated: free OR purchased (enforces limit/expiry + logs)
export const downloadResource = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "resource ID");
  const resource = await Resource.findOne({ _id: req.params.id, isActive: true });
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  // Paid items require a completed purchase; free items download directly (a granted Purchase, if
  // any, still carries limits/logging).
  const purchase = await Purchase.findOne({ userId: req.user._id, resourceId: resource._id, status: "completed" });
  if (resource.isPaid && !purchase) {
    return res.status(403).json({ message: "Purchase required to download this resource." });
  }
  return streamDownload(req, res, resource, purchase);
});

// GET /api/catalog/download/:token — secure tokenised download (spec /download/{token}). The token is
// unguessable and bound to one Purchase; access still requires the matching logged-in user, verified
// payment, an enabled download, and within the limit/expiry. Never exposes the storage key/URL.
export const downloadByToken = asyncHandler(async (req, res) => {
  const token = String(req.params.token || "");
  if (token.length < 20) return res.status(404).json({ message: "Invalid download link." });

  const purchase = await Purchase.findOne({ downloadToken: token });
  if (!purchase || String(purchase.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: "This download link is invalid or not yours." });
  }
  if (!purchase.paymentVerified && purchase.status !== "completed") {
    return res.status(403).json({ message: "Payment is not verified for this item yet." });
  }
  const resource = await Resource.findById(purchase.resourceId);
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  return streamDownload(req, res, resource, purchase);
});

// GET /api/admin/orders — all purchases for the admin Orders view (manage_orders)
export const listOrdersAdmin = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status && ["created", "completed", "failed"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  if (req.query.productType && ["digital", "physical"].includes(req.query.productType)) {
    filter.productType = req.query.productType;
  }

  const [rows, total] = await Promise.all([
    Purchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("resourceId", "title courseCode resourceType productType")
      .lean(),
    Purchase.countDocuments(filter),
  ]);

  res.json({
    orders: rows.map((p) => ({
      id: p._id,
      status: p.status,
      paymentVerified: p.paymentVerified || p.status === "completed",
      productType: p.productType || p.resourceId?.productType || "digital",
      downloadEnabled: p.downloadEnabled !== false,
      amount: p.amount,
      currency: p.currency,
      orderId: p.orderId,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
      user: p.userId ? { name: p.userId.name, email: p.userId.email } : null,
      resource: p.resourceId ? { id: p.resourceId._id, title: p.resourceId.title, courseCode: p.resourceId.courseCode, resourceType: p.resourceId.resourceType } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/admin/orders/:id — full order detail incl. digital fulfilment + download logs.
export const getOrderAdmin = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "order ID");
  const p = await Purchase.findById(req.params.id).populate("userId", "name email").populate("resourceId").lean();
  if (!p) return res.status(404).json({ message: "Order not found" });
  const logs = await DownloadLog.find({ purchaseId: p._id }).sort({ createdAt: -1 }).limit(50).lean();
  const r = p.resourceId || {};
  res.json({
    order: {
      id: p._id,
      orderId: p.orderId,
      status: p.status,
      paymentVerified: p.paymentVerified || p.status === "completed",
      verificationStatus: p.verificationStatus || (p.status === "completed" ? "verified" : "pending"),
      transactionId: p.transactionId || p.paymentId || "",
      paymentId: p.paymentId || "",
      provider: p.provider,
      amount: p.amount,
      currency: p.currency,
      invoiceNumber: p.invoiceNumber || "",
      createdAt: p.createdAt,
      productType: p.productType || r.productType || "digital",
      user: p.userId ? { id: p.userId._id, name: p.userId.name, email: p.userId.email } : null,
      downloadEnabled: p.downloadEnabled !== false,
      downloadLimit: p.downloadLimit ?? null,
      downloadCount: p.downloadCount || 0,
      downloadExpiry: p.downloadExpiry || null,
      downloadToken: p.downloadToken || "",
      licenseKey: p.licenseKey || "",
      shipping: p.shipping || null,
      resource: r._id
        ? { id: r._id, title: r.title, resourceType: r.resourceType, productType: r.productType, courseCode: r.courseCode, fileName: r.fileName, size: r.size, version: r.version, price: r.price }
        : null,
      downloadLogs: logs.map((l) => ({ id: l._id, at: l.createdAt, ip: l.ip, device: l.device, browser: l.browser, ok: l.ok, reason: l.reason })),
    },
  });
});

// PATCH /api/admin/orders/:id — admin actions over a digital/physical order.
export const updateOrderAdmin = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "order ID");
  const p = await Purchase.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Order not found" });
  const b = req.body || {};

  if (b.downloadEnabled !== undefined) p.downloadEnabled = Boolean(b.downloadEnabled);
  if (b.resetDownloads) p.downloadCount = 0;
  if (b.regenerateToken) p.downloadToken = crypto.randomBytes(24).toString("hex");
  if (b.licenseKey !== undefined) p.licenseKey = String(b.licenseKey || "");
  if (b.downloadLimit !== undefined) {
    p.downloadLimit = b.downloadLimit === null || b.downloadLimit === "" ? null : Math.max(0, Number(b.downloadLimit) || 0);
  }
  if (b.extendExpiryDays !== undefined) {
    const days = Number(b.extendExpiryDays);
    if (Number.isFinite(days)) {
      const base = p.downloadExpiry && p.downloadExpiry > new Date() ? p.downloadExpiry.getTime() : Date.now();
      p.downloadExpiry = days > 0 ? new Date(base + days * 86_400_000) : null;
    }
  }
  if (b.shipping && typeof b.shipping === "object") {
    p.shipping = p.shipping || {};
    for (const k of ["name", "phone", "address", "city", "state", "country", "pincode", "courier", "trackingNumber", "status"]) {
      if (b.shipping[k] !== undefined) p.shipping[k] = String(b.shipping[k] || "");
    }
    if (b.shipping.status === "dispatched" && !p.shipping.dispatchedAt) p.shipping.dispatchedAt = new Date();
    if (b.shipping.status === "delivered" && !p.shipping.deliveredAt) p.shipping.deliveredAt = new Date();
  }

  await p.save();
  await logAdminAction(req, "order.update", "order", p._id, { actions: Object.keys(b) });
  res.json({ ok: true });
});

// GET /api/catalog/me/purchases — student's owned resources ("My downloads")
export const listMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.user._id, status: "completed" })
    .sort({ createdAt: -1 })
    .populate("resourceId", "title resourceType courseCode year isPaid price fileName mime size version productType previewUrl")
    .lean();

  const items = purchases
    .filter((p) => p.resourceId)
    .map((p) => {
      const limit = p.downloadLimit ?? null;
      const used = p.downloadCount || 0;
      return {
        purchaseId: p._id,
        orderId: p.orderId,
        purchasedAt: p.createdAt,
        amount: p.amount,
        paymentStatus: p.paymentVerified || p.status === "completed" ? "verified" : p.verificationStatus || "pending",
        productType: p.productType || p.resourceId.productType || "digital",
        downloadEnabled: p.downloadEnabled !== false,
        downloadToken: p.downloadToken || "",
        downloadLimit: limit,
        downloadCount: used,
        remainingDownloads: limit != null ? Math.max(0, limit - used) : null,
        downloadExpiry: p.downloadExpiry || null,
        licenseKey: p.licenseKey || "",
        resource: {
          id: p.resourceId._id,
          title: p.resourceId.title,
          resourceType: p.resourceId.resourceType,
          courseCode: p.resourceId.courseCode,
          year: p.resourceId.year,
          fileName: p.resourceId.fileName,
          size: p.resourceId.size,
          version: p.resourceId.version || "",
          previewUrl: p.resourceId.previewUrl || "",
        },
      };
    });

  res.json({ purchases: items });
});
