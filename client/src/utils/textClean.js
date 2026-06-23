// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Display cleanup helper. Markdown/generated text comes in, inline markup is stripped/converted, and clean text goes to speech/export/plain previews.

export function stripMarkdownInline(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

/** Flatten GitHub-flavored Markdown into clean prose suitable for text-to-speech. */
export function markdownToPlainText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s*[-*+]\s+/gm, "") // bullet markers
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/^[\s|:-]*\|?[\s|:-]*$/gm, "") // table separator rows
    .replace(/\|/g, ", ") // table cell separators
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__?(.+?)__?/g, "$1") // underscores
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, ". ") // paragraph breaks → pause
    .replace(/\n/g, ". ") // line breaks → pause
    .replace(/\.\s*\.\s*/g, ". ") // collapse doubled periods
    .replace(/\s{2,}/g, " ")
    .trim();
}

