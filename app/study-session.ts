/**
 * Wall-clock based study-session primitives.
 *
 * The state is JSON serializable. Persist the returned state after each
 * checkpoint/visibility transition. When a new process starts, call
 * resumeStudySession() with the current wall-clock timestamp: the gap since
 * lastAccountedAtMs is then classified as Phone Away time.
 *
 * This module deliberately has no browser globals. The caller supplies all
 * timestamps, so it works in React, tests, workers, and iOS Safari recovery.
 */

export const STUDY_SESSION_VERSION = 1 as const;
export const DEFAULT_TARGET_HOURS = 700 as const;
export const SECONDS_PER_HOUR = 60 * 60;
export const FOCUS_DURATION_SECONDS = [3 * 60, 10 * 60, 20 * 60] as const;

export type StudySessionPhase = "active" | "away";

export type StudySessionState = Readonly<{
  version: typeof STUDY_SESSION_VERSION;
  id: string;
  status: "running";
  phase: StudySessionPhase;
  startedAtMs: number;
  lastAccountedAtMs: number;
  activeMilliseconds: number;
  awayMilliseconds: number;
}>;

export type StartStudySessionInput = Readonly<{
  id: string;
  startedAtMs: number;
}>;

export type CompletedStudySessionSummary = Readonly<{
  version: typeof STUDY_SESSION_VERSION;
  id: string;
  status: "completed";
  startedAtMs: number;
  completedAtMs: number;
  elapsedMilliseconds: number;
  activeMilliseconds: number;
  awayMilliseconds: number;
  elapsedSeconds: number;
  studySeconds: number;
  awaySeconds: number;
}>;

export type StudyProgress = Readonly<{
  targetHours: number;
  targetSeconds: number;
  studiedSeconds: number;
  studiedHours: number;
  remainingSeconds: number;
  remainingHours: number;
  fraction: number;
  percent: number;
}>;

function timestamp(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.trunc(value))) {
    throw new RangeError(`${name} must be a finite timestamp in milliseconds`);
  }
  return Math.trunc(value);
}

function nonNegativeNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
  return value;
}

function sessionId(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("id must be a non-empty string");
  }
  return value;
}

function effectiveNow(session: StudySessionState, nowMs: number): number {
  // A wall clock can move backwards. Never subtract time or move the ledger
  // backwards; the next valid timestamp can continue from this checkpoint.
  return Math.max(timestamp(nowMs, "nowMs"), session.lastAccountedAtMs, session.startedAtMs);
}

function accountUntil(
  session: StudySessionState,
  nowMs: number,
  phase: StudySessionPhase,
): StudySessionState {
  const now = effectiveNow(session, nowMs);
  const delta = now - session.lastAccountedAtMs;

  return {
    ...session,
    phase,
    lastAccountedAtMs: now,
    activeMilliseconds: session.activeMilliseconds + (phase === "active" ? delta : 0),
    awayMilliseconds: session.awayMilliseconds + (phase === "away" ? delta : 0),
  };
}

function projectedMilliseconds(
  session: StudySessionState,
  nowMs: number,
): { elapsed: number; active: number; away: number } {
  const now = effectiveNow(session, nowMs);
  const delta = now - session.lastAccountedAtMs;
  return {
    elapsed: now - session.startedAtMs,
    active: session.activeMilliseconds + (session.phase === "active" ? delta : 0),
    away: session.awayMilliseconds + (session.phase === "away" ? delta : 0),
  };
}

function seconds(milliseconds: number): number {
  return Math.floor(Math.max(0, milliseconds) / 1000);
}

/** Start a new session. The caller supplies the wall-clock timestamp. */
export function startStudySession(input: StartStudySessionInput): StudySessionState {
  const id = sessionId(input.id);
  const startedAtMs = timestamp(input.startedAtMs, "startedAtMs");
  return {
    version: STUDY_SESSION_VERSION,
    id,
    status: "running",
    phase: "active",
    startedAtMs,
    lastAccountedAtMs: startedAtMs,
    activeMilliseconds: 0,
    awayMilliseconds: 0,
  };
}

/**
 * Account for time spent in the current phase and persist the returned state.
 * Call this while the study screen is known to be active.
 */
export function checkpointStudySession(session: StudySessionState, nowMs: number): StudySessionState {
  return accountUntil(session, nowMs, session.phase);
}

/** Mark the session as away, accounting for the active interval up to now. */
export function markPhoneAway(session: StudySessionState, nowMs: number): StudySessionState {
  return accountUntil(session, nowMs, "away");
}

/**
 * Resume after backgrounding or process termination.
 *
 * The interval since the last persisted/accounted timestamp is intentionally
 * classified as away. A foreground heartbeat should use checkpointStudySession
 * so that known active time is not mistaken for Phone Away time.
 */
export function resumeStudySession(session: StudySessionState, nowMs: number): StudySessionState {
  const recovered = accountUntil(session, nowMs, "away");
  return { ...recovered, phase: "active" };
}

/** Complete a session explicitly. There is no timer-driven or automatic stop. */
export function stopStudySession(
  session: StudySessionState,
  completedAtMs: number,
): CompletedStudySessionSummary {
  const accounted = accountUntil(session, completedAtMs, session.phase);
  const completedAt = accounted.lastAccountedAtMs;
  const elapsedMilliseconds = completedAt - accounted.startedAtMs;

  return {
    version: STUDY_SESSION_VERSION,
    id: accounted.id,
    status: "completed",
    startedAtMs: accounted.startedAtMs,
    completedAtMs: completedAt,
    elapsedMilliseconds,
    activeMilliseconds: accounted.activeMilliseconds,
    awayMilliseconds: accounted.awayMilliseconds,
    elapsedSeconds: seconds(elapsedMilliseconds),
    studySeconds: seconds(accounted.activeMilliseconds),
    awaySeconds: seconds(accounted.awayMilliseconds),
  };
}

/** Wall-clock seconds since the session began, including Phone Away time. */
export function elapsedSeconds(session: StudySessionState, nowMs: number): number {
  return seconds(projectedMilliseconds(session, nowMs).elapsed);
}

/** Phone Away seconds accumulated so far, including an ongoing away phase. */
export function awaySeconds(session: StudySessionState, nowMs: number): number {
  return seconds(projectedMilliseconds(session, nowMs).away);
}

/** Known study seconds accumulated so far, excluding Phone Away time. */
export function studySeconds(session: StudySessionState, nowMs: number): number {
  return seconds(projectedMilliseconds(session, nowMs).active);
}

/** Build a 0–100% progress model for a cumulative study target. */
export function getStudyProgress(
  studiedSeconds: number,
  targetHours = DEFAULT_TARGET_HOURS,
): StudyProgress {
  const normalizedStudiedSeconds = Math.floor(nonNegativeNumber(studiedSeconds, "studiedSeconds"));
  const normalizedTargetHours = nonNegativeNumber(targetHours, "targetHours");
  if (normalizedTargetHours <= 0) throw new RangeError("targetHours must be greater than zero");

  const targetSeconds = Math.round(normalizedTargetHours * SECONDS_PER_HOUR);
  const fraction = Math.min(1, normalizedStudiedSeconds / targetSeconds);
  const remainingSeconds = Math.max(0, targetSeconds - normalizedStudiedSeconds);

  return {
    targetHours: normalizedTargetHours,
    targetSeconds,
    studiedSeconds: normalizedStudiedSeconds,
    studiedHours: normalizedStudiedSeconds / SECONDS_PER_HOUR,
    remainingSeconds,
    remainingHours: remainingSeconds / SECONDS_PER_HOUR,
    fraction,
    percent: fraction * 100,
  };
}

/** Deterministic display helper for a progress label such as "12.4 / 700時間". */
export function formatStudyProgress(progress: StudyProgress, decimals = 1): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError("decimals must be an integer from 0 to 6");
  }
  return `${progress.studiedHours.toFixed(decimals)} / ${progress.targetHours}時間`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function normalizeFocusDuration(value: unknown, fallback = 20 * 60): number {
  return typeof value === "number" && FOCUS_DURATION_SECONDS.includes(value as (typeof FOCUS_DURATION_SECONDS)[number])
    ? value
    : fallback;
}

/** Validate a JSON-parsed state before passing it back to resumeStudySession. */
export function isStudySessionState(value: unknown, nowMs = Date.now()): value is StudySessionState {
  if (!isRecord(value)) return false;
  const safeNow = Number.isSafeInteger(nowMs) ? nowMs : Date.now();
  return value.version === STUDY_SESSION_VERSION
    && typeof value.id === "string"
    && value.id.trim().length > 0
    && value.status === "running"
    && (value.phase === "active" || value.phase === "away")
    && isNonNegativeSafeInteger(value.startedAtMs)
    && isNonNegativeSafeInteger(value.lastAccountedAtMs)
    && value.lastAccountedAtMs >= value.startedAtMs
    && value.startedAtMs <= safeNow
    && value.lastAccountedAtMs <= safeNow
    && isNonNegativeSafeInteger(value.activeMilliseconds)
    && isNonNegativeSafeInteger(value.awayMilliseconds)
    && value.activeMilliseconds <= value.lastAccountedAtMs - value.startedAtMs
    && value.awayMilliseconds <= value.lastAccountedAtMs - value.startedAtMs - value.activeMilliseconds;
}

/** Return a clean immutable copy of persisted JSON, or null when it is invalid. */
export function restoreStudySession(value: unknown, nowMs = Date.now()): StudySessionState | null {
  if (!isStudySessionState(value, nowMs)) return null;
  return {
    version: STUDY_SESSION_VERSION,
    id: value.id,
    status: "running",
    phase: value.phase,
    startedAtMs: value.startedAtMs,
    lastAccountedAtMs: value.lastAccountedAtMs,
    activeMilliseconds: value.activeMilliseconds,
    awayMilliseconds: value.awayMilliseconds,
  };
}
