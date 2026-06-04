// NoteGenie wordmark + mark. Sidebar aur auth pages me use hota hai.
export default function Logo({ size = 32, showText = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-xl bg-brand-600 text-white shadow-lift"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 19V5h2.6l6 9V5H17v14h-2.6l-6-9v9H6z"
            fill="currentColor"
          />
          <circle cx="18.5" cy="6" r="2" fill="#F59E0B" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-lg font-700 tracking-tight">
          Note<span className="text-brand-600">Genie</span>
        </span>
      )}
    </div>
  );
}
