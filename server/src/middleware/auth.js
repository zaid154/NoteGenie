// FLOW: Auth middleware. JWT token comes from Authorization header, User is loaded from MongoDB, req.user is attached, and protected/admin routes continue.

// Yeh file login se judi cheezein sambhalti hai: token banana aur routes ko protect karna.
// "middleware" = ek function jo request aur final code ke beech me chalta hai (jaise guard).
import jwt from "jsonwebtoken"; // login token (JWT) banane/check karne ke liye
import { env } from "../config/env.js";
import { User } from "../models/User.js";

// JWT token banane ka helper (login/register dono use karte hain).
export function signToken(userId) {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Protected routes ke liye: "Authorization: Bearer <token>" check karta hai.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Login required" });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Sirf admin users ke liye (Settings, API keys, billing, user create/delete).
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Staff ya admin dono ke liye (stats dekhna, content moderation, user usage reset).
// Admin-only kaam ke liye requireAdmin use karo, ye nahi.
export function requireStaff(req, res, next) {
  if (!req.user || (req.user.role !== "staff" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Staff access required" });
  }
  next();
}

// Granular gate: admin always passes; staff passes only if they hold `key`
// (see config/permissions.js). Regular users are always rejected.
export function requirePermission(key) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    if (req.user.role === "admin") return next();
    if (req.user.role === "staff" && (req.user.permissions || []).includes(key)) return next();
    return res.status(403).json({ message: "You don't have permission to do that." });
  };
}
