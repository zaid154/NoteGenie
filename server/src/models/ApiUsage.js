import mongoose from "mongoose";

const apiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    feature: {
      type: String,
      enum: ["notes", "quiz", "flashcards", "tutor", "test"],
      required: true,
    },
    model: { type: String, default: "gemini-2.5-flash" },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

apiUsageSchema.index({ createdAt: -1 });
apiUsageSchema.index({ userId: 1, createdAt: -1 });
apiUsageSchema.index({ feature: 1 });

export const ApiUsage = mongoose.model("ApiUsage", apiUsageSchema);
