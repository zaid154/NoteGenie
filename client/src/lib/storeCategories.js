// FLOW: Storefront category taxonomy. Maps a public category slug to the Resource types it
// contains. Used by StoreLayout nav, category pages, and search.

export const STORE_CATEGORIES = [
  { slug: "assignments", label: "Assignments", types: ["assignment", "solved_assignment"] },
  { slug: "help-books", label: "Help Books", types: ["book", "guide"] },
  { slug: "question-papers", label: "Question Papers", types: ["question_paper"] },
  { slug: "projects", label: "Projects", types: ["project", "synopsis"] },
  { slug: "notes", label: "Notes", types: ["notes"] },
];

export const RESOURCE_TYPE_LABELS = {
  question_paper: "Question paper",
  assignment: "Assignment",
  solved_assignment: "Solved assignment",
  book: "Book",
  guide: "Guide",
  notes: "Notes",
  project: "Project",
  synopsis: "Synopsis",
};

export function categoryBySlug(slug) {
  return STORE_CATEGORIES.find((c) => c.slug === slug) || null;
}

export function typeLabel(t) {
  return RESOURCE_TYPE_LABELS[t] || t;
}

// Display helper: paise -> "₹49"
export function rupees(paise) {
  return `₹${Math.round((Number(paise) || 0) / 100)}`;
}
