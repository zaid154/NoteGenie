import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownContent from "../components/MarkdownContent.jsx";
import { api, apiError } from "../api/client.js";
import { Alert, Badge, Spinner, EmptyState, PageShellSkeleton } from "../components/ui.jsx";
import Flashcards from "../components/Flashcards.jsx";
import TutorChat from "../components/TutorChat.jsx";
import TagInput from "../components/TagInput.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconArrowLeft,
  IconDownload,
  IconTrash,
  IconSparkles,
  IconDoc,
  IconCards,
  IconChat,
  IconShare,
} from "../components/icons.jsx";

const tabs = [
  { id: "notes", label: "Notes", icon: IconDoc },
  { id: "flashcards", label: "Flashcards", icon: IconCards },
  { id: "tutor", label: "Tutor", icon: IconChat },
];

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("notes");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);
  const [makingQuiz, setMakingQuiz] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [studyMode, setStudyMode] = useState(searchParams.get("study") === "due");
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState([]);
  const [folders, setFolders] = useState([]);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setDoc(null);
    setError("");
    setTab("notes");

    async function load() {
      try {
        const [docRes, foldersRes] = await Promise.all([
          api.get(`/documents/${id}`),
          api.get("/documents/folders/list").catch(() => ({ data: { folders: [] } })),
        ]);
        if (!ignore) {
          const data = docRes.data.document;
          setDoc(data);
          setFolder(data.folder || "");
          setTags(data.tags || []);
          setShareEnabled(Boolean(data.shareEnabled));
          setShareUrl(data.shareToken ? `${window.location.origin}/share/${data.shareToken}` : "");
          setFolders(foldersRes.data.folders || []);
          if (searchParams.get("study") === "due") {
            setTab("flashcards");
            setStudyMode(true);
          }
        }
      } catch (err) {
        if (!ignore) setError(apiError(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [id]);

  async function generateQuiz() {
    setMakingQuiz(true);
    setError("");
    try {
      const { data } = await api.post(`/quiz/document/${id}`, { difficulty, count: questionCount });
      navigate(`/quiz/${data.quiz._id}`);
    } catch (err) {
      setError(apiError(err));
      setMakingQuiz(false);
    }
  }

  function exportAnki() {
    const rows = doc.flashcards.map((c) => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}"`);
    const csv = "front,back\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-anki.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>${doc.title}</title></head><body><h1>${doc.title}</h1><pre>${doc.notes.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close();
    w.print();
  }

  function exportNotes() {
    const blob = new Blob([doc.notes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveMeta(updates) {
    if (!doc) return;
    try {
      const { data } = await api.patch(`/documents/${id}/meta`, updates);
      setDoc(data.document);
      setTags(data.document.tags || []);
      setFolder(data.document.folder || "");
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function saveFolder() {
    await saveMeta({ folder });
  }

  async function saveTags(nextTags) {
    setTags(nextTags);
    await saveMeta({ tags: nextTags });
  }

  async function toggleShare() {
    setSharing(true);
    try {
      const { data } = await api.post(`/documents/${id}/share`, { enabled: !shareEnabled });
      setShareEnabled(data.shareEnabled);
      const fullUrl = data.shareUrl ? `${window.location.origin}${data.shareUrl}` : "";
      setShareUrl(fullUrl);
      if (data.shareEnabled) {
        toast("Share link enabled", "success");
      } else {
        toast("Share link disabled", "success");
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSharing(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast("Link copied to clipboard", "success");
    } catch {
      toast("Could not copy link", "error");
    }
  }

  async function handleRegenerate() {
    const ok = await confirm({
      title: "Regenerate content?",
      message: "This replaces the current notes and flashcards with freshly generated ones.",
      confirmText: "Regenerate",
    });
    if (!ok) return;
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
    return <PageShellSkeleton />;
  }

  if (error && !doc) {
    return (
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Link to="/app" className="btn-outline">
          <IconArrowLeft /> Library
        </Link>
      </div>
    );
  }

  const dueOnly = searchParams.get("study") === "due";
  const now = new Date();
  const displayCards = dueOnly
    ? (doc?.flashcards || []).filter((c) => !c.nextReviewAt || new Date(c.nextReviewAt) <= now)
    : doc?.flashcards || [];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <IconArrowLeft width={16} height={16} /> Back to library
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={doc.sourceType === "pdf" ? "brand" : "amber"}>
            {doc.sourceType === "pdf" ? "PDF" : "Link"}
          </Badge>
          <span className="truncate text-xs text-muted">{doc.sourceName}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">{doc.title}</h1>
        {doc.summary && (
          <MarkdownContent className="text-muted">{doc.summary}</MarkdownContent>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            className="input max-w-[200px] py-1.5 text-sm"
            placeholder="Folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            onBlur={saveFolder}
            list="folder-suggestions"
          />
          <datalist id="folder-suggestions">
            {folders.map((f) => <option key={f} value={f} />)}
          </datalist>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleShare}
              className={`btn-outline text-sm ${shareEnabled ? "border-indigo-300 text-indigo-600" : ""}`}
              disabled={sharing}
            >
              {sharing ? <Spinner size={16} /> : <IconShare width={16} height={16} />}
              {shareEnabled ? "Sharing on" : "Share"}
            </button>
            {shareEnabled && shareUrl && (
              <button type="button" onClick={copyShareLink} className="btn-outline text-sm">
                Copy link
              </button>
            )}
            <button onClick={handleRegenerate} className="btn-outline text-sm" disabled={regenerating}>
              {regenerating ? <Spinner size={16} /> : <IconSparkles width={16} height={16} />}
              Regenerate
            </button>
            <button onClick={exportNotes} className="btn-outline text-sm" title="Markdown">
              <IconDownload width={16} height={16} /> MD
            </button>
            <button onClick={exportPdf} className="btn-outline text-sm">PDF</button>
            <button onClick={exportAnki} className="btn-outline text-sm">Anki</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-outline text-sm text-red-600 hover:border-red-300"
            >
              {deleting ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
            </button>
          </div>
        </div>
        <div className="pt-2">
          <p className="label mb-2">Tags</p>
          <TagInput tags={tags} onChange={saveTags} />
        </div>
      </header>

      <div className="panel p-5">
        <p className="text-sm font-semibold text-ink">Generate quiz</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Difficulty</label>
            <div className="flex gap-2">
              {["easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition ${
                    difficulty === d
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      : "border-line text-muted hover:border-slate-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Questions: {questionCount}</label>
            <input
              type="range"
              min={3}
              max={25}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="mt-2 flex gap-2">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`rounded-md border px-2 py-0.5 text-xs ${
                    questionCount === n ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "border-line text-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={generateQuiz} className="btn-primary mt-4" disabled={makingQuiz}>
          {makingQuiz ? <><Spinner /> Generating...</> : <><IconSparkles width={16} height={16} /> Start quiz</>}
        </button>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      </div>

      <div className="sticky top-0 z-10 -mx-1 flex gap-6 border-b border-line bg-surface/95 px-1 backdrop-blur-sm">
        {tabs.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`relative flex items-center gap-2 pb-3 pt-1 text-sm font-medium transition ${
              tab === tid ? "text-indigo-600 dark:text-indigo-400" : "text-muted hover:text-ink"
            }`}
          >
            {tab === tid && (
              <motion.span
                layoutId="docTab"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-indigo-600"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon width={16} height={16} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {tab === "notes" && (
            doc.notes?.trim() ? (
              <div className="panel w-full p-6 lg:p-8">
                <MarkdownContent>{doc.notes}</MarkdownContent>
              </div>
            ) : (
              <EmptyState
                icon={IconDoc}
                title="No notes yet"
                subtitle="Try regenerating content from your source material."
                action={
                  <button type="button" className="btn-primary" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating ? <Spinner /> : "Regenerate"}
                  </button>
                }
              />
            )
          )}
          {tab === "flashcards" && (
            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 lg:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <IconCards width={20} height={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {displayCards.length} flashcard{displayCards.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {studyMode ? "Spaced repetition review" : "Tap any card to flip"}
                    </p>
                  </div>
                </div>
                <div className="flashcard-mode-toggle">
                  <button
                    type="button"
                    className={`flashcard-mode-btn ${!studyMode ? "flashcard-mode-btn-active" : "hover:text-ink"}`}
                    onClick={() => setStudyMode(false)}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={`flashcard-mode-btn ${studyMode ? "flashcard-mode-btn-active" : "hover:text-ink"}`}
                    onClick={() => setStudyMode(true)}
                  >
                    Review
                  </button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                {dueOnly && (
                  <div className="mb-4">
                    <Alert type="info">
                      Reviewing {displayCards.length} due card{displayCards.length !== 1 ? "s" : ""} only.
                    </Alert>
                  </div>
                )}
                <Flashcards cards={displayCards} documentId={doc._id} studyMode={studyMode} />
              </div>
            </div>
          )}
          {tab === "tutor" && (
            <div className="panel p-4 lg:p-6">
              <TutorChat documentId={doc._id} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
