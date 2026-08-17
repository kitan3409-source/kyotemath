import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFocusDuration, restoreStudySession, startStudySession } from "../app/study-session.ts";

test("future persisted focus sessions are rejected", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const future = startStudySession({ id: "future", startedAtMs: now + 1000 });
  assert.equal(restoreStudySession(future, now), null);
});

test("persisted focus counters cannot exceed elapsed session time", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const session = startStudySession({ id: "ahead-counter", startedAtMs: now - 1000 });
  assert.equal(restoreStudySession({ ...session, lastAccountedAtMs: now - 500, activeMilliseconds: 5000 }, now), null);
});

test("valid persisted focus sessions restore", () => {
  const startedAtMs = Date.parse("2025-12-31T23:59:00.000Z");
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const session = startStudySession({ id: "past", startedAtMs });
  assert.equal(restoreStudySession(session, now)?.id, "past");
});

test("focus duration accepts only the visible presets", () => {
  assert.equal(normalizeFocusDuration(180), 180);
  assert.equal(normalizeFocusDuration(600), 600);
  assert.equal(normalizeFocusDuration(1200), 1200);
  assert.equal(normalizeFocusDuration(0), 1200);
  assert.equal(normalizeFocusDuration(Number.MAX_SAFE_INTEGER), 1200);
});
