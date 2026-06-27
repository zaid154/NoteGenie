// FLOW: Admin resources/products manager. Uploads/edits/deletes sellable products via
// /api/admin/resources (multipart). Admin picks Digital or Physical and the relevant fields show.
// Resources attach to a Course (cascading university → program → course picker).

import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Spinner, Badge, PageHeader, EmptyState } from "../../components/ui.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { IconTrash, IconUpload } from "../../components/icons.jsx";

const RESOURCE_TYPES = [
  ["question_paper", "Question paper"],
  ["solved_assignment", "Solved assignment"],
  ["assignment", "Assignment"],
  ["book", "Book"],
  ["guide", "Guide"],
  ["notes", "Notes"],
  ["project", "Project"],
  ["synopsis", "Synopsis"],
];

const blank = {
  title: "", description: "", resourceType: "question_paper", year: "", session: "",
  isPaid: false, priceRupees: "",
  productType: "digital",
  // digital
  version: "", downloadLimit: "", downloadExpiryDays: "", licenseKey: "", downloadUrl: "",
  documentationUrl: "", instantDownload: true, allowMultipleFiles: false,
  // physical
  sku: "", stock: "", weightGrams: "", dimensions: "", shippingRequired: true,
  lowStockAlert: "", deliveryChargesRupees: "", codAvailable: false, manageInventory: false,
};

export default function AdminResources() {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selUni, setSelUni] = useState("");
  const [selProg, setSelProg] = useState("");
  const [courseId, setCourseId] = useState("");
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isDigital = form.productType === "digital";

  useEffect(() => { api.get("/admin/catalog/universities").then(({ data }) => setUniversities(data.universities || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!selUni) { setPrograms([]); return; }
    api.get("/admin/catalog/programs", { params: { universityId: selUni } }).then(({ data }) => setPrograms(data.programs || [])).catch(() => {});
  }, [selUni]);
  useEffect(() => {
    if (!selProg) { setCourses([]); return; }
    api.get("/admin/catalog/courses", { params: { programId: selProg } }).then(({ data }) => setCourses(data.courses || [])).catch(() => {});
  }, [selProg]);
  useEffect(() => {
    if (!courseId) { setResources([]); return; }
    api.get("/admin/resources", { params: { courseId } }).then(({ data }) => setResources(data.resources || [])).catch(() => {});
  }, [courseId]);

  function reloadResources() {
    if (!courseId) return Promise.resolve();
    return api.get("/admin/resources", { params: { courseId } }).then(({ data }) => setResources(data.resources || []));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!courseId) { setError("Pick a course first."); return; }
    if (isDigital && !file && !form.downloadUrl.trim()) {
      setError("A digital product needs a file or a download URL.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("courseId", courseId);
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("resourceType", form.resourceType);
      fd.append("year", form.year);
      fd.append("session", form.session);
      fd.append("isPaid", String(form.isPaid));
      if (form.isPaid) fd.append("price", String(Math.round(Number(form.priceRupees || 0) * 100)));
      fd.append("previewUrl", form.previewUrl || "");
      fd.append("productType", form.productType);

      if (isDigital) {
        fd.append("version", form.version);
        fd.append("licenseKey", form.licenseKey);
        fd.append("downloadUrl", form.downloadUrl);
        fd.append("documentationUrl", form.documentationUrl);
        fd.append("instantDownload", String(form.instantDownload));
        fd.append("allowMultipleFiles", String(form.allowMultipleFiles));
        if (form.downloadLimit) fd.append("downloadLimit", String(Number(form.downloadLimit)));
        if (form.downloadExpiryDays) fd.append("downloadExpiryDays", String(Number(form.downloadExpiryDays)));
        if (file) fd.append("file", file);
      } else {
        fd.append("sku", form.sku);
        fd.append("stock", String(Number(form.stock || 0)));
        fd.append("dimensions", form.dimensions);
        fd.append("shippingRequired", String(form.shippingRequired));
        fd.append("codAvailable", String(form.codAvailable));
        fd.append("manageInventory", String(form.manageInventory));
        if (form.weightGrams) fd.append("weightGrams", String(Number(form.weightGrams)));
        if (form.lowStockAlert) fd.append("lowStockAlert", String(Number(form.lowStockAlert)));
        if (form.deliveryChargesRupees) fd.append("deliveryCharges", String(Math.round(Number(form.deliveryChargesRupees) * 100)));
      }

      await api.post("/admin/resources", fd);
      setForm(blank);
      setFile(null);
      await reloadResources();
      toast("Product saved", "success");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const ok = await confirm({ title: "Delete product?", message: "The file (if any) will be removed too.", confirmText: "Delete", danger: true });
    if (!ok) return;
    try {
      await api.delete(`/admin/resources/${id}`);
      await reloadResources();
      toast("Deleted", "success");
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Add digital downloads or physical products to your store" />
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">University</label>
          <select className="input" value={selUni} onChange={(e) => { setSelUni(e.target.value); setSelProg(""); setCourseId(""); }}>
            <option value="">— select —</option>
            {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Program</label>
          <select className="input" value={selProg} onChange={(e) => { setSelProg(e.target.value); setCourseId(""); }} disabled={!selUni}>
            <option value="">— select —</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Course</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={!selProg}>
            <option value="">— select —</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
      </div>

      {courseId && (
        <form onSubmit={submit} className="card space-y-5 p-5">
          {/* Product type */}
          <div>
            <label className="label">Product type</label>
            <div className="flex gap-2">
              {[["digital", "Digital product"], ["physical", "Physical product"]].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("productType", v)}
                  className={form.productType === v
                    ? "rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:border-accent-300"}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Common */}
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            <select className="input" value={form.resourceType} onChange={(e) => set("resourceType", e.target.value)}>
              {RESOURCE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input className="input" placeholder="Year (e.g. 2024)" value={form.year} onChange={(e) => set("year", e.target.value)} />
            <input className="input" placeholder="Session (e.g. June 2024)" value={form.session} onChange={(e) => set("session", e.target.value)} />
            <textarea className="input sm:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} />
            <input className="input" placeholder="Preview image URL (optional)" value={form.previewUrl || ""} onChange={(e) => set("previewUrl", e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPaid} onChange={(e) => set("isPaid", e.target.checked)} /> Paid product
            </label>
            {form.isPaid && (
              <input className="input" type="number" min="1" step="1" placeholder="Price (₹)" value={form.priceRupees} onChange={(e) => set("priceRupees", e.target.value)} />
            )}
          </div>

          {/* Digital fields */}
          {isDigital && (
            <div className="rounded-xl border border-line bg-canvas/40 p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Digital settings</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="Version (e.g. 1.0)" value={form.version} onChange={(e) => set("version", e.target.value)} />
                <input className="input" placeholder="License key (optional)" value={form.licenseKey} onChange={(e) => set("licenseKey", e.target.value)} />
                <input className="input" type="number" min="1" placeholder="Download limit (blank = unlimited)" value={form.downloadLimit} onChange={(e) => set("downloadLimit", e.target.value)} />
                <input className="input" type="number" min="1" placeholder="Download expiry (days, blank = never)" value={form.downloadExpiryDays} onChange={(e) => set("downloadExpiryDays", e.target.value)} />
                <input className="input sm:col-span-2" placeholder="External download URL (instead of a file)" value={form.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} />
                <input className="input sm:col-span-2" placeholder="Documentation URL (optional)" value={form.documentationUrl} onChange={(e) => set("documentationUrl", e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.instantDownload} onChange={(e) => set("instantDownload", e.target.checked)} /> Instant download after payment</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowMultipleFiles} onChange={(e) => set("allowMultipleFiles", e.target.checked)} /> Allow multiple files</label>
              </div>
              <div className="mt-3">
                <label className="label">File (ZIP / PDF / EXE / APK / ISO / DOCX / PPT / MP4 / MP3 …) — or use a URL above</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </div>
          )}

          {/* Physical fields */}
          {!isDigital && (
            <div className="rounded-xl border border-line bg-canvas/40 p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Physical settings</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
                <input className="input" type="number" min="0" placeholder="Stock quantity" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
                <input className="input" type="number" min="0" placeholder="Weight (grams)" value={form.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
                <input className="input" placeholder="Dimensions (e.g. 20 x 15 x 3 cm)" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
                <input className="input" type="number" min="0" placeholder="Low-stock alert at" value={form.lowStockAlert} onChange={(e) => set("lowStockAlert", e.target.value)} />
                <input className="input" type="number" min="0" placeholder="Delivery charges (₹)" value={form.deliveryChargesRupees} onChange={(e) => set("deliveryChargesRupees", e.target.value)} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.shippingRequired} onChange={(e) => set("shippingRequired", e.target.checked)} /> Shipping required</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.codAvailable} onChange={(e) => set("codAvailable", e.target.checked)} /> Cash on delivery</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.manageInventory} onChange={(e) => set("manageInventory", e.target.checked)} /> Manage inventory (block at 0 stock)</label>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <><IconUpload width={16} height={16} /> Save product</>}
          </button>
        </form>
      )}

      {courseId && (
        <ul className="space-y-2">
          {resources.length === 0 && <EmptyState title="No products for this course yet" />}
          {resources.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{r.title}</span>
                <Badge color={r.productType === "physical" ? "amber" : "brand"}>{r.productType === "physical" ? "Physical" : "Digital"}</Badge>
                <Badge color="gray">{r.resourceType.replace(/_/g, " ")}</Badge>
                {r.year && <Badge color="gray">{r.year}</Badge>}
                {r.isPaid ? <Badge color="brand">₹{(r.price / 100).toFixed(0)}</Badge> : <Badge color="green">Free</Badge>}
                {r.productType === "physical" && <span className="text-xs text-muted">stock {r.stock ?? 0}</span>}
                {!r.isActive && <Badge color="amber">hidden</Badge>}
                <span className="text-xs text-muted">{r.downloadCount} downloads</span>
              </span>
              <button onClick={() => remove(r.id)} className="text-muted hover:text-red-600"><IconTrash width={16} height={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
