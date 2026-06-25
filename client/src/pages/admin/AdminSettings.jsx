// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (AdminSettings). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

// AdminSettings: Gemini key pool, model, audit log, and rate limits.
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, Spinner, PageLoader, PageHeader, SectionTitle } from "../../components/ui.jsx";
import { IconSettings, IconSparkles, IconCoins, IconActivity, IconTrash, IconPlus } from "../../components/icons.jsx";

const DEFAULT_RATE = { input: 0.3, output: 2.5 };

function rateForModel(model, pricing, fallback) {
  if (!pricing) return fallback || DEFAULT_RATE;
  if (pricing[model]) return pricing[model];
  const partial = Object.keys(pricing).find((k) => model.includes(k));
  return partial ? pricing[partial] : fallback || DEFAULT_RATE;
}

function statusBadge(status) {
  const map = {
    ok: { color: "green", label: "OK" },
    cooldown: { color: "amber", label: "Cooldown" },
    failed: { color: "amber", label: "Failed" },
    disabled: { color: "gray", label: "Disabled" },
  };
  const s = map[status] || map.ok;
  return <Badge color={s.color}>{s.label}</Badge>;
}

function testResultBadge(ok) {
  return ok ? <Badge color="green">OK</Badge> : <Badge color="red">Failed</Badge>;
}

function testResultRowClass(ok) {
  return ok
    ? "border-l-2 border-emerald-500 bg-emerald-500/5"
    : "border-l-2 border-red-500 bg-red-500/5";
}

const SECTIONS = {
  keys: { title: "AI keys", subtitle: "Gemini API key pool, model selection, and failover." },
  audit: { title: "Audit log", subtitle: "Admin actions across the platform." },
  "rate-limit": { title: "Rate limits", subtitle: "AI generation limits per user." },
  storefront: { title: "Storefront", subtitle: "Public store: utility bar, WhatsApp, hero & socials." },
};

const STOREFRONT_FIELDS = [
  ["utilityBarText", "Utility bar text", "India's #1 study material store"],
  ["whatsappNumber", "WhatsApp number (e.g. 9193…)", "919350849407"],
  ["supportEmail", "Support email", "support@example.com"],
  ["heroTitle", "Hero title", "Solved assignments, papers & books"],
  ["heroSubtitle", "Hero subtitle", "Everything you need to score better"],
  ["heroBannerUrl", "Hero banner image URL", "https://…"],
  ["instagram", "Instagram URL", ""],
  ["facebook", "Facebook URL", ""],
  ["youtube", "YouTube URL", ""],
  ["telegram", "Telegram URL", ""],
];

export default function AdminSettings() {
  const { section: sectionParam = "keys" } = useParams();
  const invalidSection = sectionParam && !SECTIONS[sectionParam];
  const section = SECTIONS[sectionParam] ? sectionParam : "keys";
  const { title, subtitle } = SECTIONS[section];
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [apiKeys, setApiKeys] = useState([]);
  const [poolSize, setPoolSize] = useState(0);
  const [models, setModels] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [defaultPricing, setDefaultPricing] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiRateLimitMax, setAiRateLimitMax] = useState("120");
  const [aiRateLimitWindowMinutes, setAiRateLimitWindowMinutes] = useState("15");
  const [savingRateLimit, setSavingRateLimit] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [togglingAi, setTogglingAi] = useState(false);
  const [storefront, setStorefront] = useState({});
  const [savingStore, setSavingStore] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [editingKeyId, setEditingKeyId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [encryptionWarning, setEncryptionWarning] = useState("");

  async function load() {
    try {
      const { data } = await api.get("/admin/settings");
      setApiKeys(data.apiKeys || []);
      setPoolSize(data.poolSize || 0);
      setEncryptionWarning(data.encryptionWarning || "");
      setModel(data.geminiModel || "gemini-2.5-flash");
      setPricing(data.pricing || null);
      if (data.defaultPricing) setDefaultPricing(data.defaultPricing);
      setAiRateLimitMax(String(data.aiRateLimitMax ?? 120));
      setAiRateLimitWindowMinutes(String(data.aiRateLimitWindowMinutes ?? 15));
      setAiEnabled(data.aiEnabled !== false);
      setStorefront(data.storefront || {});
      if (data.hasApiKey) {
        try {
          const m = await api.get("/admin/models");
          setModels(m.data.models);
        } catch {
          setModels(["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]);
        }
      }
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadAudit(p = 1) {
    try {
      const { data } = await api.get("/admin/audit-log", { params: { page: p, limit: 20 } });
      setAuditLogs(data.logs);
      setAuditPage(data.page);
      setAuditTotalPages(data.totalPages || 1);
    } catch (e) {
      setError(apiError(e));
    }
  }

  useEffect(() => {
    if (section === "audit") loadAudit(auditPage);
  }, [section, auditPage]);

  async function patchKey(keyId, patch) {
    try {
      const { data } = await api.patch(`/admin/settings/keys/${keyId}`, patch);
      setApiKeys(data.apiKeys);
      setSuccess("Key updated.");
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function moveKeyPriority(keyId, direction) {
    const sorted = [...apiKeys].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((k) => k.id === keyId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await patchKey(a.id, { priority: b.priority });
    await patchKey(b.id, { priority: a.priority });
    await load();
  }

  async function handleResetRateLimit() {
    setSavingRateLimit(true);
    setError("");
    try {
      const { data } = await api.post("/admin/settings/reset-rate-limit");
      setAiRateLimitMax(String(data.aiRateLimitMax));
      setAiRateLimitWindowMinutes(String(data.aiRateLimitWindowMinutes));
      setSuccess("Rate limit reset to defaults.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSavingRateLimit(false);
    }
  }

  async function toggleAi(next) {
    setTogglingAi(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", { aiEnabled: next });
      setAiEnabled(next);
      setSuccess(next ? "AI features enabled for everyone." : "AI features turned off for students (admins/staff can still use them).");
    } catch (e) {
      setError(apiError(e));
    } finally {
      setTogglingAi(false);
    }
  }

  async function handleSaveStorefront(e) {
    e.preventDefault();
    setSavingStore(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", { storefront });
      setSuccess("Storefront settings saved.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSavingStore(false);
    }
  }

  async function handleSaveRateLimit(e) {
    e.preventDefault();
    setSavingRateLimit(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", {
        aiRateLimitMax: Number(aiRateLimitMax),
        aiRateLimitWindowMinutes: Number(aiRateLimitWindowMinutes),
      });
      setSuccess("AI rate limit updated.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSavingRateLimit(false);
    }
  }

  async function handleSaveModel(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", { geminiModel: model });
      setSuccess("Model saved.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddKey(e) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/admin/settings/keys", {
        key: newKey.trim(),
        label: newLabel.trim() || undefined,
      });
      setApiKeys(data.apiKeys);
      setPoolSize(data.apiKeys.filter((k) => !k.disabled && k.status !== "cooldown").length);
      setNewKey("");
      setNewLabel("");
      setSuccess("API key added to pool.");
      const m = await api.get("/admin/models");
      setModels(m.data.models);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey(id) {
    setError("");
    try {
      const { data } = await api.delete(`/admin/settings/keys/${id}`);
      setApiKeys(data.apiKeys);
      setPoolSize(data.apiKeys.length);
      setSuccess("Key removed.");
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function handleTestAll() {
    setTestingAll(true);
    setError("");
    setTestResults(null);
    try {
      const { data } = await api.post("/admin/settings/test-all");
      setTestResults(data);
      const failed = data.total - data.passed;
      setSuccess(
        failed > 0
          ? `${data.passed}/${data.total} keys passed, ${failed} failed.`
          : `${data.passed}/${data.total} keys passed.`
      );
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setTestingAll(false);
    }
  }

  async function handleTestNew() {
    if (!newKey.trim()) return;
    setTesting(true);
    setError("");
    try {
      await api.post("/admin/settings/test", { geminiApiKey: newKey.trim(), geminiModel: model });
      setSuccess("New key is valid.");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setTesting(false);
    }
  }

  if (loading && section !== "audit") return <PageLoader />;

  const rate = rateForModel(model, pricing, defaultPricing);
  const testResultById = testResults?.results
    ? Object.fromEntries(testResults.results.map((r) => [r.id, r]))
    : {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {invalidSection && <Navigate to="/admin/settings/keys" replace />}
      <PageHeader title={title} subtitle={subtitle} />

      {section === "audit" ? (
        <div className="card overflow-hidden">
          {error && <Alert>{error}</Alert>}
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/50">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {auditLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3 text-muted">{l.admin?.email}</td>
                  <td className="px-4 py-3 text-xs">{l.targetType} {l.targetId?.slice?.(0, 8)}</td>
                  <td className="px-4 py-3 text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditTotalPages > 1 && (
            <div className="flex justify-center gap-3 p-4">
              <button type="button" className="btn-outline text-sm" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>Previous</button>
              <span className="text-sm text-muted">Page {auditPage} of {auditTotalPages}</span>
              <button type="button" className="btn-outline text-sm" disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </div>
      ) : section === "rate-limit" ? (
        <>
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <form onSubmit={handleSaveRateLimit} className="card space-y-4 p-6">
            <SectionTitle>AI generation rate limit</SectionTitle>
            <p className="text-sm text-muted">
              Max AI actions per user per window (upload, regenerate, quiz, tutor). Admin accounts skip this limit.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="aiRateLimitMax">Max requests</label>
                <input
                  id="aiRateLimitMax"
                  type="number"
                  min="1"
                  max="10000"
                  className="input"
                  value={aiRateLimitMax}
                  onChange={(e) => setAiRateLimitMax(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="aiRateLimitWindowMinutes">Window (minutes)</label>
                <input
                  id="aiRateLimitWindowMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  className="input"
                  value={aiRateLimitWindowMinutes}
                  onChange={(e) => setAiRateLimitWindowMinutes(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={savingRateLimit}>
                {savingRateLimit ? <Spinner /> : "Save rate limit"}
              </button>
              <button type="button" className="btn-outline" onClick={handleResetRateLimit} disabled={savingRateLimit}>
                Reset to defaults
              </button>
            </div>
          </form>
        </>
      ) : section === "storefront" ? (
        <>
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <form onSubmit={handleSaveStorefront} className="card space-y-4 p-6">
            <SectionTitle>Public storefront</SectionTitle>
            <p className="text-sm text-muted">
              These appear on the public /store pages (utility bar, hero, WhatsApp & social links).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {STOREFRONT_FIELDS.map(([key, label, ph]) => (
                <div key={key}>
                  <label className="label" htmlFor={`sf-${key}`}>{label}</label>
                  <input
                    id={`sf-${key}`}
                    className="input"
                    placeholder={ph}
                    value={storefront[key] || ""}
                    onChange={(e) => setStorefront((s) => ({ ...s, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="btn-primary" disabled={savingStore}>
              {savingStore ? <Spinner /> : "Save storefront"}
            </button>
          </form>
        </>
      ) : (
      <>
      <div className={`card mb-5 flex flex-wrap items-center justify-between gap-4 p-5 ${aiEnabled ? "" : "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SectionTitle>AI features</SectionTitle>
            <Badge color={aiEnabled ? "green" : "amber"}>{aiEnabled ? "ON" : "OFF"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Master switch for all AI generation (notes, assignment, guess paper, quiz, tutor, flashcards).
            Turn OFF when the free API is unreliable — students see a friendly message, everything else keeps working.
            Admins &amp; staff can still use AI while it&apos;s off.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiEnabled}
          disabled={togglingAi}
          onClick={() => toggleAi(!aiEnabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${aiEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"} ${togglingAi ? "opacity-60" : ""}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${aiEnabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-stone-800/10 text-stone-700">
            <IconSettings width={22} height={22} />
          </span>
          <div>
            <SectionTitle>Gemini API Key Pool</SectionTitle>
            <p className="mt-0.5 text-sm text-muted">
              Multiple keys with automatic failover — if one hits quota, the next takes over.
            </p>
          </div>
        </div>
        <Badge color={poolSize > 0 ? "green" : apiKeys.length > 0 ? "amber" : "amber"}>
          {poolSize > 0
            ? `${poolSize} active key${poolSize !== 1 ? "s" : ""}`
            : apiKeys.length > 0
              ? `${apiKeys.length} saved key${apiKeys.length !== 1 ? "s" : ""} (none usable)`
              : "No keys configured"}
        </Badge>
      </div>

      {error && <Alert>{error}</Alert>}
      {encryptionWarning && <Alert type="warning">{encryptionWarning}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="card overflow-hidden">
        <div className="border-b border-line bg-canvas/40 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-600 text-ink">Key pool</h3>
            <button type="button" onClick={handleTestAll} className="btn-outline text-sm" disabled={testingAll || poolSize === 0}>
              {testingAll ? <Spinner size={14} /> : <IconSparkles width={14} height={14} />}
              Test all keys
            </button>
          </div>
        </div>

        <div className="divide-y divide-line">
          {apiKeys.length === 0 ? (
            <p className="p-6 text-sm text-muted">No keys in pool. Add keys below or set GEMINI_API_KEYS in .env.</p>
          ) : (
            apiKeys.map((k) => {
              const testHit = testResultById[k.id];
              return (
              <div
                key={k.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${testHit ? testResultRowClass(testHit.ok) : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {editingKeyId === k.id ? (
                      <input
                        className="input py-1 text-sm"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => {
                          patchKey(k.id, { label: editLabel });
                          setEditingKeyId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button type="button" className="font-500 text-ink hover:underline" onClick={() => { setEditingKeyId(k.id); setEditLabel(k.label); }}>
                        {k.label}
                      </button>
                    )}
                    {statusBadge(k.status)}
                    {testHit && testResultBadge(testHit.ok)}
                    <span className="text-xs text-muted">priority {k.priority}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-muted">{k.masked}</p>
                  {testHit && !testHit.ok && (
                    <p className="mt-1 text-xs text-red-600">Last test: {testHit.error}</p>
                  )}
                  {!testHit && k.status === "cooldown" && k.lastError && (
                    <p className="mt-1 text-xs text-red-600">{k.lastError}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-ghost text-xs" onClick={() => moveKeyPriority(k.id, "up")}>↑</button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => moveKeyPriority(k.id, "down")}>↓</button>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!k.disabled} onChange={(e) => patchKey(k.id, { disabled: !e.target.checked })} />
                    Enabled
                  </label>
                  <button type="button" onClick={() => handleRemoveKey(k.id)} className="btn-ghost p-2 text-red-500" title="Remove key">
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              </div>
            );
            })
          )}
        </div>

        {testResults && (
          <div className="border-t border-line bg-canvas/30 px-6 py-4">
            <p className="text-xs font-600 uppercase text-muted">
              Test results — {testResults.passed}/{testResults.total} passed
            </p>
            <ul className="mt-3 space-y-2">
              {testResults.results.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-lg px-3 py-2 text-sm ${testResultRowClass(r.ok)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {testResultBadge(r.ok)}
                    <span className="font-500 text-ink">{r.label}</span>
                    {r.masked && (
                      <>
                        <span className="text-muted">·</span>
                        <span className="font-mono text-xs text-muted">{r.masked}</span>
                      </>
                    )}
                    {r.sourceLabel && (
                      <>
                        <span className="text-muted">·</span>
                        <span className="text-xs text-muted">{r.sourceLabel}</span>
                      </>
                    )}
                  </div>
                  {!r.ok && r.error && (
                    <p className="mt-1 text-xs text-red-600">{r.error}</p>
                  )}
                  {!r.ok && r.errorDetail && r.errorDetail !== r.error && (
                    <p className="mt-0.5 font-mono text-xs text-muted">{r.errorDetail}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handleAddKey} className="card space-y-4 p-6">
        <h3 className="font-display font-600 text-ink">Add API key</h3>
        <div>
          <label className="label">Label (optional)</label>
          <input className="input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Backup 1" />
        </div>
        <div>
          <label className="label">Gemini API key</label>
          <input
            type="password"
            className="input font-mono text-sm"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Paste key"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleTestNew} className="btn-outline" disabled={testing || !newKey.trim()}>
            {testing ? <Spinner /> : "Test key"}
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !newKey.trim()}>
            {saving ? <Spinner /> : <IconPlus width={16} height={16} />}
            Add to pool
          </button>
        </div>
      </form>

      <form onSubmit={handleSaveModel} className="card space-y-4 p-6">
        <label className="label">Model</label>
        {models.length > 0 ? (
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
        )}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner /> : "Save model"}
        </button>
      </form>

      <div className="card p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <IconCoins width={20} height={20} />
          </span>
          <div>
            <h3 className="font-display text-base font-600 text-ink">Rates for {model}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-canvas/40 p-4">
                <p className="text-xs uppercase text-muted">Input</p>
                <p className="mt-1 text-xl font-700">${rate.input} <span className="text-sm font-400 text-muted">/ 1M</span></p>
              </div>
              <div className="rounded-xl border border-line bg-canvas/40 p-4">
                <p className="text-xs uppercase text-muted">Output</p>
                <p className="mt-1 text-xl font-700">${rate.output} <span className="text-sm font-400 text-muted">/ 1M</span></p>
              </div>
            </div>
            <Link to="/admin/usage" className="btn-outline mt-5 inline-flex">
              <IconActivity width={16} height={16} />
              View usage by key
            </Link>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

