// Yeh file login/register se judi saari request handle karti hai (controller = logic).
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// Email sahi format me hai ya nahi, yeh check karne wala pattern.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8; // password kam se kam itne characters ka ho

// POST /api/auth/register — naya account banata hai.
export const register = asyncHandler(async (req, res) => {
  // Step 1: frontend se aayi values nikaalo.
  const { name, email, password } = req.body;

  // Step 2: saari values sahi hain ya nahi, check karo.
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

  // Step 3: yeh email pehle se to nahi hai?
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  // Step 4: password ko hash karke naya user banao.
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name: name.trim(), email, passwordHash });

  // Step 5: ek login token banakar user ke saath wapas bhej do.
  const token = signToken(user._id);
  res.status(201).json({ user: user.toSafeObject(), token });
});

// POST /api/auth/login — email/password sahi hone par token deta hai.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // User dhoondo aur password match karo. Dono me se ek bhi galat to same error
  // (taaki koi guess na kar sake ki email exist karta hai ya nahi).
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user._id);
  res.json({ user: user.toSafeObject(), token });
});

// GET /api/auth/me  (protected)
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

// PUT /api/auth/profile  body: { name }
export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  req.user.name = name.trim();
  await req.user.save();
  res.json({ user: req.user.toSafeObject() });
});

// PUT /api/auth/password  body: { currentPassword, newPassword }
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters` });
  }
  const ok = await req.user.comparePassword(currentPassword);
  if (!ok) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }
  req.user.passwordHash = await User.hashPassword(newPassword);
  await req.user.save();
  res.json({ message: "Password updated" });
});
