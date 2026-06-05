import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, Spinner } from "../../components/ui.jsx";
import { IconSettings, IconSparkles } from "../../components/icons.jsx";

export default function AdminSettings() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [masked, setMasked] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testOk, setTestOk] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/admin/settings");
        setMasked(data.geminiApiKeyMasked);
        setHasKey(data.hasApiKey);
        setModel(data.geminiModel || "gemini-2.5-flash");
        if (data.hasApiKey) {
          const m = await api.get("/admin/models");
          setModels(m.data.models);
        }
      } catch (e) {
        setError(apiError(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadModels(key) {
    try {
      const { data } = await api.get("/admin/models", {
        params: key ? { key } : {},
      });
      setModels(data.models);
    } catch {
      setModels(["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body = { geminiModel: model };
      if (apiKey.trim()) body.geminiApiKey = apiKey.trim();
      const { data } = await api.put("/admin/settings", body);
      setSuccess("Settings saved.");
      setMasked(data.geminiApiKeyMasked);
      setHasKey(data.hasApiKey);
      setApiKey("");
      await loadModels();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError("");
    setTestOk(null);
    try {
      const body = { geminiModel: model };
      if (apiKey.trim()) body.geminiApiKey = apiKey.trim();
      await api.post("/admin/settings/test", body);
      setTestOk(true);
      setSuccess("API key is valid and working.");
      if (apiKey.trim()) await loadModels(apiKey.trim());
    } catch (err) {
      setTestOk(false);
      setError(apiError(err));
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header block */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
            <IconSettings width={22} height={22} />
          </span>
          <div>
            <h2 className="font-display text-lg font-600 text-ink">Gemini API</h2>
            <p className="mt-0.5 text-sm text-muted">
              Powers notes, quizzes, flashcards, and the tutor.
            </p>
          </div>
        </div>
        <Badge color={hasKey ? "green" : "amber"}>
          {hasKey ? "Key configured" : "Using .env fallback"}
        </Badge>
      </div>

      <div className="card overflow-hidden">
        {hasKey && (
          <div className="border-b border-line bg-canvas/40 px-6 py-3">
            <p className="text-xs text-muted">Active key</p>
            <p className="mt-0.5 font-mono text-sm text-ink">{masked || "••••••••"}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 p-6">
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          {testOk === true && !success && (
            <Alert type="success">API key test passed.</Alert>
          )}

          <div>
            <label className="label">API key</label>
            <input
              type="password"
              className="input font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "Leave blank to keep current key" : "Paste your Gemini key"}
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-muted">
              If left empty here, the server uses{" "}
              <code className="rounded bg-ink/5 px-1 py-0.5 text-xs">GEMINI_API_KEY</code> from
              the root <code className="rounded bg-ink/5 px-1 py-0.5 text-xs">.env</code> file.
            </p>
          </div>

          <div className="border-t border-line pt-5">
            <label className="label">Model</label>
            {models.length > 0 ? (
              <select
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-2.5-flash"
              />
            )}
            <p className="mt-1.5 text-xs text-muted">
              Flash models are cheaper. Pro models cost more per token.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <button type="button" onClick={handleTest} className="btn-outline" disabled={testing}>
              {testing ? <Spinner /> : <IconSparkles width={16} height={16} />}
              Test key
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : "Save"}
            </button>
          </div>
        </form>
      </div>

      <p className="text-sm text-muted">
        Track how many calls this key makes →{" "}
        <Link to="/admin/usage" className="font-500 text-brand-600 hover:underline">
          Usage page
        </Link>
      </p>
    </div>
  );
}
