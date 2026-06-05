import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, Spinner } from "../components/ui.jsx";
import { IconUpload, IconLink, IconDoc, IconSparkles } from "../components/icons.jsx";

export default function Upload() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pdf");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const MAX_BYTES = 15 * 1024 * 1024;

  function pickFile(f) {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      setError("Only PDF files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That PDF is larger than 15MB. Please choose a smaller file.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (tab === "pdf") {
        if (!file) throw new Error("Please choose a PDF first.");
        const formData = new FormData();
        formData.append("file", file);
        res = await api.post("/documents/upload", formData);
      } else {
        if (!url.trim()) throw new Error("Please enter a URL.");
        res = await api.post("/documents/link", { url: url.trim() });
      }
      navigate(`/document/${res.data.document._id}`);
    } catch (err) {
      setError(apiError(err));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-700 text-ink">Add material</h1>
      <p className="mt-1 text-sm text-muted">
        Drop a PDF or paste a link — notes and flashcards get generated in about 20 seconds.
      </p>

      {/* Tabs */}
      <div className="mt-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {[
          { id: "pdf", label: "PDF upload", icon: IconUpload },
          { id: "link", label: "Web / YouTube link", icon: IconLink },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
              // Doosre tab ka data clear taaki galti se wrong input submit na ho.
              setFile(null);
              setUrl("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-brand-600 text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            <Icon width={16} height={16} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && <Alert>{error}</Alert>}

        {tab === "pdf" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInput.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
              dragOver
                ? "border-brand-500 bg-brand-500/5"
                : "border-line hover:border-brand-400"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
              {file ? <IconDoc width={26} height={26} /> : <IconUpload width={26} height={26} />}
            </span>
            {file ? (
              <p className="font-500 text-ink">{file.name}</p>
            ) : (
              <>
                <p className="font-500 text-ink">Drop a PDF here, or click to browse</p>
                <p className="mt-1 text-sm text-muted">Max 15MB</p>
              </>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Web page or YouTube video link</label>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or any article URL"
            />
            <p className="mt-2 text-xs text-muted">
              We use the YouTube transcript or the web page's text content.
            </p>
          </div>
        )}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner /> Generating...
            </>
          ) : (
            <>
              <IconSparkles /> Generate notes
            </>
          )}
        </button>
        {loading && (
          <p className="text-center text-sm text-muted">
            This can take 10–30 seconds while the AI reads your content.
          </p>
        )}
      </form>
    </div>
  );
}
