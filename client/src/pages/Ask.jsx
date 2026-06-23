// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Ask). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { PageHeader } from "../components/ui.jsx";
import TutorChat from "../components/TutorChat.jsx";

// Cross-document tutor — asks across ALL of the user's materials at once.
export default function Ask() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Ask across all notes"
        subtitle="The tutor pulls from your most relevant materials to answer."
      />
      <div className="panel p-4 lg:p-6">
        <TutorChat
          basePath="/tutor/global"
          emptyTitle="Ask across all your notes"
          emptyHint='Ask anything — for example, "compare the key ideas from my biology and chemistry notes". The tutor finds the most relevant materials automatically.'
          placeholder="Ask anything about your materials..."
        />
      </div>
    </div>
  );
}

