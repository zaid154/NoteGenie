// FLOW: Admin orders view. Lists per-product purchases via /api/admin/orders (manage_orders).
// Digital + physical orders; click an order to open its detail page with admin actions.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, PageHeader, EmptyState, Spinner } from "../../components/ui.jsx";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/admin/orders", { params: typeFilter ? { productType: typeFilter } : {} })
      .then(({ data }) => setOrders(data.orders || []))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Digital & physical product purchases" />
      {error && <Alert>{error}</Alert>}

      <div className="flex gap-2">
        {[["", "All"], ["digital", "Digital"], ["physical", "Physical"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTypeFilter(v)}
            className={typeFilter === v ? "rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white" : "rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-accent-300"}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-24"><Spinner size={24} /></div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03] text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-medium text-ink">
                    {o.resource?.title || "—"}
                    {o.resource?.courseCode && <span className="ml-2 text-xs text-muted">{o.resource.courseCode}</span>}
                  </td>
                  <td className="px-4 py-3"><Badge color={o.productType === "physical" ? "amber" : "brand"}>{o.productType === "physical" ? "Physical" : "Digital"}</Badge></td>
                  <td className="px-4 py-3 text-muted">{o.user ? `${o.user.name}` : "—"}<br /><span className="text-xs">{o.user?.email}</span></td>
                  <td className="px-4 py-3">₹{(o.amount / 100).toFixed(0)}</td>
                  <td className="px-4 py-3"><Badge color={o.paymentVerified ? "green" : o.status === "failed" ? "amber" : "gray"}>{o.paymentVerified ? "Verified" : o.status}</Badge></td>
                  <td className="px-4 py-3 text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Link to={`/admin/orders/${o.id}`} className="text-accent-600 hover:underline dark:text-accent-400">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
