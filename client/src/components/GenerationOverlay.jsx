import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "./ui.jsx";
import { IconSparkles } from "./icons.jsx";

const STUDY_TIPS = [
  "Active recall beats re-reading — quiz yourself after notes load.",
  "Spaced repetition works best with small batches of cards.",
  "Break large topics into sections — your notes are structured that way.",
  "Teaching a concept out loud helps lock it in memory.",
  "Review flashcards within 24 hours for the biggest retention boost.",
];

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function GenerationOverlay({
  open,
  phase = "notes",
  title,
  subtitle,
  tips = STUDY_TIPS,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      setTipIndex(0);
      return;
    }
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    const tipTimer = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 4500);
    return () => {
      clearInterval(tick);
      clearInterval(tipTimer);
    };
  }, [open, tips.length]);

  if (!open) return null;

  const phaseLabel =
    phase === "uploading"
      ? "Uploading file…"
      : phase === "extracting"
        ? "Reading your material…"
        : phase === "cards"
          ? "Building flashcards…"
          : "Creating your notes…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-soft"
      >
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <motion.span
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <IconSparkles width={24} height={24} />
            </motion.span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink">{title || phaseLabel}</p>
            <p className="mt-1 text-sm text-muted">{subtitle || "This usually takes 10–30 seconds."}</p>
            <p className="mt-2 text-xs tabular-nums text-muted">{formatElapsed(elapsed)} elapsed</p>
          </div>
          <Spinner size={20} />
        </div>

        <div className="progress-bar mt-5 h-2">
          <div className="progress-bar-indeterminate" />
        </div>

        <div className="mt-4 flex gap-1.5">
          {["uploading", "extracting", "notes", "cards"].map((p) => {
            const order = { uploading: 0, extracting: 1, notes: 2, cards: 3 };
            const active = order[phase] >= order[p];
            return (
              <span
                key={p}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  active ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-5 rounded-lg border border-line bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-muted dark:bg-slate-900/40"
          >
            <span className="font-medium text-ink">Tip: </span>
            {tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function GenerationBanner({ message, loading = true }) {
  if (!loading) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40"
    >
      <Spinner size={16} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
          {message || "Building flashcards from your notes…"}
        </p>
        <div className="progress-bar mt-2 h-1">
          <div className="progress-bar-indeterminate" />
        </div>
      </div>
    </motion.div>
  );
}
