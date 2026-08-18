import assert from "node:assert/strict";
import test from "node:test";

import { mergeProgress, normalizeProgress } from "../app/storage.ts";

const empty = { mastery: {}, attempts: {}, studyDates: [], studySeconds: 0, awaySeconds: 0, guideSeen: {}, examHistory: [] };

test("progress normalization rejects invalid clocks without poisoning merge order", () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const normalized = normalizeProgress({
    ...empty,
    mastery: { "I-01": 9, bad: "x" },
    updatedAt: "not-a-date",
    attempts: {
      "I-01": {
        correct: 2,
        total: 3,
        lastAt: past,
        evidence: [
          { problemId: "p1", kind: "quick", delayed: false, correct: true, answeredAt: "not-a-date", source: "observed" },
          { problemId: "p2", kind: "standard", delayed: false, correct: false, answeredAt: past, source: "observed" },
          { problemId: "p3", kind: "transfer", delayed: false, correct: true, answeredAt: "2026-02-31T00:00:00.000Z", source: "observed" },
        ],
      },
    },
  });
  assert.equal(normalized?.updatedAt, undefined);
  assert.equal(normalized?.mastery["I-01"], 4);
  assert.deepEqual(normalized?.attempts["I-01"]?.evidence, [{ problemId: "p2", kind: "standard", delayed: false, correct: false, answeredAt: past, source: "observed" }]);
  const older = { ...empty, updatedAt: "2026-08-17T00:00:00.000Z", mastery: { "I-01": 1 } };
  const newer = { ...empty, updatedAt: "2026-08-18T00:00:00.000Z", mastery: { "I-01": 2 } };
  assert.equal(mergeProgress(older, newer).mastery["I-01"], 2);
});

test("foundation-skip state survives normalization and merge", () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const normalized = normalizeProgress({ ...empty, foundationSkipped: true, updatedAt: past });
  assert.equal(normalized?.foundationSkipped, true);
  const older = { ...empty, foundationSkipped: true, updatedAt: "2026-08-18T00:00:00.000Z" };
  const newer = { ...empty, foundationSkipped: false, updatedAt: "2026-08-18T00:01:00.000Z" };
  assert.equal(mergeProgress(older, newer).foundationSkipped, false);
});

test("progress normalization rejects future evidence and reset metadata", () => {
  const now = Date.parse("2026-08-18T12:00:00.000Z");
  const normalized = normalizeProgress({
    ...empty,
    updatedAt: "2099-01-01T00:00:00.000Z",
    clearedAt: "2099-01-01T00:00:00.000Z",
    errorHistory: {
      "I-01": [{ problemId: "p1", cause: "careless", at: "2099-01-01T00:00:00.000Z" }],
    },
    attempts: {
      "I-01": {
        correct: 1,
        total: 1,
        lastAt: "2099-01-01T00:00:00.000Z",
        evidence: [{ problemId: "p1", kind: "quick", delayed: false, correct: true, answeredAt: "2099-01-01T00:00:00.000Z", source: "observed" }],
      },
    },
  }, now);
  assert.equal(normalized?.updatedAt, undefined);
  assert.equal(normalized?.clearedAt, undefined);
  assert.deepEqual(normalized?.attempts, {});
  assert.deepEqual(normalized?.errorHistory, {});
});

test("a newer reset tombstone wins over a stale tab snapshot", () => {
  const stale = { ...empty, updatedAt: "2026-08-18T00:00:00.000Z", mastery: { "I-01": 3 } };
  const cleared = { ...empty, updatedAt: "2026-08-18T01:00:00.000Z", clearedAt: "2026-08-18T01:00:00.000Z" };
  const merged = mergeProgress(stale, cleared);
  assert.deepEqual(merged.mastery, {});
  assert.equal(merged.clearedAt, cleared.clearedAt);
  assert.deepEqual(mergeProgress(cleared, stale).mastery, {});
  assert.deepEqual(mergeProgress(cleared, { ...stale, updatedAt: "2026-08-19T00:00:00.000Z" }).mastery, {});
});

test("exam history with reversed clocks is discarded", () => {
  const normalized = normalizeProgress({
    ...empty,
    examHistory: [{
      formId: "IA-F1",
      paper: "math1a",
      score: 60,
      totalPoints: 100,
      percentage: 60,
      selectedOptionalSectionIds: [],
      startedAt: "2026-08-18T01:00:00.000Z",
      submittedAt: "2026-08-18T00:00:00.000Z",
      unanswered: [],
      elapsedSeconds: 0,
      timedOut: false,
      bySection: {},
    }],
  });
  assert.deepEqual(normalized?.examHistory, []);
});

test("evidence from two tabs is deduplicated while different answers remain", () => {
  const left = { ...empty, updatedAt: "2026-08-18T00:00:00.000Z", attempts: { "I-01": { correct: 1, total: 1, lastAt: "2026-08-18T00:00:00.000Z", evidence: [{ problemId: "p1", kind: "quick", delayed: false, correct: true, answeredAt: "2026-08-18T00:00:00.000Z", source: "observed" }] } } };
  const right = { ...empty, updatedAt: "2026-08-18T00:01:00.000Z", attempts: { "I-01": { correct: 2, total: 2, lastAt: "2026-08-18T00:01:00.000Z", evidence: [{ problemId: "p1", kind: "quick", delayed: false, correct: true, answeredAt: "2026-08-18T00:00:00.000Z", source: "observed" }, { problemId: "p2", kind: "standard", delayed: false, correct: true, answeredAt: "2026-08-18T00:01:00.000Z", source: "observed" }] } } };
  assert.equal(mergeProgress(left, right).attempts["I-01"].evidence?.length, 2);
});
