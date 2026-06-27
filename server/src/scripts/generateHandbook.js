// FLOW: Generates the academic resource handbook PDF from the sample dataset.
// Run: npm run handbook   (from the server folder, or `npm run handbook --prefix server` from root)
// Output: docs/academic-handbook.pdf

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildHandbookPdf } from "../services/handbookPdf.js";
import { HANDBOOK_META, ACADEMIC_PROGRAMS } from "../config/academicSample.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../../../docs");
const outPath = path.resolve(outDir, "academic-handbook.pdf");

const buf = await buildHandbookPdf(HANDBOOK_META, ACADEMIC_PROGRAMS);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, buf);

const courses = ACADEMIC_PROGRAMS.reduce((s, p) => s + p.semesters.reduce((x, sem) => x + sem.courses.length, 0), 0);
console.log(`✅ Handbook written: ${outPath}`);
console.log(`   ${(buf.length / 1024).toFixed(1)} KB · ${ACADEMIC_PROGRAMS.length} programs · ${courses} courses`);
