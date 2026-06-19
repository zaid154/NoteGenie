import { renderToStaticMarkup } from "react-dom/server";
import MarkdownContent from "../components/MarkdownContent.jsx";

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #0f172a;
    line-height: 1.65;
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    line-height: 1.25;
  }
  .summary {
    color: #64748b;
    font-size: 0.95rem;
    margin: 0 0 1.75rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .prose-notes h1, .prose-notes h2, .prose-notes h3 {
    font-weight: 600;
    color: #0f172a;
    margin: 1.5rem 0 0.5rem;
    line-height: 1.3;
    page-break-after: avoid;
  }
  .prose-notes h1 { font-size: 1.5rem; }
  .prose-notes h2 { font-size: 1.25rem; }
  .prose-notes h3 { font-size: 1.1rem; }
  .prose-notes p {
    margin: 0.75rem 0;
    white-space: normal;
  }
  .prose-notes ul, .prose-notes ol {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }
  .prose-notes li {
    margin: 0.35rem 0;
    white-space: normal;
  }
  .prose-notes li > p { margin: 0.25rem 0; }
  .prose-notes strong { font-weight: 600; }
  .prose-notes em { font-style: italic; }
  .prose-notes code {
    background: #f1f5f9;
    padding: 0.1em 0.35em;
    border-radius: 4px;
    font-family: Consolas, monospace;
    font-size: 0.9em;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .prose-notes pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .prose-notes pre code { background: none; padding: 0; }
  .prose-notes blockquote {
    border-left: 4px solid #c7d2fe;
    margin: 1rem 0;
    padding-left: 1rem;
    color: #64748b;
    font-style: italic;
  }
  .prose-notes hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1.5rem 0;
  }
  .prose-notes table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-size: 0.92rem;
  }
  .prose-notes th, .prose-notes td {
    border: 1px solid #e2e8f0;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }
  .prose-notes th { background: #f8fafc; font-weight: 600; }
  @page { margin: 1.5cm; }
  @media print {
    body { padding: 0; max-width: none; }
  }
`;

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildNotesPrintHtml({ title, summary, notes }) {
  const notesHtml = renderToStaticMarkup(<MarkdownContent>{notes || ""}</MarkdownContent>);
  const summaryBlock = summary?.trim()
    ? `<p class="summary">${escapeHtml(summary)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${summaryBlock}
  ${notesHtml}
</body>
</html>`;
}

export function printNotesPdf({ title, summary, notes }) {
  const html = buildNotesPrintHtml({ title, summary, notes });
  const win = window.open("", "_blank");
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
  };
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* popup may have been closed */
    }
  }, 400);

  return true;
}
