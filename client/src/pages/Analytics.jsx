// FLOW: Client source file (Analytics.jsx).
// Handcrafted senior-designer analytics dashboard tracking study activity, quiz performance, streak, and recent attempts.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, apiError } from "../api/client.js";
import { Alert, ErrorState, StatSkeleton, Badge } from "../components/ui.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import {
  IconChart,
  IconPlus,
  IconCheck,
  IconActivity,
  IconDoc,
  IconCards,
  IconChat,
  IconFlame,
  IconSparkles,
  IconArrowRight,
} from "../components/icons.jsx";
import { isValidObjectId } from "../utils/objectId.js";
import { useAiEnabled } from "../lib/useStorefront.js";

function localDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildScoreTrend(recent, scoreTrend) {
  if (scoreTrend?.length) {
    return scoreTrend.map((d) => ({ day: d.day, v: d.avg, date: d.date }));
  }
  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      dateKey: localDateKey(d),
      scores: [],
    });
  }
  (recent || []).forEach((a) => {
    const key = localDateKey(a.date);
    const bucket = buckets.find((b) => b.dateKey === key);
    if (bucket) bucket.scores.push(a.percent);
  });
  return buckets.map(({ day, dateKey, scores }) => ({
    day,
    date: dateKey,
    v: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0,
  }));
}

export default function Analytics() {
  const aiEnabled = useAiEnabled();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/quiz/analytics/overview");
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const study = data?.study;
  const hasAttempts = (data?.totalAttempts ?? 0) > 0;

  const performanceBadge = !data || !hasAttempts
    ? { label: "Not Started", color: "gray" }
    : data.avgScore >= 75
      ? { label: "Strong Mastery", color: "green" }
      : data.avgScore >= 50
        ? { label: "Moderate Progress", color: "amber" }
        : { label: "Needs Practice", color: "rose" };

  const chartData = useMemo(
    () => buildScoreTrend(data?.recent, data?.scoreTrend),
    [data]
  );

  const hasChartActivity = chartData.some((d) => d.v > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Learning Analytics
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track your study streak, quiz accuracy trends, and flashcard mastery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {study?.dueFlashcards > 0 && (
            <Link to="/review" className="btn-outline text-xs font-semibold px-4 py-2">
              <IconCards width={15} height={15} /> Review {study.dueFlashcards} due cards
            </Link>
          )}
          {aiEnabled && (
            <Link to="/upload" className="btn-primary text-xs font-semibold px-4 py-2">
              <IconPlus width={15} height={15} /> Add material
            </Link>
          )}
        </div>
      </div>

      {error && !loading && !data ? (
        <ErrorState message={error} onRetry={load} retrying={loading} />
      ) : (
        <>
          {error && <Alert>{error}</Alert>}

          <StaggerContainer className="space-y-8">
            {/* 4 Handcrafted KPI Cards Grid */}
            <StaggerItem>
              {loading ? (
                <StatSkeleton count={4} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: Materials */}
                  <div className="panel p-5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Library</span>
                      <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <IconDoc width={18} height={18} />
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-ink">{study?.materials ?? 0}</p>
                      <p className="text-xs text-muted mt-0.5">Study materials active</p>
                    </div>
                    <Link to="/app" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 pt-1">
                      Open library <IconArrowRight width={12} height={12} />
                    </Link>
                  </div>

                  {/* Card 2: Flashcards */}
                  <div className="panel p-5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Flashcards</span>
                      <span className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                        <IconCards width={18} height={18} />
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-ink">{study?.flashcards ?? 0}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {study?.dueFlashcards ? `${study.dueFlashcards} due for review` : "Cards generated"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((study?.flashcards ?? 0) / 50) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 3: Quiz Score */}
                  <div className="panel p-5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Quiz Accuracy</span>
                      <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <IconActivity width={18} height={18} />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-2xl font-bold text-ink">
                          {hasAttempts ? `${data.avgScore}%` : "—"}
                        </p>
                        <Badge color={performanceBadge.color}>{performanceBadge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {hasAttempts ? `${data.totalAttempts} total attempts` : "No quizzes taken"}
                      </p>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${data?.avgScore ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 4: Streak & Reps */}
                  <div className="panel p-5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Study Streak</span>
                      <span className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                        <IconFlame width={18} height={18} />
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <p className="font-display text-2xl font-bold text-ink">
                          {data?.streak?.current ?? 0} <span className="text-sm font-normal text-muted">days</span>
                        </p>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        Longest: {data?.streak?.longest ?? 0} days streak
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                      <span>Daily goal: {data?.dailyGoal?.done ?? 0}/{data?.dailyGoal?.target ?? 20}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {Math.round(((data?.dailyGoal?.done ?? 0) / (data?.dailyGoal?.target ?? 20)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </StaggerItem>

            {/* Performance Trend & Heatmap 2-Column Grid */}
            {!loading && data && (
              <StaggerItem>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left Column: 7-Day Quiz Trend Bar Chart */}
                  <div className="panel p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h2 className="font-semibold text-ink">7-Day Quiz Performance</h2>
                        <p className="text-xs text-muted">Average accuracy per day</p>
                      </div>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {data.avgScore}% avg
                      </span>
                    </div>

                    {!hasChartActivity ? (
                      <div className="py-12 text-center space-y-2">
                        <IconChart width={32} height={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                        <p className="text-sm text-muted">No quiz attempts in the last 7 days</p>
                      </div>
                    ) : (
                      <div className="pt-4 space-y-3">
                        <div className="flex h-40 items-end gap-3 px-2">
                          {chartData.map((d, idx) => (
                            <div key={idx} className="group relative flex flex-1 flex-col items-center gap-2 h-full justify-end">
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-xs pointer-events-none z-10">
                                {d.v}%
                              </div>
                              {/* Bar */}
                              <div
                                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 group-hover:brightness-110"
                                style={{ height: `${Math.max(d.v, 8)}%` }}
                              />
                              {/* Axis Label */}
                              <span className="text-[11px] font-medium text-muted">{d.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: 30-Day Activity Heatmap Grid */}
                  <div className="panel p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <h2 className="font-semibold text-ink">30-Day Study Activity</h2>
                        <p className="text-xs text-muted">Daily review sessions &amp; reps</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <IconFlame width={14} height={14} /> {data?.streak?.current ?? 0} Day Streak
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="grid grid-cols-10 gap-2">
                        {(data.activity || []).slice(-30).map((d, i) => {
                          const count = d.count || 0;
                          const bg = count === 0
                            ? "bg-slate-100 dark:bg-slate-800"
                            : count < 5
                              ? "bg-emerald-200 dark:bg-emerald-900/60"
                              : count < 15
                                ? "bg-emerald-400 dark:bg-emerald-700"
                                : "bg-emerald-600 dark:bg-emerald-500";
                          return (
                            <div
                              key={i}
                              title={`${d.day}: ${count} study reps`}
                              className={`h-7 rounded-lg ${bg} transition-transform hover:scale-110 shadow-2xs`}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
                        <span>Less active</span>
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 rounded bg-slate-100 dark:bg-slate-800" />
                          <span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-900/60" />
                          <span className="h-3 w-3 rounded bg-emerald-400 dark:bg-emerald-700" />
                          <span className="h-3 w-3 rounded bg-emerald-600 dark:bg-emerald-500" />
                        </div>
                        <span>More active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )}

            {/* Recent Quiz Attempts Table */}
            <StaggerItem>
              <div className="panel overflow-hidden">
                <div className="border-b border-line p-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-ink">Recent Quiz Attempts</h2>
                    <p className="text-xs text-muted">History of scores and completed quizzes</p>
                  </div>
                  {hasAttempts && (
                    <Badge color="green">{data.totalAttempts} total attempts</Badge>
                  )}
                </div>

                {loading ? (
                  <div className="divide-y divide-line p-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-4 py-3">
                        <div className="skeleton h-4 w-6" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !data || data.recent?.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <IconChart width={36} height={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-semibold text-ink">No quiz attempts yet</p>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      Open any study material from your library, generate a quiz, and submit your answers to see metrics here.
                    </p>
                    <Link to="/app" className="btn-primary text-xs inline-flex px-4 py-2">
                      Open Library
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {data.recent.map((a, i) => (
                      <Link
                        key={a.id || i}
                        to={
                          isValidObjectId(a.quizId)
                            ? `/quiz/${a.quizId}`
                            : isValidObjectId(a.documentId)
                              ? `/document/${a.documentId}`
                              : "/app"
                        }
                        className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 text-xs font-bold text-muted w-6">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                            <p className="text-xs text-muted">{new Date(a.date).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs font-semibold tabular-nums text-muted">
                            {a.score} / {a.total}
                          </span>
                          <Badge color={a.percent >= 75 ? "green" : a.percent >= 50 ? "amber" : "gray"}>
                            {a.percent}%
                          </Badge>
                          <IconArrowRight width={14} height={14} className="text-muted" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>
          </StaggerContainer>
        </>
      )}
    </div>
  );
}
