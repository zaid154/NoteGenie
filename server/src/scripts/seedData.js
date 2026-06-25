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
import { University } from "../models/University.js";
import { Program } from "../models/Program.js";
import { Course } from "../models/Course.js";
import { Resource } from "../models/Resource.js";
import { Combo } from "../models/Combo.js";
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

async function upsertUniversity({ name, slug, shortName = "", description = "", order = 0, isActive = true }) {
  let university = await University.findOne({ slug });
  if (university) {
    university.name = name;
    university.shortName = shortName;
    university.description = description;
    university.order = order;
    university.isActive = isActive;
    await university.save();
    console.log(`[seed] Updated University: ${name}`);
  } else {
    university = await University.create({ name, slug, shortName, description, order, isActive });
    console.log(`[seed] Created University: ${name}`);
  }
  return university;
}

async function upsertProgram({
  universityId,
  name,
  slug,
  level = "",
  description = "",
  order = 0,
  isActive = true,
}) {
  let program = await Program.findOne({ universityId, slug });
  if (program) {
    program.name = name;
    program.level = level;
    program.description = description;
    program.order = order;
    program.isActive = isActive;
    await program.save();
    console.log(`[seed] Updated Program: ${name}`);
  } else {
    program = await Program.create({
      universityId,
      name,
      slug,
      level,
      description,
      order,
      isActive,
    });
    console.log(`[seed] Created Program: ${name}`);
  }
  return program;
}

async function upsertCourse({
  programId,
  code,
  name,
  credits = null,
  description = "",
  order = 0,
  isActive = true,
}) {
  let course = await Course.findOne({ programId, code });
  if (course) {
    course.name = name;
    course.credits = credits;
    course.description = description;
    course.order = order;
    course.isActive = isActive;
    await course.save();
    console.log(`[seed] Updated Course: ${name}`);
  } else {
    course = await Course.create({
      programId,
      code,
      name,
      credits,
      description,
      order,
      isActive,
    });
    console.log(`[seed] Created Course: ${name}`);
  }
  return course;
}

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

async function seedUniversitiesProgramsCourses() {
  // University 1
  const uoc = await upsertUniversity({
    name: "University of Code",
    slug: "uoc",
    shortName: "UOC",
    description: "Premier institution for computer science and software engineering education.",
    order: 1,
  });

  // University 2
  const mbu = await upsertUniversity({
    name: "Metro Business University",
    slug: "mbu",
    shortName: "MBU",
    description: "Leading business school with focus on entrepreneurship and innovation.",
    order: 2,
  });

  // University 3
  const ims = await upsertUniversity({
    name: "Institute of Medical Sciences",
    slug: "ims",
    shortName: "IMS",
    description: "Excellence in medical education and research.",
    order: 3,
  });

  // UOC Programs
  const cs = await upsertProgram({
    universityId: uoc._id,
    name: "Computer Science",
    slug: "cs",
    level: "UG",
    description: "Comprehensive undergraduate program covering algorithms, systems, and AI.",
    order: 1,
  });

  const ds = await upsertProgram({
    universityId: uoc._id,
    name: "Data Science",
    slug: "ds",
    level: "PG",
    description: "Advanced program in machine learning, big data, and statistical analysis.",
    order: 2,
  });

  const it = await upsertProgram({
    universityId: uoc._id,
    name: "Information Technology",
    slug: "it",
    level: "UG",
    description: "Focus on networking, cybersecurity, and IT infrastructure.",
    order: 3,
  });

  // MBU Programs
  const bba = await upsertProgram({
    universityId: mbu._id,
    name: "Business Administration",
    slug: "bba",
    level: "UG",
    description: "Bachelor of Business Administration with specializations in marketing, finance, and HR.",
    order: 1,
  });

  const mba = await upsertProgram({
    universityId: mbu._id,
    name: "Master of Business Administration",
    slug: "mba",
    level: "PG",
    description: "Advanced business management program with global perspective.",
    order: 2,
  });

  // IMS Programs
  const mbbs = await upsertProgram({
    universityId: ims._id,
    name: "Medicine & Surgery",
    slug: "mbbs",
    level: "UG",
    description: "Bachelor of Medicine and Bachelor of Surgery program.",
    order: 1,
  });

  const nursing = await upsertProgram({
    universityId: ims._id,
    name: "Nursing",
    slug: "nursing",
    level: "UG",
    description: "Comprehensive nursing education and clinical practice program.",
    order: 2,
  });

  // CS Courses
  const cs101 = await upsertCourse({
    programId: cs._id,
    code: "CS101",
    name: "Introduction to Programming",
    credits: 3,
    description: "Fundamentals of programming using JavaScript. Covers variables, loops, functions, and OOP concepts.",
    order: 1,
  });

  const cs201 = await upsertCourse({
    programId: cs._id,
    code: "CS201",
    name: "Data Structures & Algorithms",
    credits: 4,
    description: "In-depth study of arrays, linked lists, trees, graphs, sorting and searching algorithms.",
    order: 2,
  });

  const cs301 = await upsertCourse({
    programId: cs._id,
    code: "CS301",
    name: "Database Management Systems",
    credits: 3,
    description: "Relational databases, SQL, normalization, and NoSQL databases like MongoDB.",
    order: 3,
  });

  const cs401 = await upsertCourse({
    programId: cs._id,
    code: "CS401",
    name: "Artificial Intelligence",
    credits: 4,
    description: "Machine learning, neural networks, natural language processing, and computer vision.",
    order: 4,
  });

  // DS Courses
  const ds501 = await upsertCourse({
    programId: ds._id,
    code: "DS501",
    name: "Machine Learning Fundamentals",
    credits: 4,
    description: "Supervised and unsupervised learning, model evaluation, and feature engineering.",
    order: 1,
  });

  const ds502 = await upsertCourse({
    programId: ds._id,
    code: "DS502",
    name: "Big Data Analytics",
    credits: 3,
    description: "Processing large datasets with Spark, Hadoop, and cloud platforms.",
    order: 2,
  });

  // IT Courses
  const it101 = await upsertCourse({
    programId: it._id,
    code: "IT101",
    name: "Network Fundamentals",
    credits: 3,
    description: "OSI model, TCP/IP, routing, switching, and network security basics.",
    order: 1,
  });

  const it201 = await upsertCourse({
    programId: it._id,
    code: "IT201",
    name: "Cybersecurity Essentials",
    credits: 4,
    description: "Threat analysis, cryptography, ethical hacking, and security policies.",
    order: 2,
  });

  // BBA Courses
  const bba101 = await upsertCourse({
    programId: bba._id,
    code: "BBA101",
    name: "Principles of Management",
    credits: 3,
    description: "Introduction to management theories, planning, organizing, leading, and controlling.",
    order: 1,
  });

  const bba201 = await upsertCourse({
    programId: bba._id,
    code: "BBA201",
    name: "Marketing Management",
    credits: 3,
    description: "Market research, consumer behavior, branding, and digital marketing strategies.",
    order: 2,
  });

  // MBA Courses
  const mba501 = await upsertCourse({
    programId: mba._id,
    code: "MBA501",
    name: "Strategic Management",
    credits: 4,
    description: "Corporate strategy, competitive advantage, and business model innovation.",
    order: 1,
  });

  // MBBS Courses
  const mbbs101 = await upsertCourse({
    programId: mbbs._id,
    code: "MBBS101",
    name: "Human Anatomy",
    credits: 5,
    description: "Comprehensive study of human body structure and organ systems.",
    order: 1,
  });

  // Nursing Courses
  const nurs101 = await upsertCourse({
    programId: nursing._id,
    code: "NURS101",
    name: "Fundamentals of Nursing",
    credits: 4,
    description: "Basic nursing care, patient assessment, and clinical procedures.",
    order: 1,
  });

  console.log("\n[seed] Created Educational Structure:");
  console.log("  - 3 Universities");
  console.log("  - 7 Programs");
  console.log("  - 14 Courses");

  return {
    universities: { uoc, mbu, ims },
    programs: { cs, ds, it, bba, mba, mbbs, nursing },
    courses: { cs101, cs201, cs301, cs401, ds501, ds502, it101, it201, bba101, bba201, mba501, mbbs101, nurs101 },
  };
}

async function seedUsers() {
  // Admin
  const admin = await upsertUser({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
    emailVerified: true,
    plan: "pro",
    extras: { 
      onboardingComplete: true,
      usageThisMonth: { documents: 0, tutorMessages: 0, quizzes: 0 },
    },
  });

  // Demo User
  const demoUser = await upsertUser({
    name: USER_NAME,
    email: USER_EMAIL,
    password: USER_PASSWORD,
    role: "user",
    emailVerified: true,
    plan: "free",
    extras: { 
      onboardingComplete: true,
      usageThisMonth: { documents: 0, tutorMessages: 0, quizzes: 0 },
    },
  });

  // Premium User
  const premiumUser = await upsertUser({
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    password: "Premium@123",
    role: "user",
    emailVerified: true,
    plan: "pro",
    extras: { 
      onboardingComplete: true,
      usageThisMonth: { documents: 5, tutorMessages: 10, quizzes: 3 },
    },
  });

  // Another Free User
  const freeUser = await upsertUser({
    name: "Mike Chen",
    email: "mike.chen@example.com",
    password: "Free@123",
    role: "user",
    emailVerified: true,
    plan: "free",
    extras: { 
      onboardingComplete: true,
      usageThisMonth: { documents: 1, tutorMessages: 2, quizzes: 1 },
    },
  });

  console.log("\n[seed] Created Users:");
  console.log(`  - Admin: ${admin.email} (${admin.role})`);
  console.log(`  - Demo: ${demoUser.email} (${demoUser.role})`);
  console.log(`  - Premium: ${premiumUser.email} (${premiumUser.role})`);
  console.log(`  - Free: ${freeUser.email} (${freeUser.role})`);

  return { admin, demoUser, premiumUser, freeUser };
}

async function seedResources(courses, users) {
  const resources = [];

  // CS101 Resources
  const r1 = await Resource.create({
    uploadedBy: users.demoUser._id,
    universityId: courses.cs101.universityId,
    programId: courses.cs101.programId,
    courseId: courses.cs101._id,
    resourceType: "notes",
    title: "JavaScript Programming Fundamentals",
    description: "Complete notes covering variables, functions, arrays, objects, and ES6+ features.",
    tags: ["javascript", "programming", "beginner", "free"],
    isPaid: false,
    price: 0,
    fileUrl: "https://example.com/resources/js-fundamentals.pdf",
    previewUrl: "https://example.com/resources/js-fundamentals-preview.jpg",
    size: 1024 * 800, // 800KB
    pages: 45,
    isActive: true,
  });
  resources.push(r1);

  const r2 = await Resource.create({
    uploadedBy: users.premiumUser._id,
    universityId: courses.cs101.universityId,
    programId: courses.cs101.programId,
    courseId: courses.cs101._id,
    resourceType: "pastPaper",
    title: "CS101 Final Exam - Last 5 Years",
    description: "Collection of previous year final exams with detailed solutions.",
    tags: ["exam", "cs101", "solutions", "paid"],
    isPaid: true,
    price: 1499, // 14.99 USD
    fileUrl: "https://example.com/resources/cs101-exams.pdf",
    previewUrl: "https://example.com/resources/cs101-exams-preview.jpg",
    size: 1024 * 2000, // 2MB
    pages: 120,
    isActive: true,
  });
  resources.push(r2);

  // CS201 Resources
  const r3 = await Resource.create({
    uploadedBy: users.admin._id,
    universityId: courses.cs201.universityId,
    programId: courses.cs201.programId,
    courseId: courses.cs201._id,
    resourceType: "notes",
    title: "Data Structures Visual Guide",
    description: "Visual explanations of arrays, linked lists, stacks, queues, trees, and graphs.",
    tags: ["dsa", "visual", "free"],
    isPaid: false,
    price: 0,
    fileUrl: "https://example.com/resources/dsa-visual.pdf",
    previewUrl: "https://example.com/resources/dsa-visual-preview.jpg",
    size: 1024 * 1500, // 1.5MB
    pages: 80,
    isActive: true,
  });
  resources.push(r3);

  const r4 = await Resource.create({
    uploadedBy: users.premiumUser._id,
    universityId: courses.cs201.universityId,
    programId: courses.cs201.programId,
    courseId: courses.cs201._id,
    resourceType: "assignment",
    title: "Advanced Algorithm Problems",
    description: "Challenging problem set with solutions for competitive programming.",
    tags: ["algorithms", "competitive", "paid"],
    isPaid: true,
    price: 999, // 9.99 USD
    fileUrl: "https://example.com/resources/algo-problems.pdf",
    previewUrl: "https://example.com/resources/algo-problems-preview.jpg",
    size: 1024 * 1000, // 1MB
    pages: 60,
    isActive: true,
  });
  resources.push(r4);

  // CS301 Resources
  const r5 = await Resource.create({
    uploadedBy: users.demoUser._id,
    universityId: courses.cs301.universityId,
    programId: courses.cs301.programId,
    courseId: courses.cs301._id,
    resourceType: "notes",
    title: "SQL & NoSQL Database Guide",
    description: "Complete guide to relational and non-relational databases.",
    tags: ["database", "sql", "mongodb", "free"],
    isPaid: false,
    price: 0,
    fileUrl: "https://example.com/resources/database-guide.pdf",
    previewUrl: "https://example.com/resources/database-guide-preview.jpg",
    size: 1024 * 1200, // 1.2MB
    pages: 70,
    isActive: true,
  });
  resources.push(r5);

  // Business Resources
  const r6 = await Resource.create({
    uploadedBy: users.premiumUser._id,
    universityId: courses.bba201.universityId,
    programId: courses.bba201.programId,
    courseId: courses.bba201._id,
    resourceType: "notes",
    title: "Digital Marketing Strategy Guide",
    description: "Modern digital marketing techniques including SEO, SEM, and social media.",
    tags: ["marketing", "digital", "strategy", "paid"],
    isPaid: true,
    price: 1999, // 19.99 USD
    fileUrl: "https://example.com/resources/digital-marketing.pdf",
    previewUrl: "https://example.com/resources/digital-marketing-preview.jpg",
    size: 1024 * 2500, // 2.5MB
    pages: 150,
    isActive: true,
  });
  resources.push(r6);

  // Medical Resources
  const r7 = await Resource.create({
    uploadedBy: users.admin._id,
    universityId: courses.mbbs101.universityId,
    programId: courses.mbbs101.programId,
    courseId: courses.mbbs101._id,
    resourceType: "notes",
    title: "Human Anatomy Atlas",
    description: "Detailed anatomical diagrams and explanations of all body systems.",
    tags: ["anatomy", "medical", "free"],
    isPaid: false,
    price: 0,
    fileUrl: "https://example.com/resources/anatomy-atlas.pdf",
    previewUrl: "https://example.com/resources/anatomy-atlas-preview.jpg",
    size: 1024 * 5000, // 5MB
    pages: 200,
    isActive: true,
  });
  resources.push(r7);

  console.log(`\n[seed] Created ${resources.length} Resources:`);
  resources.forEach(r => console.log(`  - ${r.title} (${r.isPaid ? 'Paid' : 'Free'})`));

  return resources;
}

async function seedCombos(resources, users) {
  const combos = [];

  // CS Study Pack
  const combo1 = await Combo.create({
    createdBy: users.admin._id,
    name: "Computer Science Starter Pack",
    description: "Essential resources for CS101 - get notes and exam papers at 20% off!",
    image: "https://example.com/combos/cs-starter.jpg",
    resourceIds: [resources[0]._id, resources[1]._id], // JS Fundamentals (free) + CS101 Exams (paid)
    price: 1199, // 11.99 USD (20% off from 14.99)
    order: 1,
    isActive: true,
  });
  combos.push(combo1);

  // Algorithm Master Pack
  const combo2 = await Combo.create({
    createdBy: users.premiumUser._id,
    name: "Algorithm Master Pack",
    description: "Visual DSA guide + advanced problems for complete algorithm mastery.",
    image: "https://example.com/combos/algo-master.jpg",
    resourceIds: [resources[2]._id, resources[3]._id], // DSA Visual (free) + Algo Problems (paid)
    price: 899, // 8.99 USD (10% off from 9.99)
    order: 2,
    isActive: true,
  });
  combos.push(combo2);

  // Full Stack Bundle
  const combo3 = await Combo.create({
    createdBy: users.admin._id,
    name: "Full Stack Development Bundle",
    description: "JavaScript fundamentals + Database guide - everything for full-stack development.",
    image: "https://example.com/combos/fullstack.jpg",
    resourceIds: [resources[0]._id, resources[4]._id], // JS Fundamentals + Database Guide
    price: 0, // Both free resources
    order: 3,
    isActive: true,
  });
  combos.push(combo3);

  // Premium Learning Bundle
  const combo4 = await Combo.create({
    createdBy: users.premiumUser._id,
    name: "Premium Learning Bundle",
    description: "Top-rated paid resources: DSA problems + Digital Marketing + CS101 exams at 25% off!",
    image: "https://example.com/combos/premium-bundle.jpg",
    resourceIds: [resources[1]._id, resources[3]._id, resources[5]._id], // 3 paid resources
    price: 2999, // 29.99 USD (savings on 14.99 + 9.99 + 19.99)
    order: 4,
    isActive: true,
  });
  combos.push(combo4);

  console.log(`\n[seed] Created ${combos.length} Combos:`);
  combos.forEach(c => console.log(`  - ${c.name} ($${(c.price/100).toFixed(2)})`));

  return combos;
}

async function seedDocumentsAndQuizzes(user, courses) {
  const existing = await Document.findOne({ userId: user._id, title: SAMPLE_DOC_TITLE });
  if (existing) {
    console.log("[seed] Sample documents already present — skipping");
    return;
  }

  // Document 1: Photosynthesis
  const doc1 = await Document.create({
    userId: user._id,
    title: SAMPLE_DOC_TITLE,
    sourceType: "link",
    sourceName: "https://example.com/biology/photosynthesis",
    folder: "Biology",
    universityId: courses.mbbs101.universityId,
    programId: courses.mbbs101.programId,
    courseId: courses.mbbs101._id,
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

  // Document 2: JavaScript Programming
  const doc2 = await Document.create({
    userId: user._id,
    title: "JavaScript ES6+ Features",
    sourceType: "pdf",
    sourceName: "javascript-es6-guide.pdf",
    folder: "Programming",
    universityId: courses.cs101.universityId,
    programId: courses.cs101.programId,
    courseId: courses.cs101._id,
    tags: ["javascript", "es6", "programming"],
    summary: "Modern JavaScript features including arrow functions, destructuring, and async/await.",
    notes: `# JavaScript ES6+ Features

## Arrow Functions
\`\`\`javascript
const add = (a, b) => a + b;
\`\`\`

## Destructuring
\`\`\`javascript
const { name, age } = person;
const [first, second] = array;
\`\`\`

## Async/Await
\`\`\`javascript
async function fetchData() {
  const data = await fetch(url);
  return data.json();
}
\`\`\`

## Spread Operator
\`\`\`javascript
const merged = { ...obj1, ...obj2 };
\`\`\``,
    flashcards: [
      { front: "What is an arrow function?", back: "A shorter syntax for writing functions: () => {}" },
      { front: "What does async/await do?", back: "Handles asynchronous operations in a synchronous-looking way." },
      { front: "What is destructuring?", back: "Extracting values from objects/arrays into variables." },
    ],
    shareEnabled: false,
  });

  // Document 3: Data Structures
  const doc3 = await Document.create({
    userId: user._id,
    title: "Data Structures Overview",
    sourceType: "text",
    sourceName: "manual-entry",
    folder: "Computer Science",
    universityId: courses.cs201.universityId,
    programId: courses.cs201.programId,
    courseId: courses.cs201._id,
    tags: ["data-structures", "algorithms", "computer-science"],
    summary: "Overview of fundamental data structures with time complexity analysis.",
    notes: `# Data Structures

## Arrays
- Contiguous memory
- O(1) access, O(n) insertion/deletion

## Linked Lists
- Non-contiguous memory
- O(n) access, O(1) insertion/deletion at head

## Trees
- Hierarchical structure
- Binary trees, BST, AVL trees

## Hash Tables
- Key-value pairs
- O(1) average access time`,
    flashcards: [
      { front: "What is the time complexity for array access?", back: "O(1) - constant time" },
      { front: "What data structure uses LIFO?", back: "Stack" },
      { front: "What is the advantage of a linked list over an array?", back: "Dynamic size and efficient insertions/deletions" },
    ],
    shareEnabled: true,
    shareToken: crypto.randomBytes(16).toString("hex"),
  });

  // Document 4: Digital Marketing
  const doc4 = await Document.create({
    userId: user._id,
    title: "Digital Marketing Fundamentals",
    sourceType: "link",
    sourceName: "https://example.com/marketing/digital-basics",
    folder: "Marketing",
    universityId: courses.bba201.universityId,
    programId: courses.bba201.programId,
    courseId: courses.bba201._id,
    tags: ["marketing", "digital", "seo", "social-media"],
    summary: "Introduction to digital marketing channels and strategies.",
    notes: `# Digital Marketing

## SEO (Search Engine Optimization)
- On-page optimization
- Off-page optimization
- Technical SEO

## Content Marketing
- Blog posts, videos, infographics
- Value-driven content creation

## Social Media Marketing
- Platform selection
- Engagement strategies

## Email Marketing
- List building
- Automation and segmentation`,
    flashcards: [
      { front: "What does SEO stand for?", back: "Search Engine Optimization" },
      { front: "What is content marketing?", back: "Creating valuable content to attract and retain customers." },
    ],
    shareEnabled: false,
  });

  // Document 5: WWII Timeline
  const doc5 = await Document.create({
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
    shareEnabled: true,
    shareToken: crypto.randomBytes(16).toString("hex"),
  });

  // Create quizzes
  const quiz1 = await Quiz.create({
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

  const quiz2 = await Quiz.create({
    userId: user._id,
    documentId: doc2._id,
    title: "JavaScript ES6 Quiz",
    difficulty: "easy",
    questions: [
      {
        question: "What is the correct syntax for an arrow function?",
        options: ["function() => {}", "() => {}", "=> function() {}", "arrow() => {}"],
        correctIndex: 1,
        explanation: "Arrow functions use the => syntax: () => {}",
      },
      {
        question: "Which keyword is used with async functions?",
        options: ["wait", "pause", "await", "delay"],
        correctIndex: 2,
        explanation: "The await keyword is used inside async functions to wait for promises.",
      },
    ],
  });

  const quiz3 = await Quiz.create({
    userId: user._id,
    documentId: doc3._id,
    title: "Data Structures Quiz",
    difficulty: "hard",
    questions: [
      {
        question: "What is the worst-case time complexity for searching in a binary search tree?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correctIndex: 2,
        explanation: "In worst case (unbalanced tree), searching takes O(n) time.",
      },
      {
        question: "Which data structure uses FIFO principle?",
        options: ["Stack", "Queue", "Tree", "Graph"],
        correctIndex: 1,
        explanation: "Queue follows First In, First Out (FIFO) principle.",
      },
      {
        question: "What is the space complexity of an adjacency list for a graph?",
        options: ["O(V)", "O(E)", "O(V + E)", "O(V * E)"],
        correctIndex: 2,
        explanation: "Adjacency list uses O(V + E) space, where V is vertices and E is edges.",
      },
    ],
  });

  // Create quiz attempts
  await QuizAttempt.insertMany([
    {
      userId: user._id,
      quizId: quiz1._id,
      documentId: doc1._id,
      score: 2,
      total: 3,
      answers: [1, 2, 0],
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      userId: user._id,
      quizId: quiz1._id,
      documentId: doc1._id,
      score: 3,
      total: 3,
      answers: [1, 2, 1],
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      userId: user._id,
      quizId: quiz2._id,
      documentId: doc2._id,
      score: 2,
      total: 2,
      answers: [1, 2],
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      userId: user._id,
      quizId: quiz3._id,
      documentId: doc3._id,
      score: 1,
      total: 3,
      answers: [1, 1, 2],
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ]);

  // Create chat messages for different documents
  await ChatMessage.insertMany([
    // Photosynthesis chat
    {
      userId: user._id,
      documentId: doc1._id,
      role: "user",
      content: "Explain the Calvin cycle in simple terms.",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      documentId: doc1._id,
      role: "assistant",
      content: "The Calvin cycle uses ATP and NADPH from the light reactions to turn CO₂ into glucose. It runs in the stroma and does not need light directly — hence \"dark reactions.\"",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      documentId: doc1._id,
      role: "user",
      content: "What's the difference between C3 and C4 plants?",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      documentId: doc1._id,
      role: "assistant",
      content: "C3 plants use only the Calvin cycle for carbon fixation, while C4 plants have an additional step that concentrates CO₂, making them more efficient in hot, dry conditions.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    // JavaScript chat
    {
      userId: user._id,
      documentId: doc2._id,
      role: "user",
      content: "When should I use arrow functions vs regular functions?",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      documentId: doc2._id,
      role: "assistant",
      content: "Use arrow functions for callbacks and when you want to preserve the lexical 'this'. Use regular functions when you need dynamic 'this' binding or for methods in objects.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    // Data Structures chat
    {
      userId: user._id,
      documentId: doc3._id,
      role: "user",
      content: "When would I use a linked list over an array?",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user._id,
      documentId: doc3._id,
      role: "assistant",
      content: "Linked lists are better when you need frequent insertions/deletions at the beginning or middle of the list, as these operations are O(1) compared to O(n) for arrays. However, arrays offer better cache locality and random access.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  // Update user usage stats
  user.usageThisMonth = { 
    documents: 5, 
    tutorMessages: 8, 
    quizzes: 4, 
    resources: 1, 
    combos: 0 
  };
  user.usageResetAt = startOfNextMonth();
  await user.save();

  console.log("\n[seed] Sample Documents, Quizzes & Chat:");
  console.log(`  - 5 Documents (Biology, Programming, CS, Marketing, History)`);
  console.log(`  - 3 Quizzes with multiple attempts`);
  console.log(`  - 8 Chat messages across 3 documents`);

  return { documents: [doc1, doc2, doc3, doc4, doc5], quizzes: [quiz1, quiz2, quiz3] };
}

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed] MONGO_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[seed] Connected to MongoDB\n");
  console.log("=".repeat(60));
  console.log("🌱 SEEDING DATABASE");
  console.log("=".repeat(60));

  // Step 1: Create users
  const users = await seedUsers();

  // Step 2: Create educational structure
  const { universities, programs, courses } = await seedUniversitiesProgramsCourses();

  // Step 3: Create resources
  const resources = await seedResources(courses, users);

  // Step 4: Create combos
  const combos = await seedCombos(resources, users);

  // Step 5: Create documents, quizzes, and chat for demo user
  await seedDocumentsAndQuizzes(users.demoUser, courses);

  // Optional: Add some data for premium user
  const premiumDocs = await Document.findOne({ userId: users.premiumUser._id });
  if (!premiumDocs) {
    const pDoc = await Document.create({
      userId: users.premiumUser._id,
      title: "Advanced Database Concepts",
      sourceType: "pdf",
      sourceName: "database-advanced.pdf",
      folder: "Computer Science",
      universityId: courses.cs301.universityId,
      programId: courses.cs301.programId,
      courseId: courses.cs301._id,
      tags: ["database", "sql", "nosql", "advanced"],
      summary: "Deep dive into database optimization, indexing, and transaction management.",
      notes: `# Advanced Databases

## Indexing Strategies
- B-Trees
- Hash indexes
- Composite indexes

## Transaction Management
- ACID properties
- Isolation levels
- Deadlock prevention

## Query Optimization
- Execution plans
- Join algorithms
- Materialized views`,
      flashcards: [
        { front: "What does ACID stand for?", back: "Atomicity, Consistency, Isolation, Durability" },
        { front: "What is a B-Tree index?", back: "A balanced tree structure for efficient data retrieval." },
      ],
      shareEnabled: false,
    });

    await Quiz.create({
      userId: users.premiumUser._id,
      documentId: pDoc._id,
      title: "Advanced Databases Quiz",
      difficulty: "hard",
      questions: [
        {
          question: "Which isolation level prevents dirty reads?",
          options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
          correctIndex: 1,
          explanation: "READ COMMITTED prevents dirty reads but allows non-repeatable reads.",
        },
      ],
    });

    console.log("[seed] Added premium user sample data");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ SEEDING COMPLETE");
  console.log("=".repeat(60));
  console.log("\n📊 SUMMARY:");
  console.log(`  • 4 Users (1 admin, 1 demo, 1 premium, 1 free)`);
  console.log(`  • 3 Universities with 7 Programs and 14 Courses`);
  console.log(`  • 7 Resources (4 free, 3 paid)`);
  console.log(`  • 4 Combos`);
  console.log(`  • 6 Documents with 4 Quizzes and 8+ Chat messages`);
  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log(`\n  Admin:`);
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log(`\n  Demo User:`);
  console.log(`    Email:    ${USER_EMAIL}`);
  console.log(`    Password: ${USER_PASSWORD}`);
  console.log(`\n  Premium User:`);
  console.log(`    Email:    sarah.johnson@example.com`);
  console.log(`    Password: Premium@123`);
  console.log(`\n  Free User:`);
  console.log(`    Email:    mike.chen@example.com`);
  console.log(`    Password: Free@123`);
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