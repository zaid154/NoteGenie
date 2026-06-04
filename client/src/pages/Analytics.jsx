import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, EmptyState, PageLoader, Badge } from "../components/ui.jsx";
import { IconChart, IconPlus } from "../components/icons.jsx";

function Stat({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-700 text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/quiz/analytics/overview");
        setData(res.data);
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink">Analytics</h1>
        <p className="mt-1 text-muted">Track your progress and quiz performance.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total attempts" value={data.totalAttempts} />
        <Stat label="Average score" value={`${data.avgScore}%`} hint="Across all quizzes" />
        <Stat
          label="Performance"
          value={data.avgScore >= 75 ? "Strong" : data.avgScore >= 50 ? "Okay" : "Needs work"}
        />
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-600 text-ink">Recent attempts</h2>
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
            {data.recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-500 text-ink">{a.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(a.date).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted">
                    {a.score}/{a.total}
                  </span>
                  <Badge color={a.percent >= 60 ? "green" : "amber"}>{a.percent}%</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
