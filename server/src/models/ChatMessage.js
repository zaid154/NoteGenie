import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // null for cross-document ("global") chats.
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },
    scope: { type: String, enum: ["document", "global"], default: "document" },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// History queries hamesha user + document + time order par chalti hain.
chatMessageSchema.index({ userId: 1, documentId: 1, createdAt: 1 });
// Cross-document ("global") chat history.
chatMessageSchema.index({ userId: 1, scope: 1, createdAt: 1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
