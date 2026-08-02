// FLOW: Seed script. Env values provide admin/demo credentials, DB connects, default users/settings are created or updated, then local dev can log in.

// Seed demo data — admin + user accounts and sample library content.
// Run: npm run seed   (from project root or server folder)
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
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
import { Purchase } from "../models/Purchase.js";
import { startOfNextMonth } from "../config/plans.js";
import { buildSamplePdf } from "../services/handbookPdf.js";
import { uploadBuffer } from "../services/fileStorage.js";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

console.log("DNS Servers:", dns.getServers());

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
  universityId,
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
    if (universityId) course.universityId = universityId;
    await course.save();
    console.log(`[seed] Updated Course: ${name}`);
  } else {
    course = await Course.create({
      programId,
      universityId,
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

// Removes the old generic demo universities (UOC / MBU / IMS) and everything under them, so the
// store catalog reflects ONLY IGNOU + whatever the admin creates in the panel. Idempotent.
async function cleanupDemoCatalog() {
  const res = await Resource.deleteMany({});
  const comb = await Combo.deleteMany({});
  const crs = await Course.deleteMany({});
  const prg = await Program.deleteMany({});
  const uni = await University.deleteMany({});
  const pur = await Purchase.deleteMany({});

  console.log(
    `[seed] Completely purged old database records: ${uni.deletedCount} universities, ${prg.deletedCount} programs, ${crs.deletedCount} courses, ${res.deletedCount} resources, ${comb.deletedCount} combos, ${pur.deletedCount} purchases`
  );
}

// IGNOU catalog — the store's primary focus (distance-learning study material).
// [code, course name] per program. Course codes are real IGNOU-style codes.
const ALL_UNIVERSITIES_DATA = [
  {
    name: "IGNOU",
    slug: "ignou",
    shortName: "IGNOU",
    description: "Indira Gandhi National Open University — India's largest open & distance learning university.",
    order: 0,
    programs: [
      {
        name: "MBA (Master of Business Administration)", slug: "mba-ignou", level: "PG", courses: [
          ["MMPC-001", "Management Functions and Organisational Processes"],
          ["MMPC-002", "Human Resource Management"],
          ["MMPC-003", "Business Environment"],
          ["MMPC-004", "Accounting for Managers"],
          ["MMPC-005", "Quantitative Analysis for Managerial Applications"],
          ["MMPC-006", "Marketing Management"],
          ["MMPC-007", "Business Communication"],
        ]
      },
      {
        name: "BCA (Bachelor of Computer Applications)", slug: "bca", level: "UG", courses: [
          ["BCS-011", "Computer Basics and PC Software"],
          ["BCS-012", "Mathematics"],
          ["MCS-011", "Problem Solving and Programming"],
          ["BCS-031", "Programming in C++"],
          ["BCS-040", "Statistical Techniques"],
          ["MCS-012", "Computer Organisation and Assembly Language Programming"],
          ["BCSL-013", "Computer Basics and PC Software Lab"],
          ["BCS-053", "Web Programming"],
          ["BCS-054", "Computer Oriented Numerical Techniques"],
          ["BCS-055", "Business Communication"],
          ["MCS-021", "Data and File Structures"],
          ["MCS-022", "Operating System Concepts and Networking Management"],
        ]
      },
      {
        name: "MA History (MAH)", slug: "mah", level: "PG", courses: [
          ["MHI-01", "Ancient and Medieval Societies"],
          ["MHI-02", "Modern World"],
          ["MHI-03", "Historiography"],
          ["MHI-04", "Political Structures in India"],
          ["MHI-05", "History of Indian Economy"],
          ["MHI-06", "Evolution of Social Structures in India"],
        ]
      },
      {
        name: "B.Com (CBCS)", slug: "bcomg", level: "UG", courses: [
          ["BCOC-131", "Financial Accounting"],
          ["BCOC-132", "Business Organisation and Management"],
          ["BCOC-133", "Business Law"],
          ["BCOC-134", "Business Mathematics and Statistics"],
          ["BCOC-135", "Company Law"],
          ["BCOC-136", "Income Tax Law and Practice"],
        ]
      },
      {
        name: "MA English (MEG)", slug: "meg", level: "PG", courses: [
          ["MEG-01", "British Poetry"],
          ["MEG-02", "British Drama"],
          ["MEG-03", "British Novel"],
          ["MEG-04", "Aspects of Language"],
          ["MEG-05", "Literary Criticism & Theory"],
        ]
      },
    ]
  },
  {
    name: "Delhi University (DU)",
    slug: "du",
    shortName: "DU",
    description: "University of Delhi — Premier central university with SOL and regular degree courses.",
    order: 1,
    programs: [
      {
        name: "DU B.A. (Hons) History", slug: "du-ba-history", level: "UG", courses: [
          ["DU-HIS-101", "History of India - I"],
          ["DU-HIS-102", "Social Formations and Cultural Patterns"],
        ]
      },
      {
        name: "DU B.Com (Hons)", slug: "du-bcom-hons", level: "UG", courses: [
          ["DU-BCOM-101", "Financial Accounting"],
          ["DU-BCOM-102", "Business Laws & Governance"],
        ]
      }
    ]
  },
  {
    name: "Jawaharlal Nehru University (JNU)",
    slug: "jnu",
    shortName: "JNU",
    description: "Jawaharlal Nehru University — Premier research and postgraduate university.",
    order: 2,
    programs: [
      {
        name: "JNU M.A. International Relations", slug: "jnu-ma-ir", level: "PG", courses: [
          ["JNU-IR-501", "International Politics Theory"],
          ["JNU-IR-502", "India's Foreign Policy"],
        ]
      },
    ]
  },
  {
    name: "Aligarh Muslim University (AMU)",
    slug: "amu",
    shortName: "AMU",
    description: "Aligarh Muslim University — Central university with distance & regular learning.",
    order: 3,
    programs: [
      {
        name: "AMU B.Sc (Computer Science)", slug: "amu-bsc-cs", level: "UG", courses: [
          ["AMU-CS-101", "Programming Fundamentals in C"],
          ["AMU-CS-102", "Discrete Mathematics"],
        ]
      },
    ]
  },
  {
    name: "Banaras Hindu University (BHU)",
    slug: "bhu",
    shortName: "BHU",
    description: "Banaras Hindu University — Historic central university in Varanasi.",
    order: 4,
    programs: [
      {
        name: "BHU M.Sc Physics", slug: "bhu-msc-phy", level: "PG", courses: [
          ["BHU-PHY-501", "Classical Mechanics"],
          ["BHU-PHY-502", "Quantum Mechanics"],
        ]
      },
    ]
  },
  {
    name: "Jamia Millia Islamia (JMI)",
    slug: "jmi",
    shortName: "JMI",
    description: "Jamia Millia Islamia — Central university with online & distance programs.",
    order: 5,
    programs: [
      {
        name: "JMI Diploma in Computer Engineering", slug: "jmi-dip-ce", level: "UG", courses: [
          ["JMI-DCE-101", "Basic Electrical & Electronics"],
          ["JMI-DCE-102", "C Programming & Algorithm Lab"],
        ]
      },
    ]
  },
];

async function seedIgnou() {
  const allCourses = [];

  for (const u of ALL_UNIVERSITIES_DATA) {
    const uni = await upsertUniversity({
      name: u.name,
      slug: u.slug,
      shortName: u.shortName,
      description: u.description,
      order: u.order,
    });

    let pOrder = 1;
    for (const p of u.programs) {
      const program = await upsertProgram({
        universityId: uni._id,
        name: p.name,
        slug: p.slug,
        level: p.level,
        description: `${p.name} — ${u.shortName} study material.`,
        order: pOrder++,
      });

      let cOrder = 1;
      for (const [code, cname] of p.courses) {
        const course = await upsertCourse({ programId: program._id, universityId: uni._id, code, name: cname, order: cOrder++ });
        allCourses.push({
          _id: course._id,
          code: course.code || code,
          name: cname,
          universityId: uni._id,
          programId: program._id,
        });
      }
    }
  }

  console.log(`[seed] Created 6 Universities with authentic programs & courses`);
  console.log(`[seed] Total Courses Created across all unis: ${allCourses.length}`);
  return allCourses;
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

// Generates ~150 store products across the given courses. Idempotent: previously-seeded
// resources (marked by a "seed-demo-" fileName prefix) are removed first, so re-running the
// seed never duplicates them and never touches real admin-uploaded resources.
async function seedResources(allCourses, users) {
  const seedFilesDir = path.join(__dirname, "seed_files");
  
  const del = await Resource.deleteMany({ fileName: { $regex: "^seed-demo-" } });
  if (del.deletedCount) console.log(`[seed] Removed ${del.deletedCount} previously-seeded resources`);

  if (!fs.existsSync(seedFilesDir)) {
    console.log("[seed] No seed_files directory found, skipping real file seed.");
    return [];
  }

  const files = fs.readdirSync(seedFilesDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.log("[seed] No PDF files in seed_files, skipping real file seed.");
    return [];
  }

  const docs = [];
  let i = 0;
  
  // Find generic courses to fallback
  const fallbackCourse = allCourses[0]; 
  const bcaCourses = allCourses.filter(c => c.code.includes('BCS') || c.code.includes('MCS'));
  const bcomCourses = allCourses.filter(c => c.code.includes('BCOC'));

  for (const file of files) {
    const filePath = path.join(seedFilesDir, file);
    const buffer = fs.readFileSync(filePath);
    
    // Determine type and course based on filename
    let type = "notes";
    let course = fallbackCourse;
    
    const lowerName = file.toLowerCase();
    
    if (lowerName.includes("assignment") || lowerName.includes("b.com")) {
      type = "assignment";
      if (lowerName.includes("b.com")) course = bcomCourses[i % bcomCourses.length] || fallbackCourse;
      else course = bcaCourses[i % bcaCourses.length] || fallbackCourse;
    } else if (lowerName.includes("bcs-") || lowerName.includes("mcs-")) {
      type = "question_paper";
      const codeMatch = file.match(/(BCS|MCS)[\s\-]?[0-9]{3}/i);
      if (codeMatch) {
         const codeStr = codeMatch[0].replace(/\s+/, '-').toUpperCase();
         const matchedCourse = allCourses.find(c => c.code === codeStr);
         if (matchedCourse) course = matchedCourse;
         else course = bcaCourses[i % bcaCourses.length] || fallbackCourse;
      } else {
         course = bcaCourses[i % bcaCourses.length] || fallbackCourse;
      }
    } else {
      type = "guide";
    }

    try {
      const uploaded = await uploadBuffer(buffer, { filename: `seed-demo-${file}`, mime: "application/pdf" });
      
      const isPaid = (i % 3 === 0); // make every 3rd paid
      const price = isPaid ? 4900 : 0; // 49 INR

      docs.push({
        uploadedBy: users.admin._id,
        universityId: course.universityId,
        programId: course.programId,
        courseId: course._id,
        courseCode: course.code,
        resourceType: type,
        title: file.replace('.pdf', '').substring(0, 100), // Enforce title length limits if any
        description: `Authentic ${type} for ${course.code}.`,
        year: "2025",
        session: "July 2025",
        isPaid,
        price,
        currency: "INR",
        fileName: `seed-demo-${file}`,
        storageProvider: uploaded.provider,
        storageKey: uploaded.key,
        mime: uploaded.mime,
        size: uploaded.size,
        pages: 10 + (i % 20), 
        downloadCount: (i * 10) % 100,
        isActive: true,
      });
      i++;
    } catch (e) {
      console.warn(`[seed] Could not upload real file ${file}: ${e.message}`);
    }
  }

  const inserted = await Resource.insertMany(docs);
  const free = inserted.filter((r) => !r.isPaid).length;
  console.log(`\n[seed] Created ${inserted.length} store resources from real files (${free} free, ${inserted.length - free} paid)`);
  return inserted;
}

// Builds a few demo combo packs from the generated resources. Idempotent: removes its own
// combos (matched by slug) first so re-running the seed doesn't pile up duplicates.
// Note: the Combo schema requires `title` + a unique `slug` (NOT name/image).
async function seedCombos(resources, users) {
  const COMBOS = [
    {
      title: "IGNOU Solved Assignment Combo",
      slug: "ignou-solved-assignment-combo",
      description: "Three solved assignments bundled together — save 20% vs buying separately.",
      pool: "paid", from: 0, count: 3, discount: 0.8,
    },
    {
      title: "Exam Prep Pack (Assignments + Guides)",
      slug: "exam-prep-pack",
      description: "Solved assignments + help-book guides for exam preparation — 25% off.",
      pool: "paid", from: 3, count: 3, discount: 0.75,
    },
    {
      title: "Free Notes & Question Paper Bundle",
      slug: "free-notes-question-paper-bundle",
      description: "Free study notes and previous-year question papers in one download.",
      pool: "free", from: 0, count: 3, discount: 0,
    },
  ];

  await Combo.deleteMany({ slug: { $in: COMBOS.map((c) => c.slug) } });

  const pools = {
    paid: resources.filter((r) => r.isPaid),
    free: resources.filter((r) => !r.isPaid),
  };

  const created = [];
  let order = 1;
  for (const c of COMBOS) {
    const items = pools[c.pool].slice(c.from, c.from + c.count);
    if (items.length < 2) continue; // not enough resources to make a worthwhile bundle
    const total = items.reduce((s, r) => s + (r.price || 0), 0);
    created.push(
      await Combo.create({
        createdBy: users.admin._id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        resourceIds: items.map((r) => r._id),
        price: Math.round(total * c.discount),
        currency: "INR",
        order: order++,
        isActive: true,
      })
    );
  }

  console.log(`\n[seed] Created ${created.length} combos`);
  return created;
}

// Creates a physical demo product + a few completed orders (digital + physical) so the admin
// Orders page isn't empty. Idempotent: removes its own seeded orders/product first.
async function seedOrders(resources, users, ignouCourses) {
  await Purchase.deleteMany({ orderId: { $regex: "^seed_order_" } });

  const genToken = () => crypto.randomBytes(24).toString("hex");
  const genLicense = () => crypto.randomBytes(10).toString("hex").toUpperCase().match(/.{1,4}/g).join("-");

  // A physical demo product (printed hard-copy book) so there's a physical order to show.
  let physical = null;
  const firstCourse = ignouCourses[0];
  if (firstCourse) {
    physical = await Resource.create({
      courseId: firstCourse._id,
      programId: firstCourse.programId,
      universityId: firstCourse.universityId,
      courseCode: firstCourse.code,
      title: `${firstCourse.code} Printed Help Book (Hard Copy)`,
      description: "Printed hard-copy help book, delivered to your address.",
      resourceType: "book",
      isPaid: true,
      price: 24900,
      currency: "INR",
      productType: "physical",
      sku: `BOOK-${firstCourse.code}`,
      stock: 50,
      weightGrams: 400,
      dimensions: "24 x 18 x 2 cm",
      shippingRequired: true,
      deliveryCharges: 4000,
      codAvailable: true,
      manageInventory: true,
      fileName: "seed-demo-physical-book.jpg",
      isActive: true,
      uploadedBy: users.admin._id,
    });
  }

  const paidDigital = resources.filter((r) => r.isPaid).slice(0, 3);
  const orders = [];
  let n = 1;
  for (const r of paidDigital) {
    orders.push({
      userId: users.demoUser._id,
      resourceId: r._id,
      amount: r.price,
      currency: "INR",
      provider: "razorpay",
      orderId: `seed_order_${n}`,
      paymentId: `pay_seed_${n}`,
      transactionId: `pay_seed_${n}`,
      status: "completed",
      paymentVerified: true,
      verificationStatus: "verified",
      productType: "digital",
      downloadEnabled: true,
      downloadToken: genToken(),
      licenseKey: genLicense(),
      downloadLimit: r.downloadLimit ?? null,
      downloadCount: n - 1,
    });
    n++;
  }
  if (physical) {
    orders.push({
      userId: users.demoUser._id,
      resourceId: physical._id,
      amount: physical.price,
      currency: "INR",
      provider: "razorpay",
      orderId: `seed_order_${n}`,
      paymentId: `pay_seed_${n}`,
      transactionId: `pay_seed_${n}`,
      status: "completed",
      paymentVerified: true,
      verificationStatus: "verified",
      productType: "physical",
      shipping: {
        name: users.demoUser.name,
        phone: "9876543210",
        address: "12 MG Road",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        pincode: "110001",
        courier: "BlueDart",
        trackingNumber: "BD123456789",
        status: "dispatched",
        dispatchedAt: new Date(),
      },
    });
  }

  await Purchase.insertMany(orders);
  console.log(`[seed] Created ${orders.length} demo orders (${paidDigital.length} digital, ${physical ? 1 : 0} physical)`);
  return orders;
}

async function seedDocumentsAndQuizzes(user) {
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

  // Step 2: Remove old demo universities, then seed the IGNOU catalog (the real store data)
  await cleanupDemoCatalog();
  const ignouCourses = await seedIgnou();

  // Step 3: Create ~150 store resources across the IGNOU courses
  const resources = await seedResources(ignouCourses, users);

  // Step 4: Create combo packs from those resources
  const combos = await seedCombos(resources, users);

  // Step 5: Create a few demo orders (digital + physical) so the admin Orders page isn't empty
  const orders = await seedOrders(resources, users, ignouCourses);

  // Step 6: Create documents, quizzes, and chat for demo user (AI-feature demo content)
  await seedDocumentsAndQuizzes(users.demoUser);

  // Optional: Add some data for premium user
  const premiumDocs = await Document.findOne({ userId: users.premiumUser._id });
  if (!premiumDocs) {
    const pDoc = await Document.create({
      userId: users.premiumUser._id,
      title: "Advanced Database Concepts",
      sourceType: "pdf",
      sourceName: "database-advanced.pdf",
      folder: "Computer Science",
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
  const freeCount = resources.filter((r) => !r.isPaid).length;
  console.log("\n📊 SUMMARY:");
  console.log(`  • 4 Users (1 admin, 1 demo, 1 premium, 1 free)`);
  console.log(`  • 1 University (IGNOU) — 6 programs & ${ignouCourses.length} courses`);
  console.log(`  • ${resources.length} Store resources (${freeCount} free, ${resources.length - freeCount} paid)`);
  console.log(`  • ${combos.length} Combos`);
  console.log(`  • ${orders.length} Demo orders (digital + physical)`);
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
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
  });