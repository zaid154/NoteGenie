// NoteGenie wordmark + mark. Sidebar aur auth pages me use hota hai.
export default function Logo({ size = 32, showText = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-lg bg-brand-600 text-white"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 19V5h2.6l6 9V5H17v14h-2.6l-6-9v9H6z"
            fill="currentColor"
          />
          {/* Amber accent dot (brand palette ke saath cohesive) */}
          <circle cx="18.5" cy="6" r="2" fill="#f59e0b" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-lg font-600 tracking-tight">
          Note<span className="text-accent-500">Genie</span>
        </span>
      )}
    </div>
  );
}
