// FLOW: Admin orders view. Lists per-resource purchases via /api/admin/orders (manage_orders).

import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, PageHeader, EmptyState, Spinner } from "../../components/ui.jsx";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/orders")
      .then(({ data }) => setOrders(data.orders || []))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Resource purchases" />
      {error && <Alert>{error}</Alert>}
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03] text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {o.resource?.title || "—"}
                    {o.resource?.courseCode && <span className="ml-2 text-xs text-muted">{o.resource.courseCode}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{o.user ? `${o.user.name} (${o.user.email})` : "—"}</td>
                  <td className="px-4 py-3">₹{(o.amount / 100).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <Badge color={o.status === "completed" ? "green" : o.status === "failed" ? "amber" : "gray"}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
