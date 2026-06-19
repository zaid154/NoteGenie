/** Plain text for flashcards — no markdown asterisks or backticks. */
export function stripMarkdownInline(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeFlashcard(card) {
  return {
    front: stripMarkdownInline(card.front),
    back: stripMarkdownInline(card.back),
  };
}

export function sanitizeFlashcards(cards) {
  return (cards || [])
    .map(sanitizeFlashcard)
    .filter((c) => c.front && c.back);
}
