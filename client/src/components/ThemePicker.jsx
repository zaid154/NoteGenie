// FLOW: Theme + accent picker. Light/dark segmented toggle + accent swatches. Reads/writes
// ThemeContext (persists to localStorage). Mounted in Profile ("Appearance") and the sidebars.

import { useTheme } from "../context/ThemeContext.jsx";
import { IconSun, IconMoon } from "./icons.jsx";

export default function ThemePicker() {
  const { theme, toggleTheme, accent, setAccent, accents } = useTheme();

  return (
    <div className="space-y-3">
      <div>
        <p className="text-small mb-1.5">Appearance</p>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {["light", "dark"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { if (theme !== m) toggleTheme(); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                theme === m ? "bg-accent-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              {m === "light" ? <IconSun width={15} height={15} /> : <IconMoon width={15} height={15} />}
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-small mb-1.5">Accent</p>
        <div className="flex gap-2.5">
          {accents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccent(a.id)}
              title={a.label}
              aria-label={`${a.label} accent`}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${
                accent === a.id ? "ring-accent-500" : "ring-transparent hover:ring-line"
              }`}
              style={{ backgroundColor: a.swatch }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
