import { useMemo } from "react";
import { useSpeech } from "../hooks/useSpeech.js";
import { markdownToPlainText } from "../utils/textClean.js";
import { IconHeadphones, IconPlay, IconPause, IconStop } from "./icons.jsx";

const RATES = [0.75, 1, 1.25, 1.5];

/**
 * Compact "Listen" transport bar. Reads `text` (markdown is flattened to prose) aloud
 * via the browser's speech engine. Renders nothing if the API is unavailable.
 */
export default function AudioPlayer({ text, label = "Listen", className = "" }) {
  const { supported, speaking, paused, progress, rate, setRate, play, pause, resume, stop } =
    useSpeech();

  const spoken = useMemo(() => markdownToPlainText(text), [text]);

  if (!supported) return null;

  const onPrimary = () => {
    if (!speaking) play(spoken);
    else if (paused) resume();
    else pause();
  };

  const hasText = spoken.length > 0;
  const pct = Math.round((progress || 0) * 100);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas/40 px-3 py-2 ${className}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <IconHeadphones width={15} height={15} /> {label}
      </span>

      <button
        type="button"
        onClick={onPrimary}
        disabled={!hasText}
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        aria-label={!speaking ? "Play audio" : paused ? "Resume audio" : "Pause audio"}
      >
        {!speaking || paused ? <IconPlay width={14} height={14} /> : <IconPause width={14} height={14} />}
        {!speaking ? "Play" : paused ? "Resume" : "Pause"}
      </button>

      {speaking && (
        <button
          type="button"
          onClick={stop}
          className="btn-outline px-2.5 py-1.5 text-xs"
          aria-label="Stop audio"
        >
          <IconStop width={14} height={14} /> Stop
        </button>
      )}

      <label className="ml-auto flex items-center gap-1 text-xs text-muted">
        <span className="sr-only">Playback speed</span>
        <select
          className="input w-auto py-1 text-xs"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          aria-label="Playback speed"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>

      {speaking && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
