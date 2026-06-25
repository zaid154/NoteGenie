// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (AuthShell). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import Logo from "./Logo.jsx";
import { IconUpload, IconCards, IconChat } from "./icons.jsx";
import { PageTransition, StaggerContainer, StaggerItem } from "./motion.jsx";

const steps = [
  { icon: IconUpload, text: "Upload a PDF or paste a link" },
  { icon: IconCards, text: "Get structured notes and flashcards" },
  { icon: IconChat, text: "Quiz yourself or ask the AI tutor" },
];

export default function AuthShell({ children }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="mesh-bg" aria-hidden="true" />

      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-accent-600 to-accent-800 p-12 text-white lg:flex">
        <Logo variant="light" />
        <div>
          <h2 className="text-3xl font-semibold leading-snug text-white/95">
            Your readings, turned into study kits
          </h2>
          <StaggerContainer className="mt-10 space-y-4">
            {steps.map(({ icon: Icon, text }) => (
              <StaggerItem key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                  <Icon width={16} height={16} />
                </span>
                {text}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        <p className="text-xs text-white/40">© NoteGenie</p>
      </div>

      <div className="relative flex items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="card-solid mb-8 p-8 lg:hidden">
            <Logo />
          </div>
          <PageTransition className="card-solid p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            {children}
          </PageTransition>
        </div>
      </div>
    </div>
  );
}

