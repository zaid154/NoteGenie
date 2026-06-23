// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Review). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, EmptyState, PageLoader } from "../components/ui.jsx";
import { CardSlide } from "../components/motion.jsx";
import {
  FlashcardProgress,
  FlashcardStudyCard,
  FlashcardSessionComplete,
} from "../components/FlashcardUI.jsx";
import { IconCards, IconArrowLeft, IconHeadphones } from "../components/icons.jsx";
import { useSpeech } from "../hooks/useSpeech.js";

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);
  const [done, setDone] = useState(false);
  const [listen, setListen] = useState(false);
  const speech = useSpeech();

  const activeCard = queue[index];

  // Hands-free: read the card front aloud, and the back once it's revealed.
  useEffect(() => {
    if (!listen || done || !activeCard) return;
    speech.play(revealed ? activeCard.back : activeCard.front);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen, activeCard?.cardId, revealed, done]);

  function toggleListen() {
    setListen((on) => {
      if (on) speech.stop();
      return !on;
    });
  }

  async function loadDue() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/documents/review/due");
      setQueue(data.due || []);
      setIndex(0);
      setRevealed(false);
      setDone(!(data.due?.length));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDue();
  }, []);

  async function rate(quality) {
    const card = queue[index];
    if (!card) return;
    setRating(true);
    try {
      await api.post(`/documents/${card.documentId}/flashcards/${card.cardId}/rate`, { quality });
      const next = queue.filter((_, i) => i !== index);
      setQueue(next);
      setRevealed(false);
      if (next.length === 0) {
        setDone(true);
      } else {
        setIndex((i) => Math.min(i, next.length - 1));
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRating(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <IconArrowLeft width={16} height={16} /> Back to library
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Review queue</h1>
          <p className="mt-1 text-sm text-muted">Due flashcards across all your materials.</p>
        </div>
        {speech.supported && !done && queue.length > 0 && (
          <button
            type="button"
            onClick={toggleListen}
            aria-pressed={listen}
            className={`btn-outline text-sm ${listen ? "border-indigo-300 text-indigo-600 dark:text-indigo-400" : ""}`}
          >
            <IconHeadphones width={16} height={16} />
            {listen ? "Hands-free on" : "Hands-free"}
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {done ? (
        <EmptyState
          icon={IconCards}
          title="All caught up!"
          subtitle="No flashcards are due right now. Check back later or add new material."
          action={
            <Link to="/app" className="btn-primary">Back to library</Link>
          }
        />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={IconCards}
          title="Nothing due"
          subtitle="Generate flashcards from your materials to start spaced repetition."
          action={
            <Link to="/upload" className="btn-primary">Add material</Link>
          }
        />
      ) : (
        <div className="panel overflow-hidden p-6 lg:p-8">
          <FlashcardProgress
            current={index + 1}
            total={queue.length}
            loading={rating}
            label={`${index + 1} of ${queue.length} due`}
          />
          <div className="mt-6">
            <CardSlide cardKey={`${queue[index].cardId}-${index}`} direction={1}>
              <FlashcardStudyCard
                front={queue[index].front}
                back={queue[index].back}
                subtitle={queue[index].documentTitle}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                onRate={rate}
                rating={rating}
              />
            </CardSlide>
          </div>
        </div>
      )}
    </div>
  );
}

