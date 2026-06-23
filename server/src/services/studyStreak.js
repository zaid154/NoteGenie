// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Quiz/review/activity flows call this after study actions. User activity comes in, daily StudyActivity is upserted, user streak fields are updated, and recent activity returns to dashboard/analytics.

// Study streak + daily activity tracking. All functions are best-effort and must
// never break the primary request (a failed streak update is logged, not thrown).
import { localDateKey } from "../utils/dateKey.js";
import { StudyActivity } from "../models/StudyActivity.js";

function dayKeyOffset(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localDateKey(d);
}

/**
 * Record one study action for `user` (a Mongoose user doc): advance the consecutive-day
 * streak (only on the first action of the day) and increment today's activity counter.
 * Returns the updated streak object, or null on failure.
 */
export async function recordStudyActivity(user) {
  try {
    if (!user?._id) return null;
    const today = dayKeyOffset(0);
    const streak = user.studyStreak || { current: 0, longest: 0, lastStudyDay: "" };

    if (streak.lastStudyDay !== today) {
      const continued = streak.lastStudyDay === dayKeyOffset(-1);
      streak.current = continued ? (streak.current || 0) + 1 : 1;
      streak.longest = Math.max(streak.longest || 0, streak.current);
      streak.lastStudyDay = today;
      user.studyStreak = streak;
      user.markModified("studyStreak");
      await user.save();
    }

    await StudyActivity.updateOne(
      { userId: user._id, day: today },
      { $inc: { count: 1 } },
      { upsert: true }
    );

    return user.studyStreak;
  } catch (err) {
    console.warn("[streak] recordStudyActivity failed:", err.message);
    return null;
  }
}

/**
 * Returns the last `days` of activity as [{ day, count }], oldest→newest, zero-filled
 * for days with no activity. Used for the dashboard heatmap.
 */
export async function getRecentActivity(userId, days = 30) {
  const startKey = dayKeyOffset(-(days - 1));
  let map = {};
  try {
    const rows = await StudyActivity.find({ userId, day: { $gte: startKey } })
      .select("day count")
      .lean();
    map = Object.fromEntries(rows.map((r) => [r.day, r.count]));
  } catch (err) {
    console.warn("[streak] getRecentActivity failed:", err.message);
  }

  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKeyOffset(-i);
    out.push({ day: key, count: map[key] || 0 });
  }
  return out;
}

/** Live-recompute current streak from lastStudyDay (so a missed day shows 0, not stale). */
export function currentStreakValue(streak) {
  if (!streak?.lastStudyDay) return 0;
  const today = dayKeyOffset(0);
  const yesterday = dayKeyOffset(-1);
  if (streak.lastStudyDay === today || streak.lastStudyDay === yesterday) {
    return streak.current || 0;
  }
  return 0;
}

