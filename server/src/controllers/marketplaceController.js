// FLOW: Marketplace API logic. Per-item buy + download for catalog resources. Mirrors the
// subscription billing flow (services/razorpay.js + PaymentEvent) but keyed on a resourceId via
// the Purchase model. Download is gated: free OR purchased. File bytes stream from fileStorage.

import { Resource } from "../models/Resource.js";
import { Combo } from "../models/Combo.js";
import { Purchase } from "../models/Purchase.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId, isValidObjectId } from "../utils/objectId.js";
import { createResourceOrder as createRzOrder, createCartOrder as createCartRzOrder, verifyPaymentSignature, fetchOrder } from "../services/razorpay.js";
import { openDownloadStream } from "../services/fileStorage.js";

async function userOwns(userId, resourceId) {
  return Boolean(await Purchase.exists({ userId, resourceId, status: "completed" }));
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
    { status: "completed", paymentId },
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
      rows.push({ resourceId: r._id, amount: idx === 0 ? c.price : 0, currency: c.currency || "INR" });
      covered.add(String(r._id));
    });
  }

  // Standalone resources.
  for (const r of standalone) {
    if (owned.has(String(r._id)) || covered.has(String(r._id))) continue;
    if (!r.isPaid || r.price <= 0) { await grantFree(userId, r); freeGranted.push(String(r._id)); covered.add(String(r._id)); continue; }
    rows.push({ resourceId: r._id, amount: r.price, currency: r.currency || "INR" });
    covered.add(String(r._id));
  }

  const total = rows.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) {
    return res.json({ paid: false, freeGranted });
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

  await Purchase.updateMany({ orderId, userId: req.user._id }, { status: "completed", paymentId });
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

  res.json({ owned: true, count: rows.length });
});

// GET /api/catalog/resources/:id/download  — gated: free OR purchased
export const downloadResource = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "resource ID");
  const resource = await Resource.findOne({ _id: req.params.id, isActive: true });
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  const allowed = !resource.isPaid || (await userOwns(req.user._id, resource._id));
  if (!allowed) return res.status(403).json({ message: "Purchase required to download this resource." });

  if (resource.storageProvider !== "gridfs" || !resource.storageKey) {
    // Future providers (cloudinary/r2/s3) would return a signed URL here instead.
    return res.status(503).json({ message: "This file isn't available for download yet." });
  }

  // Count the download (best-effort), then stream the bytes.
  Resource.updateOne({ _id: resource._id }, { $inc: { downloadCount: 1 } }).catch(() => {});

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

  const [rows, total] = await Promise.all([
    Purchase.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("resourceId", "title courseCode")
      .lean(),
    Purchase.countDocuments(filter),
  ]);

  res.json({
    orders: rows.map((p) => ({
      id: p._id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      orderId: p.orderId,
      paymentId: p.paymentId,
      createdAt: p.createdAt,
      user: p.userId ? { name: p.userId.name, email: p.userId.email } : null,
      resource: p.resourceId ? { id: p.resourceId._id, title: p.resourceId.title, courseCode: p.resourceId.courseCode } : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/catalog/me/purchases — student's owned resources ("My downloads")
export const listMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.user._id, status: "completed" })
    .sort({ createdAt: -1 })
    .populate("resourceId", "title resourceType courseCode year isPaid price fileName mime size")
    .lean();

  const items = purchases
    .filter((p) => p.resourceId)
    .map((p) => ({
      purchaseId: p._id,
      purchasedAt: p.createdAt,
      amount: p.amount,
      resource: {
        id: p.resourceId._id,
        title: p.resourceId.title,
        resourceType: p.resourceId.resourceType,
        courseCode: p.resourceId.courseCode,
        year: p.resourceId.year,
        fileName: p.resourceId.fileName,
        size: p.resourceId.size,
      },
    }));

  res.json({ purchases: items });
});
