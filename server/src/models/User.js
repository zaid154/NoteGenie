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
    role: { type: String, enum: ["user", "admin"], default: "user" },
    plan: { type: String, default: "free" },
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    planExpiresAt: { type: Date, default: null },
    usageThisMonth: { type: usageSchema, default: () => ({}) },
    usageResetAt: { type: Date, default: null },
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
