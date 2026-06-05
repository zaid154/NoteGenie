import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { User } from "../models/User.js";

// .env project root me hai (server/src/scripts/ se teen level upar).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@notegenie.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

const USER_EMAIL = process.env.USER_EMAIL || "user@notegenie.local";
const USER_PASSWORD = process.env.USER_PASSWORD || "user123456";
const USER_NAME = process.env.USER_NAME || "Demo User";

// Ek account ko create ya update karta hai (email unique hota hai).
async function upsertUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.name = name;
    user.role = role;
    if (password) {
      user.passwordHash = await User.hashPassword(password);
    }
    await user.save();
    console.log(`[seed] Updated ${role}: ${normalizedEmail}`);
  } else {
    const passwordHash = await User.hashPassword(password);
    user = await User.create({ name, email: normalizedEmail, passwordHash, role });
    console.log(`[seed] Created ${role}: ${normalizedEmail}`);
  }
  return user;
}

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed] MONGO_URI missing in server/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[seed] Connected to MongoDB");

  await upsertUser({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
  });

  await upsertUser({
    name: USER_NAME,
    email: USER_EMAIL,
    password: USER_PASSWORD,
    role: "user",
  });

  console.log("\n[seed] Done. Login credentials:");
  console.log(`  Admin → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  User  → ${USER_EMAIL} / ${USER_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
