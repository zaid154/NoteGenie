import { IconSparkles } from "./icons.jsx";
import { AnimatedNumber } from "./motion.jsx";
import { Link } from "react-router-dom";
import { isQuotaExceeded } from "../utils/quota.js";

const TILE_COLORS = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
};

export function Spinner({ size = 18 }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return <PageShellSkeleton />;
}

export function StatCard({ icon: Icon, label, value, numericValue, suffix = "", hint, color = "indigo" }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
            {typeof numericValue === "number" ? (
              <>
                <AnimatedNumber value={numericValue} />
                {suffix}
              </>
            ) : (
              value
            )}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {Icon && (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TILE_COLORS[color] || TILE_COLORS.indigo}`}>
            <Icon width={20} height={20} />
          </span>
        )}
      </div>
    </div>
  );
}

export function StatSkeleton({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${count === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-7 w-10" />
            </div>
            <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaterialCardSkeleton() {
  return (
    <div className="material-card !shadow-none !translate-y-0 !ring-0">
      <div className="flex items-start gap-3">
        <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-full" />
        </div>
      </div>
      <div className="mt-4 skeleton h-3 w-1/2" />
      <div className="mt-4 skeleton h-9 w-full rounded-lg" />
    </div>
  );
}

export function PageShellSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in px-1">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-8 w-48" />
        </div>
        <div className="skeleton h-10 w-36 rounded-lg" />
      </div>
      <StatSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="panel p-4">
            <div className="flex gap-2">
              <div className="skeleton h-9 w-44 rounded-lg" />
              <div className="skeleton h-9 w-28 rounded-lg" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <MaterialCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rail-card space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageMeter({ label, used, limit }) {
  if (limit == null) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{used} / {limit}</span>
      </div>
      <div className="progress-bar mt-1.5">
        <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NoteSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}

export function EmptyState({ icon: Icon = IconSparkles, title, subtitle, action, compact = false }) {
  if (compact) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-5 text-center">
        <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Icon width={16} height={16} />
        </div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }
  return (
    <div className="card-solid flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
        <Icon width={24} height={24} />
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {subtitle && <p className="mt-2 max-w-sm text-sm text-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-canvas/50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="skeleton h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanCardSkeleton() {
  return (
    <div className="card-solid flex flex-col p-8">
      <div className="skeleton h-6 w-24" />
      <div className="skeleton mt-4 h-10 w-32" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-4 w-full" />
        ))}
      </div>
      <div className="skeleton mt-8 h-10 w-full rounded-lg" />
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card-solid space-y-4 p-6">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-8 w-28" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="card-solid p-6">
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function QuotaBlocked({ feature = "documents", usage }) {
  if (!isQuotaExceeded(usage, feature)) return null;
  const labels = { documents: "uploads", tutorMessages: "tutor messages", quizzes: "quizzes" };
  return (
    <Alert type="info">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          You&apos;ve reached your monthly {labels[feature] || feature} limit on the free plan.
        </span>
        <Link to="/pricing" className="btn-primary shrink-0 py-1.5 text-xs">
          Upgrade
        </Link>
      </div>
    </Alert>
  );
}

export function Alert({ type = "error", children }) {
  const styles = {
    error: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    success: "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    info: "bg-indigo-50 text-indigo-800 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
    warning: "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>
  );
}

export function Badge({ children, color = "brand" }) {
  const styles = {
    brand: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  };
  return <span className={`badge ${styles[color] || styles.brand}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-lg font-semibold text-ink">{children}</h3>
      {action}
    </div>
  );
}

export function Stats({ cols = 3, items = [] }) {
  const gridCols =
    cols === 4 ? "md:grid-cols-4" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {items.map((item, i) => (
        <StatCard key={i} {...item} />
      ))}
    </div>
  );
}

export function ProgressRing({ value, max, label, sublabel, color = "#4f46e5" }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="card-solid flex flex-col items-center p-6">
      <p className="mb-4 w-full text-sm font-semibold text-ink">{label}</p>
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <span className="text-2xl font-bold text-ink">{value}</span>
          {sublabel && <span className="text-[10px] text-muted">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
}

export function MiniBarChart({ data, label, empty = false }) {
  const hasValues = data.some((d) => d.v > 0);
  if (empty || !hasValues) {
    return (
      <div className="card-solid flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-2 text-sm text-muted">No quiz attempts in the last 7 days</p>
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="card-solid p-6">
      <p className="mb-4 text-sm font-semibold text-ink">{label}</p>
      <div className="flex h-28 items-end justify-between gap-2">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
              style={{ height: `${Math.max(8, (d.v / max) * 100)}%` }}
            />
            <span className="text-[10px] font-medium text-muted">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
