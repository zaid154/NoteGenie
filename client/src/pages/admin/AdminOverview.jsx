import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, PageLoader } from "../../components/ui.jsx";

function Stat({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-700 text-ink">{value}</p>
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setData(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users} />
        <Stat label="Materials" value={data.documents} />
        <Stat label="Quizzes" value={data.quizzes} />
        <Stat label="Quiz attempts" value={data.attempts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent materials</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {data.recentDocs.length === 0 ? (
              <p className="p-4 text-sm text-muted">No materials yet.</p>
            ) : (
              data.recentDocs.map((d) => (
                <div key={d.id} className="p-4">
                  <p className="font-500 text-ink">{d.title}</p>
                  <p className="text-xs text-muted">
                    {d.user?.email || "—"} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent quiz attempts</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {data.recentAttempts.length === 0 ? (
              <p className="p-4 text-sm text-muted">No attempts yet.</p>
            ) : (
              data.recentAttempts.map((a) => (
                <div key={a.id} className="flex justify-between p-4">
                  <div>
                    <p className="font-500 text-ink">{a.documentTitle}</p>
                    <p className="text-xs text-muted">{a.user?.email}</p>
                  </div>
                  <span className="text-sm font-600 text-brand-600">
                    {a.score}/{a.total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
