// FLOW: Storefront category taxonomy. Maps a public category slug to the Resource types it
// contains, plus a distinct icon + colour tint so the category tiles don't all look the same.
// Used by StoreLayout nav, category pages, search, StoreHome and Landing tiles.

import { IconDoc, IconBook, IconFileText, IconBriefcase, IconCards, IconSparkles } from "../components/icons.jsx";

export const STORE_CATEGORIES = [
  {
    slug: "assignments",
    label: "Assignments",
    tag: "2024-25 Solved",
    description: "Step-by-step solutions",
    types: ["assignment", "solved_assignment"],
    icon: IconDoc,
    tint: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    gradient: "bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600",
    shadow: "shadow-md shadow-indigo-500/25",
    hoverBorder: "hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:shadow-indigo-500/10",
    badgeStyle: "bg-indigo-50/90 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50",
    accentLine: "bg-gradient-to-r from-indigo-500 to-blue-600",
    glowBg: "bg-indigo-500/10",
  },
  {
    slug: "help-books",
    label: "Help Books",
    tag: "Exam Guides",
    description: "Curated reference books",
    types: ["book", "guide"],
    icon: IconBook,
    tint: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600",
    shadow: "shadow-md shadow-amber-500/25",
    hoverBorder: "hover:border-amber-400/60 dark:hover:border-amber-500/60 hover:shadow-amber-500/10",
    badgeStyle: "bg-amber-50/90 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50",
    accentLine: "bg-gradient-to-r from-amber-500 to-orange-500",
    glowBg: "bg-amber-500/10",
  },
  {
    slug: "question-papers",
    label: "Question Papers",
    tag: "Last 5 Years",
    description: "Previous exam archives",
    types: ["question_paper"],
    icon: IconFileText,
    tint: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    gradient: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600",
    shadow: "shadow-md shadow-sky-500/25",
    hoverBorder: "hover:border-sky-400/60 dark:hover:border-sky-500/60 hover:shadow-sky-500/10",
    badgeStyle: "bg-sky-50/90 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/50",
    accentLine: "bg-gradient-to-r from-sky-400 to-blue-600",
    glowBg: "bg-sky-500/10",
  },
  {
    slug: "projects",
    label: "Projects",
    tag: "Synopsis & Work",
    description: "Source code & synopses",
    types: ["project", "synopsis"],
    icon: IconBriefcase,
    tint: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    gradient: "bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600",
    shadow: "shadow-md shadow-violet-500/25",
    hoverBorder: "hover:border-purple-400/60 dark:hover:border-purple-500/60 hover:shadow-violet-500/10",
    badgeStyle: "bg-purple-50/90 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50",
    accentLine: "bg-gradient-to-r from-violet-500 to-purple-600",
    glowBg: "bg-violet-500/10",
  },
  {
    slug: "notes",
    label: "Notes",
    tag: "Free PDF",
    description: "Handwritten & summary PDF",
    types: ["notes"],
    icon: IconCards,
    tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    gradient: "bg-gradient-to-br from-emerald-500 via-teal-600 to-green-600",
    shadow: "shadow-md shadow-emerald-500/25",
    hoverBorder: "hover:border-emerald-400/60 dark:hover:border-emerald-500/60 hover:shadow-emerald-500/10",
    badgeStyle: "bg-emerald-50/90 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50",
    accentLine: "bg-gradient-to-r from-emerald-400 to-teal-600",
    glowBg: "bg-emerald-500/10",
  },
];

export const COMBO_CATEGORY = {
  slug: "combos",
  label: "Combo packs",
  tag: "Save up to 30%",
  description: "Complete semester bundle",
  types: [],
  icon: IconSparkles,
  tint: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500",
  shadow: "shadow-md shadow-rose-500/30",
  hoverBorder: "hover:border-rose-400/60 dark:hover:border-rose-500/60 hover:shadow-rose-500/10",
  badgeStyle: "bg-gradient-to-r from-rose-50 to-orange-50 text-rose-700 border-rose-200/70 dark:from-rose-950/80 dark:to-orange-950/80 dark:text-rose-300 dark:border-rose-800/60 font-bold",
  accentLine: "bg-gradient-to-r from-rose-500 to-orange-500",
  glowBg: "bg-rose-500/10",
};

export const ALL_STORE_CATEGORIES = [...STORE_CATEGORIES, COMBO_CATEGORY];

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
