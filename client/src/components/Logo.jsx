// FLOW: Client source file. Renders NoteGenie tier-1 minimalist premium brand logo.

import { useId } from "react";

export default function Logo({ size = 32, showText = true, variant = "default", tone = "app" }) {
  const light = variant === "light";
  const idPrefix = useId().replace(/:/g, "");

  return (
    <div className="flex items-center gap-2.5 group select-none cursor-pointer">
      <span
        className="relative grid place-items-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${idPrefix}-brand`} x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={tone === "store" ? "#1d52d9" : "#4f46e5"} />
              <stop offset="100%" stopColor={tone === "store" ? "#163a99" : "#3730a3"} />
            </linearGradient>
          </defs>

          {/* Minimalist Squircle Badge */}
          <rect x="3" y="3" width="30" height="30" rx="9" fill={`url(#${idPrefix}-brand)`} />
          <rect x="3.5" y="3.5" width="29" height="29" rx="8.5" stroke="white" strokeOpacity="0.2" strokeWidth="1" fill="none" />

          {/* Precise Geometric 'N' Book-Fold Vector Stroke */}
          <path
            d="M11.5 11V25M11.5 11L24.5 25V11"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {showText && (
        <span className={`font-sans text-xl sm:text-2xl font-extrabold tracking-tight transition-colors ${light ? "text-white" : "text-slate-900 dark:text-white"}`}>
          Note<span className={light ? "text-indigo-200 font-extrabold" : tone === "store" ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-indigo-600 dark:text-indigo-400 font-extrabold"}>Genie</span>
        </span>
      )}
    </div>
  );
}
