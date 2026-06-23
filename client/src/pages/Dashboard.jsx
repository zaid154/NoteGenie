// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Dashboard). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import OnboardingWizard from "../components/OnboardingWizard.jsx";
import {
  EmptyState,
  Alert,
  Badge,
  StatSkeleton,
  MaterialCardSkeleton,
  UsageMeter,
  StatCard,
} from "../components/ui.jsx";
import { StaggerContainer, StaggerItem, MotionDiv } from "../components/motion.jsx";
import {
  IconPlus,
  IconDoc,
  IconLink,
  IconCards,
  IconChart,
  IconUpload,
  IconCheck,
  IconActivity,
  IconLayers,
  IconChevronRight,
  IconCalendar,
  IconTrash,
  IconFlame,
} from "../components/icons.jsx";

function MaterialCard({ doc, onDelete, deleting }) {
  const date = new Date(doc.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const isPdf = doc.sourceType === "pdf";

  return (
    <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <div className="material-card group relative flex h-full flex-col">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(doc._id)}
            disabled={deleting}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-line bg-white/90 text-muted opacity-0 shadow-sm transition hover:border-red-300 hover:text-red-600 group-hover:opacity-100 dark:bg-slate-900/90"
            aria-label="Delete material"
            title="Delete content"
          >
            {deleting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconTrash width={15} height={15} />}
          </button>
        )}
        <Link to={`/document/${doc._id}`} className="block flex-1">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
              isPdf
                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                : "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
            }`}
          >
            {isPdf ? <IconDoc width={18} height={18} /> : <IconLink width={18} height={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge color={isPdf ? "red" : "blue"}>{isPdf ? "PDF" : "Link"}</Badge>
              {doc.folder && <Badge color="gray">{doc.folder}</Badge>}
              {doc.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} color="gray">{tag}</Badge>
              ))}
            </div>
            <h3 className="mt-2 line-clamp-2 font-semibold leading-snug text-ink group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {doc.title}
            </h3>
            {doc.summary && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{doc.summary}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <IconCalendar width={13} height={13} />
            {date}
          </span>
          {doc.flashcardCount != null && (
            <span className="flex items-center gap-1">
              <IconCards width={14} height={14} />
              {doc.flashcardCount} cards
            </span>
          )}
        </div>
        <span className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/50 dark:text-indigo-300 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
          Open material
          <IconChevronRight width={14} height={14} />
        </span>
        </Link>
      </div>
    </MotionDiv>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({ totalAttempts: 0, avgScore: 0, recent: [] });
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [folders, setFolders] = useState([]);
  const [dueCount, setDueCount] = useState(0);
  const [dueItems, setDueItems] = useState([]);
  const [usage, setUsage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDeleteDoc(docId) {
    const ok = await confirm({
      title: "Delete this material?",
      message: "Notes, flashcards, quizzes, and tutor chat for this item will be permanently removed.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(docId);
    try {
      await api.delete(`/documents/${docId}`);
      setDocs((prev) => prev.filter((d) => d._id !== docId));
      toast("Content deleted", "success");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    async function loadDocs() {
      setLoadingDocs(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
        if (folderFilter) params.set("folder", folderFilter);
        const qs = params.toString();
        const [docsRes, foldersRes] = await Promise.all([
          api.get(`/documents${qs ? `?${qs}` : ""}`),
          api.get("/documents/folders/list").catch(() => ({ data: { folders: [] } })),
        ]);
        if (ignore) return;
        setDocs(docsRes.data.documents);
        setFolders(foldersRes.data.folders || []);
      } catch (err) {
        if (!ignore) setError(apiError(err));
      } finally {
        if (!ignore) setLoadingDocs(false);
      }
    }

    loadDocs();
    return () => { ignore = true; };
  }, [debouncedSearch, folderFilter]);

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const [statsRes, dueRes, usageRes] = await Promise.all([
          api.get("/quiz/analytics/overview"),
          api.get("/documents/review/due").catch(() => ({ data: { count: 0, due: [] } })),
          api.get("/billing/usage").catch(() => ({ data: null })),
        ]);
        if (ignore) return;
        setStats(statsRes.data);
        setDueCount(dueRes.data.count || 0);
        setDueItems(dueRes.data.due?.slice(0, 5) || []);
        setUsage(usageRes.data?.usage);
      } catch {
        if (!ignore) {
          setStats({ totalAttempts: 0, avgScore: 0, recent: [] });
          setDueCount(0);
          setDueItems([]);
        }
      } finally {
        if (!ignore) setLoadingStats(false);
      }
    }
    loadStats();
    return () => { ignore = true; };
  }, []);

  const allTags = [...new Set(docs.flatMap((d) => d.tags || []))].sort();

  const filtered = docs.filter((doc) => {
    const matchType = filterType === "all" || doc.sourceType === filterType;
    const matchTag = !tagFilter || (doc.tags || []).includes(tagFilter);
    return matchType && matchTag;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const activity = stats.activity || [];
  const activityMax = Math.max(...activity.map((d) => d.count || 0), 1);
  const goal = stats.dailyGoal || { done: 0, target: 20 };
  const goalPct = Math.min(100, Math.round(((goal.done || 0) / (goal.target || 20)) * 100));
  const showStreak = !loadingStats && ((stats.streak?.current ?? 0) > 0 || activity.some((d) => d.count > 0));
  const heatCell = (c) => {
    if (!c) return "bg-slate-100 dark:bg-slate-800/70";
    const r = c / activityMax;
    if (r > 0.66) return "bg-indigo-600 dark:bg-indigo-500";
    if (r > 0.33) return "bg-indigo-400 dark:bg-indigo-700";
    return "bg-indigo-200 dark:bg-indigo-900/70";
  };

  const statItems = [
    { label: "Materials", numericValue: docs.length, icon: IconDoc, color: "indigo" },
    { label: "Quizzes taken", numericValue: stats.totalAttempts, icon: IconCheck, color: "violet" },
    {
      label: "Avg. score",
      value: stats.totalAttempts ? `${stats.avgScore}%` : "—",
      numericValue: stats.totalAttempts ? stats.avgScore : undefined,
      suffix: stats.totalAttempts ? "%" : undefined,
      icon: IconActivity,
      color: "emerald",
    },
    {
      label: "Cards due",
      value: dueCount ? String(dueCount) : "—",
      numericValue: dueCount || undefined,
      icon: IconLayers,
      color: "amber",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {!user?.onboardingComplete && <OnboardingWizard />}

      <StaggerContainer className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <StaggerItem>
            <p className="text-sm text-muted">{greeting}, {firstName}</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Your library</h1>
              {showStreak && (stats.streak?.current ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                  title="Daily study streak"
                >
                  <IconFlame width={15} height={15} /> {stats.streak.current}
                </span>
              )}
            </div>
          </StaggerItem>
          <StaggerItem>
            <Link to="/upload" className="btn-primary">
              <IconPlus width={16} height={16} /> Add material
            </Link>
          </StaggerItem>
        </div>

        {loadingStats ? (
          <StatSkeleton count={4} />
        ) : (
          <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statItems.map((item) => (
              <StaggerItem key={item.label}>
                <StatCard {...item} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </StaggerContainer>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {loadingDocs ? "Loading…" : `${filtered.length} material${filtered.length !== 1 ? "s" : ""}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  className="input w-44 py-2 text-sm"
                  placeholder="Search materials…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="input w-auto py-2 text-sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>
              </div>
            </div>

            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
                <button
                  type="button"
                  onClick={() => setFolderFilter("")}
                  className={folderFilter === "" ? "chip-active" : "chip"}
                >
                  All folders
                </button>
                {folders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFolderFilter(f)}
                    className={folderFilter === f ? "chip-active" : "chip"}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
                <button
                  type="button"
                  onClick={() => setTagFilter("")}
                  className={tagFilter === "" ? "chip-active" : "chip"}
                >
                  All tags
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagFilter(t)}
                    className={tagFilter === t ? "chip-active" : "chip"}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4">
              {loadingDocs ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <MaterialCardSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                docs.length === 0 ? (
                  <EmptyState
                    icon={IconDoc}
                    title="Nothing here yet"
                    subtitle="Upload a PDF or paste a link. Notes, flashcards, and quizzes are generated automatically."
                    action={
                      <Link to="/upload" className="btn-primary">
                        <IconPlus width={16} height={16} /> Upload your first source
                      </Link>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={IconDoc}
                    title="No matches"
                    subtitle="Try clearing your search or filters."
                    action={
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => { setSearch(""); setFolderFilter(""); setTagFilter(""); setFilterType("all"); }}
                      >
                        Clear filters
                      </button>
                    }
                  />
                )
              ) : (
                <StaggerContainer className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((doc) => (
                    <StaggerItem key={doc._id}>
                      <MaterialCard
                        doc={doc}
                        onDelete={handleDeleteDoc}
                        deleting={deletingId === doc._id}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </div>
          </div>
        </div>

        <StaggerContainer className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          {showStreak && (
            <StaggerItem>
              <div className="rail-card">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <IconFlame width={16} height={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      {stats.streak?.current ?? 0} day streak
                    </p>
                    <p className="text-xs text-muted">
                      Longest {stats.streak?.longest ?? 0} • {goal.done ?? 0}/{goal.target ?? 20} today
                    </p>
                  </div>
                </div>
                <div className="progress-bar mt-3" aria-label={`Daily goal ${goalPct}%`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {activity.slice(-21).map((d) => (
                    <span
                      key={d.day}
                      title={`${d.day}: ${d.count || 0} ${(d.count || 0) === 1 ? "session" : "sessions"}`}
                      className={`h-3.5 w-3.5 rounded-[3px] ${heatCell(d.count)}`}
                    />
                  ))}
                </div>
              </div>
            </StaggerItem>
          )}

          {dueCount > 0 && (
            <StaggerItem>
              <div className="rail-card">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <IconCards width={16} height={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Review queue</p>
                    <p className="text-xs text-muted">{dueCount} card{dueCount !== 1 ? "s" : ""} due</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {dueItems.map((item, i) => (
                    <StaggerItem key={item.cardId}>
                      <Link
                        to={`/document/${item.documentId}?study=due`}
                        className="group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium text-ink">{item.front}</p>
                          <p className="line-clamp-1 text-xs text-muted">{item.documentTitle}</p>
                        </div>
                        <motion.span whileHover={{ x: 2 }} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100">
                          <IconChevronRight width={14} height={14} />
                        </motion.span>
                      </Link>
                    </StaggerItem>
                  ))}
                </ul>
                {dueItems[0] && (
                  <Link to="/review" className="btn-primary mt-3 w-full py-2 text-xs">
                    Start review
                  </Link>
                )}
              </div>
            </StaggerItem>
          )}

          <StaggerItem>
            <div className="rail-card">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="font-semibold text-ink">Recent quizzes</p>
                <Link to="/analytics" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                  View all
                </Link>
              </div>
              {loadingStats ? (
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-10 w-full" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ) : stats.recent?.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    compact
                    icon={IconChart}
                    title="No quizzes yet"
                    subtitle="Take a quiz from any material."
                    action={
                      <Link to="/app" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Browse library
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {stats.recent.slice(0, 4).map((a) => (
                    <li key={a.id}>
                      <Link
                        to={a.documentId ? `/document/${a.documentId}` : "/analytics"}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-medium text-ink">{a.title}</p>
                        <p className="text-xs text-muted">
                          {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        a.percent >= 60
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                      }`}>
                        {a.percent}%
                      </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </StaggerItem>

          {usage?.limits?.documents != null && (
            <StaggerItem>
              <div className="rail-card">
                <p className="font-semibold text-ink">Monthly usage</p>
                <div className="mt-3 space-y-3">
                  <UsageMeter label="Uploads" used={usage.used.documents} limit={usage.limits.documents} />
                  {user?.plan === "free" && (
                    <Link to="/pricing" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                      Upgrade for more →
                    </Link>
                  )}
                </div>
              </div>
            </StaggerItem>
          )}

          <StaggerItem>
            <div className="rail-card">
              <p className="mb-3 font-semibold text-ink">Quick actions</p>
              <div className="grid gap-2">
                <Link to="/upload" className="btn-outline w-full justify-start text-sm">
                  <IconUpload width={16} height={16} /> Upload material
                </Link>
                <Link to="/analytics" className="btn-outline w-full justify-start text-sm">
                  <IconChart width={16} height={16} /> View analytics
                </Link>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </div>
  );
}

