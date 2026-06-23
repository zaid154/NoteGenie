// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Pricing). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { useEffect, useState } from "react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api } from "../api/client.js";

import { useAuth } from "../context/AuthContext.jsx";

import { Alert, Spinner, Badge, PlanCardSkeleton } from "../components/ui.jsx";

import MarketingShell from "../components/MarketingShell.jsx";

import { StaggerContainer, StaggerItem, ScrollReveal } from "../components/motion.jsx";



const PLANS = [

  {

    id: "free",

    name: "Free",

    price: "₹0",

    period: "forever",

    features: ["3 documents / month", "20 tutor messages", "5 quizzes", "Flashcards & notes"],

  },

  {

    id: "pro",

    name: "Pro",

    price: "₹749",

    period: "/ 30 days",

    popular: true,

    features: ["50 documents / month", "Unlimited tutor chat", "Unlimited quizzes", "Priority AI failover"],

  },

  {

    id: "team",

    name: "Team",

    price: "₹2,499",

    period: "/ 30 days",

    features: ["200 documents / month", "5 team seats (soon)", "Everything in Pro", "Shared library"],

  },

];



const COMPARE_ROWS = [

  { label: "Documents / month", free: "3", pro: "50", team: "200" },

  { label: "Tutor messages", free: "20", pro: "Unlimited", team: "Unlimited" },

  { label: "Quizzes", free: "5", pro: "Unlimited", team: "Unlimited" },

  { label: "Flashcards & notes", free: "✓", pro: "✓", team: "✓" },

  { label: "Shared library", free: "—", pro: "—", team: "Soon" },

];



export default function Pricing() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { user } = useAuth();

  const [loading, setLoading] = useState(null);

  const [configLoading, setConfigLoading] = useState(true);

  const [error, setError] = useState("");

  const [configured, setConfigured] = useState(false);

  const [apiPlans, setApiPlans] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const [supportEmail, setSupportEmail] = useState("");



  useEffect(() => {

    api

      .get("/billing/public-config")

      .then((r) => {

        setConfigured(Boolean(r.data.configured));

        setApiPlans(r.data.plans || []);
        setCatalog(r.data.catalog?.length ? r.data.catalog : PLANS.map((p) => ({
          id: p.id,
          name: p.name,
          displayPrice: p.price,
          period: p.period,
          features: p.features,
          popular: p.popular,
          billingEnabled: p.id !== "free",
        })));

        setSupportEmail(r.data.supportEmail || "");

      })

      .catch(() => setError("Could not load billing configuration."))

      .finally(() => setConfigLoading(false));

  }, []);



  function displayPrice(planId, fallback) {

    const fromApi = apiPlans.find((p) => p.id === planId)?.displayPrice;

    return fromApi || fallback;

  }



  function selectPlan(plan) {

    if (plan === "free") {

      navigate(user ? "/app" : "/register");

      return;

    }

    if (!user) {

      navigate("/login", { state: { from: { pathname: "/pricing" } } });

      return;

    }

    if (!configured) {

      setError("Paid plans require Razorpay configuration. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.");

      return;

    }

    navigate(`/checkout?plan=${plan}`);

  }



  return (

    <MarketingShell

      backTo="/"

      backLabel="Home"

      extraHeader={

        user ? (

          <Link to="/app" className="btn-ghost hidden sm:inline-flex text-sm">

            Library

          </Link>

        ) : null

      }

    >

      <div className="text-center">

        <StaggerContainer>

          <StaggerItem>

            <h1 className="text-3xl font-semibold tracking-tight text-ink lg:text-4xl">Choose your plan</h1>

          </StaggerItem>

          <StaggerItem>

            <p className="mt-2 text-muted">Start free. Upgrade anytime with Razorpay — billed in INR for 30 days.</p>

          </StaggerItem>

          {user && (

            <StaggerItem>

              <div className="mt-4 flex justify-center">

                <Badge color="brand">Current: {user.plan || "free"}</Badge>

              </div>

            </StaggerItem>

          )}

        </StaggerContainer>

      </div>



      {searchParams.get("canceled") && (

        <div className="mt-6">

          <Alert type="info">Payment was canceled. No charges were made.</Alert>

        </div>

      )}

      {!configLoading && !configured && (

        <div className="mt-6">

          <Alert type="warning">

            Online checkout is not configured. Add <code className="text-xs">RAZORPAY_KEY_ID</code> and{" "}

            <code className="text-xs">RAZORPAY_KEY_SECRET</code> to <code className="text-xs">.env</code>.

            {supportEmail && (

              <>

                {" "}

                Need help? Contact{" "}

                <a href={`mailto:${supportEmail}`} className="font-medium underline">

                  {supportEmail}

                </a>

                .

              </>

            )}

          </Alert>

        </div>

      )}

      {supportEmail && configured && (

        <p className="mt-4 text-center text-sm text-muted">

          Questions?{" "}

          <a href={`mailto:${supportEmail}`} className="font-medium text-indigo-600 underline dark:text-indigo-400">

            {supportEmail}

          </a>

        </p>

      )}

      {error && (

        <div className="mt-6">

          <Alert>{error}</Alert>

        </div>

      )}



      <StaggerContainer className={`mt-12 grid gap-6 ${catalog.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>

        {configLoading

          ? [0, 1, 2].map((i) => <PlanCardSkeleton key={i} />)

          : catalog.map((p) => {

              const isCurrent = user?.plan === p.id;

              const paidDisabled = p.billingEnabled !== false && p.id !== "free" && !configured;

              const showPopular = p.popular && !isCurrent;

              return (

                <StaggerItem key={p.id}>

                  <div

                    className={`card-solid relative flex h-full flex-col p-8 transition-shadow hover:shadow-soft ${

                      p.popular ? "border-2 border-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900/50" : ""

                    }`}

                  >

                    {showPopular && (

                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">

                        Popular

                      </span>

                    )}

                    {isCurrent && (

                      <span className="absolute right-4 top-4">

                        <Badge color="green">Current plan</Badge>

                      </span>

                    )}

                    <h2 className="text-xl font-bold">{p.name}</h2>

                    <p className="mt-3">

                      <span className="text-4xl font-bold text-ink">{displayPrice(p.id, p.displayPrice || p.price)}</span>

                      <span className="text-muted">{p.period || ""}</span>

                    </p>

                    <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">

                      {p.features.map((f) => (

                        <li key={f} className="flex items-center gap-2">

                          <span className="text-indigo-600">✓</span> {f}

                        </li>

                      ))}

                    </ul>

                    <button

                      type="button"

                      className={`mt-8 w-full ${p.popular ? "btn-primary" : "btn-outline"}`}

                      disabled={loading === p.id || isCurrent || paidDisabled}

                      onClick={() => {

                        setLoading(p.id);

                        selectPlan(p.id);

                        setLoading(null);

                      }}

                    >

                      {loading === p.id ? (

                        <Spinner />

                      ) : isCurrent ? (

                        "Current plan"

                      ) : p.id === "free" ? (

                        user ? "Go to library" : "Start free"

                      ) : !user ? (

                        "Log in to subscribe"

                      ) : paidDisabled ? (

                        "Unavailable"

                      ) : (

                        `Get ${p.name}`

                      )}

                    </button>

                  </div>

                </StaggerItem>

              );

            })}

      </StaggerContainer>



      <ScrollReveal delay={0.1}>

        <section className="mt-16">

          <h2 className="text-center text-lg font-semibold text-ink">Compare plans</h2>

          <div className="panel mt-6 overflow-x-auto">

            <table className="w-full min-w-[480px] text-left text-sm">

              <thead>

                <tr className="border-b border-line">

                  <th className="px-4 py-3 font-semibold text-ink">Feature</th>

                  <th className="px-4 py-3 font-semibold text-ink">Free</th>

                  <th className="px-4 py-3 font-semibold text-indigo-600">Pro</th>

                  <th className="px-4 py-3 font-semibold text-ink">Team</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-line">

                {COMPARE_ROWS.map((row) => (

                  <tr key={row.label} className="hover:bg-ink/[0.02]">

                    <td className="px-4 py-3 text-muted">{row.label}</td>

                    <td className="px-4 py-3">{row.free}</td>

                    <td className="px-4 py-3 font-medium text-ink">{row.pro}</td>

                    <td className="px-4 py-3">{row.team}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

      </ScrollReveal>



      {user && (

        <p className="mt-8 text-center text-sm text-muted">

          <Link to="/billing" className="font-medium text-indigo-600 underline dark:text-indigo-400">

            Manage billing & usage

          </Link>

        </p>

      )}

    </MarketingShell>

  );

}


