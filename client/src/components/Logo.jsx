// FLOW: Client source file. Renders NoteGenie tier-1 minimalist premium brand logo.


export default function Logo({ size = 32, showText = true, variant = "default", tone = "app" }) {
  const light = variant === "light";

  return (
    <div className="flex items-center gap-2.5 group select-none cursor-pointer">
      <span
        className="relative grid place-items-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        style={{ width: size, height: size }}
      >
        <img src="/favicon.png" alt="NoteGenie" width={size} height={size} className="rounded-lg" />
      </span>

      {showText && (
        <span className={`font-sans text-xl sm:text-2xl font-extrabold tracking-tight transition-colors ${light ? "text-white" : "text-slate-900 dark:text-white"}`}>
          Note<span className={light ? "text-indigo-200 font-extrabold" : tone === "store" ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-indigo-600 dark:text-indigo-400 font-extrabold"}>Genie</span>
        </span>
      )}
    </div>
  );
}
