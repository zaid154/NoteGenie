// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (CommandPalette). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import {
  IconSearch,
  IconUpload,
  IconChat,
  IconChart,
  IconHome,
  IconCards,
  IconDoc,
} from "./icons.jsx";

const ACTIONS = [
  { id: "library", label: "Go to library", to: "/app", icon: IconHome, keywords: "home dashboard materials" },
  { id: "upload", label: "Upload material", to: "/upload", icon: IconUpload, keywords: "add pdf link new source" },
  { id: "ask", label: "Ask across all notes", to: "/ask", icon: IconChat, keywords: "tutor global question chat" },
  { id: "review", label: "Review due flashcards", to: "/review", icon: IconCards, keywords: "spaced repetition study cards" },
  { id: "analytics", label: "View analytics", to: "/analytics", icon: IconChart, keywords: "stats streak progress scores" },
];

/**
 * ⌘K / Ctrl-K command palette: fuzzy-jump to actions and search materials.
 * Opens on the hotkey or a window "open-command-palette" event (from the header button).
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setDocs([]);
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (!term) {
      setDocs([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/documents?q=${encodeURIComponent(term)}`);
        setDocs((data.documents || []).slice(0, 6));
      } catch {
        setDocs([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const term = q.trim().toLowerCase();
  const filteredActions = ACTIONS.filter(
    (a) => !term || a.label.toLowerCase().includes(term) || a.keywords.includes(term)
  );
  const items = [
    ...filteredActions.map((a) => ({ type: "action", ...a })),
    ...docs.map((d) => ({ type: "doc", id: d._id, label: d.title, to: `/document/${d._id}`, icon: IconDoc })),
  ];

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  const go = useCallback(
    (item) => {
      if (!item) return;
      setOpen(false);
      navigate(item.to);
    },
    [navigate]
  );

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <IconSearch width={18} height={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search materials or jump to…"
            className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={items.length ? `cmdk-${active}` : undefined}
            aria-autocomplete="list"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-muted sm:block">Esc</kbd>
        </div>

        <ul id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">No results</li>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li
                  id={`cmdk-${i}`}
                  key={`${item.type}-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    i === active
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      : "text-ink"
                  }`}
                >
                  <Icon width={16} height={16} className="shrink-0 text-muted" />
                  <span className="truncate">{item.label}</span>
                  {item.type === "doc" && (
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted">Material</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

