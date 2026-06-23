// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (OnboardingWizard). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function OnboardingWizard({ onComplete }) {
  const { refreshUser } = useAuth();

  async function finish() {
    await api.post("/auth/onboarding/complete");
    await refreshUser?.();
    onComplete?.();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-ink">First time here?</p>
        <p className="mt-0.5 text-sm text-muted">Upload a PDF or link to generate your first study kit.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link to="/upload" className="btn-primary py-2 text-sm" onClick={finish}>
          Upload
        </Link>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={finish}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

