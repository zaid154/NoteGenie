// Upload page: PDF file ya link daal kar AI se notes banwane ke liye.
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { Alert, Spinner, PageHeader } from "../components/ui.jsx";
import { IconUpload, IconLink, IconDoc, IconSparkles } from "../components/icons.jsx";

export default function Upload() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pdf");      // abhi kaunsa tab khula hai: "pdf" ya "link"
  const [file, setFile] = useState(null);      // chuni hui PDF file
  const [url, setUrl] = useState("");           // daala gaya link
  const [dragOver, setDragOver] = useState(false); // file drag karte waqt highlight ke liye
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);               // hidden <input type=file> ko click karne ke liye

  // PDF ki max size = 15 MB (bytes me).
  const MAX_BYTES = 15 * 1024 * 1024;

  // pickFile: file chunne par check karo ki PDF hai aur 15MB se chhoti hai.
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

  // handleSubmit: file/link backend ko bhejo aur naye document page pe le jao.
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

  const tabs = [
    { id: "pdf", label: "PDF upload", icon: IconUpload },
    { id: "link", label: "Web / YouTube link", icon: IconLink },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Create"
        title="Add new"
        accent="material."
        subtitle="Drop a PDF or paste a link — notes, flashcards, and a quiz get generated in about 20 seconds."
      />

      {/* Underline tabs — editorial, segmented-pill se zyada deliberate */}
      <div className="flex gap-6 border-b border-line">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
              setFile(null);
              setUrl("");
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-500 transition ${
              tab === id
                ? "border-brand-600 text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon width={16} height={16} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition ${
              dragOver
                ? "border-brand-500 bg-brand-500/5"
                : file
                ? "border-brand-400 bg-brand-500/[0.03]"
                : "border-ink/20 hover:border-brand-400 hover:bg-ink/[0.02]"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
            <span className="mb-4 text-brand-600">
              {file ? (
                <IconDoc width={32} height={32} />
              ) : (
                <IconUpload width={32} height={32} />
              )}
            </span>
            {file ? (
              <>
                <p className="font-display text-lg font-600 text-ink">{file.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB · click to replace
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-lg font-600 text-ink">
                  Drop a PDF here
                </p>
                <p className="mt-1 text-sm text-muted">
                  or click to browse · max 15MB
                </p>
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
