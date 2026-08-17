import {
  mergeErrorHistory,
  isErrorCause,
  normalizeErrorHistory,
  normalizePracticeSnapshot,
  type ErrorCause,
  type ErrorHistory,
  type PracticeResumeState,
  type RetryState,
} from "./learning-state";

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
  }>;
  studyDates: string[];
  studySeconds: number;
  awaySeconds: number;
  guideSeen: Record<string, boolean>;
  practice?: PracticeResumeState;
  errorHistory?: ErrorHistory;
};

const DB_NAME = "kyote-math-60";
const DB_VERSION = 1;
const STORE_NAME = "progress";
const PROGRESS_KEY = "current";
const LOCAL_KEYS = {
  mastery: "kyote-math-60:mastery",
  attempts: "kyote-math-60:attempts",
  studyDates: "kyote-math-60:study-dates",
  studySeconds: "kyote-math-60:study-seconds",
  awaySeconds: "kyote-math-60:away-seconds",
  guideSeen: "kyote-math-60:guide-seen",
  practice: "kyote-math-60:practice",
  errorHistory: "kyote-math-60:error-history",
} as const;

let writeQueue = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProgress(value: unknown): PersistedProgress | null {
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
    const lastAt = typeof rawAttempt.lastAt === "string" ? rawAttempt.lastAt : new Date().toISOString();
    const dueAt = typeof rawAttempt.dueAt === "string" ? rawAttempt.dueAt : undefined;
    const streak = typeof rawAttempt.streak === "number" && Number.isFinite(rawAttempt.streak) ? Math.max(0, Math.floor(rawAttempt.streak)) : undefined;
    const lastErrorCause = isErrorCause(rawAttempt.lastErrorCause) ? rawAttempt.lastErrorCause : undefined;
    const retry = isRecord(rawAttempt.retry)
      && typeof rawAttempt.retry.problemId === "string"
      && typeof rawAttempt.retry.scheduledAt === "string"
      && isErrorCause(rawAttempt.retry.cause)
      ? { cause: rawAttempt.retry.cause, problemId: rawAttempt.retry.problemId, scheduledAt: rawAttempt.retry.scheduledAt }
      : undefined;
    attempts[id] = { correct: Math.min(correct, total), total, lastAt, dueAt, streak, lastErrorCause, retry };
  }
  const studyDates = Array.isArray(value.studyDates)
    ? value.studyDates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
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
  return { mastery, attempts, studyDates: [...new Set(studyDates)].slice(-180), studySeconds, awaySeconds, guideSeen, practice, errorHistory };
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
    if (masteryRaw === null && attemptsRaw === null && studyDatesRaw === null && studySecondsRaw === null && awaySecondsRaw === null && guideSeenRaw === null && practiceRaw === null && errorHistoryRaw === null) return null;
    return normalizeProgress({
      mastery: JSON.parse(masteryRaw ?? "{}") as unknown,
      attempts: JSON.parse(attemptsRaw ?? "{}") as unknown,
      studyDates: JSON.parse(studyDatesRaw ?? "[]") as unknown,
      studySeconds: studySecondsRaw === null ? 0 : Number(studySecondsRaw),
      awaySeconds: awaySecondsRaw === null ? 0 : Number(awaySecondsRaw),
      guideSeen: JSON.parse(guideSeenRaw ?? "{}") as unknown,
      practice: JSON.parse(practiceRaw ?? "null") as unknown,
      errorHistory: JSON.parse(errorHistoryRaw ?? "{}") as unknown,
    });
  } catch {
    return null;
  }
}

function localFallback(): PersistedProgress {
  return readLocalProgress() ?? { mastery: {}, attempts: {}, studyDates: [], studySeconds: 0, awaySeconds: 0, guideSeen: {} };
}

function mergeProgress(left: PersistedProgress, right: PersistedProgress): PersistedProgress {
  const mastery: Record<string, number> = { ...left.mastery };
  for (const [id, level] of Object.entries(right.mastery)) mastery[id] = Math.max(mastery[id] ?? 0, level);

  const attempts: PersistedProgress["attempts"] = { ...left.attempts };
  for (const [id, candidate] of Object.entries(right.attempts)) {
    const current = attempts[id];
    if (!current || candidate.total > current.total || (candidate.total === current.total && candidate.correct > current.correct)
      || (candidate.total === current.total && candidate.correct === current.correct && candidate.lastAt > current.lastAt)) {
      attempts[id] = candidate;
    }
  }

  const guideSeen: Record<string, boolean> = { ...left.guideSeen };
  for (const [id, seen] of Object.entries(right.guideSeen)) if (seen) guideSeen[id] = true;
  return {
    mastery,
    attempts,
    studyDates: [...new Set([...left.studyDates, ...right.studyDates])].sort().slice(-180),
    studySeconds: Math.max(left.studySeconds, right.studySeconds),
    awaySeconds: Math.max(left.awaySeconds, right.awaySeconds),
    guideSeen,
    practice: left.practice ?? right.practice,
    errorHistory: mergeErrorHistory(left.errorHistory ?? {}, right.errorHistory ?? {}),
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not open"));
  });
}

export async function loadProgress(): Promise<PersistedProgress> {
  const fallback = localFallback();
  const localProgress = readLocalProgress();
  if (typeof window === "undefined" || !window.indexedDB) return fallback;
  try {
    const database = await openDatabase();
    const value = await new Promise<PersistedProgress | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PROGRESS_KEY);
      request.onsuccess = () => resolve(request.result as PersistedProgress | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const databaseProgress = normalizeProgress(value);
    if (localProgress && databaseProgress) return mergeProgress(localProgress, databaseProgress);
    return localProgress ?? databaseProgress ?? fallback;
  } catch {
    return fallback;
  }
}

async function persistProgress(progress: PersistedProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEYS.mastery, JSON.stringify(progress.mastery));
    window.localStorage.setItem(LOCAL_KEYS.attempts, JSON.stringify(progress.attempts));
    window.localStorage.setItem(LOCAL_KEYS.studyDates, JSON.stringify(progress.studyDates));
    window.localStorage.setItem(LOCAL_KEYS.studySeconds, String(progress.studySeconds));
    window.localStorage.setItem(LOCAL_KEYS.awaySeconds, String(progress.awaySeconds));
    window.localStorage.setItem(LOCAL_KEYS.guideSeen, JSON.stringify(progress.guideSeen));
    if (progress.practice) window.localStorage.setItem(LOCAL_KEYS.practice, JSON.stringify(progress.practice));
    else window.localStorage.removeItem(LOCAL_KEYS.practice);
    if (progress.errorHistory && Object.keys(progress.errorHistory).length > 0) window.localStorage.setItem(LOCAL_KEYS.errorHistory, JSON.stringify(progress.errorHistory));
    else window.localStorage.removeItem(LOCAL_KEYS.errorHistory);
  } catch {
    // IndexedDB is attempted below even when localStorage is unavailable.
  }
  if (!window.indexedDB) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(progress, PROGRESS_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // The localStorage copy remains available as a recovery path.
  }
}

export function saveProgress(progress: PersistedProgress) {
  // State effects can fire in quick succession after one answer. Serialize writes
  // so an older IndexedDB transaction cannot finish after a newer one.
  writeQueue = writeQueue.then(() => persistProgress(progress));
  return writeQueue;
}

async function removeProgress() {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.values(LOCAL_KEYS)) window.localStorage.removeItem(key);
  } catch {
    // Continue to IndexedDB when localStorage is blocked.
  }
  if (!window.indexedDB) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(PROGRESS_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // The database may be unavailable in private browsing; localStorage is already cleared.
  }
}

export function clearProgress() {
  // Queue the delete after prior writes and before any later writes.
  writeQueue = writeQueue.then(removeProgress);
  return writeQueue;
}
