// Basic API smoke tests (run: npm test in server/)
import test from "node:test";
import assert from "node:assert/strict";
import { getLimitsSync, usageSummary } from "../src/config/plans.js";
import { sm2 } from "../src/services/spacedRepetition.js";
import { localDateKey, weekdayShort } from "../src/utils/dateKey.js";
import {
  pickLeastLoaded,
  releaseKey,
  getInFlightCount,
  resetKeyBalancer,
} from "../src/services/keyBalancer.js";
import { withStepRetry } from "../src/services/generationOrchestrator.js";
import { isKeyExhausted, formatGeminiError, geminiErrorDetail, shouldFailoverToNextKey, parseJson, extractBalancedJson, isModelNotFoundError } from "../src/services/geminiHelpers.js";
import { normalizeDetailLevel, clampFlashcardCount, DEFAULT_DETAIL_LEVEL } from "../src/config/detailLevel.js";
import { shouldUseChunkedNotes, mergeSectionNotes } from "../src/utils/notesChunk.js";
import { parseNoteSections, getSectionNotes } from "../src/utils/parseNoteSections.js";
import { assembleGlobalContext, sourceTitles } from "../src/services/retrieval.js";
import { currentStreakValue } from "../src/services/studyStreak.js";

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

test("shouldUseChunkedNotes triggers on large PDF or text", () => {
  assert.equal(shouldUseChunkedNotes({ pdfBytes: 2_000_000 }), true);
  assert.equal(shouldUseChunkedNotes({ pdfBytes: 600_000 }), false);
  assert.equal(shouldUseChunkedNotes({ textLength: 35_000 }), true);
});

test("mergeSectionNotes combines sections with headings", () => {
  const merged = mergeSectionNotes([
    { title: "Intro", content: "- Point A" },
    { title: "Methods", content: "## Methods\n\n- Step 1" },
  ]);
  assert.match(merged, /## Intro/);
  assert.match(merged, /## Methods/);
  assert.match(merged, /Point A/);
});

test("parseNoteSections splits markdown headings", () => {
  const sections = parseNoteSections("## One\n\nBody one\n\n## Two\n\nBody two");
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "One");
  assert.match(sections[1].body, /Body two/);
});

test("getSectionNotes returns scoped section", () => {
  const notes = "## Alpha\n\nA text\n\n## Beta\n\nB text";
  const scoped = getSectionNotes(notes, "Beta");
  assert.match(scoped, /B text/);
  assert.doesNotMatch(scoped, /A text/);
});

test("parseJson handles fenced JSON", () => {
  const data = parseJson('Here:\n```json\n{"title":"Test","value":1}\n```');
  assert.equal(data.title, "Test");
});

test("extractBalancedJson finds nested object", () => {
  const raw = 'prefix {"a":1,"b":{"c":2}} suffix';
  const json = extractBalancedJson(raw);
  assert.equal(JSON.parse(json).b.c, 2);
});

test("localDateKey uses local calendar date not UTC", () => {
  const d = new Date(2026, 5, 20, 23, 30);
  assert.equal(localDateKey(d), "2026-06-20");
  assert.equal(weekdayShort("2026-06-20").length >= 2, true);
});

test("keyBalancer picks least-loaded key", () => {
  resetKeyBalancer();
  const pool = [
    { id: "a", label: "A", priority: 0 },
    { id: "b", label: "B", priority: 0 },
  ];
  pickLeastLoaded(pool);
  pickLeastLoaded(pool);
  assert.equal(getInFlightCount("a"), 1);
  assert.equal(getInFlightCount("b"), 1);
  releaseKey("a");
  const next = pickLeastLoaded(pool);
  assert.equal(next.id, "a");
  releaseKey("a");
  resetKeyBalancer();
});

test("withStepRetry retries failed step", async () => {
  let calls = 0;
  const result = await withStepRetry(
    async () => {
      calls += 1;
      if (calls < 2) throw new Error("transient");
      return "ok";
    },
    { retries: 1 }
  );
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("withStepRetry throws after retries exhausted", async () => {
  await assert.rejects(
    () =>
      withStepRetry(async () => {
        throw new Error("fail");
      }, { retries: 1 }),
    /fail/
  );
});

test("isModelNotFoundError detects bad / unsupported model ids", () => {
  assert.equal(isModelNotFoundError(new Error("404 models/gemini-9 is not found")), true);
  assert.equal(isModelNotFoundError(new Error("model not supported for this project")), true);
  assert.equal(isModelNotFoundError(new Error("NOT_FOUND: model unavailable")), true);
  // Should NOT trigger fallback on quota or generic 404s without a model reference.
  assert.equal(isModelNotFoundError(new Error("429 quota exceeded")), false);
  assert.equal(isModelNotFoundError(new Error("404 not found")), false);
});

test("assembleGlobalContext includes selected docs", () => {
  const ctx = assembleGlobalContext([
    { title: "Bio", notes: "Cells are the unit of life." },
    { title: "Chem", sourceText: "Atoms form molecules." },
  ]);
  assert.match(ctx, /### Bio/);
  assert.match(ctx, /### Chem/);
  assert.match(ctx, /Cells are the unit/);
});

test("assembleGlobalContext truncates per-doc and skips empty docs", () => {
  const long = "x".repeat(5000);
  const ctx = assembleGlobalContext([{ title: "T", notes: long }], { perDocChars: 100 });
  assert.ok(ctx.length < 200);
  assert.equal(assembleGlobalContext([{ title: "Empty", notes: "" }]), "");
});

test("sourceTitles returns titles with fallback", () => {
  assert.deepEqual(sourceTitles([{ title: "A" }, {}]), ["A", "Untitled"]);
});

test("currentStreakValue keeps streak when studied today or yesterday", () => {
  const today = localDateKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = localDateKey(y);
  assert.equal(currentStreakValue({ current: 5, lastStudyDay: today }), 5);
  assert.equal(currentStreakValue({ current: 5, lastStudyDay: yesterday }), 5);
});

test("currentStreakValue resets when last study is stale", () => {
  const old = new Date();
  old.setDate(old.getDate() - 3);
  assert.equal(currentStreakValue({ current: 5, lastStudyDay: localDateKey(old) }), 0);
  assert.equal(currentStreakValue({ lastStudyDay: "" }), 0);
  assert.equal(currentStreakValue(null), 0);
});
