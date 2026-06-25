// FLOW: University Mongoose model. Top level of the content catalog (IGNOU, DU SOL, MDU…).
// Admin catalog controllers create/query this; programs/courses/resources reference it.

import mongoose from "mongoose";

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    shortName: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

universitySchema.index({ order: 1, name: 1 });

export const University = mongoose.model("University", universitySchema);
