import { IconSparkles } from "./icons.jsx";

// Chhote reusable UI pieces ek hi jagah.

export function Spinner({ size = 18 }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

// Pura page loader (auth check ke time).
export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas text-brand-600">
      <Spinner size={28} />
    </div>
  );
}

// Notes/quiz generate hote waqt ka skeleton.
export function NoteSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-11/12" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-24 w-full" />
    </div>
  );
}

// Khaali list/empty page ke liye - generic blank na lage isliye custom.
export function EmptyState({ icon: Icon = IconSparkles, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
        <Icon width={26} height={26} />
      </span>
      <h3 className="font-display text-lg font-600 text-ink">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Inline error/success message.
export function Alert({ type = "error", children }) {
  const styles = {
    error: "bg-red-500/10 text-red-600 border-red-500/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    info: "bg-brand-500/10 text-brand-700 border-brand-500/20",
  };
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "brand" }) {
  const styles = {
    brand: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    amber: "bg-accent-500/15 text-accent-600",
    green: "bg-emerald-500/10 text-emerald-600",
    gray: "bg-ink/5 text-muted",
  };
  return <span className={`badge ${styles[color]}`}>{children}</span>;
}
