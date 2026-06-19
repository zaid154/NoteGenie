import { useState } from "react";

const MAX_TAGS = 10;
const MAX_LEN = 32;

export default function TagInput({ tags = [], onChange, disabled = false, placeholder = "Add tag and press Enter" }) {
  const [input, setInput] = useState("");

  function addTag(raw) {
    const tag = raw.trim().slice(0, MAX_LEN);
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    onChange([...tags, tag]);
    setInput("");
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="chip inline-flex items-center gap-1">
            {tag}
            {!disabled && (
              <button type="button" className="text-muted hover:text-ink" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && tags.length < MAX_TAGS && (
        <input
          className="input py-1.5 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          onBlur={() => addTag(input)}
          placeholder={placeholder}
        />
      )}
      <p className="text-xs text-muted">{tags.length}/{MAX_TAGS} tags</p>
    </div>
  );
}
