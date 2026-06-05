import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, PageLoader } from "../../components/ui.jsx";
import AdminStatCard, { formatCost, formatTokens } from "../../components/AdminStatCard.jsx";
import { IconActivity, IconCoins, IconSparkles } from "../../components/icons.jsx";

const FEATURE_LABELS = {
  notes: "Notes",
  flashcards: "Flashcards",
  quiz: "Quiz",
  tutor: "Tutor chat",
  test: "Key test",
};

export default function AdminUsage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/usage")
      .then((r) => setData(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const { totals, byFeature, byUser, recent } = data;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Gemini API usage tracked per call. Costs are estimates based on token counts — not
        actual billing.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard
          icon={IconActivity}
          label="Total API calls"
          value={totals.calls.toLocaleString()}
          accent="brand"
        />
        <AdminStatCard
          icon={IconSparkles}
          label="Total tokens"
          value={formatTokens(totals.totalTokens)}
          sub={`${formatTokens(totals.promptTokens)} in · ${formatTokens(totals.completionTokens)} out`}
          accent="amber"
        />
        <AdminStatCard
          icon={IconCoins}
          label="Estimated cost"
          value={formatCost(totals.cost)}
          sub="approximate USD"
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-600 text-ink">By feature</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {byFeature.length === 0 ? (
              <p className="p-4 text-sm text-muted">No API calls recorded yet.</p>
            ) : (
              byFeature.map((f) => (
                <div key={f.feature} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-500 text-ink">
                      {FEATURE_LABELS[f.feature] || f.feature}
                    </p>
                    <p className="text-xs text-muted">
                      {f.calls} call{f.calls !== 1 ? "s" : ""} · {formatTokens(f.totalTokens)} tokens
                    </p>
                  </div>
                  <span className="text-sm font-600 text-ink">{formatCost(f.cost)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-600 text-ink">By user</h2>
          <div className="card divide-y divide-line overflow-hidden">
            {byUser.length === 0 ? (
              <p className="p-4 text-sm text-muted">No user activity yet.</p>
            ) : (
              byUser.map((u) => (
                <div key={u.userId} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate font-500 text-ink">{u.name}</p>
                    <p className="truncate text-xs text-muted">
                      {u.email} · {u.calls} calls
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-sm font-600 text-ink">
                    {formatCost(u.cost)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent calls</h2>
        <div className="card overflow-hidden">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/50">
                <tr>
                  <th className="px-4 py-3 font-600 text-ink">Feature</th>
                  <th className="px-4 py-3 font-600 text-ink">User</th>
                  <th className="px-4 py-3 font-600 text-ink">Tokens</th>
                  <th className="px-4 py-3 font-600 text-ink">Cost</th>
                  <th className="px-4 py-3 font-600 text-ink">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-ink/[0.02]">
                    <td className="px-4 py-3 capitalize">
                      {FEATURE_LABELS[r.feature] || r.feature}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.user?.email || "—"}</td>
                    <td className="px-4 py-3">{formatTokens(r.totalTokens)}</td>
                    <td className="px-4 py-3">{formatCost(r.cost)}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
