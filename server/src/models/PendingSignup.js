// FLOW: Pending signup model. register() stores an unverified signup here (NOT in User),
// verifyEmail() reads it, creates the real User, then deletes this. A TTL index auto-removes
// abandoned signups so no junk/unverified records pile up in the database.

import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    // OTP is stored hashed (sha256), never in plain text.
    otpHash: { type: String, required: true },
    otpExpires: { type: Date, required: true },
    // Wrong-OTP attempts — used for brute-force protection.
    attempts: { type: Number, default: 0 },
    // Last time an OTP email was sent — used for resend cooldown.
    lastSentAt: { type: Date, default: null },
    // TTL cleanup: the whole pending record disappears after this time even if abandoned.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB removes the document automatically once expiresAt passes.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingSignup = mongoose.model("PendingSignup", pendingSignupSchema);
