// FLOW: Storefront cart (/store/cart). Lists local cart items, removes, and checks out the
// whole cart in ONE Razorpay payment (POST /catalog/cart/order → pay → /catalog/cart/verify).
// Browse + cart are public; the login wall is here at "Proceed to pay".

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { Alert, Spinner, EmptyState } from "../../components/ui.jsx";
import { IconTrash, IconCart, IconLock, IconDownload, IconChat, IconShield, IconArrowLeft } from "../../components/icons.jsx";
import { motion, AnimatePresence, useReducedMotion } from "../../components/motion.jsx";
import { loadRazorpayScript } from "../../lib/razorpay.js";
import { rupees, typeLabel } from "../../lib/storeCategories.js";
import { typeVisual, COMBO_VISUAL, DOT_PATTERN } from "../../lib/resourceVisuals.js";

// A small colour-coded thumbnail so each cart line reads as a real product, not a text row.
function ItemThumb({ item }) {
  const v = item.kind === "combo" ? COMBO_VISUAL : typeVisual(item.resourceType);
  const Icon = v.Icon;
  return (
    <span style={{ background: v.bg }} className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-sm">
      <span className="absolute inset-0 opacity-20" style={DOT_PATTERN} />
      <Icon width={22} height={22} className="relative" />
    </span>
  );
}

// One cart line. Animates in/out (and reflows) so removing an item feels smooth, not jumpy.
function ItemRow({ item, onRemove, reduced }) {
  const anim = reduced
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: -24, transition: { duration: 0.2 } },
      };
  return (
    <motion.li
      {...anim}
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 shadow-soft transition-shadow hover:shadow-card"
    >
      <ItemThumb item={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          {item.kind === "combo" ? (
            <span className="store-pill">Combo pack</span>
          ) : (
            <span className="store-pill">{typeLabel(item.resourceType)}</span>
          )}
          {item.courseCode && <span className="store-pill">{item.courseCode}</span>}
          {item.productType === "physical" && (
            <span className="store-pill bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Physical</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="font-bold text-ink">
          {item.isPaid ? rupees(item.price) : <span className="text-store-700 dark:text-store-300">Free</span>}
        </span>
        <button
          onClick={onRemove}
          aria-label="Remove item"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <IconTrash width={16} height={16} />
        </button>
      </div>
    </motion.li>
  );
}

export default function Cart() {
  const { items, remove, clear, subtotalPaise } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
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
  const freeCount = items.length - paidCount;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl leading-tight text-ink">Your cart</h1>
          <p className="mt-1 text-sm text-muted">{items.length} item{items.length !== 1 ? "s" : ""} ready to check out.</p>
        </div>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-red-600"
        >
          <IconTrash width={15} height={15} /> Clear cart
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Left: items + shipping */}
        <div className="space-y-4">
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((i) => (
                <ItemRow key={i.id} item={i} onRemove={() => remove(i.id)} reduced={reduced} />
              ))}
            </AnimatePresence>
          </ul>

          {hasPhysical && (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <p className="font-semibold text-ink">Shipping address</p>
              <p className="mb-3 mt-0.5 text-xs text-muted">Only needed for your physical item(s) — digital files download instantly.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[["name", "Full name"], ["phone", "Phone number"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "Pincode"]].map(([k, l]) => (
                  <input
                    key={k}
                    className={`input ${k === "address" ? "sm:col-span-2" : ""}`}
                    placeholder={l}
                    value={shipping[k]}
                    onChange={(e) => setShipping((s) => ({ ...s, [k]: e.target.value }))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: sticky order summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h2 className="font-semibold text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Paid items ({paidCount})</dt>
                <dd className="font-medium text-ink">{rupees(subtotalPaise)}</dd>
              </div>
              {freeCount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Free items ({freeCount})</dt>
                  <dd className="font-medium text-emerald-600 dark:text-emerald-400">₹0</dd>
                </div>
              )}
            </dl>

            <div className="my-4 border-t border-line" />

            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-display text-2xl text-ink">{rupees(subtotalPaise)}</span>
            </div>

            <button
              onClick={checkout}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-storeaccent-400 to-storeaccent-600 py-3.5 text-sm font-semibold text-white shadow-soft transition-all hover:shadow-card active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Spinner /> : user ? <><IconLock width={15} height={15} /> Proceed to pay</> : <><IconCart width={15} height={15} /> Sign in to checkout</>}
            </button>

            <ul className="mt-4 space-y-2 text-xs text-muted">
              <li className="flex items-center gap-2"><IconShield width={14} height={14} className="shrink-0 text-store-600" /> Secure UPI / card payment via Razorpay</li>
              <li className="flex items-center gap-2"><IconDownload width={14} height={14} className="shrink-0 text-store-600" /> Instant download the moment you pay</li>
              <li className="flex items-center gap-2"><IconChat width={14} height={14} className="shrink-0 text-store-600" /> WhatsApp support if you get stuck</li>
            </ul>

            <Link
              to="/store"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-store-700 dark:hover:text-store-300"
            >
              <IconArrowLeft width={15} height={15} /> Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
