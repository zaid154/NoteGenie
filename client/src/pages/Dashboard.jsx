// Dashboard: login ke baad ka home page. Yahan stats aur saari materials dikhti hain.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { EmptyState, Alert, Badge, Spinner } from "../components/ui.jsx";
import {
  IconPlus,
  IconDoc,
  IconUpload,
  IconLink,
  IconChart,
} from "../components/icons.jsx";

// Chhota card jo ek number dikhata hai (jaise "Study materials: 5").
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
        <Icon />
      </span>
      <div>
        <p className="text-2xl font-700 text-ink">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

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
        // Promise.all = dono request ek saath bhejo (jaldi ho jata hai).
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
    // Cleanup: agar user is page se chala jaye to ignore true kar do.
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
    return matchSearch && matchType; // dono sahi to hi dikhao
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-700 text-ink">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your study materials and quiz scores in one place.
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <IconPlus /> New material
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card flex items-center gap-4 p-5">
              <div className="skeleton h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={IconDoc} label="Study materials" value={docs.length} />
          <StatCard icon={IconChart} label="Quizzes attempted" value={stats.totalAttempts} />
          <StatCard icon={IconUpload} label="Average score" value={`${stats.avgScore}%`} />
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-600 text-ink">Your library</h2>
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
        </div>

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
                className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
                    {doc.sourceType === "pdf" ? (
                      <IconDoc width={18} height={18} />
                    ) : (
                      <IconLink width={18} height={18} />
                    )}
                  </span>
                  <Badge color={doc.sourceType === "pdf" ? "brand" : "amber"}>
                    {doc.sourceType === "pdf" ? "PDF" : "Link"}
                  </Badge>
                </div>
                <h3 className="line-clamp-2 font-600 text-ink group-hover:text-brand-600">
                  {doc.title}
                </h3>
                <p className="line-clamp-2 text-sm text-muted">{doc.summary}</p>
                <p className="mt-auto text-xs text-muted">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
