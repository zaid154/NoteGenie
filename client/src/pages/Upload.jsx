// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Upload). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiError, uploadDocumentStream, importLinkStream, importTextStream } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Spinner, Badge, UsageMeter, QuotaBlocked, StatCard } from "../components/ui.jsx";
import TagInput from "../components/TagInput.jsx";
import { isQuotaExceeded } from "../utils/quota.js";
import { OUTPUT_LANGUAGES, DEFAULT_OUTPUT_LANGUAGE } from "../config/languages.js";
import { DETAIL_LEVELS, DEFAULT_DETAIL_LEVEL, CHUNKED_PDF_BYTES } from "../config/detailLevel.js";
import { ACCEPT_ATTR, isSupportedFile, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, SUPPORTED_LABEL } from "../config/uploadTypes.js";
import { sourceMeta } from "../utils/sourceMeta.jsx";
import GenerationOverlay from "../components/GenerationOverlay.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import {
  IconUpload,
  IconLink,
  IconDoc,
  IconSparkles,
  IconCards,
  IconChat,
  IconChart,
  IconArrowLeft,
  IconGlobe,
  IconCheck,
  IconMail,
  IconLayers,
  IconChevronRight,
  IconActivity,
} from "../components/icons.jsx";

const OUTPUT_STEPS = [
  { icon: IconDoc, label: "Structured notes", desc: "Headings, summaries, key points", color: "bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-400" },
  { icon: IconCards, label: "Flashcards", desc: "Spaced repetition ready", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400" },
  { icon: IconChat, label: "AI tutor", desc: "Ask questions about your material", color: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400" },
];

const WORKFLOW = [
  { step: "1", label: "Add source", desc: "PDF or public link" },
  { step: "2", label: "AI generates", desc: "Detailed notes first" },
  { step: "3", label: "Study", desc: "Flashcards, quiz, tutor" },
];

const FAQ = [
  {
    q: "What file types work?",
    a: "PDF, Word (.docx), PowerPoint (.pptx), text files, images, audio, and video up to 15MB — plus public web links (articles, blogs, YouTube) and pasted text.",
  },
  {
    q: "How long does generation take?",
    a: "Usually 10–30 seconds. Keep this tab open while processing.",
  },
  {
    q: "Why did my upload fail?",
    a: "Check file size, PDF validity, or that links are publicly accessible.",
  },
];

const EXAMPLE_LINKS = [
  { label: "Wikipedia article", url: "https://en.wikipedia.org/wiki/Spaced_repetition" },
  { label: "YouTube (with captions)", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
];

const LOADING_PHASE = {
  pdf: "uploading",
  link: "extracting",
  text: "notes",
};

const MIN_TEXT_CHARS = 40;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("pdf");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("notes");
  const [sectionProgress, setSectionProgress] = useState(null);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(null);
  const [folder, setFolder] = useState("");
  const [tags, setTags] = useState([]);
  const [outputLanguage, setOutputLanguage] = useState(DEFAULT_OUTPUT_LANGUAGE);
  const [detailLevel, setDetailLevel] = useState(DEFAULT_DETAIL_LEVEL);
  // "notes" = study notes (default). "assignment" = solve an IGNOU-style question paper.
  const [contentType, setContentType] = useState("notes");
  const [courseCode, setCourseCode] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [folders, setFolders] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [avgScore, setAvgScore] = useState(null);
  const [dueCount, setDueCount] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const fileInput = useRef(null);
  const quotaBlocked = isQuotaExceeded(usage, "documents");
  const uploadsLeft =
    usage?.limits?.documents != null
      ? Math.max(0, usage.limits.documents - (usage.used?.documents ?? 0))
      : null;

  useEffect(() => {
    Promise.all([
      api.get("/billing/usage").then((r) => r.data?.usage).catch(() => null),
      api.get("/documents/folders/list").then((r) => r.data?.folders || []).catch(() => []),
      api.get("/documents").then((r) => r.data?.documents || []).catch(() => []),
      api.get("/documents/review/due").then((r) => r.data?.count || 0).catch(() => 0),
      api.get("/quiz/analytics/overview").then((r) => r.data).catch(() => null),
    ]).then(([usageData, folderList, docs, due, stats]) => {
      setUsage(usageData);
      setFolders(folderList);
      setRecentDocs(docs.slice(0, 4));
      setMaterialCount(docs.length);
      setDueCount(due);
      setAvgScore(stats?.totalAttempts ? stats.avgScore : null);
    });
  }, []);

  function pickFile(f) {
    if (!f) return;
    if (!isSupportedFile(f)) {
      setError(`Unsupported file. Upload ${SUPPORTED_LABEL}.`);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`That file is larger than ${MAX_UPLOAD_MB}MB.`);
      return;
    }
    setError("");
    setFile(f);
  }

  function handlePhase(data) {
    if (data.phase) setLoadingPhase(data.phase);
    if (data.phase === "section" && data.current && data.total) {
      setSectionProgress({ current: data.current, total: data.total, title: data.title });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSectionProgress(null);
    setLoadingPhase(LOADING_PHASE[tab] || "notes");
    try {
      let documentId;
      if (tab === "pdf") {
        if (!file) throw new Error("Please choose a PDF first.");
        const formData = new FormData();
        formData.append("file", file);
        if (folder.trim()) formData.append("folder", folder.trim());
        if (tags.length) formData.append("tags", JSON.stringify(tags));
        formData.append("outputLanguage", outputLanguage);
        formData.append("detailLevel", detailLevel);
        formData.append("contentType", contentType);
        if (courseCode.trim()) formData.append("courseCode", courseCode.trim());
        if (contentType === "assignment" && wordLimit) formData.append("wordLimit", String(wordLimit));
        if (contentType === "guess" && questionCount) formData.append("count", String(questionCount));
        const result = await uploadDocumentStream(formData, { onPhase: handlePhase });
        documentId = result.documentId;
      } else if (tab === "link") {
        if (!url.trim()) throw new Error("Please enter a URL.");
        try {
          new URL(url.trim());
        } catch {
          throw new Error("Please enter a valid URL (include https://).");
        }
        const result = await importLinkStream(
          {
            url: url.trim(),
            folder: folder.trim(),
            tags,
            outputLanguage,
            detailLevel,
            contentType,
            courseCode: courseCode.trim(),
            ...(contentType === "assignment" && wordLimit ? { wordLimit } : {}),
            ...(contentType === "guess" && questionCount ? { count: questionCount } : {}),
          },
          { onPhase: handlePhase }
        );
        documentId = result.documentId;
      } else if (tab === "text") {
        if (pastedText.trim().length < MIN_TEXT_CHARS) {
          throw new Error(`Please paste at least ${MIN_TEXT_CHARS} characters of text.`);
        }
        const result = await importTextStream(
          {
            text: pastedText.trim(),
            title: pastedTitle.trim(),
            folder: folder.trim(),
            tags,
            outputLanguage,
            detailLevel,
            contentType,
            courseCode: courseCode.trim(),
            ...(contentType === "assignment" && wordLimit ? { wordLimit } : {}),
            ...(contentType === "guess" && questionCount ? { count: questionCount } : {}),
          },
          { onPhase: handlePhase }
        );
        documentId = result.documentId;
      }
      navigate(`/document/${documentId}?fresh=1`);
    } catch (err) {
      setError(err.message || apiError(err));
      setLoading(false);
    }
  }

  function retryUpload() {
    setError("");
    handleSubmit({ preventDefault: () => {} });
  }

  function switchTab(id) {
    setTab(id);
    setError("");
    setFile(null);
    setUrl("");
    setPastedText("");
    setPastedTitle("");
  }

  const tabs = [
    // id stays "pdf" for backward-compat; this tab now accepts any supported file.
    { id: "pdf", label: "Upload file", icon: IconUpload, hint: "PDF, Word, slides, image, audio, video" },
    { id: "link", label: "Web link", icon: IconLink, hint: "Articles, blogs, YouTube" },
    { id: "text", label: "Paste text", icon: IconDoc, hint: "Notes, transcripts, any text" },
  ];

  const canSubmit =
    !quotaBlocked &&
    (tab === "pdf"
      ? !!file
      : tab === "link"
        ? url.trim().length > 0
        : pastedText.trim().length >= MIN_TEXT_CHARS);

  return (
    <div className="mx-auto max-w-7xl">
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <Link
            to="/app"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-accent-600 dark:hover:text-accent-400"
          >
            <IconArrowLeft width={16} height={16} /> Back to library
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Add material</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Upload a PDF, paste a link, or drop in your own text — notes and starter flashcards in one step.
              </p>
            </div>
            <Link to="/app" className="btn-outline text-sm">
              <IconDoc width={16} height={16} /> View library
            </Link>
          </div>
        </StaggerItem>

        <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StaggerItem>
            <StatCard
              label="Your materials"
              numericValue={materialCount}
              icon={IconDoc}
              color="indigo"
              hint="In your library"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Uploads left"
              value={uploadsLeft != null ? String(uploadsLeft) : "—"}
              numericValue={uploadsLeft ?? undefined}
              icon={IconUpload}
              color="violet"
              hint="This month"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Cards due"
              value={dueCount ? String(dueCount) : "—"}
              numericValue={dueCount || undefined}
              icon={IconLayers}
              color="amber"
              hint={dueCount ? "Ready to review" : "All caught up"}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Avg. quiz score"
              value={avgScore != null ? `${avgScore}%` : "—"}
              numericValue={avgScore ?? undefined}
              suffix={avgScore != null ? "%" : undefined}
              icon={IconActivity}
              color="emerald"
              hint={avgScore != null ? "Across all quizzes" : "Take a quiz after upload"}
            />
          </StaggerItem>
        </StaggerContainer>

        <div className="panel overflow-hidden shadow-soft">
          <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {WORKFLOW.map(({ step, label, desc }) => (
              <div key={step} className="flex items-center gap-3 px-5 py-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-50 text-sm font-bold text-accent-600 dark:bg-accent-950/60 dark:text-accent-400">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <StaggerItem className="space-y-4 lg:col-span-3">
            <div className="panel overflow-hidden shadow-soft">
              <div className="border-b border-line bg-slate-50/80 p-3 dark:bg-slate-900/40">
                <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/60">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchTab(id)}
                      className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        tab === id
                          ? "bg-white text-accent-700 shadow-soft dark:bg-surface dark:text-accent-300"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <Icon width={16} height={16} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{id === "pdf" ? "File" : id === "link" ? "Link" : "Text"}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-muted">
                  {tabs.find((t) => t.id === tab)?.hint}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
                <QuotaBlocked feature="documents" usage={usage} />

                {/* Generation mode: study notes (default), solved assignment, or guess paper. */}
                <div>
                  <span className="label">What do you want to create?</span>
                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "notes", label: "Study notes", desc: "Summary, flashcards & quiz", icon: IconCards },
                      { id: "assignment", label: "Solve assignment", desc: "Answer a question paper", icon: IconDoc },
                      { id: "guess", label: "Guess paper", desc: "Important exam questions", icon: IconSparkles },
                    ].map(({ id, label, desc, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setContentType(id)}
                        disabled={loading}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                          contentType === id
                            ? "border-accent-400 bg-accent-50 dark:border-accent-500 dark:bg-accent-950/40"
                            : "border-line hover:border-accent-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                            contentType === id
                              ? "bg-accent-100 text-accent-600 dark:bg-accent-900/60 dark:text-accent-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                          }`}
                        >
                          <Icon width={16} height={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{label}</span>
                          <span className="block text-xs text-muted">{desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {contentType !== "notes" && (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="course-code">Course code (optional)</label>
                        <input
                          id="course-code"
                          className="input py-1.5 text-sm uppercase"
                          placeholder="e.g. BCS-011"
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value)}
                          disabled={loading}
                          maxLength={40}
                        />
                      </div>
                      {contentType === "assignment" ? (
                        <div>
                          <label className="label" htmlFor="word-limit">Words per answer (optional)</label>
                          <input
                            id="word-limit"
                            type="number"
                            min="50"
                            max="2000"
                            step="50"
                            className="input py-1.5 text-sm"
                            placeholder="e.g. 500"
                            value={wordLimit}
                            onChange={(e) => setWordLimit(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="label" htmlFor="question-count">Number of questions (optional)</label>
                          <input
                            id="question-count"
                            type="number"
                            min="5"
                            max="30"
                            step="1"
                            className="input py-1.5 text-sm"
                            placeholder="e.g. 12"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(e.target.value)}
                            disabled={loading}
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted sm:col-span-2">
                        {contentType === "assignment"
                          ? "Upload your IGNOU assignment question paper (PDF / photo) or paste the questions — every question is answered exam-style."
                          : "Upload your syllabus / notes (PDF, photo or text) — AI predicts the most exam-likely questions with model answers."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="label" htmlFor="output-language">Output language</label>
                    <select
                      id="output-language"
                      className="input py-1.5 text-sm"
                      value={outputLanguage}
                      onChange={(e) => setOutputLanguage(e.target.value)}
                      disabled={loading}
                    >
                      {OUTPUT_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted">Notes, flashcards, and quizzes will be in this language.</p>
                  </div>
                  <div>
                    <label className="label" htmlFor="detail-level">Note depth</label>
                    <select
                      id="detail-level"
                      className="input py-1.5 text-sm"
                      value={detailLevel}
                      onChange={(e) => setDetailLevel(e.target.value)}
                      disabled={loading}
                    >
                      {DETAIL_LEVELS.map(({ id, label }) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted">
                      {DETAIL_LEVELS.find((d) => d.id === detailLevel)?.hint}
                    </p>
                  </div>
                  <div>
                    <label className="label">Folder (optional)</label>
                    <input
                      className="input py-1.5 text-sm"
                      placeholder="e.g. Biology"
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      list="upload-folder-list"
                      disabled={loading}
                    />
                    <datalist id="upload-folder-list">
                      {folders.map((f) => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="label">Tags (optional)</label>
                    <TagInput tags={tags} onChange={setTags} disabled={loading} />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-2"
                    >
                      <Alert>{error}</Alert>
                      <button type="button" className="btn-outline w-full" onClick={retryUpload} disabled={loading}>
                        Retry
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: tab === "pdf" ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: tab === "pdf" ? 12 : -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {tab === "pdf" ? (
                      <>
                        <motion.div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
                          onClick={() => !loading && fileInput.current?.click()}
                          className={`upload-dropzone min-h-[220px] ${dragOver ? "upload-dropzone-active" : ""} ${file ? "upload-dropzone-has-file" : ""}`}
                          animate={{ scale: dragOver ? 1.01 : 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <input
                            ref={fileInput}
                            type="file"
                            accept={ACCEPT_ATTR}
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files[0])}
                          />

                          <span
                            className={`mx-auto grid h-14 w-14 place-items-center rounded-xl ${
                              file
                                ? "bg-accent-100 text-accent-600 dark:bg-accent-950 dark:text-accent-400"
                                : "bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-400"
                            }`}
                          >
                            {file ? <IconCheck width={24} height={24} /> : <IconUpload width={24} height={24} />}
                          </span>

                          {file ? (
                            <div className="mt-5">
                              <p className="font-semibold text-ink">{file.name}</p>
                              <div className="mt-2 flex items-center justify-center gap-2">
                                <Badge color="gray">{formatBytes(file.size)}</Badge>
                                <Badge color="brand">Ready to generate</Badge>
                              </div>
                              <p className="mt-3 text-xs text-muted">Click to choose a different file</p>
                            </div>
                          ) : (
                            <div className="mt-5">
                              <p className="font-semibold text-ink">
                                {dragOver ? "Drop your file here" : "Drop a file or click to browse"}
                              </p>
                              <p className="mt-1 text-sm text-muted">PDF, Word, slides, image, audio or video · max {MAX_UPLOAD_MB}MB</p>
                            </div>
                          )}
                        </motion.div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["PDF · Word · Slides", "Image · Audio · Video", `Max ${MAX_UPLOAD_MB}MB`].map((t) => (
                            <span key={t} className="chip text-xs">{t}</span>
                          ))}
                        </div>
                      </>
                    ) : tab === "link" ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                            <IconGlobe width={18} height={18} />
                          </span>
                          <input
                            className="input pl-10"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/article or YouTube URL"
                            disabled={loading}
                          />
                        </div>
                        <p className="text-xs text-muted">
                          Paste any public article, blog post, or YouTube video link.
                        </p>
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted">Try an example</p>
                          <div className="flex flex-wrap gap-2">
                            {EXAMPLE_LINKS.map(({ label, url: exampleUrl }) => (
                              <button
                                key={label}
                                type="button"
                                className="chip hover:border-accent-300 hover:bg-accent-50 dark:hover:bg-accent-950/40"
                                onClick={() => setUrl(exampleUrl)}
                              >
                                {label}
                              </button>
                            ))}
                            {["Article", "Blog", "YouTube"].map((tag) => (
                              <span key={tag} className="chip">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="label" htmlFor="paste-title">Title (optional)</label>
                          <input
                            id="paste-title"
                            className="input py-1.5 text-sm"
                            value={pastedTitle}
                            onChange={(e) => setPastedTitle(e.target.value)}
                            placeholder="e.g. Lecture 4 — Cell Biology"
                            disabled={loading}
                            maxLength={140}
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="paste-text">Your text</label>
                          <textarea
                            id="paste-text"
                            className="input min-h-[220px] resize-y py-2 font-mono text-sm leading-relaxed"
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste lecture notes, a transcript, an article, or any study text here…"
                            disabled={loading}
                          />
                          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                            <span>Notes, flashcards &amp; quizzes are generated from this text.</span>
                            <span
                              className={
                                pastedText.trim().length > 0 && pastedText.trim().length < MIN_TEXT_CHARS
                                  ? "text-amber-600 dark:text-amber-400"
                                  : ""
                              }
                            >
                              {pastedText.trim().length.toLocaleString()} chars
                              {pastedText.trim().length < MIN_TEXT_CHARS ? ` · need ${MIN_TEXT_CHARS}+` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <button type="submit" className="btn-primary w-full py-3" disabled={loading || !canSubmit}>
                  {loading ? (
                    <>
                      <Spinner />
                      {contentType === "assignment"
                        ? "Solving your assignment…"
                        : contentType === "guess"
                          ? "Building your guess paper…"
                          : "Creating your notes…"}
                    </>
                  ) : (
                    <>
                      <IconSparkles width={16} height={16} />
                      {contentType === "assignment"
                        ? "Solve assignment"
                        : contentType === "guess"
                          ? "Generate guess paper"
                          : "Generate study kit"}
                    </>
                  )}
                </button>
              </form>
            </div>

            {recentDocs.length > 0 && (
              <div className="panel p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">Recent uploads</p>
                  <Link to="/app" className="text-xs font-medium text-accent-600 dark:text-accent-400">
                    View all
                  </Link>
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {recentDocs.map((doc) => (
                    <li key={doc._id}>
                      <Link
                        to={`/document/${doc._id}`}
                        className="group flex items-center gap-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${sourceMeta(doc.sourceType).tint}`}>
                          {(() => {
                            const SrcIcon = sourceMeta(doc.sourceType).Icon;
                            return <SrcIcon width={16} height={16} />;
                          })()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink group-hover:text-accent-600 dark:group-hover:text-accent-400">
                            {doc.title}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {doc.flashcardCount != null && ` · ${doc.flashcardCount} cards`}
                          </p>
                        </div>
                        <IconChevronRight width={14} height={14} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </StaggerItem>

          <StaggerItem className="space-y-4 lg:col-span-2">
            <div className="rail-card">
              <p className="text-sm font-semibold text-ink">What you&apos;ll get</p>
              <ul className="mt-4 space-y-3">
                {OUTPUT_STEPS.map(({ icon: Icon, label, desc, color }) => (
                  <li key={label} className="flex items-start gap-3 rounded-xl border border-line bg-surface/60 p-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}>
                      <Icon width={16} height={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rail-card">
              <p className="text-sm font-semibold text-ink">Quick actions</p>
              <div className="mt-3 grid gap-2">
                {dueCount > 0 && (
                  <Link to="/review" className="btn-primary w-full justify-start py-2.5 text-sm">
                    <IconLayers width={16} height={16} />
                    Review {dueCount} due card{dueCount !== 1 ? "s" : ""}
                  </Link>
                )}
                <Link to="/app" className="btn-outline w-full justify-start text-sm">
                  <IconDoc width={16} height={16} /> Open library
                </Link>
                <Link to="/analytics" className="btn-outline w-full justify-start text-sm">
                  <IconChart width={16} height={16} /> View analytics
                </Link>
                {user?.plan === "free" && (
                  <Link to="/pricing" className="btn-outline w-full justify-start text-sm">
                    <IconSparkles width={16} height={16} /> Upgrade plan
                  </Link>
                )}
              </div>
            </div>

            <div className="rail-card">
              <div className="flex items-center gap-2">
                <IconChart width={16} height={16} className="text-accent-600" />
                <p className="text-sm font-semibold text-ink">Tips for best results</p>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  Use clear, text-based PDFs — scanned images may work less well.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  For links, make sure the page is publicly accessible.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                  Add a folder and tags now to stay organized later.
                </li>
              </ul>
            </div>

            {usage?.limits?.documents != null && (
              <div className="rail-card">
                <p className="text-sm font-semibold text-ink">Your plan</p>
                <p className="mt-1 text-xs capitalize text-muted">{user?.plan || "free"} plan</p>
                <div className="mt-3">
                  <UsageMeter label="Uploads this month" used={usage.used.documents} limit={usage.limits.documents} />
                </div>
                {user?.plan === "free" && (
                  <Link
                    to="/pricing"
                    className="mt-3 inline-flex text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
                  >
                    Upgrade for more uploads →
                  </Link>
                )}
              </div>
            )}

            <div className="rail-card">
              <div className="flex items-center gap-2">
                <IconMail width={16} height={16} className="text-accent-600" />
                <p className="text-sm font-semibold text-ink">Help & support</p>
              </div>
              <div className="mt-3 space-y-2">
                {FAQ.map(({ q, a }, i) => (
                  <div key={q} className="rounded-lg border border-line bg-surface/40">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-medium text-ink"
                      onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    >
                      {q}
                      <span className="text-muted">{openFaq === i ? "−" : "+"}</span>
                    </button>
                    {openFaq === i && (
                      <p className="border-t border-line px-3 py-2 text-xs leading-relaxed text-muted">{a}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/billing" className="btn-outline flex-1 justify-center py-2 text-xs">
                  Billing & plans
                </Link>
                <Link to="/terms" className="btn-ghost py-2 text-xs">Terms</Link>
                <Link to="/privacy" className="btn-ghost py-2 text-xs">Privacy</Link>
              </div>
            </div>
          </StaggerItem>
        </div>
      </StaggerContainer>

      <GenerationOverlay
        open={loading}
        phase={loadingPhase}
        sectionProgress={sectionProgress}
        title={
          contentType === "assignment"
            ? "Solving your assignment…"
            : contentType === "guess"
              ? "Building your guess paper…"
              : "Creating your notes…"
        }
        subtitle={
          contentType === "assignment"
            ? "Answering every question in your paper — keep this tab open."
            : contentType === "guess"
              ? "Predicting the most exam-likely questions with model answers — keep this tab open."
              : file && file.size > CHUNKED_PDF_BYTES
                ? "Large file — generating section by section for full coverage."
                : "Flashcards will be ready on the next screen — read your notes while they generate."
        }
      />
    </div>
  );
}

