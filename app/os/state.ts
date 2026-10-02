// OSレイヤーの永続化。既存の kyote-math-60:* とは独立したキーで保存し、
// エクスポート/インポートに両方を含める。

import type { LearningSubjectId, RecordEntry, ScienceChoice, SocialChoice, UnitState } from "./model";

export const OS_STORAGE_KEY = "kyote-os:state";

export type OsState = {
  version: 1;
  unitStates: Record<string, UnitState>;
  records: RecordEntry[];
  diagnosticsDone: Record<LearningSubjectId, string | undefined>;
  scienceChoice: ScienceChoice | null;
  socialChoice: SocialChoice | null;
  customMinutes: number | null;
  updatedAt: string;
};

export const emptyOsState: OsState = {
  version: 1,
  unitStates: {},
  records: [],
  diagnosticsDone: {} as Record<LearningSubjectId, string | undefined>,
  scienceChoice: null,
  socialChoice: null,
  customMinutes: null,
  updatedAt: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUnitState(value: unknown): UnitState {
  if (!isRecord(value)) return { level: 0, attempts: 0, correct: 0 };
  const level = typeof value.level === "number" && Number.isInteger(value.level) ? Math.min(4, Math.max(0, value.level)) : 0;
  const attempts = typeof value.attempts === "number" && Number.isInteger(value.attempts) && value.attempts >= 0 ? value.attempts : 0;
  const correct = typeof value.correct === "number" && Number.isInteger(value.correct) && value.correct >= 0 ? Math.min(value.correct, attempts) : 0;
  return {
    level,
    attempts,
    correct,
    lastAt: typeof value.lastAt === "string" ? value.lastAt : undefined,
    dueAt: typeof value.dueAt === "string" ? value.dueAt : undefined,
    lastErrorCause: typeof value.lastErrorCause === "string" ? value.lastErrorCause : undefined,
  };
}

function normalizeRecordEntry(value: unknown): RecordEntry | null {
  if (!isRecord(value)) return null;
  const score = typeof value.score === "number" && Number.isFinite(value.score) ? value.score : NaN;
  const maxScore = typeof value.maxScore === "number" && value.maxScore > 0 ? value.maxScore : NaN;
  if (!Number.isFinite(score) || !Number.isFinite(maxScore)) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `rec-${Math.random().toString(36).slice(2, 10)}`,
    date: typeof value.date === "string" ? value.date : new Date().toISOString(),
    material: typeof value.material === "string" ? value.material : "記録",
    slotId: typeof value.slotId === "string" ? value.slotId : "kokugo",
    score: Math.max(0, score),
    maxScore,
    minutes: typeof value.minutes === "number" && value.minutes > 0 ? Math.round(value.minutes) : undefined,
  };
}

export function normalizeOsState(value: unknown): OsState {
  if (!isRecord(value)) return { ...emptyOsState, updatedAt: new Date().toISOString() };
  const unitStates: Record<string, UnitState> = {};
  if (isRecord(value.unitStates)) {
    for (const [unitId, state] of Object.entries(value.unitStates)) {
      if (typeof unitId === "string") unitStates[unitId] = normalizeUnitState(state);
    }
  }
  const records = Array.isArray(value.records)
    ? value.records.map(normalizeRecordEntry).filter((entry): entry is RecordEntry => entry !== null)
    : [];
  const diagnosticsDone: Record<LearningSubjectId, string | undefined> = {} as Record<LearningSubjectId, string | undefined>;
  if (isRecord(value.diagnosticsDone)) {
    for (const [subjectId, date] of Object.entries(value.diagnosticsDone)) {
      if (typeof date === "string") diagnosticsDone[subjectId as LearningSubjectId] = date;
    }
  }
  const scienceChoice = value.scienceChoice === "bio" || value.scienceChoice === "chem" ? value.scienceChoice : null;
  const socialChoice = value.socialChoice === "world" || value.socialChoice === "geo" ? value.socialChoice : null;
  const customMinutes = typeof value.customMinutes === "number" && value.customMinutes > 0 ? Math.round(value.customMinutes) : null;
  return {
    version: 1,
    unitStates,
    records: records.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    diagnosticsDone,
    scienceChoice,
    socialChoice,
    customMinutes,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

export function loadOsState(): OsState {
  try {
    const raw = window.localStorage.getItem(OS_STORAGE_KEY);
    if (!raw) return { ...emptyOsState, updatedAt: new Date().toISOString() };
    return normalizeOsState(JSON.parse(raw) as unknown);
  } catch {
    return { ...emptyOsState, updatedAt: new Date().toISOString() };
  }
}

export function saveOsState(state: OsState) {
  try {
    window.localStorage.setItem(OS_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    // 保存失敗は致命的でない（メモリ上の状態を維持）
  }
}

export function mergeOsState(local: OsState, incoming: OsState): OsState {
  const unitStates: Record<string, UnitState> = { ...incoming.unitStates };
  for (const [unitId, state] of Object.entries(local.unitStates)) {
    const other = unitStates[unitId];
    if (!other || (other.level ?? 0) < (state.level ?? 0) || (other.attempts ?? 0) < (state.attempts ?? 0)) {
      unitStates[unitId] = state;
    }
  }
  const records = [...local.records, ...incoming.records]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index);
  const diagnosticsDone = { ...local.diagnosticsDone, ...incoming.diagnosticsDone };
  return {
    version: 1,
    unitStates,
    records,
    diagnosticsDone,
    scienceChoice: incoming.scienceChoice ?? local.scienceChoice,
    socialChoice: incoming.socialChoice ?? local.socialChoice,
    customMinutes: incoming.customMinutes ?? local.customMinutes,
    updatedAt: new Date().toISOString(),
  };
}

// 復習スケジュール（当日/翌日/3日後/7日後）
export function nextReviewDue(isoNow: string, kind: "wrong" | "ok"): string {
  const now = Date.parse(isoNow);
  const hours = kind === "wrong" ? 24 : 72;
  return new Date(now + hours * 3600 * 1000).toISOString();
}
