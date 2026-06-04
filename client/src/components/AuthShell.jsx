import Logo from "./Logo.jsx";
import { IconUpload, IconCards, IconChat, IconChart } from "./icons.jsx";

const features = [
  { icon: IconUpload, text: "Instant AI notes from a PDF or link" },
  { icon: IconCards, text: "Auto-generated quizzes and flashcards" },
  { icon: IconChat, text: "Chat with an AI tutor about your material" },
  { icon: IconChart, text: "Track your progress and scores" },
];

// Login/Register dono ke liye split-screen shell.
// Left: branding panel. Right: form (children).
export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        {/* Subtle dot-grid texture instead of generic blur blobs */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-3xl font-700 leading-tight">
            Study smarter, with AI.
          </h1>
          <p className="mt-3 text-brand-100">
            Turn your PDFs and videos into notes, quizzes, and flashcards in
            seconds.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                  <Icon />
                </span>
                <span className="text-sm text-brand-50">{text}</span>
              </li>
            ))}
          </ul>

          {/* Small testimonial card adds a human, product-like touch */}
          <figure className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <blockquote className="text-sm text-brand-50">
              "I uploaded my chapter PDF and had notes and a quiz ready before my
              chai went cold."
            </blockquote>
            <figcaption className="mt-2 text-xs text-brand-200">
              — A happy student
            </figcaption>
          </figure>
        </div>
        <p className="relative text-xs text-brand-200">Powered by Google Gemini</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
