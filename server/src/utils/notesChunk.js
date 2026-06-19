export const CHUNKED_SECTION_LIMIT = 5;
export const CHUNKED_SECTION_CONCURRENCY = 2;
export const CHUNKED_PDF_BYTES = 1_572_864; // 1.5 MB — only very large PDFs use multi-call chunked mode
export const CHUNKED_TEXT_CHARS = 30_000;

export function shouldUseChunkedNotes({ pdfBytes = 0, textLength = 0 } = {}) {
  return pdfBytes > CHUNKED_PDF_BYTES || textLength > CHUNKED_TEXT_CHARS;
}

export function mergeSectionNotes(sections) {
  const parts = (sections || [])
    .map(({ title, content }) => {
      const body = String(content || "").trim();
      if (!body) return "";
      const heading = String(title || "").trim();
      if (body.startsWith("## ")) return body;
      return heading ? `## ${heading}\n\n${body}` : body;
    })
    .filter(Boolean);
  return parts.join("\n\n");
}

export function mergeSourceExcerpts(excerpts, limit = 15000) {
  return excerpts.filter(Boolean).join("\n\n").slice(0, limit);
}

/** Run async tasks with limited concurrency; preserves result order. */
export async function mapWithConcurrency(items, concurrency, fn) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
