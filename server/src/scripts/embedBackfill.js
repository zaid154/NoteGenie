// FLOW: One-off / repeatable backfill. Embeds every existing document's notes into
// DocumentChunk so semantic Ask/tutor works for materials created before RAG.
// Run: npm run embed:backfill  (from server/ or project root)

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Document } from "../models/Document.js";
import { indexDocument } from "../services/rag.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await connectDB();
  const docs = await Document.find({ notes: { $exists: true, $ne: "" } })
    .select("_id userId title notes")
    .lean();

  console.log(`[backfill] ${docs.length} documents to embed`);
  let ok = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      const n = await indexDocument(doc);
      ok += 1;
      console.log(`[backfill] ${doc.title || doc._id}: ${n} chunks`);
    } catch (err) {
      failed += 1;
      console.warn(`[backfill] FAILED ${doc.title || doc._id}:`, err.message?.slice(0, 120));
    }
    await sleep(250); // stay under Gemini rate limits
  }

  console.log(`[backfill] done — ${ok} ok, ${failed} failed`);
  await mongoose.connection.close();
  process.exit(failed && !ok ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exit(1);
});
