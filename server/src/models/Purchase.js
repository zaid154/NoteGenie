// FLOW: Purchase Mongoose model. One row per student→resource purchase. Marketplace controller
// creates it on order and flips it to "completed" on verified payment; the gated download endpoint
// checks Purchase.exists({userId, resourceId, status:"completed"}). A PaymentEvent is also written
// so the existing Admin → Payments view keeps showing all money movements.

import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true, index: true },
    amount: { type: Number, default: 0 }, // paise
    currency: { type: String, default: "INR" },
    provider: { type: String, default: "razorpay" },
    orderId: { type: String, default: "", index: true },
    paymentId: { type: String, default: "" },
    status: { type: String, enum: ["created", "completed", "failed"], default: "created" },
  },
  { timestamps: true }
);

purchaseSchema.index({ userId: 1, resourceId: 1 });
purchaseSchema.index({ createdAt: -1 });

export const Purchase = mongoose.model("Purchase", purchaseSchema);
