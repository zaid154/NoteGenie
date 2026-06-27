// FLOW: Storefront cart (/store/cart). Lists local cart items, removes, and checks out the
// whole cart in ONE Razorpay payment (POST /catalog/cart/order → pay → /catalog/cart/verify).
// Browse + cart are public; the login wall is here at "Proceed to pay".

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { Alert, Spinner, EmptyState } from "../../components/ui.jsx";
import { IconTrash, IconCart, IconLock, IconDownload, IconChat } from "../../components/icons.jsx";
import { loadRazorpayScript } from "../../lib/razorpay.js";
import { rupees, typeLabel } from "../../lib/storeCategories.js";

export default function Cart() {
  const { items, remove, clear, subtotalPaise } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shipping, setShipping] = useState({ name: "", phone: "", address: "", city: "", state: "", country: "India", pincode: "" });

  const hasPhysical = items.some((i) => i.productType === "physical");

  async function checkout() {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (hasPhysical) {
      const required = ["name", "phone", "address", "city", "state", "pincode"];
      if (required.some((k) => !String(shipping[k] || "").trim())) {
        setError("Please fill the shipping address for your physical item(s).");
        return;
      }
    }
    setBusy(true); setError("");
    try {
      const resourceIds = items.filter((i) => i.kind === "resource").map((i) => i.id);
      const comboIds = items.filter((i) => i.kind === "combo").map((i) => i.id);
      const { data } = await api.post("/catalog/cart/order", { resourceIds, comboIds, shipping: hasPhysical ? shipping : undefined });

      // All free / already owned → granted immediately, no payment.
      if (!data.paid) {
        clear();
        navigate("/my-downloads");
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load Razorpay checkout.");

      const rz = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NoteGenie",
        description: `${data.count} item(s)`,
        order_id: data.orderId,
        prefill: { name: user.name || "", email: user.email || "" },
        theme: { color: "#0d9488" },
        handler: async (response) => {
          try {
            await api.post("/catalog/cart/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            clear();
            navigate("/my-downloads");
          } catch (e) {
            setError(apiError(e));
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

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={IconCart}
          title="Your cart is empty"
          subtitle="Browse the store to add study material."
          action={<Link to="/store" className="btn-primary">Browse store</Link>}
        />
      </div>
    );
  }

  const paidCount = items.filter((i) => i.isPaid).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-ink">Your cart ({items.length})</h1>
      {error && <Alert>{error}</Alert>}

      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{i.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                {i.kind === "combo" ? <span className="store-pill">Combo</span> : <span>{typeLabel(i.resourceType)}</span>}
                {i.courseCode && <span className="store-pill">{i.courseCode}</span>}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-semibold text-ink">{i.isPaid ? rupees(i.price) : "Free"}</span>
              <button onClick={() => remove(i.id)} className="text-muted hover:text-red-600" aria-label="Remove"><IconTrash width={16} height={16} /></button>
            </span>
          </li>
        ))}
      </ul>

      {hasPhysical && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="mb-3 font-semibold text-ink">Shipping address</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["name", "Full name"], ["phone", "Phone"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]].map(([k, l]) => (
              <input key={k} className="input" placeholder={l} value={shipping[k]} onChange={(e) => setShipping((s) => ({ ...s, [k]: e.target.value }))} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Digital items don't need an address — this is only for your physical item(s).</p>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between text-lg">
          <span className="font-medium text-ink">Subtotal</span>
          <span className="font-bold text-ink">{rupees(subtotalPaise)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {paidCount} paid item(s){items.length - paidCount > 0 ? ` · ${items.length - paidCount} free` : ""}. UPI / cards via Razorpay.
        </p>
        <button onClick={checkout} className="store-btn-accent mt-4 w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : user ? "Proceed to pay" : "Sign in to checkout"}
        </button>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><IconLock width={12} height={12} /> Secure payment</span>
          <span className="inline-flex items-center gap-1"><IconDownload width={12} height={12} /> Instant download</span>
          <span className="inline-flex items-center gap-1"><IconChat width={12} height={12} /> WhatsApp support</span>
        </div>
        <Link to="/store" className="mt-2 block text-center text-sm text-muted hover:text-store-700">Continue shopping</Link>
      </div>
    </div>
  );
}
