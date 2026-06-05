import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, PageLoader } from "../../components/ui.jsx";
import AdminStatCard, { formatCost } from "../../components/AdminStatCard.jsx";
import {
  IconUsers,
  IconDoc,
  IconCards,
  IconChart,
  IconActivity,
  IconCoins,
} from "../../components/icons.jsx";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard icon={IconUsers} label="Users" value={data.users} accent="brand" />
        <AdminStatCard icon={IconDoc} label="Materials" value={data.documents} accent="brand" />
        <AdminStatCard icon={IconCards} label="Quizzes" value={data.quizzes} accent="amber" />
        <AdminStatCard icon={IconChart} label="Quiz attempts" value={data.attempts} accent="amber" />
        <AdminStatCard
          icon={IconActivity}
          label="AI calls"
          value={(data.aiCalls || 0).toLocaleString()}
          accent="green"
        />
        <AdminStatCard
          icon={IconCoins}
          label="Est. AI cost"
          value={formatCost(data.aiCost || 0)}
          sub="approximate"
          accent="green"
        />
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

      <p className="text-sm text-muted">
        Full API breakdown →{" "}
        <Link to="/admin/usage" className="font-500 text-brand-600 hover:underline">
          Usage page
        </Link>
      </p>
    </div>
  );
}
