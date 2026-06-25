// FLOW: Course (subject) Mongoose model. Third catalog level under a Program (code like BCS-011).
// universityId is denormalized so browse/search can filter by university without a join.
// Resources attach to a course.

import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: true,
      index: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    credits: { type: Number, default: null },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique course code within a program; text search on code + name.
// (universityId already has a single-field index via `index: true` above.)
courseSchema.index({ programId: 1, code: 1 }, { unique: true });
courseSchema.index({ code: "text", name: "text" });

export const Course = mongoose.model("Course", courseSchema);
