// FLOW: Tag helper. Raw tags come from upload/meta request body, this file cleans/deduplicates them, and Document stores safe tag strings.

/** Parse tags from upload body (JSON array or comma-separated). */
export function parseTags(body) {
  if (Array.isArray(body.tags)) {
    return body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
  }
  if (typeof body.tags === "string" && body.tags.trim()) {
    try {
      const parsed = JSON.parse(body.tags);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
      }
    } catch {
      return body.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    }
  }
  return [];
}
