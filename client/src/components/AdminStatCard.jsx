// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (AdminStatCard). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

// Ek chhota card jo admin pages pe ek number/stat dikhata hai (icon + color ke saath).
// Example: "Total Users: 120"
export default function AdminStatCard({ icon: Icon, label, value, sub, accent = "brand" }) {
  // accent ke hisaab se card ka color chunte hain.
  const accents = {
    brand: "bg-stone-800/10 text-stone-700",
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

// formatCost: dollar amount ko padhne layak banata hai (jaise 0.0034 -> "~$0.0034").
export function formatCost(usd) {
  if (!usd || usd === 0) return "~$0.00";
  if (usd < 0.01) return `~$${usd.toFixed(4)}`;
  return `~$${usd.toFixed(2)}`;
}

// formatTokens: bade number ko chhota karta hai (1500 -> "1.5K", 2000000 -> "2.0M").
export function formatTokens(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

