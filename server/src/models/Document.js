import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    section: { type: String, default: "" },
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewAt: { type: Date, default: null },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    sourceType: { type: String, enum: ["pdf", "link"], required: true },
    sourceName: { type: String },
    folder: { type: String, default: "", trim: true, index: true },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" },
    summary: { type: String, default: "" },
    keyTakeaways: { type: [String], default: [] },
    glossary: {
      type: [
        {
          _id: false,
          term: { type: String, default: "" },
          definition: { type: String, default: "" },
        },
      ],
      default: [],
    },
    flashcards: { type: [flashcardSchema], default: [] },
    sourceText: { type: String, default: "" },
    outputLanguage: { type: String, default: "English" },
    detailLevel: { type: String, enum: ["standard", "detailed"], default: "detailed" },
    generationMode: { type: String, enum: ["single", "chunked"], default: "single" },
    shareToken: { type: String, default: "" },
    shareEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ title: "text", notes: "text", summary: "text" });
documentSchema.index({ shareToken: 1 }, { sparse: true });

export const Document = mongoose.model("Document", documentSchema);
