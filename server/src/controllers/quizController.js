// Yeh file quiz banane, dikhane, submit karne aur analytics ki request handle karti hai.
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { generateQuiz } from "../services/gemini.js";
import { incrementUsage } from "../middleware/quota.js";
import { normalizeOutputLanguage } from "../config/languages.js";
import { localDateKey, weekdayShort } from "../utils/dateKey.js";
import { assertValidObjectId } from "../utils/objectId.js";

// Document ke content se ek naya quiz generate karta hai.
// POST /api/quiz/document/:documentId   body: { difficulty, count }
const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];

export const createQuiz = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.documentId, "document ID");

  const difficulty = ALLOWED_DIFFICULTY.includes(req.body.difficulty)
    ? req.body.difficulty
    : "medium";
  // count ko safe range me rakhte hain (3 se 25 tak).
  const requested = Number(req.body.count) || 5;
  const count = Math.min(25, Math.max(3, Math.round(requested)));

  const doc = await Document.findOne({
    _id: req.params.documentId,
    userId: req.user._id,
  });
  if (!doc) return res.status(404).json({ message: "Document not found" });

  const questions = await generateQuiz(doc.sourceText || doc.notes, {
    difficulty,
    count,
    userId: req.user._id,
    feature: "quiz",
    language: normalizeOutputLanguage(req.body.outputLanguage || doc.outputLanguage),
  });
  if (!questions.length) {
    return res.status(502).json({ message: "Could not generate the quiz. Please try again." });
  }

  const quiz = await Quiz.create({
    userId: req.user._id,
    documentId: doc._id,
    title: `${doc.title} — Quiz`,
    difficulty,
    questions,
  });

  await incrementUsage(req.user, "quizzes");

  res.status(201).json({ quiz });
});

// Quiz solve karte waqt sahi jawab chhupa kar bhejte hain.
// GET /api/quiz/:id
export const getQuiz = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "quiz ID");

  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  const safeQuiz = {
    _id: quiz._id,
    documentId: quiz.documentId,
    title: quiz.title,
    difficulty: quiz.difficulty,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: q.options,
    })),
  };
  res.json({ quiz: safeQuiz });
});

// Answers submit -> score nikaal kar attempt save karta hai, explanations ke saath result deta hai.
// POST /api/quiz/:id/submit   body: { answers: number[] }
export const submitQuiz = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "quiz ID");

  const { answers } = req.body;

  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  // Answers ek array ho aur har question ka jawab ho.
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    return res.status(400).json({ message: "Please answer every question before submitting." });
  }

  // Har sawal ke liye dekho user ka jawab sahi hai ya nahi, aur score badhao.
  let score = 0;
  const review = quiz.questions.map((q, i) => {
    // Out-of-range / non-number index ko -1 (galat) maan lete hain.
    const raw = answers[i];
    const selected = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : -1;
    const isCorrect = selected === q.correctIndex;
    if (isCorrect) score++;
    return {
      question: q.question,
      options: q.options,
      selected,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  await QuizAttempt.create({
    userId: req.user._id,
    quizId: quiz._id,
    documentId: quiz.documentId,
    score,
    total: quiz.questions.length,
    answers,
  });

  res.json({ score, total: quiz.questions.length, review });
});

// Dashboard analytics: total attempts, average score, recent attempts, study overview.
// GET /api/quiz/analytics/overview
export const getAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [attempts, documentCount, quizCount, docs] = await Promise.all([
    QuizAttempt.find({ userId })
      .populate("documentId", "title")
      .sort({ createdAt: -1 }),
    Document.countDocuments({ userId }),
    Quiz.countDocuments({ userId }),
    Document.find({ userId }).select("flashcards"),
  ]);

  const now = new Date();
  let totalFlashcards = 0;
  let dueFlashcards = 0;
  for (const doc of docs) {
    for (const card of doc.flashcards || []) {
      totalFlashcards += 1;
      if (!card.nextReviewAt || new Date(card.nextReviewAt) <= now) {
        dueFlashcards += 1;
      }
    }
  }

  const usage = req.user.usageThisMonth || { documents: 0, tutorMessages: 0, quizzes: 0 };

  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);
  const avgScore = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Last 7 days average score per day (for charts).
  const trendBuckets = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    trendBuckets.push({ date: localDateKey(d), scores: [] });
  }
  attempts.forEach((a) => {
    const key = localDateKey(a.createdAt);
    const bucket = trendBuckets.find((b) => b.date === key);
    if (bucket && a.total) {
      bucket.scores.push(Math.round((a.score / a.total) * 100));
    }
  });
  const scoreTrend = trendBuckets.map((b) => ({
    date: b.date,
    day: weekdayShort(b.date),
    avg: b.scores.length
      ? Math.round(b.scores.reduce((s, x) => s + x, 0) / b.scores.length)
      : 0,
  }));

  res.json({
    totalAttempts,
    avgScore,
    scoreTrend,
    study: {
      materials: documentCount,
      quizzesGenerated: quizCount,
      flashcards: totalFlashcards,
      dueFlashcards,
      tutorMessagesThisMonth: usage.tutorMessages || 0,
    },
    recent: attempts.slice(0, 8).map((a) => ({
      id: a._id,
      quizId: a.quizId,
      documentId: a.documentId?._id || a.documentId,
      title: a.documentId?.title || "Deleted document",
      score: a.score,
      total: a.total,
      percent: a.total ? Math.round((a.score / a.total) * 100) : 0,
      date: a.createdAt,
    })),
  });
});
