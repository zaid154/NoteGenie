// FLOW: Student resource detail. Free → Download. Paid & not owned → Buy (Razorpay one-time).
// Paid & owned → Download. Ownership is checked via /catalog/me/purchases on load.

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Alert, Spinner, Badge, EmptyState } from "../components/ui.jsx";
import { IconArrowLeft, IconDownload, IconCoins, IconCart, IconCheck } from "../components/icons.jsx";
import { loadRazorpayScript, downloadResourceFile } from "../lib/razorpay.js";
import { typeLabel as TYPE_LABEL_FN } from "../lib/storeCategories.js";

const TYPE_LABEL = {
  question_paper: "Question paper", solved_assignment: "Solved assignment", assignment: "Assignment",
  book: "Book", guide: "Guide", notes: "Notes", project: "Project", synopsis: "Synopsis",
};

export default function ResourceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add, has } = useCart();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get(`/catalog/resources/${id}`).then((r) => r.data.resource),
      api.get("/catalog/me/purchases").then((r) => r.data.purchases || []).catch(() => []),
    ]).then(([res, purchases]) => {
      setResource(res);
      setOwned(purchases.some((p) => String(p.resource.id) === String(id)));
    }).catch((e) => setError(apiError(e))).finally(() => setLoading(false));
  }, [id]);

  async function download() {
    setBusy(true); setError("");
    try {
      await downloadResourceFile(api, id, resource.fileName);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    setBusy(true); setError("");
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load Razorpay checkout.");
      const { data: order } = await api.post("/catalog/resources/order", { resourceId: id });
      const rz = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NoteGenie",
        description: resource.title,
        order_id: order.orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#0d9488" },
        handler: async (response) => {
          try {
            await api.post("/catalog/resources/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              resourceId: id,
            });
            setOwned(true);
          } catch (e) {
            setError(apiError(e));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on("payment.failed", (r) => { setError(r?.error?.description || "Payment failed."); setBusy(false); });
      rz.open();
    } catch (e) {
      setError(apiError(e));
      setBusy(false);
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Spinner size={24} /></div>;
  if (!resource) return <div className="mx-auto max-w-3xl"><EmptyState title="Resource not found" /></div>;

  const canDownload = !resource.isPaid || owned;
  const inCart = has(resource.id);

  function addToCart() {
    add({
      kind: "resource",
      id: resource.id,
      title: resource.title,
      price: resource.price,
      isPaid: resource.isPaid,
      resourceType: resource.resourceType,
      courseCode: resource.courseCode,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/store" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-store-700 dark:hover:text-store-300">
        <IconArrowLeft width={16} height={16} /> Back to store
      </Link>

      <div className="panel space-y-4 p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="gray">{TYPE_LABEL[resource.resourceType] || TYPE_LABEL_FN(resource.resourceType)}</Badge>
          {resource.courseCode && <span className="store-pill">{resource.courseCode}</span>}
          {resource.year && <Badge color="gray">{resource.year}</Badge>}
          {resource.isPaid ? <Badge color="amber">₹{(resource.price / 100).toFixed(0)}</Badge> : <Badge color="green">Free</Badge>}
        </div>
        <h1 className="text-2xl font-semibold text-ink">{resource.title}</h1>
        {resource.description && <p className="text-muted">{resource.description}</p>}
        <p className="text-xs text-muted">
          {resource.fileName} {resource.size ? `· ${(resource.size / 1024 / 1024).toFixed(1)} MB` : ""}{resource.pages ? ` · ${resource.pages} pages` : ""}
        </p>

        {error && <Alert>{error}</Alert>}

        {canDownload ? (
          <button onClick={download} className="btn-primary w-full py-3" disabled={busy}>
            {busy ? <Spinner /> : <><IconDownload width={16} height={16} /> Download</>}
          </button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => (inCart ? navigate("/store/cart") : addToCart())}
              className="btn-outline flex-1 py-3"
              disabled={busy}
            >
              {inCart ? <><IconCheck width={16} height={16} /> Go to cart</> : <><IconCart width={16} height={16} /> Add to cart</>}
            </button>
            <button onClick={buy} className="store-btn-accent flex-1 py-3" disabled={busy}>
              {busy ? <Spinner /> : <><IconCoins width={16} height={16} /> Buy now · ₹{(resource.price / 100).toFixed(0)}</>}
            </button>
          </div>
        )}
        {owned && <p className="text-center text-xs text-emerald-600">You own this resource — find it anytime in My downloads.</p>}
      </div>
    </div>
  );
}
