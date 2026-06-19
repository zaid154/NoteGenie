import { useState } from "react";
import { EmptyState, Spinner } from "./ui.jsx";
import { IconCards } from "./icons.jsx";
import { api } from "../api/client.js";
import { CardSlide } from "./motion.jsx";
import {
  FlashcardProgress,
  FlashcardStudyCard,
  FlashcardGrid,
  FlashcardSessionComplete,
} from "./FlashcardUI.jsx";

export default function Flashcards({ cards = [], documentId, studyMode = false, onRated }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);
  const [slideDir, setSlideDir] = useState(1);

  if (!cards.length) {
    return (
      <EmptyState
        icon={IconCards}
        title="No flashcards"
        subtitle="Flashcards could not be generated from this material."
      />
    );
  }

  async function rate(quality) {
    if (!documentId || !cards[index]?._id) return;
    setRating(true);
    try {
      await api.post(`/documents/${documentId}/flashcards/${cards[index]._id}/rate`, { quality });
      onRated?.();
      if (index >= cards.length - 1) {
        setRevealed(false);
        return;
      }
      setSlideDir(1);
      setRevealed(false);
      setIndex((i) => i + 1);
    } finally {
      setRating(false);
    }
  }

  if (studyMode) {
    const card = cards[index];
    if (!card) {
      return (
        <FlashcardSessionComplete
          title="Session complete"
          subtitle="You've reviewed every card in this set. Switch to grid view to browse them again."
        />
      );
    }
    return (
      <div className="space-y-6">
        <FlashcardProgress current={index + 1} total={cards.length} loading={rating} />
        <CardSlide cardKey={`${index}-${card._id}`} direction={slideDir}>
          <FlashcardStudyCard
            front={card.front}
            back={card.back}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onRate={rate}
            rating={rating}
          />
        </CardSlide>
      </div>
    );
  }

  return <FlashcardGrid cards={cards} />;
}
