// FLOW: Program Mongoose model. Second catalog level under a University (BCA, MCA, BA English…).
// Courses reference a program; resources are tagged through their course.

import mongoose from "mongoose";

const programSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    level: { type: String, enum: ["UG", "PG", "Diploma", "Certificate", ""], default: "" },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique program slug within a university; fast ordered listing per university.
programSchema.index({ universityId: 1, slug: 1 }, { unique: true });
programSchema.index({ universityId: 1, order: 1 });

export const Program = mongoose.model("Program", programSchema);
