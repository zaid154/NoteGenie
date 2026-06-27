// FLOW: Student "My downloads". Rich cards for every purchase — secure token download (limit/expiry
// enforced server-side), payment + download status, remaining downloads, expiry, version, license key.
// Physical purchases show a fulfilment note instead of a download button.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconDownload, IconDoc, IconLock, IconCheck } from "../components/icons.jsx";
import { downloadByToken, downloadResourceFile } from "../lib/razorpay.js";
import { typeLabel } from "../lib/storeCategories.js";

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

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

  async function download(p) {
    setBusyId(p.purchaseId); setError("");
    try {
      if (p.downloadToken) await downloadByToken(api, p.downloadToken, p.resource.fileName);
      else await downloadResourceFile(api, p.resource.id, p.resource.fileName);
      // Reflect the consumed download locally.
      setPurchases((list) => list.map((x) => x.purchaseId === p.purchaseId
        ? { ...x, downloadCount: (x.downloadCount || 0) + 1, remainingDownloads: x.remainingDownloads != null ? Math.max(0, x.remainingDownloads - 1) : null }
        : x));
    } catch (e) {
      // Download responses are blobs, so the JSON error body must be read manually for a clear message.
      let msg = apiError(e);
      if (e?.response?.data instanceof Blob) {
        try { msg = JSON.parse(await e.response.data.text()).message || msg; } catch { /* keep generic */ }
      }
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">My downloads</h1>
      {error && <Alert>{error}</Alert>}

      {purchases.length === 0 ? (
        <EmptyState title="No downloads yet" subtitle="Saved and purchased study material shows up here." action={<Link to="/store" className="btn-primary">Browse the store</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => {
            const digital = (p.productType || "digital") === "digital";
            const expired = p.downloadExpiry && new Date(p.downloadExpiry) < new Date();
            const exhausted = p.remainingDownloads != null && p.remainingDownloads <= 0;
            const canDownload = digital && p.downloadEnabled && !expired && !exhausted;
            return (
              <div key={p.purchaseId} className="panel flex flex-col p-4">
                {p.resource.previewUrl ? (
                  <img src={p.resource.previewUrl} alt="" className="mb-3 h-28 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 grid h-28 w-full place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-950/40 dark:text-accent-300">
                    <IconDoc width={28} height={28} />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={digital ? "brand" : "amber"}>{digital ? "Digital" : "Physical"}</Badge>
                  {p.resource.version && <Badge color="gray">v{p.resource.version}</Badge>}
                  <Badge color={p.paymentStatus === "verified" ? "green" : "amber"}>
                    {p.paymentStatus === "verified" ? "Paid" : p.paymentStatus}
                  </Badge>
                </div>

                <p className="mt-2 line-clamp-2 font-semibold text-ink">{p.resource.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {p.resource.courseCode ? `${p.resource.courseCode} · ` : ""}{typeLabel(p.resource.resourceType)}
                </p>

                <dl className="mt-3 space-y-1 text-xs text-muted">
                  <div className="flex justify-between"><dt>Order</dt><dd className="font-mono text-ink">#{String(p.purchaseId).slice(-8)}</dd></div>
                  <div className="flex justify-between"><dt>Purchased</dt><dd>{fmtDate(p.purchasedAt)}</dd></div>
                  {digital && (
                    <div className="flex justify-between">
                      <dt>Downloads left</dt>
                      <dd className="text-ink">{p.remainingDownloads == null ? "Unlimited" : p.remainingDownloads}</dd>
                    </div>
                  )}
                  {digital && p.downloadExpiry && (
                    <div className="flex justify-between"><dt>Expires</dt><dd className={expired ? "text-red-600" : ""}>{fmtDate(p.downloadExpiry)}</dd></div>
                  )}
                  {digital && p.licenseKey && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="inline-flex items-center gap-1"><IconLock width={11} height={11} /> License</dt>
                      <dd className="truncate font-mono text-ink">{p.licenseKey}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-auto pt-3">
                  {digital ? (
                    canDownload ? (
                      <button onClick={() => download(p)} className="btn-primary w-full py-2.5 text-sm" disabled={busyId === p.purchaseId}>
                        {busyId === p.purchaseId ? <Spinner size={14} /> : <><IconDownload width={15} height={15} /> Download</>}
                      </button>
                    ) : (
                      <p className="rounded-lg bg-canvas/60 py-2 text-center text-xs font-medium text-muted">
                        {!p.downloadEnabled ? "Download disabled by admin" : expired ? "Download expired" : "Download limit reached"}
                      </p>
                    )
                  ) : (
                    <p className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-canvas/60 py-2 text-xs font-medium text-muted">
                      <IconCheck width={14} height={14} /> Physical product — ships to your address
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
