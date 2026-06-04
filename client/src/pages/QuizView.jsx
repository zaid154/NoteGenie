import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, Spinner, PageLoader, Badge } from "../components/ui.jsx";
import { IconCheck, IconX, IconArrowLeft, IconChart } from "../components/icons.jsx";

const DIFFICULTY_COLOR = { easy: "green", medium: "brand", hard: "amber" };

export default function QuizView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/quiz/${id}`);
        setQuiz(data.quiz);
        setAnswers(new Array(data.quiz.questions.length).fill(-1));
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function choose(qIndex, optIndex) {
    if (result) return; // submit ke baad change na ho
    setAnswers((a) => {
      const copy = [...a];
      copy[qIndex] = optIndex;
      return copy;
    });
  }

  async function submit() {
    if (answers.includes(-1)) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post(`/quiz/${id}/submit`, { answers });
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error && !quiz) return <Alert>{error}</Alert>;

  const percent = result ? Math.round((result.score / result.total) * 100) : 0;
  const answered = answers.filter((a) => a !== -1).length;
  const total = quiz.questions.length;
  const progress = total ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <IconArrowLeft width={16} height={16} /> Back
      </button>

      <div>
        <h1 className="font-display text-2xl font-700 text-ink">{quiz.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge color={DIFFICULTY_COLOR[quiz.difficulty] || "brand"}>
            {quiz.difficulty} difficulty
          </Badge>
          <Badge color="gray">{total} questions</Badge>
        </div>
      </div>

      {/* Progress bar (sirf solve karte waqt) */}
      {!result && (
        <div className="sticky top-2 z-10 card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-500 text-ink">
              {answered} of {total} answered
            </span>
            <span className="text-muted">{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="card flex flex-col items-center gap-3 p-6 text-center animate-fade-up">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full text-2xl font-700 ${
              percent >= 60
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-accent-500/15 text-accent-600"
            }`}
          >
            {percent}%
          </div>
          <p className="text-lg font-600 text-ink">
            {result.score} / {result.total} correct
          </p>
          <p className="text-sm text-muted">
            {percent >= 80
              ? "Excellent work."
              : percent >= 60
              ? "Good job — review the notes once more."
              : "Keep going. Revisit the notes and try again."}
          </p>
          <button onClick={() => navigate("/analytics")} className="btn-outline mt-2">
            <IconChart width={16} height={16} /> View analytics
          </button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {/* Questions */}
      <div className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const review = result?.review[qi];
          return (
            <div key={qi} className="card p-5 animate-fade-up">
              <p className="font-500 text-ink">
                <span className="text-brand-600">{qi + 1}.</span> {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  let style = "border-line hover:border-brand-400";
                  if (result) {
                    if (oi === review.correctIndex)
                      style = "border-emerald-500 bg-emerald-500/10";
                    else if (selected && !review.isCorrect)
                      style = "border-red-500 bg-red-500/10";
                    else style = "border-line opacity-70";
                  } else if (selected) {
                    style = "border-brand-500 bg-brand-500/10";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => choose(qi, oi)}
                      disabled={!!result}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition ${style}`}
                    >
                      <span className="text-ink">{opt}</span>
                      {result && oi === review.correctIndex && (
                        <IconCheck width={18} height={18} className="text-emerald-600" />
                      )}
                      {result && selected && !review.isCorrect && (
                        <IconX width={18} height={18} className="text-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {result && (
                <p className="mt-3 rounded-xl bg-brand-500/5 px-4 py-2.5 text-sm text-muted">
                  <span className="font-500 text-brand-600">Explanation: </span>
                  {review.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <button onClick={submit} className="btn-primary w-full" disabled={submitting}>
          {submitting ? <><Spinner /> Checking...</> : "Submit quiz"}
        </button>
      )}
    </div>
  );
}
