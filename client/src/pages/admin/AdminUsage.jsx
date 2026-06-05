import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, PageLoader, EmptyState, Spinner } from "../../components/ui.jsx";
import AdminStatCard, { formatCost, formatTokens } from "../../components/AdminStatCard.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { IconActivity, IconCoins, IconSparkles, IconTrash } from "../../components/icons.jsx";

// Har feature ka label + ek consistent accent colour (badge aur bar dono ke liye).
const FEATURE_META = {
  notes: { label: "Notes", dot: "bg-brand-500", bar: "bg-brand-500", soft: "bg-brand-500/10 text-brand-700 dark:text-brand-300" },
  flashcards: { label: "Flashcards", dot: "bg-accent-500", bar: "bg-accent-500", soft: "bg-accent-500/15 text-accent-600" },
  quiz: { label: "Quiz", dot: "bg-emerald-500", bar: "bg-emerald-500", soft: "bg-emerald-500/10 text-emerald-600" },
  tutor: { label: "Tutor chat", dot: "bg-sky-500", bar: "bg-sky-500", soft: "bg-sky-500/10 text-sky-600" },
  test: { label: "Key test", dot: "bg-slate-400", bar: "bg-slate-400", soft: "bg-ink/5 text-muted" },
};

function meta(feature) {
  return FEATURE_META[feature] || { label: feature, dot: "bg-slate-400", bar: "bg-slate-400", soft: "bg-ink/5 text-muted" };
}

// Patli proportion bar — relative share dikhane ke liye.
function ShareBar({ pct, className = "bg-brand-500" }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

export default function AdminUsage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const confirm = useConfirm();

  async function load() {
    try {
      const { data } = await api.get("/admin/usage");
      setData(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReset() {
    const ok = await confirm({
      title: "Reset usage log?",
      message:
        "This clears the app's own record of API calls, tokens, and estimated cost. It does not affect your Google billing — only the numbers shown here.",
      confirmText: "Reset usage",
      danger: true,
    });
    if (!ok) return;
    setResetting(true);
    setError("");
    try {
      await api.delete("/admin/usage", { data: { confirm: true } });
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const { totals, byFeature, byUser, recent } = data;
  const hasData = totals.calls > 0;

  // Bars ko sabse bade item ke hisaab se scale karte hain (cost, warna calls).
  const maxFeatureCost = Math.max(...byFeature.map((f) => f.cost), 0.000001);
  const maxUserCost = Math.max(...byUser.map((u) => u.cost), 0.000001);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Gemini API usage tracked per call. Costs are estimates based on token counts — not
          actual billing. These are this app&apos;s own records, separate from your Google console.
        </p>
        {hasData && (
          <button
            type="button"
            onClick={handleReset}
            className="btn-danger shrink-0"
            disabled={resetting}
          >
            {resetting ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
            Reset usage
          </button>
        )}
      </div>

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

      {!hasData ? (
        <EmptyState
          icon={IconActivity}
          title="No API usage yet"
          subtitle="Generate notes, a quiz, or chat with the tutor — calls will show up here with token counts and estimated cost."
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 font-display text-lg font-600 text-ink">By feature</h2>
              <div className="card space-y-4 p-5">
                {byFeature.map((f) => {
                  const m = meta(f.feature);
                  const pct = (f.cost / maxFeatureCost) * 100;
                  return (
                    <div key={f.feature}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-500 text-ink">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${m.dot}`} />
                          {m.label}
                        </span>
                        <span className="text-sm font-600 text-ink">{formatCost(f.cost)}</span>
                      </div>
                      <ShareBar pct={pct} className={m.bar} />
                      <p className="mt-1.5 text-xs text-muted">
                        {f.calls} call{f.calls !== 1 ? "s" : ""} · {formatTokens(f.totalTokens)} tokens
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg font-600 text-ink">By user</h2>
              <div className="card space-y-4 p-5">
                {byUser.length === 0 ? (
                  <p className="text-sm text-muted">No user activity yet.</p>
                ) : (
                  byUser.map((u) => {
                    const pct = (u.cost / maxUserCost) * 100;
                    return (
                      <div key={u.userId}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-500 text-ink">{u.name}</span>
                            <span className="block truncate text-xs text-muted">{u.email}</span>
                          </span>
                          <span className="shrink-0 text-sm font-600 text-ink">
                            {formatCost(u.cost)}
                          </span>
                        </div>
                        <ShareBar pct={pct} className="bg-brand-500" />
                        <p className="mt-1.5 text-xs text-muted">
                          {u.calls} call{u.calls !== 1 ? "s" : ""} · {formatTokens(u.totalTokens)} tokens
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-3 font-display text-lg font-600 text-ink">Recent calls</h2>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line bg-canvas/50">
                  <tr className="text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-600">Feature</th>
                    <th className="px-4 py-3 font-600">User</th>
                    <th className="px-4 py-3 font-600 text-right">Tokens</th>
                    <th className="px-4 py-3 font-600 text-right">Cost</th>
                    <th className="px-4 py-3 font-600 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((r) => {
                    const m = meta(r.feature);
                    return (
                      <tr key={r.id} className="hover:bg-ink/[0.02]">
                        <td className="px-4 py-3">
                          <span className={`badge ${m.soft}`}>{m.label}</span>
                        </td>
                        <td className="px-4 py-3 text-muted">{r.user?.email || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatTokens(r.totalTokens)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCost(r.cost)}</td>
                        <td className="px-4 py-3 text-right text-muted">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
