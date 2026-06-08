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

// Sirf admin users ke liye (Settings, users list, etc.).
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
