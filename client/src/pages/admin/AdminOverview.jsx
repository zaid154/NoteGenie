// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminOverview). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

// AdminOverview: admin ka pehla page. Poore platform ke numbers + recent activity.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Alert, PageLoader, PageHeader, EmptyState } from "../../components/ui.jsx";
import AdminStatCard, { formatCost } from "../../components/AdminStatCard.jsx";
import { StaggerContainer, StaggerItem } from "../../components/motion.jsx";
import {
  IconUsers,
  IconDoc,
  IconCards,
  IconChart,
  IconActivity,
  IconCoins,
} from "../../components/icons.jsx";

export default function AdminOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
      <PageHeader title="Dashboard" subtitle="Platform stats and recent activity." />

      <StaggerContainer className="space-y-8">
        <StaggerItem>
          <section>
            <h2 className="mb-3 font-display text-lg font-600 text-ink">Platform</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard icon={IconUsers} label="Users" value={data.users} accent="brand" />
              <AdminStatCard icon={IconDoc} label="Materials" value={data.documents} accent="brand" />
              <AdminStatCard icon={IconCards} label="Quizzes" value={data.quizzes} accent="amber" />
              <AdminStatCard icon={IconChart} label="Quiz attempts" value={data.attempts} accent="amber" />
            </div>
          </section>
        </StaggerItem>

        <StaggerItem>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-600 text-ink">AI usage</h2>
              {isAdmin && (
                <Link to="/admin/usage" className="text-sm font-500 text-stone-700 hover:underline">
                  View details →
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                sub="approximate USD"
                accent="green"
              />
            </div>
          </section>
        </StaggerItem>

        {data.supportEmail && (
          <StaggerItem>
            <section className="card-solid p-4">
              <p className="text-xs font-semibold uppercase text-muted">Support email</p>
              <p className="mt-1 text-sm text-ink">
                <a href={`mailto:${data.supportEmail}`} className="font-medium text-accent-600 underline dark:text-accent-400">
                  {data.supportEmail}
                </a>
              </p>
              <p className="mt-1 text-xs text-muted">From <code>SUPPORT_EMAIL</code> in <code>.env</code> — admin only.</p>
            </section>
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent materials</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {data.recentDocs.length === 0 ? (
                  <EmptyState
                    compact
                    icon={IconDoc}
                    title="No materials yet"
                    subtitle="Uploads from users will show here."
                  />
                ) : (
                  data.recentDocs.map((d) => (
                    <Link key={d.id} to={`/document/${d.id}`} className="block p-4 hover:bg-ink/[0.02]">
                      <p className="font-500 text-ink">{d.title}</p>
                      <p className="text-xs text-muted">
                        {d.user?.email || "—"} · {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
            <div>
              <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent quiz attempts</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {data.recentAttempts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={IconChart}
                    title="No attempts yet"
                    subtitle="Quiz activity will show here."
                  />
                ) : (
                  data.recentAttempts.map((a) => (
                    <div key={a.id} className="flex justify-between p-4 hover:bg-ink/[0.02]">
                      <div>
                        <p className="font-500 text-ink">{a.documentTitle}</p>
                        <p className="text-xs text-muted">{a.user?.email}</p>
                      </div>
                      <span className="text-sm font-600 text-stone-700">
                        {a.score}/{a.total}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

