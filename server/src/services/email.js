// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Auth controller calls this for verification and reset emails. SMTP values come from config/env.js, templates are built here, and nodemailer sends the message to the user.

// Email sending — verification and password reset.
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser) return null;
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure ?? env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn("[email] SMTP not configured — would send to:", to, subject);
    return { ok: false, dev: true };
  }
  await tx.sendMail({
    from: env.emailFrom || env.smtpUser,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  });
  return { ok: true };
}

export function verifyOtpHtml(name, otp, expiresMin) {
  return `<p>Hi ${name},</p><p>Your NoteGenie verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in ${expiresMin} minutes.</p><p>If you did not create an account, you can ignore this email.</p>`;
}

export function resetPasswordHtml(name, link) {
  return `<p>Hi ${name},</p><p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>Link expires in 1 hour.</p>`;
}

