// FLOW: Academic handbook PDF builder (pdfkit). Given meta + a programs array (see
// config/academicSample.js), returns a Buffer of a professionally formatted PDF: cover page,
// table of contents with page numbers, program/university/course sections, assignments (with
// difficulty), recommended books (Free/Paid), additional resources, and footer page numbers.

import PDFDocument from "pdfkit";

const C = {
  accent: "#0d9488", // teal
  ink: "#18181b",
  muted: "#71717a",
  free: "#059669",
  paid: "#b45309",
  easy: "#059669",
  medium: "#b45309",
  hard: "#dc2626",
  line: "#e4e4e7",
};

function diffColor(d) {
  return d === "Hard" ? C.hard : d === "Medium" ? C.medium : C.easy;
}

function drawProgram(doc, p) {
  doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(20).text(p.name);
  doc.fillColor(C.muted).font("Helvetica").fontSize(9).text(`Program code: ${p.code}`);
  doc.moveDown(0.6);

  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(12).text("Universities offering this program");
  doc.moveDown(0.2);
  doc.fillColor(C.ink).font("Helvetica").fontSize(10).list(p.universities, { bulletRadius: 1.6, textIndent: 12, lineGap: 1 });
  doc.moveDown(0.6);

  for (const sem of p.semesters) {
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(14).text(sem.name);
    doc.moveDown(0.2);

    for (const course of sem.courses) {
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(12).text(`${course.code} — ${course.name}  (${course.credits} credits)`);
      doc.fillColor(C.muted).font("Helvetica").fontSize(10).text(course.description);
      doc.moveDown(0.3);

      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10.5).text("Assignments");
      doc.font("Helvetica").fontSize(10);
      course.assignments.forEach((a, i) => {
        doc.fillColor(C.ink).text(`${i + 1}. ${a.q}  `, { continued: true });
        doc.fillColor(diffColor(a.difficulty)).text(`[${a.difficulty}]`);
      });
      doc.moveDown(0.3);

      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10.5).text("Recommended books");
      doc.font("Helvetica").fontSize(10);
      course.books.forEach((b) => {
        doc.fillColor(C.ink).text(`• ${b.title} — ${b.author} (${b.publisher})  `, { continued: true });
        doc.fillColor(b.type === "Free" ? C.free : C.paid).text(`${b.type}${b.source ? ` · ${b.source}` : ""}`);
      });
      doc.moveDown(0.3);

      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10.5).text("Additional resources");
      doc.fillColor(C.ink).font("Helvetica").fontSize(10).list(course.resources, { bulletRadius: 1.6, textIndent: 12, lineGap: 1 });
      doc.moveDown(0.8);
    }
  }
}

// A small, branded single-purpose sample PDF (used by the seed so every demo product has a real,
// downloadable file). `kind` tailors the sample body (assignment / question paper / notes …).
export function buildSamplePdf(title, kind = "notes") {
  const SAMPLES = {
    solved_assignment: ["This is a sample SOLVED ASSIGNMENT (handwritten + typed).", "Q1. Define the topic and explain with examples. (Answer provided)", "Q2. Long-answer with step-by-step solution. (Answer provided)", "Q3. Application-based question. (Answer provided)"],
    assignment: ["This is a sample ASSIGNMENT question set.", "Q1. Define the key terms in your own words.", "Q2. Explain the main concept with a suitable example.", "Q3. Attempt the application-based long question."],
    question_paper: ["This is a sample PREVIOUS-YEAR QUESTION PAPER.", "Section A — Short answers (5 x 2 marks)", "Section B — Long answers (4 x 10 marks)", "Section C — Case study (1 x 20 marks)"],
    guide: ["This is a sample HELP BOOK / EXAM GUIDE.", "Chapter 1 — Concept summary & key points", "Chapter 2 — Important questions with answers", "Chapter 3 — Quick revision notes"],
    notes: ["These are sample STUDY NOTES.", "Unit 1 — Introduction & key definitions", "Unit 2 — Core concepts with examples", "Unit 3 — Summary & important points for exams"],
  };
  const body = SAMPLES[kind] || SAMPLES.notes;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, 8).fill(C.accent);
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(11).text("NOTEGENIE · STUDY MATERIAL", 56, 80, { characterSpacing: 2 });
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(20).text(title, 56, 110, { width: doc.page.width - 112 });
    doc.moveDown(1);
    doc.fillColor(C.ink).font("Helvetica").fontSize(12);
    body.forEach((line, i) => { doc.text(i === 0 ? line : `• ${line}`); doc.moveDown(0.4); });
    doc.moveDown(2);
    doc.fillColor(C.muted).fontSize(9).text("This is sample demo content. Replace with your real file from Admin → Products.", { width: doc.page.width - 112 });
    doc.fillColor(C.muted).fontSize(8).text(`NoteGenie · ${new Date().toISOString().slice(0, 10)}`, 56, doc.page.height - 50);
    doc.end();
  });
}

export function buildHandbookPdf(meta, programs) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true, autoFirstPage: false });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let pageNo = 0;
    doc.on("pageAdded", () => { pageNo += 1; });

    const today = new Date().toISOString().slice(0, 10);

    // ── Cover ──────────────────────────────────────────────────────────────
    doc.addPage();
    const W = doc.page.width;
    const H = doc.page.height;
    doc.rect(0, 0, W, 10).fill(C.accent);
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(12).text(meta.org.toUpperCase(), 56, 150, { characterSpacing: 3 });
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(36).text(meta.title, 56, 180, { width: W - 112 });
    doc.moveDown(0.4);
    doc.fillColor(C.muted).font("Helvetica").fontSize(13).text(meta.subtitle, { width: W - 112 });
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(11).text(meta.edition, 56, 360);
    doc.fillColor(C.muted).font("Helvetica").fontSize(10).text(`Generated ${today}`);
    doc.rect(56, H - 150, W - 112, 70).fill("#f0fdfa");
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(11).text("Inside this handbook", 72, H - 134);
    doc.fillColor(C.ink).font("Helvetica").fontSize(9.5).text(
      "Programs · Universities · Semester courses (code, credits, description) · Assignments (Easy/Medium/Hard) · Recommended books (Free & Paid) · Notes, question papers, lab manuals & project ideas.",
      72, H - 118, { width: W - 144 }
    );

    // ── Table of contents (filled after content) ───────────────────────────
    doc.addPage();
    const tocPageIndex = pageNo - 1; // 0-based buffered index
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(22).text("Table of Contents", 56, 70);

    const tocEntries = [];

    // ── Program sections ───────────────────────────────────────────────────
    for (const p of programs) {
      doc.addPage();
      tocEntries.push({ label: p.name, page: pageNo }); // start page (human, cover = 1)
      drawProgram(doc, p);
    }

    // Fill the TOC now that page numbers are known.
    doc.switchToPage(tocPageIndex);
    let y = 120;
    doc.font("Helvetica").fontSize(12);
    tocEntries.forEach((e, i) => {
      doc.fillColor(C.ink).text(`${i + 1}.  ${e.label}`, 56, y, { lineBreak: false, width: W - 160 });
      doc.fillColor(C.muted).text(String(e.page), W - 96, y, { width: 40, align: "right", lineBreak: false });
      y += 24;
    });

    // ── Footers on every page ──────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const yy = H - 38;
      doc.moveTo(56, yy - 6).lineTo(W - 56, yy - 6).strokeColor(C.line).lineWidth(0.5).stroke();
      doc.fillColor(C.muted).font("Helvetica").fontSize(8)
        .text(`${meta.org} · ${meta.title}`, 56, yy, { lineBreak: false });
      doc.fillColor(C.muted).fontSize(8)
        .text(`Page ${i + 1} of ${range.count}`, W - 156, yy, { width: 100, align: "right", lineBreak: false });
    }

    doc.end();
  });
}
