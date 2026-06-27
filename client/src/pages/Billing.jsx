// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Billing). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Alert,
  PageHeader,
  Spinner,
  UsageMeter,
  StatSkeleton,
  StatCard,
  Badge,
  EmptyState,
} from "../components/ui.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import { IconDoc, IconChat, IconChart, IconCoins, IconDownload } from "../components/icons.jsx";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatResetDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  useEffect(() => {
    async function load() {
      if (params.get("success")) {
        await refreshUser();
      }
      try {
        const r = await api.get("/billing/status");
        setStatus(r.data);
        if (!r.data?.usage) setUsageError("Could not load usage data.");
      } catch (e) {
        setError(apiError(e));
        setUsageError(apiError(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params, refreshUser]);

  // Paid purchase / receipt history. Free downloads live in "Saved & downloads", so the
  // billing record only lists purchases that were actually charged.
  useEffect(() => {
    let ignore = false;
    api
      .get("/catalog/me/purchases")
      .then((r) => {
        if (ignore) return;
        setPurchases((r.data.purchases || []).filter((p) => (p.amount || 0) > 0));
      })
      .catch(() => !ignore && setPurchases([]))
      .finally(() => !ignore && setLoadingPurchases(false));
    return () => { ignore = true; };
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    setError("");
    try {
      const { data } = await api.post("/billing/portal");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(apiError(e));
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Billing & usage" subtitle="Manage your plan and see monthly limits." />
        <StatSkeleton count={3} />
      </div>
    );
  }

  const usage = status?.usage;
  const plan = user?.plan || status?.plan || "free";
  const resetLabel = formatResetDate(usage?.resetAt);
  const expiryLabel = formatDate(status?.planExpiresAt || user?.planExpiresAt);
  const showStripePortal = status?.hasStripePortal;

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
      <PageHeader
        title="Billing & usage"
        subtitle="Manage your plan and see monthly limits."
        action={
          plan === "free" ? (
            <Link to="/checkout?plan=pro" className="btn-primary text-sm">
              Upgrade to Pro
            </Link>
          ) : (
            <Link to="/pricing" className="btn-outline text-sm">
              View plans
            </Link>
          )
        }
      />

      {params.get("success") && (
        <Alert type="success">Payment successful! Your plan is now active for 30 days.</Alert>
      )}
      {params.get("canceled") && (
        <Alert type="info">Checkout was canceled. No charges were made.</Alert>
      )}
      {error && <Alert>{error}</Alert>}

      <StaggerContainer className="space-y-8">
        <StaggerItem>
          <div className="panel p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Current plan</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold capitalize text-ink">{plan}</p>
                  <Badge color={plan === "free" ? "gray" : "brand"}>{plan === "free" ? "Free tier" : "Active"}</Badge>
                </div>
                {expiryLabel && plan !== "free" && (
                  <p className="mt-2 text-sm text-muted">Valid until {expiryLabel}</p>
                )}
                {plan === "free" && (
                  <p className="mt-2 text-sm text-muted">Upgrade for more uploads and unlimited tutor chat.</p>
                )}
              </div>
              {plan !== "free" ? (
                <div className="flex flex-wrap gap-2">
                  {showStripePortal ? (
                    <button type="button" className="btn-outline" onClick={openPortal} disabled={portalLoading}>
                      {portalLoading ? <Spinner /> : "Manage subscription"}
                    </button>
                  ) : (
                    <Link to="/pricing" className="btn-outline">
                      Renew plan
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Link to="/checkout?plan=pro" className="btn-primary">
                    Upgrade to Pro
                  </Link>
                  <Link to="/pricing" className="btn-outline">
                    View all plans
                  </Link>
                </div>
              )}
            </div>
          </div>
        </StaggerItem>

        {usage && (
          <>
            <StaggerItem>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={IconDoc}
                  label="Documents"
                  value={`${usage.used.documents}${usage.limits.documents ? ` / ${usage.limits.documents}` : ""}`}
                  color="indigo"
                />
                <StatCard
                  icon={IconChat}
                  label="Tutor messages"
                  value={
                    usage.limits.tutorMessages
                      ? `${usage.used.tutorMessages} / ${usage.limits.tutorMessages}`
                      : `${usage.used.tutorMessages}`
                  }
                  hint={plan !== "free" ? "Unlimited on paid plans" : undefined}
                  color="violet"
                />
                <StatCard
                  icon={IconChart}
                  label="Quizzes"
                  value={
                    usage.limits.quizzes
                      ? `${usage.used.quizzes} / ${usage.limits.quizzes}`
                      : `${usage.used.quizzes}`
                  }
                  color="emerald"
                />
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="panel space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-ink">Usage this month</h2>
                  {resetLabel && <p className="text-xs text-muted">Resets on {resetLabel}</p>}
                </div>
                <UsageMeter label="Documents" used={usage.used.documents} limit={usage.limits.documents} />
                <UsageMeter label="Tutor messages" used={usage.used.tutorMessages} limit={usage.limits.tutorMessages} />
                <UsageMeter label="Quizzes" used={usage.used.quizzes} limit={usage.limits.quizzes} />
                {(plan === "pro" || plan === "team") && (
                  <p className="text-xs text-muted">Pro and Team plans include unlimited tutor & quizzes.</p>
                )}
              </div>
            </StaggerItem>
          </>
        )}

        {!usage && usageError && (
          <StaggerItem>
            <Alert>{usageError}</Alert>
          </StaggerItem>
        )}

        {/* Purchase / payment history */}
        <StaggerItem>
          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
              <h2 className="font-bold text-ink">Purchase history</h2>
              <Link to="/my-downloads" className="text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400">
                Saved &amp; downloads →
              </Link>
            </div>

            {loadingPurchases ? (
              <div className="space-y-2 pt-4">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="pt-2">
                <EmptyState
                  icon={IconCoins}
                  title="No billing history yet"
                  subtitle="Your paid purchases and receipts will show up here. Free study material stays in Saved & downloads."
                  action={
                    <Link to="/store" className="btn-outline">Browse the store</Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line pt-2">
                {purchases.map((p) => (
                  <li key={p.purchaseId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link to={`/resources/${p.resource.id}`} className="font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400">
                        {p.resource.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {p.resource.courseCode ? `${p.resource.courseCode} · ` : ""}
                        {formatDate(p.purchasedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums text-ink">₹{((p.amount || 0) / 100).toFixed(0)}</span>
                      <Link
                        to={`/resources/${p.resource.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
                      >
                        <IconDownload width={14} height={14} /> Download
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

