// FLOW: Import & AI Note Studio page (Upload.jsx).
// Supports PDF/DOCX/PPTX/Image/Audio/Video uploads, Web URL imports, and pasted text with AI conversion streaming.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiError, uploadDocumentStream, importLinkStream, importTextStream } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Spinner, Badge, UsageMeter, QuotaBlocked } from "../components/ui.jsx";
import TagInput from "../components/TagInput.jsx";
import { isQuotaExceeded } from "../utils/quota.js";
import { OUTPUT_LANGUAGES, DEFAULT_OUTPUT_LANGUAGE } from "../config/languages.js";
import { DETAIL_LEVELS, DEFAULT_DETAIL_LEVEL, CHUNKED_PDF_BYTES } from "../config/detailLevel.js";
import { ACCEPT_ATTR, isSupportedFile, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, SUPPORTED_LABEL } from "../config/uploadTypes.js";
import { sourceMeta } from "../utils/sourceMeta.jsx";
import GenerationOverlay from "../components/GenerationOverlay.jsx";
import {
  IconUpload,
  IconLink,
  IconDoc,
  IconSparkles,
  IconCards,
  IconChat,
  IconArrowLeft,
  IconGlobe,
  IconCheck,
  IconChevronRight,
  IconX,
  IconLayers,
} from "../components/icons.jsx";

const LOADING_PHASE = {
  pdf: "uploading",
  link: "extracting",
  text: "notes",
};

const MIN_TEXT_CHARS = 40;

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
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
  const [contentType, setContentType] = useState("notes");
  const [courseCode, setCourseCode] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [folders, setFolders] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);

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
    ]).then(([usageData, folderList, docs]) => {
      setUsage(usageData);
      setFolders(folderList);
      setRecentDocs(docs.slice(0, 3));
    });
  }, []);

  function pickFile(f) {
    if (!f) return;
    if (!isSupportedFile(f)) {
      setError(`Unsupported file type. Please upload ${SUPPORTED_LABEL}.`);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`File size exceeds maximum limit of ${MAX_UPLOAD_MB}MB.`);
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
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    setSectionProgress(null);
    setLoadingPhase(LOADING_PHASE[tab] || "notes");
    try {
      let documentId;
      if (tab === "pdf") {
        if (!file) throw new Error("Please select a file to upload.");
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
        if (!url.trim()) throw new Error("Please enter a valid URL.");
        try {
          new URL(url.trim());
        } catch {
          throw new Error("Please enter a valid Web or YouTube URL (including https://).");
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
          throw new Error(`Please paste at least ${MIN_TEXT_CHARS} characters of study content.`);
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

  function switchTab(id) {
    setTab(id);
    setError("");
    setFile(null);
    setUrl("");
    setPastedText("");
    setPastedTitle("");
  }

  const canSubmit =
    !quotaBlocked &&
    (tab === "pdf"
      ? !!file
      : tab === "link"
        ? url.trim().length > 0
        : pastedText.trim().length >= MIN_TEXT_CHARS);

  const tabs = [
    { id: "pdf", label: "File Upload", icon: IconUpload, hint: "PDF, Word, PPTX, MP3, MP4, PNG" },
    { id: "link", label: "Web / Video Link", icon: IconGlobe, hint: "Articles, Medium, YouTube" },
    { id: "text", label: "Paste Text", icon: IconDoc, hint: "Raw notes, lecture transcripts" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Studio Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-accent-600 dark:hover:text-accent-400"
          >
            <IconArrowLeft width={14} height={14} /> Back to Dashboard
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink lg:text-3xl">
            Import &amp; AI Studio
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Transform PDFs, slides, articles, or notes into structured study guides, flashcards, &amp; quizzes.
          </p>
        </div>

        {uploadsLeft != null && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-surface px-3 py-2 shadow-2xs dark:border-slate-800">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-400">
              <IconSparkles width={14} height={14} />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-ink">{uploadsLeft} uploads left</p>
              <p className="text-[10px] text-muted">This billing period</p>
            </div>
          </div>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      <QuotaBlocked feature="documents" usage={usage} />

      {/* Main Studio 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Primary Input Canvas (8 Cols) */}
        <div className="space-y-6 lg:col-span-8">
          <div className="panel p-5 shadow-xs">
            {/* Input Method Segmented Selector */}
            <div className="flex rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/80">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition ${
                    tab === id
                      ? "bg-surface text-ink shadow-xs border border-slate-200/60 dark:border-slate-700"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon width={16} height={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Input Canvas Container */}
            <div className="mt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "pdf" && (
                    <div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          pickFile(e.dataTransfer.files[0]);
                        }}
                        onClick={() => !loading && fileInput.current?.click()}
                        className={`relative grid min-h-[230px] cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                          dragOver
                            ? "border-accent-500 bg-accent-50/50 ring-4 ring-accent-100 dark:bg-accent-950/40 dark:ring-accent-900/40"
                            : file
                              ? "border-accent-300 bg-accent-50/30 dark:border-accent-800 dark:bg-accent-950/20"
                              : "border-slate-300/80 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-900/50"
                        }`}
                      >
                        <input
                          ref={fileInput}
                          type="file"
                          accept={ACCEPT_ATTR}
                          className="hidden"
                          onChange={(e) => pickFile(e.target.files[0])}
                        />

                        {file ? (
                          <div className="flex flex-col items-center">
                            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-600 text-white shadow-sm">
                              <IconCheck width={22} height={22} />
                            </span>
                            <p className="mt-3 font-display text-base font-bold text-ink">{file.name}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge color="brand">{formatBytes(file.size)}</Badge>
                              <Badge color="gray">Ready to process</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                              }}
                              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                            >
                              <IconX width={13} height={13} /> Remove file
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-surface text-accent-600 shadow-2xs dark:border-slate-800 dark:text-accent-400">
                              <IconUpload width={22} height={22} />
                            </span>
                            <p className="mt-3 font-display text-base font-bold text-ink">
                              {dragOver ? "Drop file to upload" : "Drag and drop your file here"}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              Supports PDF, DOCX, PPTX, Images, MP3, MP4 up to {MAX_UPLOAD_MB}MB
                            </p>
                            <span className="btn-outline mt-4 text-xs font-semibold">Browse files</span>
                          </div>
                        )}
                      </div>

                      {/* Format Badges */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {["PDF Document", "Word (.docx)", "PowerPoint (.pptx)", "Audio & Video", `Max ${MAX_UPLOAD_MB}MB`].map(
                          (lbl) => (
                            <span key={lbl} className="chip text-[11px]">
                              {lbl}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {tab === "link" && (
                    <div className="space-y-4 py-2">
                      <div>
                        <label className="label mb-1.5" htmlFor="web-url-input">
                          Web Article or YouTube Video URL
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                            <IconGlobe width={18} height={18} />
                          </span>
                          <input
                            id="web-url-input"
                            className="input pl-10 py-2.5 text-sm"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://en.wikipedia.org/wiki/Spaced_repetition"
                            disabled={loading}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted">
                          Paste any public website link, blog post, medium article, or YouTube video link.
                        </p>
                      </div>
                    </div>
                  )}

                  {tab === "text" && (
                    <div className="space-y-4 py-2">
                      <div>
                        <label className="label mb-1.5" htmlFor="paste-title-input">
                          Title / Subject (Optional)
                        </label>
                        <input
                          id="paste-title-input"
                          className="input py-2 text-sm"
                          value={pastedTitle}
                          onChange={(e) => setPastedTitle(e.target.value)}
                          placeholder="e.g. Unit 3 — Data Structures Notes"
                          disabled={loading}
                          maxLength={140}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="label" htmlFor="paste-text-input">
                            Study Content
                          </label>
                          <span className="text-[11px] font-medium text-muted">
                            {pastedText.trim().length.toLocaleString()} chars
                            {pastedText.trim().length < MIN_TEXT_CHARS ? ` (min ${MIN_TEXT_CHARS})` : ""}
                          </span>
                        </div>
                        <textarea
                          id="paste-text-input"
                          className="input min-h-[200px] resize-y py-2.5 font-mono text-sm leading-relaxed"
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          placeholder="Paste lecture notes, raw text, transcripts, or assignment questions here…"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Creation Goal & Workflow Section */}
          <div className="panel p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">1. Select Creation Mode</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { id: "notes", label: "Study Kit & Summary", desc: "Notes, flashcards & quiz deck", icon: IconCards },
                { id: "assignment", label: "Solve Assignment", desc: "Answer question papers", icon: IconDoc },
                { id: "guess", label: "Guess Paper", desc: "Predict exam questions", icon: IconSparkles },
              ].map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setContentType(id)}
                  disabled={loading}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                    contentType === id
                      ? "border-accent-500 bg-accent-50/60 ring-2 ring-accent-100 dark:border-accent-600 dark:bg-accent-950/40 dark:ring-accent-900/50"
                      : "border-slate-200/90 bg-surface hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <div>
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg ${
                        contentType === id
                          ? "bg-accent-600 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <Icon width={16} height={16} />
                    </span>
                    <p className="mt-3 font-display font-semibold text-sm text-ink">{label}</p>
                    <p className="mt-0.5 text-xs text-muted">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {contentType !== "notes" && (
              <div className="mt-4 grid gap-4 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <label className="label mb-1" htmlFor="course-code-input">
                    Course Code (Optional)
                  </label>
                  <input
                    id="course-code-input"
                    className="input py-2 text-sm uppercase"
                    placeholder="e.g. BCS-011"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {contentType === "assignment" ? (
                  <div>
                    <label className="label mb-1" htmlFor="word-limit-input">
                      Words per Answer
                    </label>
                    <input
                      id="word-limit-input"
                      type="number"
                      min="50"
                      max="2000"
                      step="50"
                      className="input py-2 text-sm"
                      placeholder="e.g. 500"
                      value={wordLimit}
                      onChange={(e) => setWordLimit(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label mb-1" htmlFor="question-count-input">
                      Question Count
                    </label>
                    <input
                      id="question-count-input"
                      type="number"
                      min="5"
                      max="30"
                      step="1"
                      className="input py-2 text-sm"
                      placeholder="e.g. 12"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center justify-between gap-4">
            <Link to="/app" className="text-xs font-semibold text-muted hover:text-ink">
              Cancel &amp; return to Library
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              className="btn-primary px-6 py-3 text-sm shadow-md"
            >
              {loading ? (
                <>
                  <Spinner /> Processing with AI…
                </>
              ) : (
                <>
                  <IconSparkles width={16} height={16} /> Convert with AI ✨
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Conversion Settings (4 Cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="panel p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">2. AI Settings</h3>

            <div>
              <label className="label mb-1" htmlFor="output-language-select">
                Output Language
              </label>
              <select
                id="output-language-select"
                className="input py-2 text-sm"
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                disabled={loading}
              >
                {OUTPUT_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1" htmlFor="detail-level-select">
                Notes Depth Level
              </label>
              <select
                id="detail-level-select"
                className="input py-2 text-sm"
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                disabled={loading}
              >
                {DETAIL_LEVELS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label mb-1">Subject Folder</label>
              <input
                className="input py-2 text-sm"
                placeholder="e.g. Computer Science"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                list="studio-folder-list"
                disabled={loading}
              />
              <datalist id="studio-folder-list">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label mb-1">Tags</label>
              <TagInput tags={tags} onChange={setTags} disabled={loading} />
            </div>
          </div>

          {/* Recent Converted Items Widget */}
          {recentDocs.length > 0 && (
            <div className="panel p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Recent Conversions</p>
                <Link to="/app" className="text-xs font-semibold text-accent-600 dark:text-accent-400">
                  View all
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentDocs.map((doc) => (
                  <li key={doc._id}>
                    <Link
                      to={`/document/${doc._id}`}
                      className="group flex items-center gap-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200/60 dark:border-slate-800 ${sourceMeta(doc.sourceType).tint}`}
                      >
                        {(() => {
                          const SrcIcon = sourceMeta(doc.sourceType).Icon;
                          return <SrcIcon width={15} height={15} />;
                        })()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink group-hover:text-accent-600 dark:group-hover:text-accent-400">
                          {doc.title}
                        </p>
                        <p className="text-[10px] text-muted">
                          {new Date(doc.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <IconChevronRight
                        width={13}
                        height={13}
                        className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Live Conversion Overlay */}
      <GenerationOverlay
        open={loading}
        phase={loadingPhase}
        sectionProgress={sectionProgress}
        title={
          contentType === "assignment"
            ? "Solving your assignment…"
            : contentType === "guess"
              ? "Building your guess paper…"
              : "Creating your AI notes & kit…"
        }
        subtitle={
          contentType === "assignment"
            ? "Answering every question in your paper — please keep this tab open."
            : contentType === "guess"
              ? "Predicting exam-likely questions with model answers — please keep this tab open."
              : file && file.size > CHUNKED_PDF_BYTES
                ? "Large file — generating section by section for complete coverage."
                : "Generating study notes, flashcards, and tutor context — almost ready."
        }
      />
    </div>
  );
}
