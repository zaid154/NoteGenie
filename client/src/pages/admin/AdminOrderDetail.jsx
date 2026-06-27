// FLOW: Admin order detail (/admin/orders/:id). Full order info + payment + digital fulfilment
// controls (enable/disable, reset count, regenerate token, extend expiry, license, limit) and
// physical shipping (courier/tracking/status). Plus the download audit log.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, Spinner, PageHeader, SectionTitle } from "../../components/ui.jsx";
import { useToast } from "../../context/ToastContext.jsx";

function Row({ label, value, mono }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

const SHIP_STATUS = ["pending", "packed", "dispatched", "delivered", "cancelled"];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ship, setShip] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/orders/${id}`)
      .then(({ data }) => { setOrder(data.order); setShip(data.order.shipping || {}); })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(patch, msg) {
    setBusy(true); setError("");
    try {
      await api.patch(`/admin/orders/${id}`, patch);
      toast(msg || "Saved", "success");
      load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;
  if (!order) return <Alert>Order not found</Alert>;

  const digital = order.productType === "digital";
  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
  const rupees = (p) => `₹${((p || 0) / 100).toFixed(0)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/admin/orders" className="text-sm text-muted hover:text-ink">← All orders</Link>
      <PageHeader
        title={`Order #${String(order.id).slice(-8)}`}
        subtitle={order.resource?.title}
        action={<Badge color={order.paymentVerified ? "green" : "amber"}>{order.paymentVerified ? "Payment verified" : order.verificationStatus}</Badge>}
      />
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Customer */}
        <div className="card p-5">
          <SectionTitle>Customer</SectionTitle>
          <dl className="mt-2 divide-y divide-line">
            <Row label="Name" value={order.user?.name} />
            <Row label="Email" value={order.user?.email} />
          </dl>
        </div>

        {/* Payment */}
        <div className="card p-5">
          <SectionTitle>Payment</SectionTitle>
          <dl className="mt-2 divide-y divide-line">
            <Row label="Amount" value={rupees(order.amount)} />
            <Row label="Method" value={order.provider} />
            <Row label="Transaction ID" value={order.transactionId} mono />
            <Row label="Gateway order" value={order.orderId} mono />
            <Row label="Status" value={order.paymentVerified ? "Verified" : order.status} />
          </dl>
        </div>

        {/* Product */}
        <div className="card p-5">
          <SectionTitle>Product</SectionTitle>
          <dl className="mt-2 divide-y divide-line">
            <Row label="Title" value={order.resource?.title} />
            <Row label="Type" value={<Badge color={digital ? "brand" : "amber"}>{digital ? "Digital" : "Physical"}</Badge>} />
            <Row label="Category" value={order.resource?.resourceType?.replace(/_/g, " ")} />
            {order.resource?.version && <Row label="Version" value={`v${order.resource.version}`} />}
            {order.resource?.size ? <Row label="File size" value={`${(order.resource.size / 1024 / 1024).toFixed(1)} MB`} /> : null}
            {order.resource?.fileName && <Row label="File" value={order.resource.fileName} mono />}
          </dl>
        </div>

        {/* Digital fulfilment + actions */}
        {digital && (
          <div className="card p-5">
            <SectionTitle>Digital download</SectionTitle>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Download enabled" value={order.downloadEnabled ? "Yes" : "No"} />
              <Row label="Downloads used" value={`${order.downloadCount}${order.downloadLimit != null ? ` / ${order.downloadLimit}` : " (unlimited)"}`} />
              <Row label="Expires" value={order.downloadExpiry ? fmt(order.downloadExpiry) : "Never"} />
              <Row label="License key" value={order.licenseKey} mono />
              <Row label="Download token" value={order.downloadToken ? `${order.downloadToken.slice(0, 10)}…` : "—"} mono />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-outline text-xs" disabled={busy} onClick={() => act({ downloadEnabled: !order.downloadEnabled }, order.downloadEnabled ? "Download disabled" : "Download enabled")}>
                {order.downloadEnabled ? "Disable download" : "Enable download"}
              </button>
              <button className="btn-outline text-xs" disabled={busy} onClick={() => act({ resetDownloads: true }, "Download count reset")}>Reset count</button>
              <button className="btn-outline text-xs" disabled={busy} onClick={() => act({ regenerateToken: true }, "New download token")}>Regenerate token</button>
              <button className="btn-outline text-xs" disabled={busy} onClick={() => act({ extendExpiryDays: 30 }, "Expiry extended 30 days")}>Extend expiry +30d</button>
            </div>
          </div>
        )}

        {/* Physical shipping + actions */}
        {!digital && (
          <div className="card p-5 lg:col-span-2">
            <SectionTitle>Shipping</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[["name", "Name"], ["phone", "Phone"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"], ["courier", "Courier"], ["trackingNumber", "Tracking number"]].map(([k, l]) => (
                <input key={k} className="input" placeholder={l} value={ship[k] || ""} onChange={(e) => setShip((s) => ({ ...s, [k]: e.target.value }))} />
              ))}
              <select className="input" value={ship.status || "pending"} onChange={(e) => setShip((s) => ({ ...s, status: e.target.value }))}>
                {SHIP_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn-primary mt-3 text-sm" disabled={busy} onClick={() => act({ shipping: ship }, "Shipping updated")}>Save shipping</button>
          </div>
        )}
      </div>

      {/* Download logs */}
      {order.downloadLogs?.length > 0 && (
        <div className="card p-5">
          <SectionTitle>Download log</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted"><tr><th className="py-1">When</th><th>Device</th><th>Browser</th><th>IP</th><th>Result</th></tr></thead>
              <tbody className="divide-y divide-line">
                {order.downloadLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5">{fmt(l.at)}</td>
                    <td>{l.device}</td>
                    <td>{l.browser}</td>
                    <td className="font-mono">{l.ip}</td>
                    <td>{l.ok ? <span className="text-emerald-600">ok</span> : <span className="text-red-600">{l.reason || "blocked"}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
