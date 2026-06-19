import mongoose from "mongoose";

const paymentEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, default: "pro" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    provider: { type: String, enum: ["razorpay", "stripe", "admin"], default: "razorpay" },
    orderId: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    status: { type: String, enum: ["completed", "failed", "refunded", "granted"], default: "completed" },
  },
  { timestamps: true }
);

paymentEventSchema.index({ createdAt: -1 });

export const PaymentEvent = mongoose.model("PaymentEvent", paymentEventSchema);
