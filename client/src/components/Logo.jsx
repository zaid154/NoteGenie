// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (Logo). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

export default function Logo({ size = 32, showText = true, variant = "default", tone = "app" }) {
  const light = variant === "light";
  // The storefront is teal; the AI app is indigo. A gradient mark reads more premium than a flat fill.
  const markTone = light
    ? "bg-white text-indigo-600"
    : tone === "store"
      ? "bg-gradient-to-br from-store-500 to-store-700 text-white shadow-sm shadow-store-600/30"
      : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm shadow-indigo-600/30";
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-xl ${markTone}`}
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 8h8M8 12h6M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      {showText && (
        <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
          NoteGenie
        </span>
      )}
    </div>
  );
}

