// Analytics page: user ki quiz performance aur recent attempts dikhata hai.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import {
  Alert,
  EmptyState,
  PageLoader,
  Badge,
  PageHeader,
  Stats,
  SectionTitle,
} from "../components/ui.jsx";
import { IconChart, IconPlus } from "../components/icons.jsx";

export default function Analytics() {
  const [data, setData] = useState(null);   // backend se aaya analytics data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Page khulte hi backend se analytics mangwao.
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

  if (loading) return <PageLoader />;
  if (!data) return <Alert>{error || "Could not load analytics."}</Alert>;

  const performance =
    data.avgScore >= 75 ? "Strong" : data.avgScore >= 50 ? "Okay" : "Needs work";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Performance"
        title="Your"
        accent="analytics."
        subtitle="A snapshot of every quiz you've taken and how your scores are trending."
      />

      {error && <Alert>{error}</Alert>}

      <Stats
        cols={3}
        items={[
          { label: "Total attempts", value: data.totalAttempts },
          { label: "Average score", value: `${data.avgScore}%`, hint: "Across all quizzes" },
          { label: "Performance", value: performance },
        ]}
      />

      <div>
        <SectionTitle>Recent attempts</SectionTitle>
        {data.recent.length === 0 ? (
          <EmptyState
            icon={IconChart}
            title="No quiz attempts yet"
            subtitle="Open a material and take a quiz — your progress will show up here."
            action={
              <Link to="/upload" className="btn-primary">
                <IconPlus /> Add material
              </Link>
            }
          />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {data.recent.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-ink/[0.02]"
              >
                <span className="w-6 shrink-0 font-display text-sm font-600 text-muted/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-500 text-ink">{a.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(a.date).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm tabular-nums text-muted">
                  {a.score}/{a.total}
                </span>
                <Badge color={a.percent >= 60 ? "green" : "amber"}>{a.percent}%</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
