// FLOW: User Mongoose model. Controllers/services create and query this schema, MongoDB stores the fields, and API responses are built from these documents.

// User model — account, plan, and monthly usage tracking.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const usageSchema = new mongoose.Schema(
  {
    documents: { type: Number, default: 0 },
    tutorMessages: { type: Number, default: 0 },
    quizzes: { type: Number, default: 0 },
  },
  { _id: false }
);

const studyStreakSchema = new mongoose.Schema(
  {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastStudyDay: { type: String, default: "" }, // local YYYY-MM-DD
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: "", trim: true, maxlength: 280 },
    avatar: { type: String, default: "" },
    // "staff" = support/moderation role: can view stats/users and moderate content,
    // but NOT settings/API keys, billing, or user create/delete/role changes.
    role: { type: String, enum: ["user", "staff", "admin"], default: "user" },
    // Granular capabilities granted to a staff user by an admin (see config/permissions.js).
    // Ignored for "user" (none) and "admin" (implicitly has all).
    permissions: { type: [String], default: [] },
    plan: { type: String, default: "free" },
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    planExpiresAt: { type: Date, default: null },
    usageThisMonth: { type: usageSchema, default: () => ({}) },
    usageResetAt: { type: Date, default: null },
    studyStreak: { type: studyStreakSchema, default: () => ({}) },
    dailyGoalCards: { type: Number, default: 20 },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: "" },
    emailVerifyOtpExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: "" },
    passwordResetExpires: { type: Date, default: null },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.createEmailVerifyOtp = function (length = 6, expiresMin = 10) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const otp = String(Math.floor(min + Math.random() * (max - min + 1)));
  this.emailVerifyToken = crypto.createHash("sha256").update(otp).digest("hex");
  this.emailVerifyOtpExpires = new Date(Date.now() + expiresMin * 60 * 1000);
  return otp;
};

userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return token;
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    permissions: this.permissions || [],
    plan: this.plan || "free",
    bio: this.bio || "",
    avatar: this.avatar || "",
    emailVerified: this.emailVerified,
    onboardingComplete: this.onboardingComplete,
    planExpiresAt: this.planExpiresAt || null,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);
