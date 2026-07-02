// FLOW: Shared storefront "visual identity" for resources/combos. Maps a resource type (or a
// combo) to a curated gradient + icon so coverless product cards, cart thumbnails and combo
// banners all look designed and are colour-coded consistently. Used by ResourceCard, CombosList,
// ComboDetail and Cart.
//
// Gradients are INLINE hex (applied via style={{ background }}), NOT Tailwind classes — Tailwind
// can't JIT interpolated colour classes, and these must track the cobalt "Meridian" system, not
// the built-in teal/amber utilities. All covers carry white text.

import { IconDoc, IconBook, IconFileText, IconBriefcase, IconCards } from "../components/icons.jsx";

// Subtle white dot texture painted over the gradient covers.
export const DOT_PATTERN = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
  backgroundSize: "13px 13px",
};

// Cobalt-dominant, curated (not random). One warm family (books/guides) for scannable variety.
const TYPE_VISUAL = {
  assignment: { bg: "linear-gradient(150deg,#1d52d9,#1b3a8c)", Icon: IconDoc },
  solved_assignment: { bg: "linear-gradient(150deg,#2e6bf0,#1b3a8c)", Icon: IconDoc },
  question_paper: { bg: "linear-gradient(150deg,#1c3470,#0e1a33)", Icon: IconFileText },
  book: { bg: "linear-gradient(150deg,#b14807,#74310f)", Icon: IconBook },
  guide: { bg: "linear-gradient(150deg,#b14807,#74310f)", Icon: IconBook },
  project: { bg: "linear-gradient(150deg,#1b3a8c,#121f45)", Icon: IconBriefcase },
  synopsis: { bg: "linear-gradient(150deg,#1b3a8c,#121f45)", Icon: IconBriefcase },
  notes: { bg: "linear-gradient(150deg,#2e6bf0,#1d52d9)", Icon: IconCards },
};

// Combos get their own "bundle" identity — deep cobalt vault.
export const COMBO_VISUAL = { bg: "linear-gradient(150deg,#1d52d9,#121f45)", Icon: IconCards };

export function typeVisual(type) {
  return TYPE_VISUAL[type] || TYPE_VISUAL.assignment;
}
