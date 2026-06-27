// FLOW: Shared Razorpay checkout script loader. Used by Checkout (plans) and ResourceDetail
// (per-item marketplace purchases) so the script is injected once and reused.

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Trigger an authenticated file download (the endpoint requires a Bearer token, so we
// fetch the blob through axios and save it client-side rather than a bare <a href>).
export async function downloadResourceFile(api, resourceId, fileName) {
  return saveBlob(await api.get(`/catalog/resources/${resourceId}/download`, { responseType: "blob" }), fileName);
}

// Secure tokenised download — the token is bound to a verified purchase (limit/expiry enforced
// server-side). External-URL products redirect, which axios follows transparently.
export async function downloadByToken(api, token, fileName) {
  return saveBlob(await api.get(`/catalog/download/${token}`, { responseType: "blob" }), fileName);
}

function saveBlob(res, fileName) {
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
