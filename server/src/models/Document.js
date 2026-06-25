// FLOW: Document Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

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
    sourceType: {
      type: String,
      enum: ["pdf", "link", "text", "image", "audio", "video"],
      required: true,
    },
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
    // What this material is: study notes (default), a solved assignment, or a guess paper.
    contentType: { type: String, enum: ["notes", "assignment", "guess"], default: "notes", index: true },
    // Optional IGNOU / distance-learning metadata for organizing by course.
    courseCode: { type: String, default: "", trim: true, index: true },
    program: { type: String, default: "", trim: true },
    session: { type: String, default: "", trim: true },
    shareToken: { type: String, default: "" },
    shareEnabled: { type: Boolean, default: false },
    // Optional: when set, members of this workspace can view/study the document.
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ title: "text", notes: "text", summary: "text" });
documentSchema.index({ shareToken: 1 }, { sparse: true });

export const Document = mongoose.model("Document", documentSchema);
