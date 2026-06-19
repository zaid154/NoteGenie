import { slugifyHeading } from "../utils/parseNoteSections.js";

export default function NotesTOC({ sections = [], onGenerateSection }) {
  if (!sections.length) return null;

  function scrollTo(slug) {
    const el = document.getElementById(slug);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="notes-toc hidden lg:block" aria-label="Notes sections">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Sections</p>
      <ul className="space-y-1">
        {sections.map(({ title, slug }) => (
          <li key={slug}>
            <button
              type="button"
              onClick={() => scrollTo(slug)}
              className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-muted transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            >
              {title}
            </button>
            {onGenerateSection && (
              <button
                type="button"
                onClick={() => onGenerateSection(title)}
                className="ml-2 text-[10px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                + cards
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { slugifyHeading };
