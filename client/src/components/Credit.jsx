// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (Credit). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

// Developer credit + social links. App ki saari jagah (Landing footer, auth panel,
// sidebar) yahi component use karti hai, taaki ek hi jagah se manage ho.
import { developer } from "../config/developer.js";
import { IconGithub, IconLinkedin, IconGlobe } from "./icons.jsx";

const links = [
  { href: developer.github, label: "GitHub", icon: IconGithub },
  { href: developer.linkedin, label: "LinkedIn", icon: IconLinkedin },
  { href: developer.portfolio, label: "Portfolio", icon: IconGlobe },
];

// Sirf icon-buttons ki ek row. variant: "light" (dark backgrounds ke liye).
export function SocialLinks({ size = 18, variant = "default", className = "" }) {
  const base =
    variant === "light"
      ? "text-white/60 hover:bg-white/10 hover:text-white"
      : "text-muted hover:bg-ink/5 hover:text-stone-700";
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {links.map(({ href, label, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target={href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noreferrer noopener"
          title={label}
          aria-label={label}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${base}`}
        >
          <Icon width={size} height={size} />
        </a>
      ))}
    </div>
  );
}

// Poora footer block (app pages ke neeche). Built by + role + socials + copyright.
export function DeveloperFooter() {
  return (
    <footer className="mt-12 border-t border-line pt-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-sm font-600 text-ink">
            Built by {developer.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {developer.role} · {developer.location}
          </p>
        </div>
        <SocialLinks size={17} />
      </div>
      <p className="mt-4 text-xs text-muted">
        © {new Date().getFullYear()} {developer.name} · NoteGenie · Powered by Google
        Gemini
      </p>
    </footer>
  );
}

// Chhoti single-line credit (sidebar ke liye).
export function MadeByLine({ className = "" }) {
  return (
    <a
      href={developer.portfolio}
      target="_blank"
      rel="noreferrer noopener"
      className={`block text-center text-xs text-muted transition hover:text-stone-700 ${className}`}
    >
      Built by <span className="font-600">{developer.name}</span>
    </a>
  );
}

