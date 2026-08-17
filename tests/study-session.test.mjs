import assert from "node:assert/strict";
import test from "node:test";

import { restoreStudySession, startStudySession } from "../app/study-session.ts";

test("future persisted focus sessions are rejected", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const future = startStudySession({ id: "future", startedAtMs: now + 1000 });
  assert.equal(restoreStudySession(future, now), null);
});

test("valid persisted focus sessions restore", () => {
  const startedAtMs = Date.parse("2025-12-31T23:59:00.000Z");
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const session = startStudySession({ id: "past", startedAtMs });
  assert.equal(restoreStudySession(session, now)?.id, "past");
});
