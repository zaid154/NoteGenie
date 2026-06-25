// FLOW: Student "My downloads". Lists purchased resources (/catalog/me/purchases) with a
// re-download button (authenticated blob download).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconDownload } from "../components/icons.jsx";
import { downloadResourceFile } from "../lib/razorpay.js";

export default function MyDownloads() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get("/catalog/me/purchases")
      .then(({ data }) => setPurchases(data.purchases || []))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function download(resource) {
    setBusyId(resource.id); setError("");
    try {
      await downloadResourceFile(api, resource.id, resource.fileName);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">My downloads</h1>
      {error && <Alert>{error}</Alert>}
      {purchases.length === 0 ? (
        <EmptyState title="No purchases yet" subtitle="Browse the catalog to find study material." action={<Link to="/catalog" className="btn-primary">Browse catalog</Link>} />
      ) : (
        <ul className="space-y-2">
          {purchases.map((p) => (
            <li key={p.purchaseId} className="flex items-center justify-between rounded-xl border border-line p-4">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{p.resource.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {p.resource.courseCode && <Badge color="brand">{p.resource.courseCode}</Badge>}
                  <span className="text-xs text-muted">{new Date(p.purchasedAt).toLocaleDateString()}</span>
                </span>
              </span>
              <button onClick={() => download(p.resource)} className="btn-outline text-sm" disabled={busyId === p.resource.id}>
                {busyId === p.resource.id ? <Spinner size={14} /> : <><IconDownload width={15} height={15} /> Download</>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
