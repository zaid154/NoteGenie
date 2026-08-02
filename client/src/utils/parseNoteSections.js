// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Notes parsing helper. Markdown notes come from Document API, this splits headings into sections/slugs for TOC, mind map, and section UI.

export function slugifyHeading(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function parseNoteSections(notes = "") {
  let text = String(notes || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!text) return [];

  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match Markdown Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);

    // Match Bold Header Lines: e.g. **1. Overview** or **Key Concepts:**
    const boldHeaderMatch = !headingMatch && trimmed.match(/^\*\*(?:(?:\d+[.)]\s*)|(?:Section\s+\d+:?\s*))?(.+?)\*\*:?$/i);

    // Match Colon Header Lines: e.g. "Technical Skills:", "Education & Qualifications:"
    const colonHeaderMatch = !headingMatch && !boldHeaderMatch && trimmed.match(/^([A-Z][A-Za-z0-9\s&/\\-]{2,45}):$/);

    // Match Numbered Major Headings: e.g. "1. Introduction" or "Section 1: Core Principles"
    const numberedMatch = !headingMatch && !boldHeaderMatch && !colonHeaderMatch && trimmed.match(/^(?:Section\s+\d+:?\s*|\d+\.\s+)([A-Z][^:.!?]{2,60})$/);

    // Match Uppercase Titles: e.g. "WORK EXPERIENCE", "PROJECT PORTFOLIO"
    const upperMatch = !headingMatch && !boldHeaderMatch && !colonHeaderMatch && !numberedMatch && trimmed.match(/^([A-Z\s&/\\-]{4,45})$/);

    if (headingMatch || boldHeaderMatch || colonHeaderMatch || numberedMatch || upperMatch) {
      let rawTitle = headingMatch
        ? headingMatch[2]
        : boldHeaderMatch
          ? boldHeaderMatch[1]
          : colonHeaderMatch
            ? colonHeaderMatch[1]
            : numberedMatch
              ? numberedMatch[1]
              : upperMatch[1];

      let cleanTitle = rawTitle
        ? rawTitle.replace(/[*`_#><|]/g, "").replace(/[:-]{2,}/g, "").replace(/\\r|\\n|\r|\n/g, " ").trim()
        : "";

      // Skip markdown table rows or dividers
      if (cleanTitle && !cleanTitle.includes("---") && cleanTitle.length >= 2) {
        if (current && current.body.trim()) {
          sections.push(current);
        }
        current = { title: cleanTitle, body: "" };
        continue;
      }
    }

    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }

  if (current && current.body.trim()) {
    sections.push(current);
  }

  // Fallback: If no headings were detected, split into paragraph blocks
  if (sections.length === 0) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
    paragraphs.forEach((p, idx) => {
      const pLines = p.trim().split("\n");
      const firstLine = pLines[0].replace(/[*`_#>|]/g, "").replace(/\\r|\\n|\r|\n/g, " ").trim();
      const title = firstLine.length > 40 ? `${firstLine.slice(0, 38)}…` : firstLine || `Topic ${idx + 1}`;
      sections.push({
        title,
        body: p.trim(),
        slug: slugifyHeading(title),
      });
    });
  }

  return sections.map((s) => ({
    title: s.title,
    body: s.body.trim(),
    slug: slugifyHeading(s.title),
  }));
}

