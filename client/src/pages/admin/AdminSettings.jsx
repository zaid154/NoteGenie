import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner } from "../../components/ui.jsx";
import { IconSparkles } from "../../components/icons.jsx";

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
    <div className="mx-auto max-w-xl space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-lg font-600 text-ink">Gemini API configuration</h2>
        <p className="mt-1 text-sm text-muted">
          Set the key here to power notes, quizzes, flashcards, and the tutor. If empty,
          the server falls back to <code className="text-xs">GEMINI_API_KEY</code> in{" "}
          <code className="text-xs">.env</code>.
        </p>

        {hasKey && (
          <p className="mt-3 text-sm text-muted">
            Current key: <span className="font-mono text-ink">{masked || "configured"}</span>
          </p>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          {testOk === true && !success && (
            <Alert type="success">API key test passed.</Alert>
          )}

          <div>
            <label className="label">Gemini API key</label>
            <input
              type="password"
              className="input font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "Leave blank to keep current key" : "AIza..."}
              autoComplete="off"
            />
          </div>

          <div>
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleTest} className="btn-outline" disabled={testing}>
              {testing ? <Spinner /> : <IconSparkles width={16} height={16} />}
              Test key
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner /> : "Save settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
