import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "../utils/parseNoteSections.js";

function makeHeadingComponent(Tag) {
  return function Heading({ children, ...props }) {
    const text = String(children ?? "").replace(/\n/g, " ").trim();
    const id = Tag === "h2" && text ? slugifyHeading(text) : undefined;
    return (
      <Tag id={id} className={id ? "scroll-mt-24" : undefined} {...props}>
        {children}
      </Tag>
    );
  };
}

export default function MarkdownContent({ children = "", compact = false, className = "" }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  if (!text.trim()) return null;

  const proseClass = compact ? "prose-notes prose-notes-compact" : "prose-notes";

  return (
    <div className={`${proseClass} max-w-none ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: makeHeadingComponent("h2"),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
