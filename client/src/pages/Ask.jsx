// FLOW: Client source file (Ask.jsx).
// Handcrafted viewport-fitted AI Study Studio. Zero window scrollbars.

import TutorChat from "../components/TutorChat.jsx";

export default function Ask() {
  return (
    <div className="mx-auto max-w-4xl h-[calc(100vh-7.5rem)] flex flex-col animate-fade-in p-4 space-y-4">
      <TutorChat
        basePath="/tutor/global"
        emptyTitle="What would you like to master today?"
        emptyHint="Ask any question across your uploaded PDFs, notes, and study materials."
        placeholder="Ask anything about your study notes, request a summary, or build a practice quiz..."
      />
    </div>
  );
}
