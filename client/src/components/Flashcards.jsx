import { useState } from "react";
import { EmptyState } from "./ui.jsx";
import { IconCards } from "./icons.jsx";

// Ek flip-able flashcard. Click karne pe front/back palatta hai.
function Card({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="group h-40 w-full [perspective:1000px]"
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-4 text-center [backface-visibility:hidden]">
          <span className="mb-2 text-xs font-500 uppercase tracking-wide text-brand-600">
            Question
          </span>
          <p className="font-500 text-ink">{front}</p>
          <span className="mt-3 text-xs text-muted">Tap to flip</span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-brand-400 bg-brand-600 p-4 text-center text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="mb-2 text-xs font-500 uppercase tracking-wide text-brand-100">
            Answer
          </span>
          <p className="text-sm">{back}</p>
        </div>
      </div>
    </button>
  );
}

export default function Flashcards({ cards = [] }) {
  if (!cards.length) {
    return (
      <EmptyState
        icon={IconCards}
        title="No flashcards"
        subtitle="We couldn't generate flashcards from this material."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <Card key={i} front={c.front} back={c.back} />
      ))}
    </div>
  );
}
