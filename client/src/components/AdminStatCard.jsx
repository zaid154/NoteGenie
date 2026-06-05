// Reusable stat card for admin pages — icon + accent colour.
export default function AdminStatCard({ icon: Icon, label, value, sub, accent = "brand" }) {
  const accents = {
    brand: "bg-brand-500/10 text-brand-600",
    amber: "bg-accent-500/15 text-accent-600",
    green: "bg-emerald-500/10 text-emerald-600",
    red: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="card flex items-start gap-4 p-5">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accents[accent] || accents.brand}`}
      >
        <Icon width={20} height={20} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-700 text-ink">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}

export function formatCost(usd) {
  if (!usd || usd === 0) return "~$0.00";
  if (usd < 0.01) return `~$${usd.toFixed(4)}`;
  return `~$${usd.toFixed(2)}`;
}

export function formatTokens(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
