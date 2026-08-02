// Seed script — inserts a realistic University → Program → Course → Resource hierarchy.
// Run: node --env-file=.env server/src/seedData.js   (from project root)

import mongoose from "mongoose";
import { University } from "./models/University.js";
import { Program } from "./models/Program.js";
import { Course } from "./models/Course.js";
import { Resource } from "./models/Resource.js";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/notegenie";

async function seed() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // ── 1. Universities ─────────────────────────────────────────────────
    const ignouData = { name: "Indira Gandhi National Open University (IGNOU)", slug: "ignou", shortName: "IGNOU", description: "India's largest open university", order: 1, isActive: true };
    const duSolData = { name: "Delhi University School of Open Learning", slug: "du-sol", shortName: "DU SOL", description: "Open learning wing of University of Delhi", order: 2, isActive: true };

    const ignou = await University.findOneAndUpdate({ slug: "ignou" }, ignouData, { upsert: true, new: true, setDefaultsOnInsert: true });
    const duSol = await University.findOneAndUpdate({ slug: "du-sol" }, duSolData, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log("  Universities:", ignou.shortName, duSol.shortName);

    // ── 2. Programs ─────────────────────────────────────────────────────
    const programDefs = [
      { universityId: ignou._id, name: "Bachelor of Computer Applications (BCA)", slug: "bca", level: "UG", order: 1 },
      { universityId: ignou._id, name: "Master of Computer Applications (MCA)", slug: "mca", level: "PG", order: 2 },
      { universityId: ignou._id, name: "Bachelor of Arts (BA)", slug: "ba", level: "UG", order: 3 },
      { universityId: ignou._id, name: "Master of Arts — History (MAH)", slug: "mah", level: "PG", order: 4 },
      { universityId: ignou._id, name: "Master of Business Administration (MBA)", slug: "mba", level: "PG", order: 5 },
      { universityId: duSol._id, name: "BA Programme", slug: "ba-prog", level: "UG", order: 1 },
      { universityId: duSol._id, name: "B.Com", slug: "bcom", level: "UG", order: 2 },
    ];
    const programs = [];
    for (const pd of programDefs) {
      const p = await Program.findOneAndUpdate(
        { universityId: pd.universityId, slug: pd.slug },
        { ...pd, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      programs.push(p);
    }
    console.log("  Programs:", programs.length);

    // helper — find program by slug
    const prog = (s) => programs.find((p) => p.slug === s);

    // ── 3. Courses ──────────────────────────────────────────────────────
    const courseDefs = [
      // BCA
      { programId: prog("bca")._id, universityId: ignou._id, code: "BCS-011", name: "Computer Basics and PC Software", credits: 4, order: 1 },
      { programId: prog("bca")._id, universityId: ignou._id, code: "BCS-012", name: "Basic Mathematics", credits: 4, order: 2 },
      { programId: prog("bca")._id, universityId: ignou._id, code: "BCSL-013", name: "Computer Basics and PC Software Lab", credits: 2, order: 3 },
      { programId: prog("bca")._id, universityId: ignou._id, code: "BCS-040", name: "Statistical Techniques", credits: 4, order: 4 },
      // MCA
      { programId: prog("mca")._id, universityId: ignou._id, code: "MCS-011", name: "Problem Solving and Programming", credits: 3, order: 1 },
      { programId: prog("mca")._id, universityId: ignou._id, code: "MCS-012", name: "Computer Organisation and Assembly Language", credits: 4, order: 2 },
      { programId: prog("mca")._id, universityId: ignou._id, code: "MCS-013", name: "Discrete Mathematics", credits: 3, order: 3 },
      // BA
      { programId: prog("ba")._id, universityId: ignou._id, code: "BHDLA-135", name: "Hindi Bhasha: Lekhan Kaushal", credits: 4, order: 1 },
      { programId: prog("ba")._id, universityId: ignou._id, code: "BEGLA-135", name: "English in Daily Life", credits: 4, order: 2 },
      // MAH
      { programId: prog("mah")._id, universityId: ignou._id, code: "MHI-01", name: "Ancient and Medieval Societies", credits: 6, order: 1 },
      { programId: prog("mah")._id, universityId: ignou._id, code: "MHI-04", name: "Political Structures in India", credits: 6, order: 2 },
      // MBA
      { programId: prog("mba")._id, universityId: ignou._id, code: "MS-01", name: "Management Functions and Behaviour", credits: 6, order: 1 },
      { programId: prog("mba")._id, universityId: ignou._id, code: "MMPC-001", name: "Management Functions and Organisational Processes", credits: 4, order: 2 },
      // DU SOL BA
      { programId: prog("ba-prog")._id, universityId: duSol._id, code: "AECC-ENG", name: "English Communication", credits: 4, order: 1 },
      // DU SOL BCom
      { programId: prog("bcom")._id, universityId: duSol._id, code: "BCH-101", name: "Financial Accounting", credits: 6, order: 1 },
    ];

    const courses = [];
    for (const cd of courseDefs) {
      const c = await Course.findOneAndUpdate(
        { programId: cd.programId, code: cd.code },
        { ...cd, isActive: true },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      courses.push(c);
    }
    console.log("  Courses:", courses.length);

    // helper — find course by code
    const crs = (code) => courses.find((c) => c.code === code);

    // ── 4. Resources (sample data for every category) ───────────────────
    const resourceDefs = [
      // ─── Notes ───
      {
        courseId: crs("BCS-011")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-011",
        title: "BCS-011 Complete Handwritten Notes", description: "Topic-wise handwritten notes covering all 5 blocks — OS, hardware, networking, MS Office, and internet. Neat diagrams included.",
        resourceType: "notes", year: "2024", session: "July 2024", productType: "digital",
        isPaid: false, price: 0, fileName: "BCS-011_Notes.pdf", mime: "application/pdf", size: 3_200_000, pages: 68, downloadCount: 1240,
      },
      {
        courseId: crs("MCS-011")._id, programId: prog("mca")._id, universityId: ignou._id, courseCode: "MCS-011",
        title: "MCS-011 Problem Solving & Programming Notes", description: "Covers C programming, flowcharts, algorithms, arrays, pointers. Important questions marked.",
        resourceType: "notes", year: "2024", session: "July 2024", productType: "digital",
        isPaid: false, price: 0, fileName: "MCS-011_Notes.pdf", mime: "application/pdf", size: 2_800_000, pages: 52, downloadCount: 890,
      },
      {
        courseId: crs("MHI-01")._id, programId: prog("mah")._id, universityId: ignou._id, courseCode: "MHI-01",
        title: "MHI-01 Ancient & Medieval Societies Notes", description: "Summary notes for all units — Greek, Roman, Indian, and Chinese civilisations. Exam-oriented.",
        resourceType: "notes", year: "2024", session: "January 2025", productType: "digital",
        isPaid: false, price: 0, fileName: "MHI-01_Notes.pdf", mime: "application/pdf", size: 2_100_000, pages: 44, downloadCount: 530,
      },
      {
        courseId: crs("BCH-101")._id, programId: prog("bcom")._id, universityId: duSol._id, courseCode: "BCH-101",
        title: "Financial Accounting Notes — DU SOL", description: "Chapter-wise typed notes with solved illustrations. Journal entries, ledger, trial balance, final accounts.",
        resourceType: "notes", year: "2024", session: "2024-25", productType: "digital",
        isPaid: false, price: 0, fileName: "BCH101_Notes.pdf", mime: "application/pdf", size: 4_500_000, pages: 92, downloadCount: 710,
      },

      // ─── Solved Assignments ───
      {
        courseId: crs("BCS-011")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-011",
        title: "BCS-011 Solved Assignment 2024-25", description: "100% solved assignment for July 2024 and January 2025 session. Neatly handwritten PDF.",
        resourceType: "solved_assignment", year: "2024", session: "July 2024 & January 2025", productType: "digital",
        isPaid: false, price: 0, fileName: "BCS-011_Assignment.pdf", mime: "application/pdf", size: 1_600_000, pages: 24, downloadCount: 3420,
      },
      {
        courseId: crs("BCS-012")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-012",
        title: "BCS-012 Basic Mathematics Solved Assignment", description: "All questions solved with step-by-step working. Sets, matrices, calculus, trigonometry.",
        resourceType: "solved_assignment", year: "2024", session: "July 2024 & January 2025", productType: "digital",
        isPaid: false, price: 0, fileName: "BCS-012_Assignment.pdf", mime: "application/pdf", size: 1_900_000, pages: 30, downloadCount: 2810,
      },
      {
        courseId: crs("MHI-04")._id, programId: prog("mah")._id, universityId: ignou._id, courseCode: "MHI-04",
        title: "MHI-04 Political Structures in India — Solved Assignment 2025", description: "Hand-written solved assignment covering all questions. Accepted for January 2025 session.",
        resourceType: "solved_assignment", year: "2025", session: "January 2025", productType: "digital",
        isPaid: false, price: 0, fileName: "MHI-04_Assignment.pdf", mime: "application/pdf", size: 1_400_000, pages: 20, downloadCount: 1420,
      },
      {
        courseId: crs("MMPC-001")._id, programId: prog("mba")._id, universityId: ignou._id, courseCode: "MMPC-001",
        title: "MMPC-001 Solved Assignment — MBA 2025", description: "Comprehensive solved assignment. Theory + case-study answers.",
        resourceType: "solved_assignment", year: "2025", session: "January 2025", productType: "digital",
        isPaid: true, price: 4900, fileName: "MMPC-001_Assignment.pdf", mime: "application/pdf", size: 1_800_000, pages: 28, downloadCount: 670,
      },

      // ─── Question Papers ───
      {
        courseId: crs("BCS-011")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-011",
        title: "BCS-011 Question Paper — June 2024 TEE", description: "Original term-end exam paper. Scanned PDF.",
        resourceType: "question_paper", year: "2024", session: "June 2024", productType: "digital",
        isPaid: false, price: 0, fileName: "BCS-011_QP_Jun24.pdf", mime: "application/pdf", size: 620_000, pages: 4, downloadCount: 4200,
      },
      {
        courseId: crs("BCS-011")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-011",
        title: "BCS-011 Question Paper — December 2023 TEE", description: "Previous year term-end exam paper.",
        resourceType: "question_paper", year: "2023", session: "December 2023", productType: "digital",
        isPaid: false, price: 0, fileName: "BCS-011_QP_Dec23.pdf", mime: "application/pdf", size: 580_000, pages: 4, downloadCount: 3800,
      },
      {
        courseId: crs("MCS-013")._id, programId: prog("mca")._id, universityId: ignou._id, courseCode: "MCS-013",
        title: "MCS-013 Discrete Mathematics — Last 5 Years Papers", description: "Compiled question papers from 2019 to 2024.",
        resourceType: "question_paper", year: "2024", session: "Compiled", productType: "digital",
        isPaid: false, price: 0, fileName: "MCS-013_Papers.pdf", mime: "application/pdf", size: 2_400_000, pages: 20, downloadCount: 1560,
      },
      {
        courseId: crs("MHI-01")._id, programId: prog("mah")._id, universityId: ignou._id, courseCode: "MHI-01",
        title: "MHI-01 Question Paper — June 2024", description: "Term-end examination question paper for MA History.",
        resourceType: "question_paper", year: "2024", session: "June 2024", productType: "digital",
        isPaid: false, price: 0, fileName: "MHI-01_QP_Jun24.pdf", mime: "application/pdf", size: 450_000, pages: 3, downloadCount: 920,
      },

      // ─── Projects ───
      {
        courseId: crs("BCSL-013")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCSL-013",
        title: "BCA Lab Project — Library Management System", description: "Complete C project with source code, documentation, synopsis, and viva questions. Ready to submit.",
        resourceType: "project", year: "2024", session: "2024-25", productType: "digital",
        isPaid: true, price: 14900, fileName: "Library_Mgmt_Project.zip", mime: "application/zip", size: 12_500_000, pages: null, downloadCount: 320,
      },
      {
        courseId: crs("MCS-011")._id, programId: prog("mca")._id, universityId: ignou._id, courseCode: "MCS-011",
        title: "MCA Project — Online Quiz Application (IGNOU)", description: "Full-stack web project with React frontend and Node.js backend. Includes synopsis, SRS, source code, and report.",
        resourceType: "project", year: "2024", session: "2024-25", productType: "digital",
        isPaid: true, price: 29900, fileName: "Quiz_App_Project.zip", mime: "application/zip", size: 48_000_000, pages: null, downloadCount: 185,
      },
      {
        courseId: crs("BCS-040")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-040",
        title: "BCA Synopsis — E-Commerce Website", description: "Ready-made synopsis for BCA final year project. Topic: E-Commerce platform with payment integration.",
        resourceType: "synopsis", year: "2024", session: "2024-25", productType: "digital",
        isPaid: true, price: 9900, fileName: "Synopsis_ECommerce.pdf", mime: "application/pdf", size: 1_800_000, pages: 18, downloadCount: 450,
      },

      // ─── Help Books / Guides ───
      {
        courseId: crs("BCS-011")._id, programId: prog("bca")._id, universityId: ignou._id, courseCode: "BCS-011",
        title: "BCS-011 Exam Guide — Neeraj Publications", description: "Chapter-wise solved previous-year questions, important topics, and model answers. Best companion for TEE prep.",
        resourceType: "guide", year: "2024", session: "2024-25 Edition", productType: "digital",
        isPaid: true, price: 19900, fileName: "BCS-011_Guide.pdf", mime: "application/pdf", size: 8_200_000, pages: 180, downloadCount: 1100,
      },
      {
        courseId: crs("MS-01")._id, programId: prog("mba")._id, universityId: ignou._id, courseCode: "MS-01",
        title: "MS-01 Management Functions — GPH Help Book", description: "Comprehensive help book with solved papers, theory notes, and important Q&A.",
        resourceType: "book", year: "2024", session: "2024-25 Edition", productType: "digital",
        isPaid: true, price: 24900, fileName: "MS-01_HelpBook.pdf", mime: "application/pdf", size: 12_000_000, pages: 240, downloadCount: 780,
      },
      {
        courseId: crs("BEGLA-135")._id, programId: prog("ba")._id, universityId: ignou._id, courseCode: "BEGLA-135",
        title: "BEGLA-135 English in Daily Life — Study Guide", description: "Easy-to-read guide with grammar tips, letter formats, and solved exercises.",
        resourceType: "guide", year: "2024", session: "2024-25", productType: "digital",
        isPaid: false, price: 0, fileName: "BEGLA-135_Guide.pdf", mime: "application/pdf", size: 3_600_000, pages: 75, downloadCount: 640,
      },
    ];

    let inserted = 0;
    for (const rd of resourceDefs) {
      const exists = await Resource.findOne({ courseId: rd.courseId, title: rd.title });
      if (!exists) {
        await Resource.create({ ...rd, isActive: true, storageProvider: "gridfs" });
        inserted++;
      }
    }
    console.log(`  Resources: ${inserted} inserted (${resourceDefs.length - inserted} already existed)`);

    console.log("\n🎉 Seed complete! Your store now has sample data.");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed();
