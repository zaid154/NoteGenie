import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/User.js";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@notegenie.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed] MONGO_URI missing in server/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("[seed] Connected to MongoDB");

  const email = ADMIN_EMAIL.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (user) {
    user.role = "admin";
    user.name = ADMIN_NAME;
    if (ADMIN_PASSWORD) {
      user.passwordHash = await User.hashPassword(ADMIN_PASSWORD);
    }
    await user.save();
    console.log(`[seed] Updated existing user to admin: ${email}`);
  } else {
    const passwordHash = await User.hashPassword(ADMIN_PASSWORD);
    user = await User.create({
      name: ADMIN_NAME,
      email,
      passwordHash,
      role: "admin",
    });
    console.log(`[seed] Created admin user: ${email}`);
  }

  console.log("[seed] Login with ADMIN_EMAIL / ADMIN_PASSWORD from .env");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
