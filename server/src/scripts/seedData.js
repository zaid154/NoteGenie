// FLOW: Seed script. Env values provide admin/demo credentials, DB connects, default users/settings are created or updated, then local dev can log in.

// Seed demo data — admin + user accounts and sample library content.
// Run: npm run seed   (from project root or server folder)
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Document } from "../models/Document.js";
import { Quiz } from "../models/Quiz.js";
import { QuizAttempt } from "../models/QuizAttempt.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { startOfNextMonth } from "../config/plans.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shop.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

const USER_EMAIL = process.env.USER_EMAIL || "user@shop.com";
const USER_PASSWORD = process.env.USER_PASSWORD || "User@123";
const USER_NAME = process.env.USER_NAME || "Demo User";

const SAMPLE_DOC_TITLE = "Introduction to Photosynthesis";

async function upsertUser({ name, email, password, role, emailVerified, plan, extras = {} }) {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });
  const passwordHash = password ? await User.hashPassword(password) : null;

  if (user) {
    user.name = name;
    user.role = role;
    if (passwordHash) user.passwordHash = passwordHash;
    if (emailVerified !== undefined) {
      user.emailVerified = emailVerified;
      if (emailVerified) {
        user.emailVerifyToken = "";
        user.emailVerifyOtpExpires = null;
      }
    }
    if (plan) user.plan = plan;
    Object.assign(user, extras);
    await user.save();
    console.log(`[seed] Updated ${role}: ${normalizedEmail}`);
  } else {
    user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: passwordHash || (await User.hashPassword("changeme123")),
      role,
      plan: plan || "free",
      emailVerified: emailVerified ?? true,
      emailVerifyToken: "",
      onboardingComplete: true,
      usageResetAt: startOfNextMonth(),
      usageThisMonth: { documents: 0, tutorMessages: 0, quizzes: 0 },
      ...extras,
    });
    console.log(`[seed] Created ${role}: ${normalizedEmail}`);
  }
  return user;
}

async function seedSampleData(user) {
  const existing = await Document.findOne({ userId: user._id, title: SAMPLE_DOC_TITLE });
  if (existing) {
    console.log("[seed] Sample data already present — skipping documents/quizzes");
    return;
  }

  const doc1 = await Document.create({
    userId: user._id,
    title: SAMPLE_DOC_TITLE,
    sourceType: "link",
    sourceName: "https://example.com/biology/photosynthesis",
    folder: "Biology",
    tags: ["biology", "plants", "exam-prep"],
    summary:
      "Photosynthesis converts light energy into chemical energy (glucose) using CO₂ and water, releasing oxygen as a by-product.",
    notes: `# Photosynthesis

## Overview
Plants use **chlorophyll** in chloroplasts to capture sunlight.

## Light-dependent reactions
- Occur in thylakoid membranes
- Produce ATP and NADPH
- Split water → O₂ released

## Calvin cycle
- Uses ATP + NADPH to fix CO₂ into sugars
- Also called the dark reactions (light-independent)

## Key equation
6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂`,
    flashcards: [
      { front: "What is photosynthesis?", back: "Process plants use to convert light into chemical energy (glucose)." },
      { front: "Where does the Calvin cycle occur?", back: "Stroma of the chloroplast." },
      { front: "What gas is released during the light reactions?", back: "Oxygen (O₂)." },
      { front: "What pigment captures light?", back: "Chlorophyll." },
    ],
    shareEnabled: true,
    shareToken: crypto.randomBytes(16).toString("hex"),
  });

  await Document.create({
    userId: user._id,
    title: "World War II — Key Dates",
    sourceType: "pdf",
    sourceName: "ww2-timeline.pdf",
    folder: "History",
    tags: ["history", "ww2"],
    summary: "Major events of WWII from 1939 invasion of Poland to 1945 surrender.",
    notes: `# WWII Timeline (condensed)

- **1939** — Germany invades Poland; Britain & France declare war
- **1941** — Pearl Harbor; US enters war
- **1944** — D-Day (Normandy landings)
- **1945** — Germany surrenders; atomic bombs on Japan; war ends`,
    flashcards: [
      { front: "When did WWII start in Europe?", back: "1939 (invasion of Poland)." },
      { front: "What was D-Day?", back: "Allied invasion of Normandy, June 6, 1944." },
    ],
  });

  const quiz = await Quiz.create({
    userId: user._id,
    documentId: doc1._id,
    title: "Photosynthesis Quiz",
    difficulty: "medium",
    questions: [
      {
        question: "Where do light-dependent reactions of photosynthesis occur?",
        options: ["Stroma", "Thylakoid membranes", "Mitochondria", "Nucleus"],
        correctIndex: 1,
        explanation: "Light reactions happen in the thylakoid membranes of chloroplasts.",
      },
      {
        question: "What is the main product of the Calvin cycle?",
        options: ["Oxygen", "ATP only", "Glucose / sugars", "Water"],
        correctIndex: 2,
        explanation: "The Calvin cycle fixes CO₂ into carbohydrates.",
      },
      {
        question: "Which pigment primarily absorbs light for photosynthesis?",
        options: ["Carotene", "Chlorophyll", "Melanin", "Hemoglobin"],
        correctIndex: 1,
        explanation: "Chlorophyll captures light energy in plant cells.",
      },
    ],
  });

  await QuizAttempt.create({
    userId: user._id,
    quizId: quiz._id,
    documentId: doc1._id,
    score: 2,
    total: 3,
    answers: [1, 2, 0],
  });

  await ChatMessage.insertMany([
    {
      userId: user._id,
      documentId: doc1._id,
      role: "user",
      content: "Explain the Calvin cycle in simple terms.",
    },
    {
      userId: user._id,
      documentId: doc1._id,
      role: "assistant",
      content:
        "The Calvin cycle uses ATP and NADPH from the light reactions to turn CO₂ into glucose. It runs in the stroma and does not need light directly — hence \"dark reactions.\"",
    },
  ]);

  user.usageThisMonth = { documents: 2, tutorMessages: 1, quizzes: 1 };
  user.usageResetAt = startOfNextMonth();
  await user.save();

  console.log("[seed] Sample data created:");
  console.log("  - 2 materials (Biology + History)");
  console.log("  - 1 quiz with 1 attempt");
  console.log("  - 2 tutor chat messages");
  console.log(`  - 1 shared link: /share/${doc1.shareToken}`);
}

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed] MONGO_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[seed] Connected to MongoDB\n");

  await upsertUser({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
    emailVerified: true,
    plan: "free",
    extras: { onboardingComplete: true },
  });

  const demoUser = await upsertUser({
    name: USER_NAME,
    email: USER_EMAIL,
    password: USER_PASSWORD,
    role: "user",
    emailVerified: true,
    plan: "free",
    extras: { onboardingComplete: true },
  });

  await seedSampleData(demoUser);

  console.log("\n[seed] Done — login with:\n");
  console.log("  Admin");
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: (from .env ADMIN_PASSWORD)`);
  console.log("  Demo user");
  console.log(`    Email:    ${USER_EMAIL}`);
  console.log(`    Password: (from .env USER_PASSWORD)`);
  console.log("\n  Run: npm run seed");
}

seed()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[seed] Failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
