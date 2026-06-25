// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (CustomPlanForm). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Spinner } from "../ui.jsx";
import { IconPlus, IconTrash, IconX } from "../icons.jsx";

const RESERVED_IDS = ["free", "pro", "team"];
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;

export const EMPTY_CUSTOM_PLAN = {
  id: "",
  name: "",
  rupees: "",
  durationDays: "30",
  documents: "50",
  tutorMessages: "",
  quizzes: "",
  tutorUnlimited: true,
  quizzesUnlimited: true,
  features: [""],
  popular: false,
  enabled: true,
  sortOrder: "100",
};

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 31);
}

function planToForm(plan) {
  const lim = plan.limits || {};
  const tutorUnlimited = lim.tutorMessages === -1 || lim.tutorMessages == null;
  const quizzesUnlimited = lim.quizzes === -1 || lim.quizzes == null;
  return {
    id: plan.id,
    name: plan.name || "",
    rupees: String(Math.round((plan.amount || 0) / 100)),
    durationDays: String(plan.durationDays ?? 30),
    documents: lim.documents === -1 || lim.documents == null ? "" : String(lim.documents),
    tutorMessages: tutorUnlimited ? "" : String(lim.tutorMessages ?? ""),
    quizzes: quizzesUnlimited ? "" : String(lim.quizzes ?? ""),
    tutorUnlimited,
    quizzesUnlimited,
    features: plan.features?.length ? [...plan.features] : [""],
    popular: Boolean(plan.popular),
    enabled: plan.enabled !== false,
    sortOrder: String(plan.sortOrder ?? 100),
  };
}

function validateForm(form, { editing }) {
  const errors = {};
  const id = form.id.trim().toLowerCase();

  if (!editing) {
    if (!id) errors.id = "Plan id is required";
    else if (!SLUG_RE.test(id)) errors.id = "Use lowercase letters, numbers, hyphens (2–31 chars)";
    else if (RESERVED_IDS.includes(id)) errors.id = "Reserved — choose another id (not free, pro, team)";
  }

  if (!form.name.trim()) errors.name = "Display name is required";

  const price = Number(form.rupees);
  if (!Number.isFinite(price) || price <= 0) errors.rupees = "Enter a price greater than ₹0";

  const days = Number(form.durationDays);
  if (!Number.isFinite(days) || days < 1 || days > 365) errors.durationDays = "Duration must be 1–365 days";

  const features = form.features.map((f) => f.trim()).filter(Boolean);
  if (features.length === 0) errors.features = "Add at least one feature";

  return errors;
}

function formToPayload(form) {
  const features = form.features.map((f) => f.trim()).filter(Boolean).slice(0, 12);
  return {
    id: form.id.trim().toLowerCase(),
    name: form.name.trim(),
    rupees: Number(form.rupees),
    durationDays: Number(form.durationDays) || 30,
    limits: {
      documents: form.documents === "" ? -1 : Number(form.documents),
      tutorMessages: form.tutorUnlimited ? -1 : Number(form.tutorMessages || 0),
      quizzes: form.quizzesUnlimited ? -1 : Number(form.quizzes || 0),
    },
    features,
    popular: form.popular,
    enabled: form.enabled,
    sortOrder: Number(form.sortOrder) || 100,
  };
}

function LimitField({ label, hint, value, onChange, unlimited, onUnlimitedChange, unlimitedLabel = "Unlimited" }) {
  return (
    <div className="rounded-xl border border-line bg-canvas/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label className="label mb-0">{label}</label>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={unlimited} onChange={(e) => onUnlimitedChange(e.target.checked)} />
          {unlimitedLabel}
        </label>
      </div>
      <input
        type="number"
        min="0"
        className="input mt-3"
        placeholder={unlimited ? "Unlimited" : "e.g. 50"}
        value={unlimited ? "" : value}
        disabled={unlimited}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PlanPreview({ form }) {
  const features = form.features.map((f) => f.trim()).filter(Boolean);
  const price = Number(form.rupees);
  const displayPrice = Number.isFinite(price) && price > 0 ? `₹${price.toLocaleString("en-IN")}` : "₹—";
  const period = form.durationDays ? `/ ${form.durationDays} days` : "/ 30 days";

  return (
    <div className="card-solid relative flex h-full flex-col p-6">
      {form.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-accent-600 px-3 py-1 text-xs font-semibold text-white">
          Popular
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
      <h3 className="mt-2 text-xl font-bold text-ink">{form.name.trim() || "Plan name"}</h3>
      <p className="mt-2">
        <span className="text-3xl font-bold text-ink">{displayPrice}</span>
        <span className="text-muted">{period}</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
        {features.length ? (
          features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-accent-600">✓</span>
              <span>{f}</span>
            </li>
          ))
        ) : (
          <li className="text-xs italic">Features will appear here</li>
        )}
      </ul>
      {!form.enabled && (
        <div className="mt-4">
          <Badge color="gray">Hidden from pricing</Badge>
        </div>
      )}
    </div>
  );
}

export function CustomPlanModal({ open, editingPlan, saving, onClose, onSubmit }) {
  const editing = Boolean(editingPlan);
  const [form, setForm] = useState(EMPTY_CUSTOM_PLAN);
  const [autoSlug, setAutoSlug] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    if (editingPlan) {
      setForm(planToForm(editingPlan));
      setAutoSlug(false);
    } else {
      setForm(EMPTY_CUSTOM_PLAN);
      setAutoSlug(true);
    }
  }, [open, editingPlan]);

  const previewForm = useMemo(() => form, [form]);

  function setField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoSlug && !editing) {
        next.id = slugify(value);
      }
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setFeature(i, value) {
    setForm((prev) => {
      const features = [...prev.features];
      features[i] = value;
      return { ...prev, features };
    });
  }

  function addFeature() {
    setForm((prev) => ({ ...prev, features: [...prev.features, ""] }));
  }

  function removeFeature(i) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== i),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validateForm(form, { editing });
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    onSubmit(formToPayload(form), { editing, id: editingPlan?.id });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onClick={onClose}>
      <div
        className="card w-full max-w-4xl animate-fade-in shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-plan-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="custom-plan-title" className="font-display text-lg font-600 text-ink">
              {editing ? "Edit custom plan" : "Create custom plan"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Shows on the public Pricing page and Razorpay checkout.
            </p>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
            <IconX width={18} height={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="space-y-8">
              {/* Identity */}
              <section>
                <h3 className="text-sm font-600 uppercase tracking-wide text-muted">Identity</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="plan-name">Display name</label>
                    <input
                      id="plan-name"
                      className={`input ${fieldErrors.name ? "border-red-400" : ""}`}
                      placeholder="Student"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      required
                    />
                    {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="label mb-0" htmlFor="plan-id">Plan id (slug)</label>
                      {!editing && (
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={autoSlug}
                            onChange={(e) => setAutoSlug(e.target.checked)}
                          />
                          Auto from name
                        </label>
                      )}
                    </div>
                    <input
                      id="plan-id"
                      className={`input font-mono text-sm ${fieldErrors.id ? "border-red-400" : ""}`}
                      placeholder="student"
                      value={form.id}
                      disabled={editing}
                      onChange={(e) => setField("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      required={!editing}
                    />
                    {fieldErrors.id ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.id}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Used in URLs & checkout. Cannot change after create.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Pricing */}
              <section>
                <h3 className="text-sm font-600 uppercase tracking-wide text-muted">Pricing</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="plan-price">Price (₹)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                      <input
                        id="plan-price"
                        type="number"
                        min="1"
                        step="1"
                        className={`input pl-8 ${fieldErrors.rupees ? "border-red-400" : ""}`}
                        placeholder="499"
                        value={form.rupees}
                        onChange={(e) => setField("rupees", e.target.value)}
                        required
                      />
                    </div>
                    {fieldErrors.rupees && <p className="mt-1 text-xs text-red-600">{fieldErrors.rupees}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="plan-duration">Valid for (days)</label>
                    <input
                      id="plan-duration"
                      type="number"
                      min="1"
                      max="365"
                      className={`input ${fieldErrors.durationDays ? "border-red-400" : ""}`}
                      value={form.durationDays}
                      onChange={(e) => setField("durationDays", e.target.value)}
                      required
                    />
                    {fieldErrors.durationDays && <p className="mt-1 text-xs text-red-600">{fieldErrors.durationDays}</p>}
                  </div>
                </div>
              </section>

              {/* Limits */}
              <section>
                <h3 className="text-sm font-600 uppercase tracking-wide text-muted">Monthly limits</h3>
                <p className="mt-1 text-xs text-muted">What users on this plan can do each month.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <LimitField
                    label="Documents"
                    hint="Uploads per month"
                    value={form.documents}
                    onChange={(v) => setField("documents", v)}
                    unlimited={form.documents === ""}
                    onUnlimitedChange={(on) => setField("documents", on ? "" : "50")}
                    unlimitedLabel="No cap"
                  />
                  <LimitField
                    label="Tutor messages"
                    hint="AI tutor chat"
                    value={form.tutorMessages}
                    onChange={(v) => setField("tutorMessages", v)}
                    unlimited={form.tutorUnlimited}
                    onUnlimitedChange={(on) => {
                      setForm((prev) => ({
                        ...prev,
                        tutorUnlimited: on,
                        tutorMessages: on ? "" : "100",
                      }));
                    }}
                  />
                  <LimitField
                    label="Quizzes"
                    hint="Quizzes generated"
                    value={form.quizzes}
                    onChange={(v) => setField("quizzes", v)}
                    unlimited={form.quizzesUnlimited}
                    onUnlimitedChange={(on) => {
                      setForm((prev) => ({
                        ...prev,
                        quizzesUnlimited: on,
                        quizzes: on ? "" : "20",
                      }));
                    }}
                  />
                </div>
              </section>

              {/* Features */}
              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-600 uppercase tracking-wide text-muted">Features</h3>
                    <p className="mt-1 text-xs text-muted">Shown as bullet points on the Pricing card.</p>
                  </div>
                  <button type="button" className="btn-outline text-xs" onClick={addFeature}>
                    <IconPlus width={14} height={14} />
                    Add line
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {form.features.map((feat, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input flex-1 text-sm"
                        placeholder="e.g. 30 documents / month"
                        value={feat}
                        onChange={(e) => setFeature(i, e.target.value)}
                      />
                      {form.features.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost shrink-0 p-2 text-red-500"
                          onClick={() => removeFeature(i)}
                          aria-label="Remove feature"
                        >
                          <IconTrash width={16} height={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {fieldErrors.features && <p className="mt-2 text-xs text-red-600">{fieldErrors.features}</p>}
              </section>

              {/* Display options */}
              <section className="rounded-xl border border-line bg-canvas/20 p-4">
                <h3 className="text-sm font-600 text-ink">Display options</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-canvas/40 p-3">
                    <input type="checkbox" checked={form.popular} onChange={(e) => setField("popular", e.target.checked)} />
                    <span>
                      <span className="block text-sm font-500 text-ink">Mark as popular</span>
                      <span className="text-xs text-muted">Highlight badge on Pricing page</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-canvas/40 p-3">
                    <input type="checkbox" checked={form.enabled} onChange={(e) => setField("enabled", e.target.checked)} />
                    <span>
                      <span className="block text-sm font-500 text-ink">Visible on Pricing</span>
                      <span className="text-xs text-muted">Uncheck to hide without deleting</span>
                    </span>
                  </label>
                </div>
                <div className="mt-4">
                  <label className="label" htmlFor="plan-sort">Sort order</label>
                  <input
                    id="plan-sort"
                    type="number"
                    className="input max-w-[140px]"
                    value={form.sortOrder}
                    onChange={(e) => setField("sortOrder", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted">Lower numbers appear first (default 100).</p>
                </div>
              </section>
            </div>

            <div className="hidden lg:block">
              <PlanPreview form={previewForm} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary min-w-[140px]" disabled={saving}>
              {saving ? <Spinner /> : editing ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatLimit(val) {
  if (val === -1 || val == null) return "∞";
  return String(val);
}

export function CustomPlanList({ plans, onEdit, onDelete, deletingId }) {
  if (!plans.length) {
    return (
      <div className="card p-8 text-center">
        <p className="font-500 text-ink">No custom plans yet</p>
        <p className="mt-1 text-sm text-muted">
          Create plans like Student, Enterprise, or Annual — they appear alongside Free, Pro, and Team.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((p) => {
        const lim = p.limits || {};
        return (
          <div key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-600 text-ink">{p.name}</h3>
                  {p.popular && <Badge color="brand">Popular</Badge>}
                  {p.enabled === false && <Badge color="gray">Hidden</Badge>}
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted">{p.id}</p>
              </div>
              <p className="text-right text-lg font-700 text-ink">
                ₹{Math.round((p.amount || 0) / 100)}
                <span className="block text-xs font-400 text-muted">/ {p.durationDays || 30}d</span>
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-canvas/50 py-2">
                <p className="text-muted">Docs</p>
                <p className="font-600 text-ink">{formatLimit(lim.documents)}</p>
              </div>
              <div className="rounded-lg bg-canvas/50 py-2">
                <p className="text-muted">Tutor</p>
                <p className="font-600 text-ink">{formatLimit(lim.tutorMessages)}</p>
              </div>
              <div className="rounded-lg bg-canvas/50 py-2">
                <p className="text-muted">Quizzes</p>
                <p className="font-600 text-ink">{formatLimit(lim.quizzes)}</p>
              </div>
            </div>

            {p.features?.length > 0 && (
              <ul className="mt-4 flex-1 space-y-1 text-xs text-muted">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="truncate">✓ {f}</li>
                ))}
                {p.features.length > 4 && (
                  <li className="text-muted">+{p.features.length - 4} more</li>
                )}
              </ul>
            )}

            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <button type="button" className="btn-outline flex-1 text-sm" onClick={() => onEdit(p)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-outline text-sm text-red-600"
                disabled={deletingId === p.id}
                onClick={() => onDelete(p.id)}
              >
                {deletingId === p.id ? <Spinner size={14} /> : <IconTrash width={14} height={14} />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { formToPayload, planToForm };

