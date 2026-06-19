// SM-2 spaced repetition algorithm for flashcards.
export function sm2(card, quality) {
  // quality 0-5; below 3 = failed recall
  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  return { easeFactor, interval, repetitions, nextReviewAt };
}

export function initFlashcard(card) {
  return {
    ...card,
    easeFactor: card.easeFactor ?? 2.5,
    interval: card.interval ?? 0,
    repetitions: card.repetitions ?? 0,
    nextReviewAt: card.nextReviewAt ?? new Date(),
  };
}
