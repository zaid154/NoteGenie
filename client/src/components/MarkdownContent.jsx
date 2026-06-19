import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownContent({ children = "", compact = false, className = "" }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  if (!text.trim()) return null;

  const proseClass = compact ? "prose-notes prose-notes-compact" : "prose-notes";

  return (
    <div className={`${proseClass} max-w-none ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
