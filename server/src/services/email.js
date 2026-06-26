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
  const digits = String(otp).split("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Verify your NoteGenie account</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <tr><td style="background:linear-gradient(90deg,#7c3aed,#a855f7,#ec4899);height:4px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:36px 40px 28px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;padding:10px 18px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;vertical-align:middle;">N</span>
              <span style="font-size:11px;font-weight:700;color:#e9d5ff;letter-spacing:3px;vertical-align:middle;margin-left:8px;">NOTE GENIE</span>
            </td></tr>
          </table>

          <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#18181b;letter-spacing:-0.4px;">Verify your email</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
            Hi <strong style="color:#7c3aed;">${name}</strong>, enter the code below to confirm your NoteGenie account.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:14px;margin-bottom:20px;">
            <tr><td style="padding:28px 20px;text-align:center;">
              <p style="margin:0 0 18px;font-size:10px;font-weight:700;color:#7c3aed;letter-spacing:4px;text-transform:uppercase;">Your Verification Code</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  ${digits.map(d => `<td style="padding:0 4px;">
                    <div style="width:46px;height:58px;line-height:58px;background:#ffffff;border:2px solid #a855f7;border-radius:10px;font-size:26px;font-weight:900;color:#18181b;text-align:center;box-shadow:0 2px 8px rgba(124,58,237,0.12);">${d}</div>
                  </td>`).join("")}
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">⏱ Expires in <strong style="color:#7c3aed;">${expiresMin} minutes</strong></p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 18px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:16px;padding-right:10px;vertical-align:top;line-height:1.6;">🔒</td>
                <td style="font-size:12px;color:#71717a;line-height:1.6;text-align:left;">
                  If you didn't create a NoteGenie account, you can safely ignore this email.
                  <strong style="color:#52525b;">Never share this code with anyone.</strong>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="height:1px;background:#f4f4f5;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:20px 40px 28px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;">Sent by <strong style="color:#7c3aed;">NoteGenie</strong> &middot; Your AI note-taking companion</p>
          <p style="margin:0;font-size:11px;color:#d4d4d8;">&copy; ${new Date().getFullYear()} NoteGenie. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function resetPasswordHtml(name, link) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset your NoteGenie password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">

        <tr><td style="background:linear-gradient(90deg,#7c3aed,#a855f7,#ec4899);height:4px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:36px 40px 28px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;padding:10px 18px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;vertical-align:middle;">N</span>
              <span style="font-size:11px;font-weight:700;color:#e9d5ff;letter-spacing:3px;vertical-align:middle;margin-left:8px;">NOTE GENIE</span>
            </td></tr>
          </table>

          <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#18181b;letter-spacing:-0.4px;">Reset your password</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
            Hi <strong style="color:#7c3aed;">${name}</strong>, we received a request to reset your NoteGenie password. Click the button below to choose a new one.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:10px;padding:14px 36px;">
              <a href="${link}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">Reset my password</a>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;margin-bottom:20px;">
            <tr><td style="padding:12px 16px;text-align:left;">
              <p style="margin:0 0 4px;font-size:10px;color:#a1a1aa;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Or copy this link</p>
              <a href="${link}" style="font-size:11px;color:#7c3aed;word-break:break-all;text-decoration:none;">${link}</a>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:#fef3c7;border:1px solid #fde68a;border-radius:20px;padding:5px 14px;">
              <span style="font-size:11px;color:#92400e;font-weight:600;">⏱ Link expires in 1 hour</span>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 18px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:16px;padding-right:10px;vertical-align:top;line-height:1.6;">🔒</td>
                <td style="font-size:12px;color:#71717a;line-height:1.6;text-align:left;">
                  If you didn't request a password reset, you can safely ignore this email.
                  Your password will <strong style="color:#52525b;">not</strong> be changed.
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="height:1px;background:#f4f4f5;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:20px 40px 28px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;">Sent by <strong style="color:#7c3aed;">NoteGenie</strong> &middot; Your AI note-taking companion</p>
          <p style="margin:0;font-size:11px;color:#d4d4d8;">&copy; ${new Date().getFullYear()} NoteGenie. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
