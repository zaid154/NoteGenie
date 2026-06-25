// FLOW: Permission catalog. The single source of truth for granular staff permissions.
// adminController validates against these keys, requirePermission() checks them, and the
// admin UI fetches the labels to render checkboxes. Admin role implicitly has ALL of these.

// Canonical permission keys. Add new capabilities here and gate routes with
// requirePermission("<key>"). Staff users are granted a subset by an admin.
export const PERMISSION_KEYS = [
  "manage_catalog",   // create/edit universities, programs, courses
  "manage_resources", // upload/edit/delete sellable resources + files
  "manage_combos",    // create/edit combo bundles
  "manage_orders",    // view purchases/orders, payments
  "manage_content",   // moderate user materials/quizzes/chat/shares
  "manage_users",     // view users (role/permission changes stay admin-only)
  "manage_seo",       // future: meta tags / landing content
];

// Human-readable labels + descriptions for the admin permission-assignment UI.
export const PERMISSION_LABELS = {
  manage_catalog: { label: "Manage catalog", description: "Universities, programs & courses" },
  manage_resources: { label: "Manage resources", description: "Upload & edit study material / assignments / books" },
  manage_combos: { label: "Manage combos", description: "Create & edit combo bundles" },
  manage_orders: { label: "Manage orders", description: "View purchases & payments" },
  manage_content: { label: "Moderate content", description: "User materials, quizzes, chat, shares" },
  manage_users: { label: "View users", description: "Browse user accounts (read-only)" },
  manage_seo: { label: "Manage SEO", description: "Meta tags & landing pages" },
};

const KEY_SET = new Set(PERMISSION_KEYS);

export function isValidPermission(key) {
  return KEY_SET.has(key);
}

// Filter an arbitrary array down to valid, de-duplicated permission keys.
export function sanitizePermissions(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(isValidPermission))];
}
