import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { generateQuiz } from "../services/gemini.js";

// Document ke content se ek naya quiz generate karta hai.
// POST /api/quiz/document/:documentId   body: { difficulty, count }
const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];

export const createQuiz = asyncHandler(async (req, res) => {
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
    meta: { userId: req.user._id, feature: "quiz" },
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

  res.status(201).json({ quiz });
});

// Quiz solve karte waqt sahi jawab chhupa kar bhejte hain.
// GET /api/quiz/:id
export const getQuiz = asyncHandler(async (req, res) => {
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
  const { answers = [] } = req.body;

  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  let score = 0;
  const review = quiz.questions.map((q, i) => {
    const selected = answers[i];
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

// Dashboard analytics: total attempts, average score, recent attempts.
// GET /api/quiz/analytics/overview
export const getAnalytics = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ userId: req.user._id })
    .populate("documentId", "title")
    .sort({ createdAt: -1 });

  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);
  const avgScore = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  res.json({
    totalAttempts,
    avgScore,
    recent: attempts.slice(0, 8).map((a) => ({
      id: a._id,
      title: a.documentId?.title || "Deleted document",
      score: a.score,
      total: a.total,
      percent: a.total ? Math.round((a.score / a.total) * 100) : 0,
      date: a.createdAt,
    })),
  });
});
