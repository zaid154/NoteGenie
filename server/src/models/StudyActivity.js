// FLOW: StudyActivity Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

// Per-day study activity counter — powers the streak heatmap. One doc per user/day.
import mongoose from "mongoose";

const studyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    day: { type: String, required: true }, // local YYYY-MM-DD
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studyActivitySchema.index({ userId: 1, day: 1 }, { unique: true });

export const StudyActivity = mongoose.model("StudyActivity", studyActivitySchema);
