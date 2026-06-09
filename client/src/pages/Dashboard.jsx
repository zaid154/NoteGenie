// Dashboard: login ke baad ka home page. Yahan stats aur saari materials dikhti hain.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  EmptyState,
  Alert,
  PageHeader,
  Stats,
  SectionTitle,
} from "../components/ui.jsx";
import { IconPlus, IconDoc, IconLink } from "../components/icons.jsx";

// Loading ke time stat value ki jagah ek chhota shimmer.
const Loadingbar = () => (
  <span className="skeleton inline-block h-7 w-14 align-middle" />
);

export default function Dashboard() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);            // saari study materials
  const [stats, setStats] = useState({ totalAttempts: 0, avgScore: 0 }); // quiz stats
  const [loading, setLoading] = useState(true);    // data load ho raha hai?
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");        // search box me likha hua
  const [filterType, setFilterType] = useState("all"); // all / pdf / link filter

  // Page khulte hi backend se documents aur stats ek saath mangwao.
  useEffect(() => {
    let ignore = false; // page band ho jaye to purana data set na ho
    async function load() {
      try {
        const [docsRes, statsRes] = await Promise.all([
          api.get("/documents"),
          api.get("/quiz/analytics/overview"),
        ]);
        if (ignore) return;
        setDocs(docsRes.data.documents);
        setStats(statsRes.data);
      } catch (err) {
        if (!ignore) setError(apiError(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // filtered = sirf wahi documents jo search + filter se match karte hain.
  const filtered = docs.filter((doc) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      doc.title?.toLowerCase().includes(q) ||
      doc.summary?.toLowerCase().includes(q);
    const matchType = filterType === "all" || doc.sourceType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your workspace"
        title={`Welcome back,`}
        accent={user?.name?.split(" ")[0] + "."}
        subtitle="Your study materials and quiz scores, all in one place."
        action={
          <Link to="/upload" className="btn-primary">
            <IconPlus /> New material
          </Link>
        }
      />

      <Stats
        cols={3}
        items={[
          {
            label: "Study materials",
            value: loading ? <Loadingbar /> : docs.length,
          },
          {
            label: "Quizzes attempted",
            value: loading ? <Loadingbar /> : stats.totalAttempts,
          },
          {
            label: "Average score",
            value: loading ? <Loadingbar /> : `${stats.avgScore}%`,
          },
        ]}
      />

      {error && <Alert>{error}</Alert>}

      <div>
        <SectionTitle
          action={
            <div className="flex flex-wrap gap-2">
              <label htmlFor="library-search" className="sr-only">
                Search materials
              </label>
              <input
                id="library-search"
                type="search"
                className="input w-48 py-2 text-sm"
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input w-auto py-2 text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="pdf">PDF</option>
                <option value="link">Link</option>
              </select>
            </div>
          }
        >
          Your library
        </SectionTitle>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card space-y-3 p-5">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          docs.length === 0 ? (
            <EmptyState
              icon={IconDoc}
              title="No materials yet"
              subtitle="Upload a PDF or paste a YouTube/web link, and AI will generate notes, flashcards, and a quiz for you."
              action={
                <Link to="/upload" className="btn-primary">
                  <IconPlus /> Add your first material
                </Link>
              }
            />
          ) : (
            <p className="text-sm text-muted">No materials match your search.</p>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc) => (
              <Link
                key={doc._id}
                to={`/document/${doc._id}`}
                className="card group flex flex-col gap-3 p-5 transition hover:border-brand-300 hover:shadow-lift"
              >
                <div className="flex items-center justify-between text-muted">
                  <span className="inline-flex items-center gap-1.5 text-xs font-600 uppercase tracking-[0.12em]">
                    {doc.sourceType === "pdf" ? (
                      <IconDoc width={14} height={14} />
                    ) : (
                      <IconLink width={14} height={14} />
                    )}
                    {doc.sourceType === "pdf" ? "PDF" : "Link"}
                  </span>
                  <span className="text-xs">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="line-clamp-2 font-display text-lg font-600 leading-snug text-ink group-hover:text-brand-600">
                  {doc.title}
                </h3>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                  {doc.summary}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
