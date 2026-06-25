// FLOW: Combo (bundle) Mongoose model. A discounted pack of resources sold as one item.
// On purchase the cart unrolls a combo to one Purchase row per resource (reusing the existing
// ownership/download gate), so no comboId is stored on Purchase. Price is in paise.

import mongoose from "mongoose";

const comboSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
    price: { type: Number, default: 0 }, // paise
    currency: { type: String, default: "INR" },
    coverUrl: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

comboSchema.index({ isActive: 1, order: 1 });

export const Combo = mongoose.model("Combo", comboSchema);
