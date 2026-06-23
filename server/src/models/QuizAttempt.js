// FLOW: QuizAttempt Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

import mongoose from "mongoose";

// Har baar jab user quiz solve karta hai, ek attempt save hota hai.
// Isse hi analytics aur progress banta hai.
const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    // User ne har question pe kya choose kiya (review ke liye).
    answers: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
