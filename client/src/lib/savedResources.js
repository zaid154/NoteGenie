// FLOW: Client-side wishlist for the storefront. ResourceCard toggles a resource here; StoreHome
// reads it to show a "Saved" strip. Stored in localStorage only — no backend, no account needed.
// Mirrors lib/recentlyViewed.js. Logged-out friendly (like the cart).

const KEY = "ng_saved_resources";
const MAX = 60;

// Keep only the fields a ResourceCard needs, so the strip renders without a refetch.
function slim(r) {
  if (!r || !r.id) return null;
  return {
    id: r.id,
    title: r.title,
    price: r.price,
    isPaid: r.isPaid,
    resourceType: r.resourceType,
    courseCode: r.courseCode,
    year: r.year,
    downloadCount: r.downloadCount,
    pages: r.pages,
    size: r.size,
    previewUrl: r.previewUrl,
  };
}

export function getSaved() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function isSaved(id) {
  return getSaved().some((r) => String(r.id) === String(id));
}

// Adds or removes the resource. Returns the new saved state (true = now saved).
export function toggleSaved(r) {
  if (!r || !r.id) return false;
  const list = getSaved();
  const exists = list.some((x) => String(x.id) === String(r.id));
  const next = exists
    ? list.filter((x) => String(x.id) !== String(r.id))
    : [slim(r), ...list].filter(Boolean).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / quota) — wishlist just won't persist.
  }
  return !exists;
}
