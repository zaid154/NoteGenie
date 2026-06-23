// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Global tutor uses this to build context from many documents. Documents come from MongoDB query, notes/source text are trimmed into a safe prompt size, then titles/context go to Gemini tutor stream.

// Lexical cross-document retrieval helpers. Document *selection* uses MongoDB's text
// index (in the controller); these pure helpers assemble the selected docs into a
// bounded context string and are unit-tested.

/** Join the selected documents into a single bounded context for the tutor prompt. */
export function assembleGlobalContext(docs = [], { perDocChars = 3500, totalChars = 12000 } = {}) {
  const parts = [];
  let used = 0;
  for (const d of docs) {
    if (used >= totalChars) break;
    const body = String(d?.sourceText || d?.notes || "").trim().slice(0, perDocChars);
    if (!body) continue;
    const block = `### ${d?.title || "Untitled"}\n${body}`;
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n---\n\n");
}

/** Titles of the documents used, for "cite your sources" prompting. */
export function sourceTitles(docs = []) {
  return docs.map((d) => d?.title || "Untitled").filter(Boolean);
}

