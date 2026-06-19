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
import { IconCards, IconArrowLeft } from "../components/icons.jsx";

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);
  const [done, setDone] = useState(false);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Review queue</h1>
        <p className="mt-1 text-sm text-muted">Due flashcards across all your materials.</p>
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
