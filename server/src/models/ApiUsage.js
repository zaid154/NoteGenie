// FLOW: ApiUsage Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

// ApiUsage model = har AI call ka record (kis feature ne, kitne tokens, kitna cost).
// Admin usage page isi data se banta hai.
import mongoose from "mongoose";

const apiUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    feature: {
      type: String,
      enum: ["notes", "quiz", "flashcards", "tutor", "test"], // call kis kaam ke liye thi
      required: true,
    },
    model: { type: String, default: "gemini-2.5-flash" },
    keyId: { type: String, default: "" },
    promptTokens: { type: Number, default: 0 },     // input tokens
    completionTokens: { type: Number, default: 0 }, // output tokens
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },    // approx USD
  },
  { timestamps: true }
);

apiUsageSchema.index({ createdAt: -1 });
apiUsageSchema.index({ userId: 1, createdAt: -1 });
apiUsageSchema.index({ feature: 1 });

export const ApiUsage = mongoose.model("ApiUsage", apiUsageSchema);
