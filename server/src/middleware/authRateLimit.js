import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const loginRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset requests. Please wait a few minutes and try again." },
});
