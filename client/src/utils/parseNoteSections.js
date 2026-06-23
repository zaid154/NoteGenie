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
  const text = String(notes || "");
  if (!text.trim()) return [];

  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({
    title: s.title,
    body: s.body.trim(),
    slug: slugifyHeading(s.title),
  }));
}

