import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { Resource } from "../models/Resource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
await mongoose.connect(process.env.MONGO_URI);
console.log("Connected");

// Make 2 notes paid (₹99)
const freeNotes = await Resource.find({ resourceType: "notes", isPaid: false }).limit(2);
for (const n of freeNotes) { n.isPaid = true; n.price = 9900; await n.save(); }
console.log(`Made ${freeNotes.length} notes paid (₹99)`);

// Make 1 project free
const paidProj = await Resource.find({ resourceType: "project", isPaid: true }).limit(1);
for (const p of paidProj) { p.isPaid = false; p.price = 0; await p.save(); }
console.log(`Made ${paidProj.length} project free`);

// Summary
const all = await Resource.find({ isActive: true }).lean();
const summary = {};
for (const r of all) {
  const k = `${r.resourceType} (${r.isPaid ? "paid" : "free"})`;
  summary[k] = (summary[k] || 0) + 1;
}
console.log("\nFinal breakdown:");
Object.entries(summary).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

await mongoose.disconnect();
