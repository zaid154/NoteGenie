// Quota middleware — enforce per-plan AI usage limits.
import { ensureUsagePeriod, getLimits } from "../config/plans.js";

function quotaError(feature, limit) {
  const err = new Error(
    `You've reached your ${feature} limit (${limit}/month) on the Free plan. Upgrade to Pro for more.`
  );
  err.statusCode = 402;
  err.code = "QUOTA_EXCEEDED";
  err.feature = feature;
  return err;
}

export function requireQuota(feature) {
  return async (req, res, next) => {
    if (req.user.role === "admin") return next();
    try {
      await ensureUsagePeriod(req.user);
      const limits = await getLimits(req.user.plan);
      const limit = limits[feature];
      if (limit === Infinity) return next();
      const used = req.user.usageThisMonth?.[feature] || 0;
      if (used >= limit) return next(quotaError(feature, limit));
      next();
    } catch (err) {
      next(err);
    }
  };
}

export async function incrementUsage(user, feature) {
  if (user.role === "admin") return;
  await ensureUsagePeriod(user);
  if (!user.usageThisMonth) user.usageThisMonth = { documents: 0, tutorMessages: 0, quizzes: 0 };
  user.usageThisMonth[feature] = (user.usageThisMonth[feature] || 0) + 1;
  await user.save();
}
