// FLOW: One embedded chunk of a document's notes, used for semantic (vector)
// retrieval in the Ask / global tutor. The `embedding` field is indexed by an
// Atlas Vector Search index (see docs/VECTOR_SEARCH_SETUP.md). `userId` is stored
// so the vector index can filter results to the requesting user.

import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
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
    title: { type: String, default: "" }, // doc title snapshot, for citations
    section: { type: String, default: "" },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] }, // 768-dim (text-embedding-004)
  },
  { timestamps: true }
);

documentChunkSchema.index({ userId: 1, documentId: 1 });

export const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);
