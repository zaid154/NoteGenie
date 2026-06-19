import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, PageHeader, Spinner, CheckoutSkeleton, Badge } from "../components/ui.jsx";
import MarketingShell from "../components/MarketingShell.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";

const PLAN_COPY = {
  pro: { name: "Pro", features: ["50 documents / month", "Unlimited tutor chat", "Unlimited quizzes"] },
  team: { name: "Team", features: ["200 documents / month", "Everything in Pro"] },
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function renewalDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function Checkout() {
  const [params] = useSearchParams();
  const planId = params.get("plan") || "pro";
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const catalogPlan = config?.catalog?.find((p) => p.id === planId);
  const apiPlan = config?.plans?.find((p) => p.id === planId);
  const planMeta = catalogPlan || apiPlan || PLAN_COPY[planId] || { name: planId, features: [] };

  useEffect(() => {
    api
      .get("/billing/public-config")
      .then((r) => setConfig(r.data))
      .catch(() => setError("Could not load billing configuration."))
      .finally(() => setLoading(false));
  }, []);

  async function pay() {
    if (!config?.configured) {
      setError("Razorpay is not configured. Add keys to .env.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) throw new Error("Could not load Razorpay checkout.");

      const { data: order } = await api.post("/billing/create-order", { plan: planId });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NoteGenie",
        description: `${planMeta.name} plan — 30 days`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: { color: "#4f46e5" },
        handler: async (response) => {
          try {
            await api.post("/billing/verify-payment", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan: planId,
            });
            await refreshUser();
            navigate("/billing?success=1", { replace: true });
          } catch (err) {
            setError(apiError(err));
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            navigate("/pricing?canceled=1", { replace: true });
          },
        },
      };

      const rz = new window.Razorpay(options);
      rz.on("payment.failed", (response) => {
        const msg =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed. Please try again.";
        setError(msg);
        setPaying(false);
      });
      rz.open();
    } catch (err) {
      setError(apiError(err));
      setPaying(false);
    }
  }

  return (
    <MarketingShell backTo="/pricing" backLabel="Plans" maxWidth="max-w-7xl">
      {loading ? (
        <CheckoutSkeleton />
      ) : (
        <div className="mx-auto max-w-5xl">
          <PageHeader
            title={`Checkout — ${planMeta.name}`}
            subtitle="Secure payment via Razorpay. Your plan is active for 30 days after payment."
          />

          {error && <Alert>{error}</Alert>}

          {!config?.configured && (
            <Alert type="warning">
              Razorpay keys are missing. Add <code className="text-xs">RAZORPAY_KEY_ID</code> and{" "}
              <code className="text-xs">RAZORPAY_KEY_SECRET</code> to <code className="text-xs">.env</code>.
            </Alert>
          )}

          <StaggerContainer className="mt-8 grid gap-8 lg:grid-cols-2">
            <StaggerItem>
              <div className="card-solid space-y-5 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-ink">Order summary</h2>
                  <Badge color="brand">{planMeta.name}</Badge>
                </div>
                <div className="rounded-lg border border-line bg-canvas/40 p-4">
                  <p className="text-sm text-muted">Plan price</p>
                  <p className="mt-1 text-3xl font-bold text-ink">
                    {apiPlan?.displayPrice || catalogPlan?.displayPrice || "—"}
                    <span className="text-sm font-normal text-muted"> {catalogPlan?.period || "/ 30 days"}</span>
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-muted">
                  {planMeta.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-indigo-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Valid until</span>
                    <span className="font-medium text-ink">{renewalDate()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Account</span>
                    <span className="font-medium text-ink">{user?.email}</span>
                  </div>
                  {config?.supportEmail && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">Support</span>
                      <a
                        href={`mailto:${config.supportEmail}`}
                        className="font-medium text-indigo-600 underline dark:text-indigo-400"
                      >
                        {config.supportEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="card-solid flex flex-col justify-between p-6 lg:min-h-[280px]">
                <div>
                  <p className="text-sm font-semibold text-ink">Payment</p>
                  <p className="mt-2 text-sm text-muted">
                    You will be redirected to Razorpay to complete payment. Cards, UPI, and netbanking
                    are supported for Indian payments.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-8 w-full py-3"
                  disabled={paying || !config?.configured}
                  onClick={pay}
                >
                  {paying ? <Spinner /> : `Pay ${apiPlan?.displayPrice || ""} with Razorpay`}
                </button>
                <p className="mt-4 text-center text-xs text-muted">
                  By paying you agree to our{" "}
                  <Link to="/terms" className="underline hover:text-ink">
                    Terms
                  </Link>
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      )}
    </MarketingShell>
  );
}
