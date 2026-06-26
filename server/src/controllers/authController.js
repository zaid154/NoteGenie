// FLOW: Auth API logic. Auth routes send register/login/profile/password/email requests here, this controller reads/writes User, creates JWT/OTP/email flows, and returns user/session data.

// Auth: register, login, profile, email verification, password reset.
import crypto from "crypto";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";
import { sendEmail, verifyOtpHtml, resetPasswordHtml } from "../services/email.js";
import { usageSummary, usageSummaryAsync, startOfNextMonth } from "../config/plans.js";
import { applyPlanExpiry } from "../services/planExpiry.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

async function deliverVerificationOtp(user) {
  const otp = user.createEmailVerifyOtp(env.otpLength, env.otpExpiresMin);
  await user.save();
  const mail = await sendEmail({
    to: user.email,
    subject: `${otp} — Verify your NoteGenie account`,
    html: verifyOtpHtml(user.name, otp, env.otpExpiresMin),
    text: `Your NoteGenie verification code is zaid dfdjfdskjfhdjskfhjk${otp}. It expires in ${env.otpExpiresMin} minutes.`,
  });
  if (mail.dev) {
    console.log(`[email] Verification OTP for ${user.email}: ${otp}`);
  }
  return otp;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (name.trim().length > 80) {
    return res.status(400).json({ message: "Name is too long" });
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email,
    passwordHash,
    usageResetAt: startOfNextMonth(),
  });

  await deliverVerificationOtp(user);

  const token = signToken(user._id);
  res.status(201).json({ user: user.toSafeObject(), token, needsVerification: true });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = signToken(user._id);
  res.json({ user: user.toSafeObject(), token, usage: usageSummary(user) });
});

export const me = asyncHandler(async (req, res) => {
  await applyPlanExpiry(req.user);
  res.json({ user: req.user.toSafeObject(), usage: usageSummary(req.user) });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { otp, email } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });
  if (user.emailVerified) {
    return res.json({ message: "Email already verified", user: user.toSafeObject() });
  }

  const hash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
  if (
    user.emailVerifyToken !== hash ||
    !user.emailVerifyOtpExpires ||
    user.emailVerifyOtpExpires <= new Date()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.emailVerified = true;
  user.emailVerifyToken = "";
  user.emailVerifyOtpExpires = null;
  await user.save();
  res.json({ message: "Email verified", user: user.toSafeObject() });
});

export const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.emailVerified) {
    return res.json({ message: "Email is already verified" });
  }
  await deliverVerificationOtp(req.user);
  res.json({ message: "Verification OTP sent" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const resetToken = user.createPasswordResetToken();
    await user.save();
    const link = `${env.clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: "Reset your NoteGenie password",
      html: resetPasswordHtml(user.name, link),
    });
  }
  res.json({ message: "If that email exists, a reset link was sent." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    return res.status(400).json({ message: "Token, email, and new password are required" });
  }
  if (password.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    email: email.toLowerCase(),
    passwordResetToken: hash,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ message: "Invalid or expired reset link" });
  user.passwordHash = await User.hashPassword(password);
  user.passwordResetToken = "";
  user.passwordResetExpires = null;
  await user.save();
  res.json({ message: "Password updated. You can log in now." });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  req.user.onboardingComplete = true;
  await req.user.save();
  res.json({ user: req.user.toSafeObject() });
});

const MAX_BIO = 280;
const MAX_AVATAR_CHARS = 700_000;

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, avatar } = req.body;

  if (name !== undefined) {
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    if (name.trim().length > 80) return res.status(400).json({ message: "Name is too long" });
    req.user.name = name.trim();
  }

  if (bio !== undefined) {
    if (typeof bio !== "string") return res.status(400).json({ message: "Invalid bio" });
    if (bio.length > MAX_BIO) {
      return res.status(400).json({ message: `Bio must be ${MAX_BIO} characters or less` });
    }
    req.user.bio = bio.trim();
  }

  if (avatar !== undefined) {
    if (avatar !== "") {
      if (typeof avatar !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/.test(avatar)) {
        return res.status(400).json({ message: "Invalid image" });
      }
      if (avatar.length > MAX_AVATAR_CHARS) {
        return res.status(400).json({ message: "Image is too large. Please pick a smaller one." });
      }
    }
    req.user.avatar = avatar;
  }

  await req.user.save();
  res.json({ user: req.user.toSafeObject() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters` });
  }
  const ok = await req.user.comparePassword(currentPassword);
  if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
  req.user.passwordHash = await User.hashPassword(newPassword);
  await req.user.save();
  res.json({ message: "Password updated" });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password required to delete account" });
  const ok = await req.user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: "Incorrect password" });
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "Account deleted" });
});
