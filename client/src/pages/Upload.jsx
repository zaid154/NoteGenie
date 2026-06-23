// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Upload). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiError, uploadDocumentStream, importLinkStream } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Spinner, Badge, UsageMeter, QuotaBlocked, StatCard } from "../components/ui.jsx";
import TagInput from "../components/TagInput.jsx";
import { isQuotaExceeded } from "../utils/quota.js";
import { OUTPUT_LANGUAGES, DEFAULT_OUTPUT_LANGUAGE } from "../config/languages.js";
import { DETAIL_LEVELS, DEFAULT_DETAIL_LEVEL, CHUNKED_PDF_BYTES } from "../config/detailLevel.js";
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
  { icon: IconDoc, label: "Structured notes", desc: "Headings, summaries, key points", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400" },
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
    a: "PDFs up to 15MB, or public web links (articles, blogs, YouTube).",
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
};

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
  const [folders, setFolders] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [avgScore, setAvgScore] = useState(null);
  const [dueCount, setDueCount] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const fileInput = useRef(null);
  const MAX_BYTES = 15 * 1024 * 1024;
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
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That PDF is larger than 15MB.");
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
        const result = await uploadDocumentStream(formData, { onPhase: handlePhase });
        documentId = result.documentId;
      } else {
        if (!url.trim()) throw new Error("Please enter a URL.");
        try {
          new URL(url.trim());
        } catch {
          throw new Error("Please enter a valid URL (include https://).");
        }
        const result = await importLinkStream(
          { url: url.trim(), folder: folder.trim(), tags, outputLanguage, detailLevel },
          { onPhase: handlePhase }
        );
        documentId = result.documentId;
      }
      navigate(`/document/${documentId}`);
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
  }

  const tabs = [
    { id: "pdf", label: "PDF upload", icon: IconUpload, hint: "Documents up to 15MB" },
    { id: "link", label: "Web link", icon: IconLink, hint: "Articles, blogs, YouTube" },
  ];

  const canSubmit = !quotaBlocked && (tab === "pdf" ? !!file : url.trim().length > 0);

  return (
    <div className="mx-auto max-w-7xl">
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <Link
            to="/app"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <IconArrowLeft width={16} height={16} /> Back to library
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Add material</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Upload a PDF or paste a link — notes and starter flashcards in one step.
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
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
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
                          ? "bg-white text-indigo-700 shadow-soft dark:bg-surface dark:text-indigo-300"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      <Icon width={16} height={16} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{id === "pdf" ? "PDF" : "Link"}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-muted">
                  {tabs.find((t) => t.id === tab)?.hint}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
                <QuotaBlocked feature="documents" usage={usage} />

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
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files[0])}
                          />

                          <span
                            className={`mx-auto grid h-14 w-14 place-items-center rounded-xl ${
                              file
                                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
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
                                {dragOver ? "Drop your PDF here" : "Drop a PDF or click to browse"}
                              </p>
                              <p className="mt-1 text-sm text-muted">Maximum 15MB · text-based PDFs work best</p>
                            </div>
                          )}
                        </motion.div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["PDF only", "Max 15MB", "Text-based preferred"].map((t) => (
                            <span key={t} className="chip text-xs">{t}</span>
                          ))}
                        </div>
                      </>
                    ) : (
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
                                className="chip hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
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
                    )}
                  </motion.div>
                </AnimatePresence>

                <button type="submit" className="btn-primary w-full py-3" disabled={loading || !canSubmit}>
                  {loading ? (
                    <>
                      <Spinner />
                      Creating your notes…
                    </>
                  ) : (
                    <>
                      <IconSparkles width={16} height={16} />
                      Generate study kit
                    </>
                  )}
                </button>
              </form>
            </div>

            {recentDocs.length > 0 && (
              <div className="panel p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">Recent uploads</p>
                  <Link to="/app" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
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
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                          doc.sourceType === "pdf"
                            ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                            : "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
                        }`}>
                          {doc.sourceType === "pdf" ? <IconDoc width={16} height={16} /> : <IconLink width={16} height={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
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
                <IconChart width={16} height={16} className="text-indigo-600" />
                <p className="text-sm font-semibold text-ink">Tips for best results</p>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                  Use clear, text-based PDFs — scanned images may work less well.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                  For links, make sure the page is publicly accessible.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
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
                    className="mt-3 inline-flex text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Upgrade for more uploads →
                  </Link>
                )}
              </div>
            )}

            <div className="rail-card">
              <div className="flex items-center gap-2">
                <IconMail width={16} height={16} className="text-indigo-600" />
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
        title="Creating your notes…"
        subtitle={
          file && file.size > CHUNKED_PDF_BYTES
            ? "Large PDF — generating section by section for full coverage."
            : "Flashcards will be ready on the next screen — read your notes while they generate."
        }
      />
    </div>
  );
}

