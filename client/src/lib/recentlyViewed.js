// FLOW: Lightweight client-side browsing history for the storefront. ResourceDetail records a
// view here; StoreHome reads it to show "Recently viewed" and to seed "Recommended for you".
// Stored in localStorage only — no backend, no account needed. This is the basic-level
// recommendation signal asked for in Phase 4 (what the user visits + what's popular).

const KEY = "ng_recently_viewed";
const MAX = 12;

// Keep only the fields a ResourceCard needs, so the strip can render without a refetch.
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
  };
}

export function getRecentlyViewed() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function recordView(resource) {
  const item = slim(resource);
  if (!item) return;
  try {
    const list = getRecentlyViewed().filter((r) => String(r.id) !== String(item.id));
    list.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage unavailable (private mode / quota) — recommendations just stay empty.
  }
}

// The resource types the user has shown interest in, most-recent first. Used to bias
// "Recommended for you" toward categories they've actually browsed.
export function viewedResourceTypes() {
  const seen = [];
  for (const r of getRecentlyViewed()) {
    if (r.resourceType && !seen.includes(r.resourceType)) seen.push(r.resourceType);
  }
  return seen;
}
