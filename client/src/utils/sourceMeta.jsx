// FLOW: Shared mapping from a document's sourceType to its display label, badge
// color, icon, and icon tint. Used by Dashboard, DocumentView, ShareView, Upload
// so every surface shows the same thing for each kind of material.

import { IconDoc, IconLink, IconCamera, IconHeadphones, IconPlay } from "../components/icons.jsx";

const META = {
  pdf: { label: "PDF", badge: "red", Icon: IconDoc, tint: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" },
  link: { label: "Link", badge: "blue", Icon: IconLink, tint: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400" },
  text: { label: "Text", badge: "green", Icon: IconDoc, tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  image: { label: "Image", badge: "amber", Icon: IconCamera, tint: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" },
  audio: { label: "Audio", badge: "brand", Icon: IconHeadphones, tint: "bg-accent-50 text-accent-600 dark:bg-accent-950/50 dark:text-accent-400" },
  video: { label: "Video", badge: "brand", Icon: IconPlay, tint: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400" },
};

const FALLBACK = { label: "Doc", badge: "gray", Icon: IconDoc, tint: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };

export function sourceMeta(sourceType) {
  return META[sourceType] || FALLBACK;
}
