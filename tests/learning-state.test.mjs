import assert from "node:assert/strict";
import test from "node:test";

import {
  appendErrorRecord,
  isMasteryComplete,
  normalizeErrorHistory,
  normalizePracticeSnapshot,
  retryDelayHours,
} from "../app/learning-state.ts";

test("mastery completes only after three successful levels", () => {
  assert.equal(isMasteryComplete(0), false);
  assert.equal(isMasteryComplete(2), false);
  assert.equal(isMasteryComplete(3), true);
});

test("practice snapshots keep valid resume data and reject invalid phases", () => {
  const snapshot = normalizePracticeSnapshot({
    active: true,
    conceptId: "I-01",
    problemId: "Q-I01-01",
    phase: "question",
    answer: 2,
    feedback: { correct: false, explanation: "復習する" },
    errorCause: "procedure",
    reviewCause: null,
  });
  assert.deepEqual(snapshot, {
    active: true,
    conceptId: "I-01",
    problemId: "Q-I01-01",
    phase: "question",
    answer: 2,
    feedback: { correct: false, explanation: "復習する" },
    errorCause: "procedure",
    reviewCause: null,
  });
  assert.equal(normalizePracticeSnapshot({ active: true, conceptId: "I-01", problemId: "Q-I01-01", phase: "unknown" }), undefined);
  assert.equal(normalizePracticeSnapshot({ active: true, conceptId: "I-01", problemId: "Q-I01-01", phase: "question", answer: 8 })?.answer, null);
});

test("error history drops malformed entries and keeps a bounded per-concept log", () => {
  const history = normalizeErrorHistory({
    "I-01": [
      { problemId: "Q-I01-01", cause: "concept_gap", at: "2026-08-18T00:00:00.000Z" },
      { problemId: "Q-I01-02", cause: "not-a-cause", at: "2026-08-18T00:00:00.000Z" },
      { problemId: "Q-I01-03", cause: "misread", at: "not-a-date" },
    ],
  });
  assert.deepEqual(history, {
    "I-01": [{ problemId: "Q-I01-01", cause: "concept_gap", at: "2026-08-18T00:00:00.000Z" }],
  });

  let appended = {};
  for (let index = 0; index < 25; index += 1) {
    appended = appendErrorRecord(appended, "I-01", { problemId: `Q-${index}`, cause: "careless", at: new Date(index * 1000).toISOString() });
  }
  assert.equal(appended["I-01"].length, 20);
  assert.equal(appended["I-01"][0].problemId, "Q-5");
});

test("retry spacing reflects the selected error cause", () => {
  assert.equal(retryDelayHours("concept_gap"), 24);
  assert.equal(retryDelayHours("procedure"), 12);
  assert.equal(retryDelayHours("misread"), 6);
  assert.equal(retryDelayHours("calculation"), 2);
  assert.equal(retryDelayHours("careless"), 2);
});
