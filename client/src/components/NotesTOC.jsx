// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (NotesTOC). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

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

