// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (FlashcardUI). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Spinner } from "./ui.jsx";
import { IconCards } from "./icons.jsx";
import { stripMarkdownInline } from "../utils/textClean.js";
import { FlipCard, StaggerContainer, StaggerItem } from "./motion.jsx";

export const RATING_LEVELS = [
  { value: 1, label: "Forgot", hint: "Blank", tone: "flashcard-rating-forgot" },
  { value: 2, label: "Hard", hint: "Struggled", tone: "flashcard-rating-hard" },
  { value: 3, label: "OK", hint: "With effort", tone: "flashcard-rating-ok" },
  { value: 4, label: "Good", hint: "Minor pause", tone: "flashcard-rating-good" },
  { value: 5, label: "Easy", hint: "Instant", tone: "flashcard-rating-easy" },
];

function FlashcardFace({ kind, children, subtitle }) {
  const isQuestion = kind === "question";
  return (
    <div className={`flashcard-face ${isQuestion ? "flashcard-face-question" : "flashcard-face-answer"}`}>
      <div className="flashcard-face-accent" aria-hidden />
      <div className="relative flex min-h-[240px] flex-col p-6 sm:min-h-[260px] sm:p-8">
        {subtitle && (
          <p className="mb-3 truncate text-xs font-medium text-accent-600 dark:text-accent-400">{subtitle}</p>
        )}
        <div className="flex items-center gap-2">
          <span className={`flashcard-badge ${isQuestion ? "flashcard-badge-question" : "flashcard-badge-answer"}`}>
            {isQuestion ? "Question" : "Answer"}
          </span>
        </div>
        <p className="mt-4 flex flex-1 items-center text-lg leading-relaxed text-ink sm:text-xl">
          {children}
        </p>
        {!isQuestion && (
          <p className="mt-4 text-center text-[11px] text-muted">Rate how well you recalled this below</p>
        )}
      </div>
    </div>
  );
}

export function FlashcardProgress({ current, total, loading = false, label }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="flashcard-progress">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">
          {label || `Card ${current} of ${total}`}
        </span>
        <span className="text-muted">
          {pct}%
          {loading && <Spinner size={14} className="ml-2 inline" />}
        </span>
      </div>
      <div className="flashcard-progress-track" aria-hidden>
        <motion.div
          className="flashcard-progress-fill"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}

export function FlashcardRatingBar({ onRate, disabled }) {
  return (
    <motion.div
      className="flashcard-rating"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <p className="mb-3 text-center text-sm font-medium text-ink">How well did you know this?</p>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {RATING_LEVELS.map(({ value, label, hint, tone }) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            className={`flashcard-rating-btn ${tone}`}
            onClick={() => onRate(value)}
            title={`${value} — ${label}`}
          >
            <span className="text-base font-semibold">{value}</span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-wide sm:block">{label}</span>
            <span className="mt-0.5 text-[10px] opacity-80 sm:hidden">{hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-muted">
        Keyboard: <kbd className="kbd">1</kbd>–<kbd className="kbd">5</kbd> to rate · <kbd className="kbd">→</kbd> next
      </p>
    </motion.div>
  );
}

export function FlashcardStudyCard({
  front,
  back,
  subtitle,
  revealed,
  onReveal,
  onRate,
  onNext,
  rating,
}) {
  useEffect(() => {
    function onKey(e) {
      if (rating) return;
      if (!revealed && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        onReveal?.();
        return;
      }
      if (revealed && e.key === "ArrowRight" && onNext) {
        e.preventDefault();
        onNext();
        return;
      }
      if (revealed && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        onRate?.(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rating, onReveal, onRate, onNext]);

  const frontContent = (
    <FlashcardFace kind="question" subtitle={subtitle}>
      {stripMarkdownInline(front)}
    </FlashcardFace>
  );

  const backContent = (
    <FlashcardFace kind="answer" subtitle={subtitle}>
      {stripMarkdownInline(back)}
    </FlashcardFace>
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <button
        type="button"
        className="flashcard-flip-trigger w-full text-left"
        onClick={() => !revealed && onReveal?.()}
        disabled={revealed || rating}
        aria-label={revealed ? "Answer shown" : "Tap or press space to reveal answer"}
      >
        <FlipCard
          front={frontContent}
          back={backContent}
          flipped={revealed}
          className="flashcard-flip"
          faceClassName="flashcard-flip-face"
        />
      </button>

      {!revealed ? (
        <motion.div
          className="mt-5 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button type="button" className="btn-primary min-w-[200px] px-8" onClick={onReveal} disabled={rating}>
            Show answer
          </button>
          <p className="text-xs text-muted">Or tap the card · <kbd className="kbd">Space</kbd></p>
        </motion.div>
      ) : (
        <div className="mt-5 space-y-4">
          <FlashcardRatingBar onRate={onRate} disabled={rating} />
          {onNext && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn-outline min-w-[160px] px-6 text-sm"
                onClick={onNext}
                disabled={rating}
              >
                Next card
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GridFlipCard({ index, front, back, section, cardId, onUpdate, onDelete }) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFront, setEditFront] = useState(front);
  const [editBack, setEditBack] = useState(back);
  const [saving, setSaving] = useState(false);

  async function saveEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdate || !cardId) return;
    setSaving(true);
    try {
      await onUpdate(cardId, { front: editFront, back: editBack });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form
        className="flashcard-grid-item rounded-2xl border border-line bg-surface p-4"
        onSubmit={saveEdit}
        onClick={(e) => e.stopPropagation()}
      >
        <label className="label text-xs">Front</label>
        <input className="input mb-2 text-sm" value={editFront} onChange={(e) => setEditFront(e.target.value)} required />
        <label className="label text-xs">Back</label>
        <input className="input mb-3 text-sm" value={editBack} onChange={(e) => setEditBack(e.target.value)} required />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 py-1.5 text-xs" disabled={saving}>
            {saving ? <Spinner size={14} /> : "Save"}
          </button>
          <button type="button" className="btn-outline py-1.5 text-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const frontContent = (
    <div className="flashcard-grid-inner flashcard-grid-question">
      <span className="flashcard-grid-index">#{index + 1}</span>
      {section && (
        <p className="truncate text-[10px] font-medium text-accent-600 dark:text-accent-400">{section}</p>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-600/80 dark:text-accent-400/80">
        Question
      </p>
      <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-ink">{stripMarkdownInline(front)}</p>
      <span className="flashcard-grid-hint">Tap to flip</span>
    </div>
  );

  const backContent = (
    <div className="flashcard-grid-inner flashcard-grid-answer">
      <span className="flashcard-grid-index">#{index + 1}</span>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
        Answer
      </p>
      <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-ink">{stripMarkdownInline(back)}</p>
      <span className="flashcard-grid-hint">Tap to flip back</span>
    </div>
  );

  return (
    <div className="relative">
      {(onUpdate || onDelete) && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          {onUpdate && (
            <button
              type="button"
              className="rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-muted shadow-sm hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                setEditFront(front);
                setEditBack(back);
                setEditing(true);
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="rounded-md bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-red-600 shadow-sm hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(cardId);
              }}
            >
              Del
            </button>
          )}
        </div>
      )}
      <motion.button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="flashcard-grid-item w-full text-left"
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <FlipCard
          front={frontContent}
          back={backContent}
          flipped={revealed}
          className="flashcard-grid-flip"
          faceClassName="flashcard-grid-face"
        />
      </motion.button>
    </div>
  );
}

export function FlashcardGrid({ cards, onUpdate, onDelete }) {
  return (
    <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => (
        <StaggerItem key={c._id || i}>
          <GridFlipCard
            index={i}
            front={c.front}
            back={c.back}
            section={c.section}
            cardId={c._id}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

export function FlashcardSessionComplete({ title = "Review complete", subtitle }) {
  return (
    <div className="flashcard-complete">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950/50 dark:text-accent-400">
        <IconCards width={28} height={28} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{subtitle}</p>
    </div>
  );
}

