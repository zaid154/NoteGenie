import Logo from "./Logo.jsx";
import { IconUpload, IconCards, IconChat, IconChart } from "./icons.jsx";
import { SocialLinks } from "./Credit.jsx";
import { developer } from "../config/developer.js";

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
      {/* Branding side — flat dark-green panel, editorial type, koi blur/gradient nahi */}
      <div className="relative hidden flex-col justify-between bg-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo />
        </div>

        <div className="max-w-md">
          {/* Bada serif quote — hero ke jagah ek statement */}
          <p className="text-xs font-600 uppercase tracking-[0.2em] text-accent-400">
            Study smarter
          </p>
          <h1 className="mt-5 font-display text-4xl font-600 leading-[1.15]">
            Your readings,{" "}
            <span className="italic text-accent-400">rewritten</span> as notes,
            quizzes &amp; flashcards.
          </h1>

          {/* Features ek clean divided list me */}
          <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 py-3">
                <Icon width={18} height={18} className="shrink-0 text-accent-400" />
                <span className="text-sm text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-white/50">
            <p className="text-white/70">
              Built by <span className="font-600 text-white/90">{developer.name}</span>
            </p>
            <p className="mt-0.5">{developer.role}</p>
          </div>
          <SocialLinks variant="light" size={16} />
        </div>
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
