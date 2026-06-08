// Quiz model = ek document se bana hua MCQ quiz (sawal + options).
import mongoose from "mongoose";

// Ek single sawal ka dhaancha.
const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true }, // options ki list (strings)
    correctIndex: { type: Number, required: true }, // sahi option ka number (0 se shuru)
    explanation: { type: String, default: "" },      // jawab kyon sahi hai
  },
  { _id: false } // har sawal ko alag id ki zaroorat nahi
);

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    questions: { type: [questionSchema], required: true },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
