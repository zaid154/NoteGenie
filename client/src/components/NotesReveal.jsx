// FLOW: Wraps the notes markdown. On a freshly generated document it reveals the
// notes progressively (line by line, ~1.4s) for a "streaming" feel, then renders
// the full notes. Respects prefers-reduced-motion and can be skipped by clicking.
// Otherwise it just renders MarkdownContent normally.

import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent.jsx";

const REVEAL_MS = 1400;

function reducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export default function NotesReveal({ notes, fresh, onComplete }) {
  const lines = useMemo(() => String(notes || "").split("\n"), [notes]);
  const animate = fresh && !reducedMotion() && lines.length > 4;
  const [shown, setShown] = useState(animate ? 0 : lines.length);
  const doneRef = useRef(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }

  useEffect(() => {
    if (!animate) {
      setShown(lines.length);
      return undefined;
    }
    setShown(0);
    const total = lines.length;
    const steps = Math.min(total, 50);
    const perStep = Math.ceil(total / steps);
    const interval = Math.max(20, Math.floor(REVEAL_MS / steps));
    let i = 0;
    const id = setInterval(() => {
      i += perStep;
      if (i >= total) {
        setShown(total);
        clearInterval(id);
        finish();
      } else {
        setShown(i);
      }
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, animate]);

  const revealing = shown < lines.length;
  const text = revealing ? lines.slice(0, shown).join("\n") : notes;

  function skip() {
    setShown(lines.length);
    finish();
  }

  return (
    <div className={revealing ? "cursor-pointer" : ""} onClick={revealing ? skip : undefined}>
      <MarkdownContent>{text}</MarkdownContent>
      {revealing && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block h-3.5 w-[3px] animate-pulse rounded-sm bg-accent-500" />
          Revealing your notes… <span className="underline">click to skip</span>
        </p>
      )}
    </div>
  );
}
