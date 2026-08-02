// Quick script to check what resource types exist and add missing ones (notes, project, synopsis)
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { User } from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const uri = process.env.MONGO_URI;
if (!uri) { console.error("MONGO_URI missing"); process.exit(1); }

await mongoose.connect(uri);
console.log("Connected\n");

// 1. Check what types exist
const types = await Resource.aggregate([{ $group: { _id: "$resourceType", count: { $sum: 1 } } }]);
console.log("Current resource types in DB:");
types.forEach(t => console.log(`  ${t._id}: ${t.count}`));

// 2. Check if notes/project/synopsis resources exist
const notesCount = await Resource.countDocuments({ resourceType: "notes", isActive: true });
const projectCount = await Resource.countDocuments({ resourceType: "project", isActive: true });
const synopsisCount = await Resource.countDocuments({ resourceType: "synopsis", isActive: true });
console.log(`\nnotes: ${notesCount}, project: ${projectCount}, synopsis: ${synopsisCount}`);

// 3. If any are missing, add virtual resources for them
if (notesCount === 0 || projectCount === 0 || synopsisCount === 0) {
  console.log("\nAdding missing resource types...");
  
  // Get some real courses from DB
  const courses = await Course.find({ isActive: true }).lean();
  const findCourse = (code) => courses.find(c => c.code === code) || courses[0];
  
  const admin = await User.findOne({ role: "admin" }).lean();
  const adminId = admin?._id || new mongoose.Types.ObjectId();

  const toAdd = [];

  if (notesCount === 0) {
    const notesDefs = [
      { code: "BCS-011", title: "BCS-011 Complete Handwritten Notes", desc: "Topic-wise handwritten notes — OS, hardware, networking, MS Office. Neat diagrams.", pages: 68, dl: 1240 },
      { code: "MCS-011", title: "MCS-011 Problem Solving & Programming Notes", desc: "C programming, flowcharts, algorithms, arrays, pointers. Important questions marked.", pages: 52, dl: 890 },
      { code: "MHI-01", title: "MHI-01 Ancient & Medieval Societies Notes", desc: "Summary notes — Greek, Roman, Indian, Chinese civilisations. Exam-oriented.", pages: 44, dl: 530 },
      { code: "BCOC-131", title: "BCOC-131 Financial Accounting Notes", desc: "Chapter-wise typed notes with solved illustrations. Journal, ledger, trial balance.", pages: 92, dl: 710 },
      { code: "MEG-01", title: "MEG-01 British Poetry Notes", desc: "Comprehensive notes on Chaucer, Shakespeare, Romantic & Victorian poetry.", pages: 60, dl: 420 },
      { code: "MMPC-001", title: "MMPC-001 Management Functions Notes", desc: "Unit-wise summary notes for MBA Management Functions. Theory + diagrams.", pages: 55, dl: 380 },
    ];
    for (const n of notesDefs) {
      const c = findCourse(n.code);
      toAdd.push({
        uploadedBy: adminId, universityId: c.universityId, programId: c.programId,
        courseId: c._id, courseCode: c.code, resourceType: "notes",
        title: n.title, description: n.desc, year: "2024", session: "2024-25",
        isPaid: false, price: 0, currency: "INR",
        fileName: `seed-demo-${n.code.toLowerCase()}-notes.pdf`,
        storageProvider: "gridfs", storageKey: "", mime: "application/pdf",
        size: n.pages * 45000, pages: n.pages, downloadCount: n.dl, isActive: true,
      });
    }
  }

  if (projectCount === 0) {
    const projectDefs = [
      { code: "BCSL-013", title: "BCA Lab Project — Library Management System", desc: "Complete C project with source code, docs, synopsis, viva questions.", price: 14900, dl: 320 },
      { code: "MCS-011", title: "MCA Project — Online Quiz Application", desc: "Full-stack React + Node project. Synopsis, SRS, source, report.", price: 29900, dl: 185 },
      { code: "BCS-053", title: "BCA Project — Student Portal (PHP + MySQL)", desc: "Working student portal with admin dashboard, source code, DB dump.", price: 19900, dl: 260 },
      { code: "BCS-040", title: "BCA Project — Inventory Management System", desc: "Complete Python + Django project with documentation and viva prep.", price: 14900, dl: 210 },
    ];
    for (const p of projectDefs) {
      const c = findCourse(p.code);
      toAdd.push({
        uploadedBy: adminId, universityId: c.universityId, programId: c.programId,
        courseId: c._id, courseCode: c.code, resourceType: "project",
        title: p.title, description: p.desc, year: "2024", session: "2024-25",
        isPaid: true, price: p.price, currency: "INR",
        fileName: `seed-demo-${p.code.toLowerCase()}-project.zip`,
        storageProvider: "gridfs", storageKey: "", mime: "application/zip",
        size: 15_000_000, pages: null, downloadCount: p.dl, isActive: true,
      });
    }
  }

  if (synopsisCount === 0) {
    const synDefs = [
      { code: "BCS-040", title: "BCA Synopsis — E-Commerce Website", desc: "Ready-made synopsis for BCA final year project.", price: 9900, dl: 450 },
      { code: "MCS-011", title: "MCA Synopsis — Hospital Management System", desc: "Complete MCA synopsis with objectives, methodology, modules, and references.", price: 12900, dl: 280 },
    ];
    for (const s of synDefs) {
      const c = findCourse(s.code);
      toAdd.push({
        uploadedBy: adminId, universityId: c.universityId, programId: c.programId,
        courseId: c._id, courseCode: c.code, resourceType: "synopsis",
        title: s.title, description: s.desc, year: "2024", session: "2024-25",
        isPaid: true, price: s.price, currency: "INR",
        fileName: `seed-demo-${s.code.toLowerCase()}-synopsis.pdf`,
        storageProvider: "gridfs", storageKey: "", mime: "application/pdf",
        size: 800_000, pages: 18, downloadCount: s.dl, isActive: true,
      });
    }
  }

  if (toAdd.length > 0) {
    const inserted = await Resource.insertMany(toAdd);
    console.log(`Inserted ${inserted.length} resources for missing types`);
  }

  // Show updated counts
  const updated = await Resource.aggregate([{ $group: { _id: "$resourceType", count: { $sum: 1 } } }]);
  console.log("\nUpdated resource types:");
  updated.forEach(t => console.log(`  ${t._id}: ${t.count}`));
}

await mongoose.disconnect();
console.log("\nDone!");
