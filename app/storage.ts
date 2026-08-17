import {
  mergeErrorHistory,
  isErrorCause,
  normalizeErrorHistory,
  normalizePracticeSnapshot,
  isValidIsoDate,
  type ErrorCause,
  type ErrorHistory,
  type AttemptEvidence,
  type PracticeResumeState,
  type RetryState,
} from "./learning-state.ts";
import { normalizeExamHistory, normalizeExamSession, type ExamResult, type ExamSession } from "./exam-engine.ts";

export type PersistedProgress = {
  mastery: Record<string, number>;
  attempts: Record<string, {
    correct: number;
    total: number;
    lastAt: string;
    dueAt?: string;
    streak?: number;
    lastErrorCause?: ErrorCause;
    retry?: RetryState;
    evidence?: AttemptEvidence[];
  }>;
  studyDates: string[];
  studySeconds: number;
  awaySeconds: number;
  guideSeen: Record<string, boolean>;
  practice?: PracticeResumeState;
  errorHistory?: ErrorHistory;
  examSession?: ExamSession;
  examHistory?: ExamResult[];
  updatedAt?: string;
  clearedAt?: string;
};

const DB_NAME = "kyote-math-60";
const DB_VERSION = 1;
const STORE_NAME = "progress";
const PROGRESS_KEY = "current";
const RESET_SESSION_KEY = "kyote-math-60:reset-session";
const LOCAL_KEYS = {
  mastery: "kyote-math-60:mastery",
  attempts: "kyote-math-60:attempts",
  studyDates: "kyote-math-60:study-dates",
  studySeconds: "kyote-math-60:study-seconds",
  awaySeconds: "kyote-math-60:away-seconds",
  guideSeen: "kyote-math-60:guide-seen",
  practice: "kyote-math-60:practice",
  errorHistory: "kyote-math-60:error-history",
  examSession: "kyote-math-60:exam-session",
  examHistory: "kyote-math-60:exam-history",
  updatedAt: "kyote-math-60:updated-at",
  clearedAt: "kyote-math-60:cleared-at",
} as const;

let writeQueue = Promise.resolve();
const WRITE_LOCK_KEY = "kyote-math-60:write-lock";
const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let localClearAt: string | undefined;

function validTime(value: unknown): value is string {
  return isValidIsoDate(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredJson(raw: string | null, fallback: unknown) {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return fallback;
  }
}

export function normalizeProgress(value: unknown): PersistedProgress | null {
  if (!isRecord(value) || !isRecord(value.mastery) || !isRecord(value.attempts)) return null;
  const mastery: Record<string, number> = {};
  for (const [id, rawLevel] of Object.entries(value.mastery)) {
    if (typeof rawLevel === "number" && Number.isFinite(rawLevel)) mastery[id] = Math.min(4, Math.max(0, Math.round(rawLevel)));
  }
  const attempts: PersistedProgress["attempts"] = {};
  for (const [id, rawAttempt] of Object.entries(value.attempts)) {
    if (!isRecord(rawAttempt)) continue;
    const correct = typeof rawAttempt.correct === "number" && Number.isFinite(rawAttempt.correct) ? Math.max(0, Math.floor(rawAttempt.correct)) : 0;
    const total = typeof rawAttempt.total === "number" && Number.isFinite(rawAttempt.total) ? Math.max(correct, Math.floor(rawAttempt.total)) : 0;
    if (total === 0) continue;
    const lastAt = validTime(rawAttempt.lastAt) ? rawAttempt.lastAt : undefined;
    if (!lastAt) continue;
    const dueAt = validTime(rawAttempt.dueAt) ? rawAttempt.dueAt : undefined;
    const streak = typeof rawAttempt.streak === "number" && Number.isFinite(rawAttempt.streak) ? Math.max(0, Math.floor(rawAttempt.streak)) : undefined;
    const lastErrorCause = isErrorCause(rawAttempt.lastErrorCause) ? rawAttempt.lastErrorCause : undefined;
    const retry = isRecord(rawAttempt.retry)
      && typeof rawAttempt.retry.problemId === "string"
      && validTime(rawAttempt.retry.scheduledAt)
      && isErrorCause(rawAttempt.retry.cause)
      ? { cause: rawAttempt.retry.cause, problemId: rawAttempt.retry.problemId, scheduledAt: rawAttempt.retry.scheduledAt }
      : undefined;
    const evidence = Array.isArray(rawAttempt.evidence)
      ? rawAttempt.evidence.filter((entry): entry is AttemptEvidence => isRecord(entry) && typeof entry.problemId === "string" && (entry.kind === "quick" || entry.kind === "standard" || entry.kind === "transfer") && typeof entry.delayed === "boolean" && typeof entry.correct === "boolean" && isValidIsoDate(entry.answeredAt) && (entry.source === "observed" || entry.source === "imported")).slice(-60)
      : undefined;
    attempts[id] = { correct: Math.min(correct, total), total, lastAt, dueAt, streak, lastErrorCause, retry, evidence };
  }
  const studyDates = Array.isArray(value.studyDates)
    ? value.studyDates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && isValidIsoDate(date))
    : [];
  const studySeconds = typeof value.studySeconds === "number" && Number.isFinite(value.studySeconds) ? Math.max(0, Math.floor(value.studySeconds)) : 0;
  const awaySeconds = typeof value.awaySeconds === "number" && Number.isFinite(value.awaySeconds) ? Math.max(0, Math.floor(value.awaySeconds)) : 0;
  const guideSeen: Record<string, boolean> = {};
  if (isRecord(value.guideSeen)) {
    for (const [id, seen] of Object.entries(value.guideSeen)) {
      if (seen === true) guideSeen[id] = true;
    }
  }
  const practice = normalizePracticeSnapshot(value.practice);
  const errorHistory = normalizeErrorHistory(value.errorHistory);
  const examSession = normalizeExamSession(value.examSession);
  const examHistory = normalizeExamHistory(value.examHistory);
  const updatedAt = validTime(value.updatedAt) ? value.updatedAt : undefined;
  const clearedAt = validTime(value.clearedAt) ? value.clearedAt : undefined;
  return { mastery, attempts, studyDates: [...new Set(studyDates)].slice(-180), studySeconds, awaySeconds, guideSeen, practice, errorHistory, examSession, examHistory, updatedAt, clearedAt };
}

function readLocalProgress(): PersistedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const masteryRaw = window.localStorage.getItem(LOCAL_KEYS.mastery);
    const attemptsRaw = window.localStorage.getItem(LOCAL_KEYS.attempts);
    const studyDatesRaw = window.localStorage.getItem(LOCAL_KEYS.studyDates);
    const studySecondsRaw = window.localStorage.getItem(LOCAL_KEYS.studySeconds);
    const awaySecondsRaw = window.localStorage.getItem(LOCAL_KEYS.awaySeconds);
    const guideSeenRaw = window.localStorage.getItem(LOCAL_KEYS.guideSeen);
    const practiceRaw = window.localStorage.getItem(LOCAL_KEYS.practice);
    const errorHistoryRaw = window.localStorage.getItem(LOCAL_KEYS.errorHistory);
    const examSessionRaw = window.localStorage.getItem(LOCAL_KEYS.examSession);
    const examHistoryRaw = window.localStorage.getItem(LOCAL_KEYS.examHistory);
    const updatedAtRaw = window.localStorage.getItem(LOCAL_KEYS.updatedAt);
    const clearedAtRaw = window.localStorage.getItem(LOCAL_KEYS.clearedAt);
    if (masteryRaw === null && attemptsRaw === null && studyDatesRaw === null && studySecondsRaw === null && awaySecondsRaw === null && guideSeenRaw === null && practiceRaw === null && errorHistoryRaw === null && examSessionRaw === null && examHistoryRaw === null && updatedAtRaw === null && clearedAtRaw === null) return null;
    return normalizeProgress({
      mastery: parseStoredJson(masteryRaw, {}),
      attempts: parseStoredJson(attemptsRaw, {}),
      studyDates: parseStoredJson(studyDatesRaw, []),
      studySeconds: studySecondsRaw === null ? 0 : Number(studySecondsRaw),
      awaySeconds: awaySecondsRaw === null ? 0 : Number(awaySecondsRaw),
      guideSeen: parseStoredJson(guideSeenRaw, {}),
      practice: parseStoredJson(practiceRaw, null),
      errorHistory: parseStoredJson(errorHistoryRaw, {}),
      examSession: parseStoredJson(examSessionRaw, null),
      examHistory: parseStoredJson(examHistoryRaw, []),
      updatedAt: updatedAtRaw ?? undefined,
      clearedAt: clearedAtRaw ?? undefined,
    });
  } catch {
    return null;
  }
}

function localFallback(): PersistedProgress {
  return readLocalProgress() ?? { mastery: {}, attempts: {}, studyDates: [], studySeconds: 0, awaySeconds: 0, guideSeen: {}, examHistory: [] };
}

export function mergeProgress(left: PersistedProgress, right: PersistedProgress): PersistedProgress {
  const leftUpdated = validTime(left.updatedAt) ? Date.parse(left.updatedAt) : 0;
  const rightUpdated = validTime(right.updatedAt) ? Date.parse(right.updatedAt) : 0;
  const leftCleared = validTime(left.clearedAt) ? Date.parse(left.clearedAt) : 0;
  const rightCleared = validTime(right.clearedAt) ? Date.parse(right.clearedAt) : 0;
  // A tombstone is an explicit reset boundary. It must win over any
  // snapshot without a tombstone, even when an old tab writes that snapshot
  // with a newly generated updatedAt after the reset.
  if (leftCleared > 0 || rightCleared > 0) {
    if (leftCleared > 0 && rightCleared > 0) {
      const winner = rightCleared > leftCleared ? right : left;
      return { ...winner, updatedAt: winner.updatedAt ?? winner.clearedAt };
    }
    const winner = leftCleared > 0 ? left : right;
    return { ...winner, updatedAt: winner.updatedAt ?? winner.clearedAt };
  }
  const mastery: Record<string, number> = { ...left.mastery };
  for (const [id, level] of Object.entries(right.mastery)) mastery[id] = Math.max(mastery[id] ?? 0, level);

  const attempts: PersistedProgress["attempts"] = { ...left.attempts };
  for (const [id, candidate] of Object.entries(right.attempts)) {
    const current = attempts[id];
    const candidateEvidence = candidate.evidence ?? [];
    const currentEvidence = current?.evidence ?? [];
    if (!current || candidate.total > current.total || (candidate.total === current.total && candidate.correct > current.correct)
      || (candidate.total === current.total && candidate.correct === current.correct && candidate.lastAt > current.lastAt)) {
      attempts[id] = { ...candidate, evidence: [...currentEvidence, ...candidateEvidence].filter((entry, index, all) => index === all.findIndex((item) => item.problemId === entry.problemId && item.answeredAt === entry.answeredAt)).slice(-60) };
    } else if (candidateEvidence.length > 0) {
      attempts[id] = { ...current, evidence: [...currentEvidence, ...candidateEvidence].filter((entry, index, all) => index === all.findIndex((item) => item.problemId === entry.problemId && item.answeredAt === entry.answeredAt)).slice(-60) };
    }
  }

  const guideSeen: Record<string, boolean> = { ...left.guideSeen };
  for (const [id, seen] of Object.entries(right.guideSeen)) if (seen) guideSeen[id] = true;
  const latest = rightUpdated >= leftUpdated ? right : left;
  const historyByKey = new Map<string, ExamResult>();
  for (const result of [...(left.examHistory ?? []), ...(right.examHistory ?? [])]) {
    historyByKey.set(`${result.formId}:${result.submittedAt}`, result);
  }
  return {
    mastery,
    attempts,
    studyDates: [...new Set([...left.studyDates, ...right.studyDates])].sort().slice(-180),
    studySeconds: Math.max(left.studySeconds, right.studySeconds),
    awaySeconds: Math.max(left.awaySeconds, right.awaySeconds),
    guideSeen,
    practice: latest.practice,
    errorHistory: mergeErrorHistory(left.errorHistory ?? {}, right.errorHistory ?? {}),
    examSession: latest.examSession,
    examHistory: [...historyByKey.values()].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).slice(-30),
    updatedAt: latest.updatedAt,
    clearedAt: latest.clearedAt,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const finishReject = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    const timeout = window.setTimeout(() => finishReject(new Error("IndexedDB open timed out")), 1500);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); };
    request.onsuccess = () => { if (!settled) { settled = true; window.clearTimeout(timeout); request.result.onversionchange = () => request.result.close(); resolve(request.result); } };
    request.onblocked = () => finishReject(new Error("IndexedDB open blocked"));
    request.onerror = () => finishReject(request.error ?? new Error("IndexedDB could not open"));
  });
}

async function readDatabaseProgress(): Promise<PersistedProgress | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const value = await new Promise<PersistedProgress | undefined>((resolve, reject) => {
      const request = database?.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PROGRESS_KEY);
      if (!request) return reject(new Error("IndexedDB transaction unavailable"));
      request.onsuccess = () => resolve(request.result as PersistedProgress | undefined);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
    });
    return normalizeProgress(value);
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

async function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined") {
    const lockManager = (navigator as Navigator & { locks?: { request<T>(name: string, options: { mode: "exclusive" }, callback: () => Promise<T>): Promise<T> } }).locks;
    if (lockManager) return lockManager.request("kyote-math-60-progress", { mode: "exclusive" }, task);
  }
  let token = "";
  const deadline = Date.now() + 2000;
  try {
    while (Date.now() < deadline) {
      token = `${instanceId}:${Date.now()}`;
      const existing = window.localStorage.getItem(WRITE_LOCK_KEY);
      const existingAt = existing ? Number(existing.split(":").at(-1)) : 0;
      if (!existing || !Number.isFinite(existingAt) || Date.now() - existingAt > 1500) {
        window.localStorage.setItem(WRITE_LOCK_KEY, token);
        if (window.localStorage.getItem(WRITE_LOCK_KEY) === token) break;
      }
      await wait(30);
    }
    return task();
  } catch {
    // Some browsers expose localStorage but reject access in private or
    // restricted contexts. The IndexedDB/local in-memory fallbacks still work.
    return task();
  } finally {
    try {
      if (token && window.localStorage.getItem(WRITE_LOCK_KEY) === token) window.localStorage.removeItem(WRITE_LOCK_KEY);
    } catch {
      // Nothing to release when storage access is unavailable.
    }
  }
}

export async function loadProgress(): Promise<PersistedProgress> {
  const fallback = localFallback();
  const localProgress = readLocalProgress();
  if (typeof window === "undefined" || !window.indexedDB) return fallback;
  const databaseProgress = await readDatabaseProgress();
  if (localProgress && databaseProgress) return mergeProgress(localProgress, databaseProgress);
  return localProgress ?? databaseProgress ?? fallback;
}

async function persistProgress(progress: PersistedProgress) {
  if (typeof window === "undefined") return;
  const incoming: PersistedProgress = { ...progress, updatedAt: new Date().toISOString() };
  const localProgress = readLocalProgress();
  const databaseProgress = await readDatabaseProgress();
  const current = localProgress && databaseProgress ? mergeProgress(localProgress, databaseProgress) : localProgress ?? databaseProgress;
  const ownsReset = Boolean(current?.clearedAt && (current.clearedAt === localClearAt || (() => {
    try { return window.sessionStorage.getItem(RESET_SESSION_KEY) === current.clearedAt; } catch { return false; }
  })()));
  // A tab that existed before reset must not be allowed to write its stale
  // snapshot back with a fresh wall-clock timestamp. The tab that performed
  // reset may start a new history, identified by its per-tab session marker.
  if (current?.clearedAt && !progress.clearedAt && !ownsReset) return;
  const base = ownsReset && current ? ({ ...current, clearedAt: undefined } as PersistedProgress) : current ?? null;
  const snapshot = base ? mergeProgress(base, incoming) : incoming;
  try {
    window.localStorage.setItem(LOCAL_KEYS.mastery, JSON.stringify(snapshot.mastery));
    window.localStorage.setItem(LOCAL_KEYS.attempts, JSON.stringify(snapshot.attempts));
    window.localStorage.setItem(LOCAL_KEYS.studyDates, JSON.stringify(snapshot.studyDates));
    window.localStorage.setItem(LOCAL_KEYS.studySeconds, String(snapshot.studySeconds));
    window.localStorage.setItem(LOCAL_KEYS.awaySeconds, String(snapshot.awaySeconds));
    window.localStorage.setItem(LOCAL_KEYS.guideSeen, JSON.stringify(snapshot.guideSeen));
    if (snapshot.practice) window.localStorage.setItem(LOCAL_KEYS.practice, JSON.stringify(snapshot.practice));
    else window.localStorage.removeItem(LOCAL_KEYS.practice);
    if (snapshot.errorHistory && Object.keys(snapshot.errorHistory).length > 0) window.localStorage.setItem(LOCAL_KEYS.errorHistory, JSON.stringify(snapshot.errorHistory));
    else window.localStorage.removeItem(LOCAL_KEYS.errorHistory);
    if (snapshot.examSession) window.localStorage.setItem(LOCAL_KEYS.examSession, JSON.stringify(snapshot.examSession));
    else window.localStorage.removeItem(LOCAL_KEYS.examSession);
    if (snapshot.examHistory && snapshot.examHistory.length > 0) window.localStorage.setItem(LOCAL_KEYS.examHistory, JSON.stringify(snapshot.examHistory));
    else window.localStorage.removeItem(LOCAL_KEYS.examHistory);
    window.localStorage.setItem(LOCAL_KEYS.updatedAt, snapshot.updatedAt as string);
    if (snapshot.clearedAt) window.localStorage.setItem(LOCAL_KEYS.clearedAt, snapshot.clearedAt);
    else window.localStorage.removeItem(LOCAL_KEYS.clearedAt);
  } catch {
    // IndexedDB is attempted below even when localStorage is unavailable.
  }
  if (!window.indexedDB) return;
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database?.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(snapshot, PROGRESS_KEY);
      if (!request) return reject(new Error("IndexedDB transaction unavailable"));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("IndexedDB write failed"));
    });
  } catch {
    // The localStorage copy remains available as a recovery path.
  } finally {
    database?.close();
  }
}

export function saveProgress(progress: PersistedProgress) {
  // State effects can fire in quick succession after one answer. Serialize writes
  // so an older IndexedDB transaction cannot finish after a newer one.
  writeQueue = writeQueue.then(() => withWriteLock(() => persistProgress(progress)));
  return writeQueue;
}

async function clearSnapshot() {
  if (typeof window === "undefined") return;
  const clearedAt = new Date().toISOString();
  localClearAt = clearedAt;
  try { window.sessionStorage.setItem(RESET_SESSION_KEY, clearedAt); } catch { /* sessionStorage may be blocked */ }
  await persistProgress({ mastery: {}, attempts: {}, studyDates: [], studySeconds: 0, awaySeconds: 0, guideSeen: {}, practice: undefined, errorHistory: {}, examSession: undefined, examHistory: [], clearedAt });
}

export function clearProgress() {
  // Keep a tombstone instead of deleting only one backend. A stale tab can no
  // longer resurrect data after reset because the newer clear wins on merge.
  writeQueue = writeQueue.then(() => withWriteLock(clearSnapshot));
  return writeQueue;
}
