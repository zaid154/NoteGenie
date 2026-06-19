export default function Logo({ size = 32, showText = true, variant = "default" }) {
  const light = variant === "light";
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-lg ${
          light ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
        }`}
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
