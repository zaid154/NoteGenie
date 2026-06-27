// FLOW: Purchase Mongoose model. One row per student→resource purchase (acts as an order line).
// Marketplace controller creates it on order and flips it to "completed" on verified payment; the
// gated download endpoint checks ownership + payment + download limit/expiry. A PaymentEvent is also
// written so the Admin → Payments view keeps showing all money movements. Rows sharing an `orderId`
// form one logical order (e.g. a multi-item cart checkout).

import mongoose from "mongoose";

// Physical fulfilment details (only set when productType === "physical").
const shippingSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pincode: { type: String, default: "" },
    courier: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "packed", "dispatched", "delivered", "cancelled"],
      default: "pending",
    },
    dispatchedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true, index: true },
    amount: { type: Number, default: 0 }, // paise
    currency: { type: String, default: "INR" },
    provider: { type: String, default: "razorpay" },
    orderId: { type: String, default: "", index: true },
    paymentId: { type: String, default: "" },
    // Legacy gate flag (kept for back-compat): "completed" === paid & fulfilable.
    status: { type: String, enum: ["created", "completed", "failed", "cancelled"], default: "created" },

    // ── Payment verification (digital must never download before this) ──────
    paymentVerified: { type: Boolean, default: false, index: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "failed", "cancelled"],
      default: "pending",
    },
    transactionId: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },

    // Snapshot of the product type at purchase time.
    productType: { type: String, enum: ["digital", "physical"], default: "digital" },

    // ── Digital fulfilment (issued only on verified payment) ────────────────
    licenseKey: { type: String, default: "" },
    downloadEnabled: { type: Boolean, default: true }, // admin can revoke
    downloadLimit: { type: Number, default: null },    // snapshot from resource; null = unlimited
    downloadCount: { type: Number, default: 0 },
    downloadExpiry: { type: Date, default: null },     // snapshot; null = never expires
    downloadToken: { type: String, default: "", index: true }, // for secure /download/:token

    // ── Physical fulfilment ────────────────────────────────────────────────
    shipping: { type: shippingSchema, default: null },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, resourceId: 1 });
purchaseSchema.index({ createdAt: -1 });

export const Purchase = mongoose.model("Purchase", purchaseSchema);
