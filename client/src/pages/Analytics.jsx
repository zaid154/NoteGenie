import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import {
  Alert,
  EmptyState,
  StatSkeleton,
  Badge,
  PageHeader,
  Stats,
  SectionTitle,
  ProgressRing,
  MiniBarChart,
  StatCard,
} from "../components/ui.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import {
  IconChart,
  IconPlus,
  IconCheck,
  IconActivity,
  IconDoc,
  IconCards,
  IconChat,
} from "../components/icons.jsx";

function buildScoreTrend(recent, scoreTrend) {
  if (scoreTrend?.length) {
    return scoreTrend.map((d) => ({ day: d.day, v: d.avg }));
  }
  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      dateKey: d.toDateString(),
      scores: [],
    });
  }
  (recent || []).forEach((a) => {
    const key = new Date(a.date).toDateString();
    const bucket = buckets.find((b) => b.dateKey === key);
    if (bucket) bucket.scores.push(a.percent);
  });
  return buckets.map(({ day, scores }) => ({
    day,
    v: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0,
  }));
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await api.get("/quiz/analytics/overview");
        if (!ignore) setData(res.data);
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
  }, []);

  const study = data?.study;
  const hasAttempts = (data?.totalAttempts ?? 0) > 0;

  const performance = !data
    ? "—"
    : !hasAttempts
      ? "Not started"
      : data.avgScore >= 75
        ? "Strong"
        : data.avgScore >= 50
          ? "Okay"
          : "Needs work";

  const chartData = useMemo(
    () => buildScoreTrend(data?.recent, data?.scoreTrend),
    [data]
  );

  const hasChartActivity = chartData.some((d) => d.v > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <PageHeader
        title="Your analytics"
        subtitle="Study activity, quiz scores, and recent attempts."
        action={
          <Link to="/upload" className="btn-outline text-sm">
            <IconPlus width={16} height={16} /> Add material
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}

      <StaggerContainer className="space-y-8">
        <StaggerItem>
          {loading ? (
            <StatSkeleton count={4} />
          ) : (
            <>
              <Stats
                cols={4}
                items={[
                  {
                    label: "Materials",
                    value: study?.materials ?? 0,
                    icon: IconDoc,
                    color: "indigo",
                  },
                  {
                    label: "Flashcards",
                    value: study?.flashcards ?? 0,
                    hint: study?.dueFlashcards ? `${study.dueFlashcards} due now` : undefined,
                    icon: IconCards,
                    color: "violet",
                  },
                  {
                    label: "Quizzes taken",
                    value: data.totalAttempts,
                    hint: study?.quizzesGenerated
                      ? `${study.quizzesGenerated} generated`
                      : undefined,
                    icon: IconCheck,
                    color: "emerald",
                  },
                  {
                    label: "Tutor messages",
                    value: study?.tutorMessagesThisMonth ?? 0,
                    hint: "This month",
                    icon: IconChat,
                    color: "amber",
                  },
                ]}
              />
              {hasAttempts && (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <StatCard
                    icon={IconCheck}
                    label="Total attempts"
                    value={data.totalAttempts}
                    color="indigo"
                  />
                  <StatCard
                    icon={IconActivity}
                    label="Average score"
                    value={`${data.avgScore}%`}
                    hint="Across all quizzes"
                    color="emerald"
                  />
                  <StatCard icon={IconChart} label="Performance" value={performance} color="violet" />
                </div>
              )}
            </>
          )}
        </StaggerItem>

        {!loading && data && hasAttempts && (
          <StaggerItem>
            <div className="grid gap-4 lg:grid-cols-2">
              <ProgressRing
                value={data.avgScore}
                max={100}
                label="Average score"
                sublabel="Across all attempts"
              />
              <MiniBarChart
                data={chartData}
                label="Daily average score (last 7 days)"
                empty={!hasChartActivity}
              />
            </div>
          </StaggerItem>
        )}

        {!loading && data && !hasAttempts && (
          <StaggerItem>
            <Alert type="info">
              Quiz scores appear here after you <strong>generate a quiz</strong> from a material and{" "}
              <strong>submit</strong> it. Your materials and flashcards are tracked above.
            </Alert>
          </StaggerItem>
        )}

        <StaggerItem>
          <SectionTitle>Recent quiz attempts</SectionTitle>
          {loading ? (
            <div className="panel divide-y divide-line">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4 px-5 py-4">
                  <div className="skeleton h-4 w-6" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.recent.length === 0 ? (
            <EmptyState
              icon={IconChart}
              title="No quiz attempts yet"
              subtitle={
                study?.materials
                  ? "Open a material → Generate quiz → Answer all questions → Submit. Then scores show here."
                  : "Upload a PDF or link first, then take a quiz from that material."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {study?.materials ? (
                    <Link to="/app" className="btn-primary">
                      Open library
                    </Link>
                  ) : (
                    <Link to="/upload" className="btn-primary">
                      <IconPlus /> Add material
                    </Link>
                  )}
                  {study?.dueFlashcards > 0 && (
                    <Link to="/review" className="btn-outline">
                      Review {study.dueFlashcards} due cards
                    </Link>
                  )}
                </div>
              }
            />
          ) : (
            <div className="panel divide-y divide-line">
              {data.recent.map((a, i) => (
                <Link
                  key={a.id}
                  to={a.quizId ? `/quiz/${a.quizId}` : a.documentId ? `/document/${a.documentId}` : "/app"}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="w-6 shrink-0 text-sm font-semibold text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{a.title}</p>
                    <p className="text-xs text-muted">{new Date(a.date).toLocaleString()}</p>
                  </div>
                  <span className="text-sm tabular-nums text-muted">
                    {a.score}/{a.total}
                  </span>
                  <Badge color={a.percent >= 75 ? "green" : a.percent >= 50 ? "amber" : "gray"}>
                    {a.percent}%
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
