export const ERROR_CAUSE_OPTIONS = [
  { id: "concept_gap", label: "考え方が分からない", description: "使う意味や公式が思い出せない" },
  { id: "misread", label: "条件を読み落とした", description: "文章・図・選択肢の条件を取り違えた" },
  { id: "procedure", label: "方針・手順で止まった", description: "最初の一手や途中の順番が分からない" },
  { id: "calculation", label: "計算・符号で落とした", description: "考え方は合っていたが処理を誤った" },
  { id: "careless", label: "うっかり・時間切れ", description: "急ぎすぎた、転記した、時間が足りなかった" },
] as const;

export type ErrorCause = (typeof ERROR_CAUSE_OPTIONS)[number]["id"];
export type PracticePhase = "lesson" | "question";
export type LessonStep = "overview" | "worked";

export type PracticeFeedback = Readonly<{
  correct: boolean;
  explanation: string;
}>;

export type PracticeResumeState = Readonly<{
  active: boolean;
  conceptId: string;
  problemId: string;
  phase: PracticePhase;
  lessonStep: LessonStep;
  answer: number | null;
  feedback: PracticeFeedback | null;
  errorCause: ErrorCause | null;
  reviewCause: ErrorCause | null;
}>;

export type RetryState = Readonly<{
  cause: ErrorCause;
  problemId: string;
  scheduledAt: string;
}>;

export type ErrorRecord = Readonly<{
  problemId: string;
  cause: ErrorCause;
  at: string;
}>;

export type AttemptEvidence = Readonly<{
  problemId: string;
  kind: "quick" | "standard" | "transfer";
  delayed: boolean;
  correct: boolean;
  answeredAt: string;
  source: "observed" | "imported";
}>;

export const DELAYED_RETEST_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Rebuild one concept's staged mastery from chronological, correct evidence.
 * A retry or an imported snapshot cannot skip a stage, and a delayed retest
 * is only valid after the transfer evidence has aged through its schedule.
 */
export function masteryLevelFromEvidence(evidence: AttemptEvidence[]): number {
  const ordered = evidence
    .filter((entry) => entry.correct && Number.isFinite(Date.parse(entry.answeredAt)))
    .slice()
    .sort((left, right) => Date.parse(left.answeredAt) - Date.parse(right.answeredAt));
  let level = 0;
  let transferAt: number | undefined;
  for (const entry of ordered) {
    const answeredAt = Date.parse(entry.answeredAt);
    const expected = level === 0 ? "quick" : level === 1 ? "standard" : level === 2 ? "transfer" : level === 3 ? "delayed" : "complete";
    const matches = expected === "delayed"
      ? entry.kind === "transfer" && entry.delayed
      : expected === entry.kind && !entry.delayed;
    if (!matches) continue;
    if (level === 3 && transferAt !== undefined && answeredAt - transferAt < DELAYED_RETEST_WAIT_MS) continue;
    if (level === 2) transferAt = answeredAt;
    level = Math.min(4, level + 1);
  }
  return level;
}

export type ErrorHistory = Record<string, ErrorRecord[]>;

const ERROR_CAUSES = new Set<ErrorCause>(ERROR_CAUSE_OPTIONS.map((option) => option.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isErrorCause(value: unknown): value is ErrorCause {
  return typeof value === "string" && ERROR_CAUSES.has(value as ErrorCause);
}

export function isPracticePhase(value: unknown): value is PracticePhase {
  return value === "lesson" || value === "question";
}

export function isLessonStep(value: unknown): value is LessonStep {
  return value === "overview" || value === "worked";
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeFeedback(value: unknown): PracticeFeedback | null {
  if (!isRecord(value) || typeof value.correct !== "boolean" || typeof value.explanation !== "string") return null;
  return { correct: value.correct, explanation: value.explanation.slice(0, 4000) };
}

/**
 * Normalize a browser/import snapshot without knowing the current content bank.
 * The page performs the second pass against current concept/problem IDs.
 */
export function normalizePracticeSnapshot(value: unknown): PracticeResumeState | undefined {
  if (!isRecord(value) || typeof value.active !== "boolean" || typeof value.conceptId !== "string" || typeof value.problemId !== "string") return undefined;
  if (!isPracticePhase(value.phase)) return undefined;
  const lessonStep = isLessonStep(value.lessonStep) ? value.lessonStep : "overview";
  const answer = value.answer === null
    ? null
    : typeof value.answer === "number" && Number.isSafeInteger(value.answer) && value.answer >= 0 && value.answer < 4
      ? value.answer
      : null;
  return {
    active: value.active,
    conceptId: value.conceptId,
    problemId: value.problemId,
    phase: value.phase,
    lessonStep,
    answer,
    feedback: normalizeFeedback(value.feedback),
    errorCause: isErrorCause(value.errorCause) ? value.errorCause : null,
    reviewCause: isErrorCause(value.reviewCause) ? value.reviewCause : null,
  };
}

export function normalizeErrorHistory(value: unknown): ErrorHistory {
  if (!isRecord(value)) return {};
  const history: ErrorHistory = {};
  for (const [conceptId, rawEntries] of Object.entries(value)) {
    if (!Array.isArray(rawEntries)) continue;
    const entries: ErrorRecord[] = [];
    for (const rawEntry of rawEntries) {
      if (!isRecord(rawEntry) || typeof rawEntry.problemId !== "string" || !isErrorCause(rawEntry.cause) || !isValidIsoDate(rawEntry.at)) continue;
      entries.push({ problemId: rawEntry.problemId, cause: rawEntry.cause, at: rawEntry.at });
    }
    if (entries.length > 0) history[conceptId] = entries.slice(-20);
  }
  return history;
}

export function mergeErrorHistory(left: ErrorHistory, right: ErrorHistory): ErrorHistory {
  const merged: ErrorHistory = {};
  for (const conceptId of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const entries = [...(left[conceptId] ?? []), ...(right[conceptId] ?? [])]
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .filter((entry, index, all) => index === all.findIndex((candidate) => candidate.problemId === entry.problemId && candidate.cause === entry.cause && candidate.at === entry.at));
    if (entries.length > 0) merged[conceptId] = entries.slice(-20);
  }
  return merged;
}

export function appendErrorRecord(history: ErrorHistory, conceptId: string, record: ErrorRecord): ErrorHistory {
  return { ...history, [conceptId]: [...(history[conceptId] ?? []), record].slice(-20) };
}

export function isMasteryComplete(level: number | undefined): boolean {
  return (level ?? 0) >= 4;
}

export function retryDelayHours(cause: ErrorCause): number {
  if (cause === "concept_gap") return 24;
  if (cause === "procedure") return 12;
  if (cause === "misread") return 6;
  return 2;
}
