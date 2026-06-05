import mongoose from "mongoose";

// Ek "Document" = user ka koi uploaded PDF ya paste kiya hua link,
// jisse hum notes + flashcards generate karte hain.
const flashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
  },
  { _id: false }
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
    // "pdf" ya "link" - source kaha se aaya.
    sourceType: { type: String, enum: ["pdf", "link"], required: true },
    sourceName: { type: String }, // file name ya URL
    notes: { type: String, default: "" }, // markdown notes
    summary: { type: String, default: "" }, // chhota summary
    flashcards: { type: [flashcardSchema], default: [] },
    // Tutor chat aur quiz generation ke liye raw text rakhte hain.
    sourceText: { type: String, default: "" },
  },
  { timestamps: true }
);

// Dashboard list: user ke docs latest-first — compound index isse fast karta hai.
documentSchema.index({ userId: 1, createdAt: -1 });

export const Document = mongoose.model("Document", documentSchema);
