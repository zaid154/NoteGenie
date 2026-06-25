// FLOW: Storefront About page (public, under StoreLayout).

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl text-ink lg:text-4xl">About NoteGenie Store</h1>
      <p className="text-muted">
        NoteGenie helps IGNOU and distance-learning students study smarter. Our store brings together
        solved assignments, previous-year question papers, help books, guides and project reports —
        all organised by university, degree and course code, with instant download.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Instant access", "Pay once, download immediately — files stay in My downloads forever."],
          ["Organised by course", "Find exactly what you need by university → degree → course code."],
          ["Student-first pricing", "Affordable singles and discounted combo packs."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-line bg-surface p-5">
            <p className="font-semibold text-ink">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        We also build AI study tools (notes, flashcards, quizzes, an AI tutor) — explore them from the
        dashboard after you sign in.
      </p>
    </div>
  );
}
