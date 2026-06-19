// Basic API smoke tests (run: npm test in server/)
import test from "node:test";
import assert from "node:assert/strict";
import { getLimitsSync, usageSummary } from "../src/config/plans.js";
import { sm2 } from "../src/services/spacedRepetition.js";
import { isKeyExhausted } from "../src/services/geminiHelpers.js";

test("free plan limits", () => {
  const limits = getLimitsSync("free");
  assert.equal(limits.documents, 3);
  assert.equal(limits.tutorMessages, 20);
});

test("pro plan has unlimited tutor", () => {
  const limits = getLimitsSync("pro");
  assert.equal(limits.tutorMessages, Infinity);
});

test("usage summary shape", () => {
  const summary = usageSummary({
    plan: "free",
    usageThisMonth: { documents: 1, tutorMessages: 5, quizzes: 2 },
  });
  assert.equal(summary.used.documents, 1);
  assert.equal(summary.limits.documents, 3);
});

test("SM-2 increases interval on good recall", () => {
  const card = { easeFactor: 2.5, interval: 0, repetitions: 0 };
  const next = sm2(card, 4);
  assert.ok(next.interval >= 1);
  assert.ok(next.nextReviewAt);
});

test("key exhausted detection", () => {
  assert.equal(isKeyExhausted(new Error("429 quota exceeded")), true);
  assert.equal(isKeyExhausted(new Error("503 overloaded")), false);
});
