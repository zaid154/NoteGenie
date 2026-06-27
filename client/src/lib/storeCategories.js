// FLOW: Storefront category taxonomy. Maps a public category slug to the Resource types it
// contains, plus a distinct icon + colour tint so the category tiles don't all look the same.
// Used by StoreLayout nav, category pages, search, StoreHome and Landing tiles.

import { IconDoc, IconBook, IconFileText, IconBriefcase, IconCards } from "../components/icons.jsx";

export const STORE_CATEGORIES = [
  { slug: "assignments", label: "Assignments", types: ["assignment", "solved_assignment"], icon: IconDoc, tint: "bg-store-100 text-store-700 dark:bg-store-950 dark:text-store-300" },
  { slug: "help-books", label: "Help Books", types: ["book", "guide"], icon: IconBook, tint: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  { slug: "question-papers", label: "Question Papers", types: ["question_paper"], icon: IconFileText, tint: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  { slug: "projects", label: "Projects", types: ["project", "synopsis"], icon: IconBriefcase, tint: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  { slug: "notes", label: "Notes", types: ["notes"], icon: IconCards, tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
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
