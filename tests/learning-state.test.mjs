import assert from "node:assert/strict";
import test from "node:test";

import {
  appendErrorRecord,
  DELAYED_RETEST_WAIT_MS,
  isMasteryComplete,
  masteryLevelFromEvidence,
  normalizeErrorHistory,
  normalizeImportedPracticeSnapshot,
  normalizePracticeSnapshot,
  retryDelayHours,
} from "../app/learning-state.ts";

test("mastery completes only after the delayed retest", () => {
  assert.equal(isMasteryComplete(0), false);
  assert.equal(isMasteryComplete(2), false);
  assert.equal(isMasteryComplete(3), false);
  assert.equal(isMasteryComplete(4), true);
});

test("mastery rebuild is chronological and blocks an early delayed retest", () => {
  const at = (offset) => new Date(Date.parse("2026-01-01T00:00:00.000Z") + offset).toISOString();
  const quick = { problemId: "q", kind: "quick", delayed: false, correct: true, answeredAt: at(0), source: "imported" };
  const standard = { problemId: "s", kind: "standard", delayed: false, correct: true, answeredAt: at(1000), source: "imported" };
  const transfer = { problemId: "t", kind: "transfer", delayed: false, correct: true, answeredAt: at(2000), source: "imported" };
  const delayed = { problemId: "d", kind: "transfer", delayed: true, correct: true, answeredAt: at(2000 + DELAYED_RETEST_WAIT_MS), source: "imported" };
  assert.equal(masteryLevelFromEvidence([quick, standard, transfer, { ...delayed, answeredAt: at(2000 + DELAYED_RETEST_WAIT_MS - 1) }]), 3);
  assert.equal(masteryLevelFromEvidence([quick, standard, transfer, delayed]), 4);
  const standardTooEarly = { ...standard, answeredAt: at(0) };
  const quickAfterStandard = { ...quick, answeredAt: at(1000) };
  assert.equal(masteryLevelFromEvidence([standardTooEarly, quickAfterStandard, transfer, delayed]), 1);
});

test("future evidence cannot manufacture mastery", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const at = (offset) => new Date(now + offset).toISOString();
  assert.equal(masteryLevelFromEvidence([
    { problemId: "q", kind: "quick", delayed: false, correct: true, answeredAt: at(1), source: "imported" },
    { problemId: "s", kind: "standard", delayed: false, correct: true, answeredAt: at(2), source: "imported" },
    { problemId: "t", kind: "transfer", delayed: false, correct: true, answeredAt: at(3), source: "imported" },
  ], now), 0);
});

test("practice snapshots keep valid resume data and reject invalid phases", () => {
  const snapshot = normalizePracticeSnapshot({
    active: true,
    conceptId: "I-01",
    problemId: "Q-I01-01",
    phase: "question",
    lessonStep: "overview",
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
    lessonStep: "overview",
    answer: 2,
    feedback: { correct: false, explanation: "復習する" },
    errorCause: "procedure",
    reviewCause: null,
  });
  assert.equal(normalizePracticeSnapshot({ active: true, conceptId: "I-01", problemId: "Q-I01-01", phase: "unknown" }), undefined);
  assert.equal(normalizePracticeSnapshot({ active: true, conceptId: "I-01", problemId: "Q-I01-01", phase: "question", answer: 8 })?.answer, null);
  assert.deepEqual(normalizeImportedPracticeSnapshot(snapshot), {
    active: true,
    conceptId: "I-01",
    problemId: "Q-I01-01",
    phase: "lesson",
    lessonStep: "overview",
    answer: null,
    feedback: null,
    errorCause: null,
    reviewCause: null,
  });
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
