// FLOW: Student course resources list. Shows all resources for a course (/api/catalog/resources?courseId).
// Each links to ResourceDetail for preview / buy / download.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconArrowLeft, IconDownload } from "../components/icons.jsx";

const TYPE_LABEL = {
  question_paper: "Question paper",
  solved_assignment: "Solved assignment",
  assignment: "Assignment",
  book: "Book",
  guide: "Guide",
  notes: "Notes",
};

export default function CourseResources() {
  const { id } = useParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/resources", { params: { courseId: id } })
      .then(({ data }) => setResources(data.resources || []))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;

  const courseCode = resources[0]?.courseCode;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-indigo-600">
        <IconArrowLeft width={16} height={16} /> Back to catalog
      </Link>
      <h1 className="text-2xl font-semibold text-ink">{courseCode ? `${courseCode} — resources` : "Course resources"}</h1>

      {resources.length === 0 ? (
        <EmptyState title="No resources for this course yet" subtitle="Check back soon." />
      ) : (
        <ul className="space-y-2">
          {resources.map((r) => (
            <li key={r.id}>
              <Link to={`/resources/${r.id}`} className="flex items-center justify-between rounded-xl border border-line p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{r.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge color="gray">{TYPE_LABEL[r.resourceType] || r.resourceType}</Badge>
                    {r.year && <Badge color="gray">{r.year}</Badge>}
                    {r.isPaid ? <Badge color="brand">₹{(r.price / 100).toFixed(0)}</Badge> : <Badge color="green">Free</Badge>}
                  </span>
                </span>
                <IconDownload width={18} height={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
