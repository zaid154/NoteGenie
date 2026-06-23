// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (AdminTableToolbar). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { Spinner } from "./ui.jsx";

export default function AdminTableToolbar({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  page = 1,
  totalPages = 1,
  loading = false,
  onPageChange,
  actions = null,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <input
            type="search"
            className="input max-w-xs py-2 text-sm"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
        {filters.map((f) => (
          <select
            key={f.id}
            className="input w-auto py-2 text-sm"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            {loading ? <Spinner size={14} /> : `Page ${page} of ${totalPages}`}
          </span>
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

