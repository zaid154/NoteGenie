// Basic API smoke tests (run: npm test in server/)
import test from "node:test";
import assert from "node:assert/strict";
import { getLimitsSync, usageSummary } from "../src/config/plans.js";
import { sm2 } from "../src/services/spacedRepetition.js";
import { isKeyExhausted, formatGeminiError, geminiErrorDetail, shouldFailoverToNextKey } from "../src/services/geminiHelpers.js";
import { normalizeDetailLevel, clampFlashcardCount, DEFAULT_DETAIL_LEVEL } from "../src/config/detailLevel.js";

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

test("formatGeminiError maps Google fetch wrapper to API failure", () => {
  const err = new Error(
    "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash"
  );
  assert.equal(
    formatGeminiError(err),
    "Gemini API request failed — check if this key is valid and has API access enabled"
  );
});

test("formatGeminiError maps real network errors", () => {
  assert.equal(formatGeminiError(new Error("connect ECONNREFUSED")), "Network error — could not reach Google Gemini API");
  assert.equal(formatGeminiError(new Error("request ETIMEDOUT")), "Network error — could not reach Google Gemini API");
});

test("formatGeminiError maps invalid key errors", () => {
  assert.equal(formatGeminiError(new Error("403 PERMISSION_DENIED API key not valid")), "Invalid or unauthorized API key");
});

test("geminiErrorDetail redacts API keys", () => {
  const detail = geminiErrorDetail(new Error("Failed with key AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz"));
  assert.match(detail, /AIza••••/);
  assert.doesNotMatch(detail, /AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz/);
});

test("shouldFailoverToNextKey on Google fetch wrapper errors", () => {
  const err = new Error(
    "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash"
  );
  assert.equal(shouldFailoverToNextKey(err), true);
});

test("shouldFailoverToNextKey on quota and transient errors", () => {
  assert.equal(shouldFailoverToNextKey(new Error("429 quota exceeded")), true);
  assert.equal(shouldFailoverToNextKey(new Error("503 overloaded")), true);
});

test("shouldFailoverToNextKey false on non-API errors", () => {
  assert.equal(shouldFailoverToNextKey(new Error("AI returned invalid JSON. Please try again.")), false);
});

test("normalizeDetailLevel defaults to detailed", () => {
  assert.equal(normalizeDetailLevel(""), DEFAULT_DETAIL_LEVEL);
  assert.equal(normalizeDetailLevel(undefined), DEFAULT_DETAIL_LEVEL);
  assert.equal(normalizeDetailLevel("Detailed"), "detailed");
});

test("normalizeDetailLevel accepts standard", () => {
  assert.equal(normalizeDetailLevel("standard"), "standard");
  assert.equal(normalizeDetailLevel("STANDARD"), "standard");
});

test("clampFlashcardCount bounds and defaults", () => {
  assert.equal(clampFlashcardCount(undefined), 5);
  assert.equal(clampFlashcardCount(5), 5);
  assert.equal(clampFlashcardCount(10), 10);
  assert.equal(clampFlashcardCount(99), 10);
  assert.equal(clampFlashcardCount(0), 1);
  assert.equal(clampFlashcardCount(-3), 1);
});
