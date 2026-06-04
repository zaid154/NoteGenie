import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, Spinner } from "../../components/ui.jsx";
import { IconTrash } from "../../components/icons.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";

export default function AdminContent() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    api
      .get("/admin/documents")
      .then((r) => setDocs(r.data.documents))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id) {
    const ok = await confirm({
      title: "Delete this material?",
      message: "Its quizzes and chat history will be removed too. This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/documents/${id}`);
      setDocs((d) => d.filter((x) => x.id !== id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="card divide-y divide-line overflow-hidden">
        {docs.length === 0 ? (
          <p className="p-6 text-sm text-muted">No materials on the platform yet.</p>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-500 text-ink">{d.title}</p>
                  <Badge color={d.sourceType === "pdf" ? "brand" : "amber"}>
                    {d.sourceType}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {d.user?.name} ({d.user?.email}) · {new Date(d.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => remove(d.id)}
                disabled={deleting === d.id}
                className="btn-outline text-red-600 hover:border-red-400"
              >
                {deleting === d.id ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
