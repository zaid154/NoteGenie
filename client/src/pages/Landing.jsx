// Landing page: pehla page jo logged-out user ko dikhta hai (app ka intro).
import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { IconUpload, IconCards, IconChat, IconChart } from "../components/icons.jsx";
import { SocialLinks } from "../components/Credit.jsx";
import { developer } from "../config/developer.js";

// Neeche numbered steps me dikhne wale features ki list.
const features = [
  {
    icon: IconUpload,
    title: "Drop it in",
    desc: "Upload a PDF or paste a YouTube or article link.",
  },
  {
    icon: IconCards,
    title: "Notes & quizzes",
    desc: "Structured notes, flashcards, and MCQ quizzes, built for you.",
  },
  {
    icon: IconChat,
    title: "Ask the tutor",
    desc: "Chat about your material and get answers as they stream in.",
  },
  {
    icon: IconChart,
    title: "Track progress",
    desc: "Watch your quiz scores climb over time.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Patli accent line upar — chhota sa designed touch */}
      <div className="h-1 w-full bg-brand-600" />

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 lg:px-8">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-3">
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        {/* Hero */}
        <section className="border-b border-line py-20 lg:py-28">
          <p className="mb-5 text-xs font-600 uppercase tracking-[0.2em] text-accent-600">
            AI study assistant
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-600 leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
            Turn any reading into a{" "}
            <em className="font-700 not-italic text-brand-600">study kit</em>{" "}
            <span className="italic">in seconds.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Notes, flashcards, quizzes, and a tutor that actually knows your
            material — generated from your PDFs and links.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Create free account
            </Link>
            <Link to="/login" className="btn-outline px-6 py-3 text-base">
              I already have one
            </Link>
          </div>
        </section>

        {/* Steps — numbered list feels more editorial than generic icon cards */}
        <section className="py-16 lg:py-20">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex gap-4">
                <span className="font-display text-2xl font-600 leading-none text-brand-600/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Icon width={18} height={18} className="text-accent-600" />
                    <h3 className="font-display text-lg font-600 text-ink">{title}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-base font-600 text-ink">
                Built by {developer.name}
              </p>
              <p className="mt-1 text-sm text-muted">
                {developer.role} · {developer.location}
              </p>
            </div>
            <SocialLinks />
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>NoteGenie · Powered by Google Gemini</p>
            <p>
              © {new Date().getFullYear()} {developer.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
