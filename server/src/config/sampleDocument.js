// FLOW: Static, pre-written demo document used for instant onboarding. The
// controller inserts a copy of this for a brand-new user with NO Gemini call,
// so they can explore notes / flashcards / quiz / tutor immediately.

export const SAMPLE_DOCUMENT = {
  title: "How to Study Smarter: Active Recall & Spaced Repetition",
  summary:
    "A quick primer on the two most evidence-backed study techniques — active recall and spaced repetition — and how NoteGenie turns any material into both.",
  keyTakeaways: [
    "Active recall (testing yourself) beats re-reading for long-term memory.",
    "Spaced repetition schedules reviews just before you forget, saving time.",
    "Flashcards combine both techniques and are ideal for facts and definitions.",
    "Quizzes reveal what you don't know yet — the gaps worth studying.",
    "Short, frequent sessions outperform rare cramming sessions.",
  ],
  glossary: [
    { term: "Active recall", definition: "Retrieving information from memory instead of re-reading it." },
    { term: "Spaced repetition", definition: "Reviewing material at increasing intervals timed to memory decay." },
    { term: "The forgetting curve", definition: "How quickly newly learned information fades without review." },
    { term: "Interleaving", definition: "Mixing different topics in one session to strengthen discrimination and recall." },
  ],
  notes: `## Why most studying fails

Re-reading notes and highlighting *feel* productive, but research shows they create only a shallow sense of familiarity. The moment the page is closed, the **forgetting curve** kicks in and most of it fades within a day.

Two techniques consistently beat passive review in controlled studies: **active recall** and **spaced repetition**.

## Active recall

Active recall means **retrieving** an answer from memory rather than recognising it on a page. Every time you successfully pull a fact out of your head, the memory gets stronger and easier to find next time.

- Close your notes and try to explain the idea out loud.
- Turn headings into questions and answer them from memory.
- Use **flashcards** — the front forces retrieval, the back confirms it.

## Spaced repetition

You don't need to review everything every day. **Spaced repetition** schedules each review for the moment you're *about* to forget, then pushes the next review further out each time you remember.

- A card you find easy comes back in a week, then a month.
- A card you forget comes back tomorrow.
- This focuses your time on exactly the material that needs it.

NoteGenie's flashcard review uses this scheduling automatically — just rate how well you remembered each card.

## Putting it together

1. Generate **notes** to understand the material once.
2. Generate **flashcards** for the facts and definitions worth memorising.
3. Take a **quiz** to surface what you don't know yet.
4. **Review** due cards a little each day to lock it in.
5. Ask the **AI tutor** whenever something doesn't click.

> Tip: short daily sessions beat long cramming. Aim for a streak rather than a marathon.`,
  flashcards: [
    { front: "What is active recall?", back: "Retrieving information from memory instead of re-reading it — it strengthens the memory each time.", section: "Active recall" },
    { front: "Why is re-reading a weak study method?", back: "It creates familiarity, not retrieval. The information fades quickly once you stop looking at it.", section: "Why most studying fails" },
    { front: "What is spaced repetition?", back: "Reviewing material at increasing intervals timed to when you're about to forget it.", section: "Spaced repetition" },
    { front: "When should you review a card you found easy vs. hard?", back: "Easy cards come back after longer intervals (a week, then a month); hard or forgotten cards come back sooner (e.g. tomorrow).", section: "Spaced repetition" },
    { front: "What is the recommended study loop in NoteGenie?", back: "Notes to understand, flashcards to memorise, a quiz to find gaps, daily review to retain, and the AI tutor when stuck.", section: "Putting it together" },
  ],
};
