// FLOW: Auth API logic. Auth routes send register/login/profile/password/email requests here, this controller reads/writes User, creates JWT/OTP/email flows, and returns user/session data.

// Auth: register, login, profile, email verification, password reset.
import crypto from "crypto";
import { User } from "../models/User.js";
import { PendingSignup } from "../models/PendingSignup.js";
import { signToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";
import { sendEmail, verifyOtpHtml, resetPasswordHtml } from "../services/email.js";
import { usageSummary, usageSummaryAsync, startOfNextMonth } from "../config/plans.js";
import { applyPlanExpiry } from "../services/planExpiry.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// Brute-force guard: a pending signup is discarded after this many wrong OTP tries.
const MAX_OTP_ATTEMPTS = 5;
// Resend cooldown so the same email can't be spammed with OTP messages.
const RESEND_COOLDOWN_MS = 45 * 1000;
// Abandoned pending signups self-destruct after this long (TTL on the model).
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
}

// Cryptographically-random numeric OTP of the configured length.
function generateOtp(length = env.otpLength) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(crypto.randomInt(min, max));
}

// Sends an OTP email. Returns the code only so dev logging can show it when SMTP is off.
async function sendVerificationOtp({ name, email, otp }) {
  const mail = await sendEmail({
    to: email,
    subject: `${otp} — Verify your NoteGenie account`,
    html: verifyOtpHtml(name, otp, env.otpExpiresMin),
    text: `Your NoteGenie verification code is ${otp}. It expires in ${env.otpExpiresMin} minutes. If you didn't request this, you can ignore this email.`,
  });
  if (mail.dev) {
    console.log(`[email] Verification OTP for ${email}: ${otp}`);
  }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ message: "Please enter your name" });
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

  const normalizedEmail = email.toLowerCase();

  // A real (verified) account already exists — don't leak much, just block.
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  // No User is created yet — the signup waits in PendingSignup until the OTP is verified,
  // so the database never accumulates unverified junk accounts.
  const passwordHash = await User.hashPassword(password);
  const otp = generateOtp();
  const now = Date.now();

  await PendingSignup.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      otpHash: hashOtp(otp),
      otpExpires: new Date(now + env.otpExpiresMin * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(now),
      expiresAt: new Date(now + PENDING_TTL_MS),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendVerificationOtp({ name: name.trim(), email: normalizedEmail, otp });

  // No token, no user yet — the client must verify the OTP to create the account.
  res.status(201).json({ needsVerification: true, email: normalizedEmail });
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
  const normalizedEmail = email.toLowerCase();

  // Already a verified account? Tell them to log in instead of erroring.
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.emailVerified) {
    return res.json({ message: "Email already verified. Please log in.", alreadyVerified: true });
  }

  const pending = await PendingSignup.findOne({ email: normalizedEmail });

  // Legacy path: an unverified User from the old flow (no PendingSignup record).
  if (!pending && existingUser) {
    const hash = hashOtp(otp);
    if (
      existingUser.emailVerifyToken !== hash ||
      !existingUser.emailVerifyOtpExpires ||
      existingUser.emailVerifyOtpExpires <= new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    existingUser.emailVerified = true;
    existingUser.emailVerifyToken = "";
    existingUser.emailVerifyOtpExpires = null;
    await existingUser.save();
    const token = signToken(existingUser._id);
    return res.json({ message: "Email verified", user: existingUser.toSafeObject(), token });
  }

  if (!pending) {
    return res.status(400).json({ message: "No pending signup found. Please register again." });
  }

  if (!pending.otpExpires || pending.otpExpires <= new Date()) {
    return res.status(400).json({ message: "Code expired. Please request a new one." });
  }

  // Brute-force guard: too many wrong tries discards the signup.
  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await PendingSignup.deleteOne({ _id: pending._id });
    return res
      .status(429)
      .json({ message: "Too many incorrect attempts. Please register again." });
  }

  if (pending.otpHash !== hashOtp(otp)) {
    pending.attempts += 1;
    await pending.save();
    const left = Math.max(0, MAX_OTP_ATTEMPTS - pending.attempts);
    return res.status(400).json({
      message: left
        ? `Invalid code. ${left} attempt${left === 1 ? "" : "s"} left.`
        : "Invalid code.",
    });
  }

  // OTP correct — now (and only now) create the real account.
  // Re-check for a race where the email got registered between the two queries.
  const clash = await User.findOne({ email: normalizedEmail });
  if (clash) {
    await PendingSignup.deleteOne({ _id: pending._id });
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const user = await User.create({
    name: pending.name,
    email: normalizedEmail,
    passwordHash: pending.passwordHash,
    emailVerified: true,
    usageResetAt: startOfNextMonth(),
  });
  await PendingSignup.deleteOne({ _id: pending._id });

  const token = signToken(user._id);
  res.status(201).json({ message: "Email verified", user: user.toSafeObject(), token });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.emailVerified) {
    return res.json({ message: "Email is already verified. Please log in." });
  }

  const pending = await PendingSignup.findOne({ email: normalizedEmail });

  // Legacy unverified User (old flow) — refresh its OTP.
  if (!pending && existingUser) {
    if (
      existingUser.emailVerifyOtpExpires &&
      Date.now() - (existingUser.emailVerifyOtpExpires.getTime() - env.otpExpiresMin * 60 * 1000) <
        RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({ message: "Please wait a moment before requesting another code." });
    }
    const otp = generateOtp();
    existingUser.emailVerifyToken = hashOtp(otp);
    existingUser.emailVerifyOtpExpires = new Date(Date.now() + env.otpExpiresMin * 60 * 1000);
    await existingUser.save();
    await sendVerificationOtp({ name: existingUser.name, email: normalizedEmail, otp });
    return res.json({ message: "Verification code sent" });
  }

  if (!pending) {
    // Don't reveal whether the email is known — generic response.
    return res.json({ message: "If that signup exists, a new code was sent." });
  }

  // Cooldown so resend can't be spammed.
  if (pending.lastSentAt && Date.now() - pending.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ message: "Please wait a moment before requesting another code." });
  }

  const otp = generateOtp();
  const now = Date.now();
  pending.otpHash = hashOtp(otp);
  pending.otpExpires = new Date(now + env.otpExpiresMin * 60 * 1000);
  pending.attempts = 0;
  pending.lastSentAt = new Date(now);
  pending.expiresAt = new Date(now + PENDING_TTL_MS);
  await pending.save();
  await sendVerificationOtp({ name: pending.name, email: normalizedEmail, otp });

  res.json({ message: "Verification code sent" });
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
