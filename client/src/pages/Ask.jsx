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
