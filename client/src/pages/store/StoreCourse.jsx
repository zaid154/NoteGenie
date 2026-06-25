// FLOW: Storefront course page (/store/course/:id). Lists all resources for a course. Public.

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client.js";
import ResultsGrid from "../../components/store/ResultsGrid.jsx";
import { IconArrowLeft } from "../../components/icons.jsx";

export default function StoreCourse() {
  const { id } = useParams();
  const [courseCode, setCourseCode] = useState("");

  useEffect(() => {
    // Cheap way to get the course code: peek at the first resource (course detail endpoint is admin-only).
    api.get("/catalog/resources", { params: { courseId: id, limit: 1 } })
      .then(({ data }) => setCourseCode(data.resources?.[0]?.courseCode || ""))
      .catch(() => {});
  }, [id]);

  return (
    <div className="space-y-6">
      <Link to="/store" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-store-700">
        <IconArrowLeft width={16} height={16} /> Back to store
      </Link>
      <h1 className="text-2xl font-bold text-ink">{courseCode ? `${courseCode} — material` : "Course material"}</h1>
      <ResultsGrid params={{ courseId: id }} emptyTitle="No resources for this course yet" />
    </div>
  );
}
