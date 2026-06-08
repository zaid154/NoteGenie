// Landing page: pehla page jo logged-out user ko dikhta hai (app ka intro).
import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { IconUpload, IconCards, IconChat, IconChart } from "../components/icons.jsx";

// Neeche cards me dikhne wale features ki list. (text + icon)
const features = [
  {
    icon: IconUpload,
    title: "PDF or link in",
    desc: "Upload a PDF or paste a YouTube or article URL.",
  },
  {
    icon: IconCards,
    title: "Notes & quizzes",
    desc: "AI builds structured notes, flashcards, and MCQ quizzes.",
  },
  {
    icon: IconChat,
    title: "AI tutor",
    desc: "Ask questions about your material with streaming answers.",
  },
  {
    icon: IconChart,
    title: "Track progress",
    desc: "See quiz scores and improve over time.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
          <Logo />
          <div className="flex gap-3">
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-700 leading-tight text-ink lg:text-5xl">
            Turn any material into a study kit in seconds.
          </h1>
          <p className="mt-4 text-lg text-muted">
            NoteGenie uses Google Gemini to generate notes, flashcards, quizzes,
            and an AI tutor from your PDFs and links.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Create free account
            </Link>
            <Link to="/login" className="btn-outline px-6 py-3 text-base">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5">
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
                <Icon />
              </span>
              <h3 className="font-600 text-ink">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        NoteGenie — AI study assistant · Powered by Google Gemini
      </footer>
    </div>
  );
}
