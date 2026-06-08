// DocumentView: ek material ka page. Notes, flashcards aur AI tutor dikhata hai,
// aur yahin se quiz bhi generate hota hai.
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown"; // notes markdown ko HTML me dikhata hai
import remarkGfm from "remark-gfm";          // markdown me tables, lists, etc. support
import { api, apiError } from "../api/client.js";
import { Alert, Badge, NoteSkeleton, Spinner } from "../components/ui.jsx";
import Flashcards from "../components/Flashcards.jsx";
import TutorChat from "../components/TutorChat.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import {
  IconArrowLeft,
  IconDownload,
  IconTrash,
  IconSparkles,
  IconDoc,
  IconCards,
  IconChat,
} from "../components/icons.jsx";

// Page ke teen tabs.
const tabs = [
  { id: "notes", label: "Notes", icon: IconDoc },
  { id: "flashcards", label: "Flashcards", icon: IconCards },
  { id: "tutor", label: "AI Tutor", icon: IconChat },
];

export default function DocumentView() {
  // URL me /document/:id hai, wahi id yahan milti hai.
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);          // is document ka data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("notes");        // abhi kaunsa tab khula hai
  const [difficulty, setDifficulty] = useState("medium"); // quiz ka level
  const [questionCount, setQuestionCount] = useState(10);  // kitne sawal
  const [makingQuiz, setMakingQuiz] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm(); // "Are you sure?" popup ke liye

  // Jab bhi id badle (alag document khule) to naya data load karo.
  useEffect(() => {
    let ignore = false;
    // Naye document par stale content flash na ho.
    setLoading(true);
    setDoc(null);
    setError("");
    setTab("notes");

    async function load() {
      try {
        const { data } = await api.get(`/documents/${id}`);
        if (!ignore) setDoc(data.document);
      } catch (err) {
        if (!ignore) setError(apiError(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  // generateQuiz: chosen difficulty/count ke saath quiz banao, fir quiz page pe jao.
  async function generateQuiz() {
    setMakingQuiz(true);
    setError("");
    try {
      const { data } = await api.post(`/quiz/document/${id}`, {
        difficulty,
        count: questionCount,
      });
      navigate(`/quiz/${data.quiz._id}`);
    } catch (err) {
      setError(apiError(err));
      setMakingQuiz(false);
    }
  }

  // Notes ko markdown file ke roop me download karte hain.
  function exportNotes() {
    const blob = new Blob([doc.notes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // handleRegenerate: pehle confirm poochho, fir notes/flashcards dobara banwao.
  async function handleRegenerate() {
    const ok = await confirm({
      title: "Regenerate content?",
      message: "This replaces the current notes and flashcards with freshly generated ones.",
      confirmText: "Regenerate",
    });
    if (!ok) return; // user ne Cancel kiya
    setRegenerating(true);
    setError("");
    try {
      const { data } = await api.post(`/documents/${id}/regenerate`);
      setDoc(data.document);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRegenerating(false);
    }
  }

  // handleDelete: confirm ke baad document delete karo, fir dashboard pe jao.
  async function handleDelete() {
    if (deleting) return;
    const ok = await confirm({
      title: "Delete this material?",
      message: "Its quizzes and chat history will be removed too. This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/documents/${id}`);
      navigate("/app");
    } catch (err) {
      setError(apiError(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <NoteSkeleton />
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Link to="/app" className="btn-outline">
          <IconArrowLeft /> Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <IconArrowLeft width={16} height={16} /> Dashboard
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge color={doc.sourceType === "pdf" ? "brand" : "amber"}>
                {doc.sourceType === "pdf" ? "PDF" : "Link"}
              </Badge>
              <span className="truncate text-xs text-muted">{doc.sourceName}</span>
            </div>
            <h1 className="font-display text-2xl font-700 text-ink">{doc.title}</h1>
            <p className="mt-1 max-w-2xl text-muted">{doc.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRegenerate}
              className="btn-outline"
              disabled={regenerating}
            >
              {regenerating ? <Spinner size={16} /> : <IconSparkles width={16} height={16} />}
              Regenerate
            </button>
            <button onClick={exportNotes} className="btn-outline" title="Notes download">
              <IconDownload width={16} height={16} /> Export
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete material"
              title="Delete material"
              className="btn-outline text-red-500 hover:border-red-400 hover:text-red-600"
            >
              {deleting ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
            </button>
          </div>
        </div>

        {/* Quiz generator */}
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-center gap-2">
            <IconSparkles width={18} height={18} className="text-brand-600" />
            <span className="font-600 text-ink">Generate a quiz</span>
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {/* Difficulty */}
            <div>
              <label className="label">Difficulty</label>
              <div className="flex gap-2">
                {[
                  { id: "easy", label: "Easy", hint: "Recall facts" },
                  { id: "medium", label: "Medium", hint: "Apply concepts" },
                  { id: "hard", label: "Hard", hint: "Deep analysis" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-center transition ${
                      difficulty === d.id
                        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "border-line text-muted hover:border-brand-400 hover:text-ink"
                    }`}
                  >
                    <span className="block text-sm font-600">{d.label}</span>
                    <span className="block text-[11px] text-muted">{d.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="label">
                Number of questions: <span className="text-brand-600">{questionCount}</span>
              </label>
              <input
                type="range"
                min={3}
                max={25}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>3</span>
                <span>25</span>
              </div>
              <div className="mt-2 flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuestionCount(n)}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      questionCount === n
                        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "border-line text-muted hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generateQuiz}
            className="btn-primary mt-5 w-full sm:w-auto"
            disabled={makingQuiz}
          >
            {makingQuiz ? (
              <><Spinner /> Generating {questionCount} questions...</>
            ) : (
              <><IconSparkles /> Generate quiz ({questionCount} questions)</>
            )}
          </button>
          {makingQuiz && (
            <p className="mt-2 text-xs text-muted">
              More questions take a little longer. Please wait.
            </p>
          )}
        </div>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {tabs.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === tid
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon width={16} height={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content: jo tab chuna hai sirf wahi dikhao */}
      <div>
        {tab === "notes" && (
          <div className="card p-6 prose-notes max-w-none animate-fade-up">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.notes}</ReactMarkdown>
          </div>
        )}
        {tab === "flashcards" && (
          <div className="animate-fade-up">
            <Flashcards cards={doc.flashcards} />
          </div>
        )}
        {tab === "tutor" && (
          <div className="card animate-fade-up p-4">
            <TutorChat documentId={doc._id} />
          </div>
        )}
      </div>
    </div>
  );
}
