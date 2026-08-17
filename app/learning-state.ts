export const ERROR_CAUSE_OPTIONS = [
  { id: "concept_gap", label: "考え方が分からない", description: "使う意味や公式が思い出せない" },
  { id: "misread", label: "条件を読み落とした", description: "文章・図・選択肢の条件を取り違えた" },
  { id: "procedure", label: "方針・手順で止まった", description: "最初の一手や途中の順番が分からない" },
  { id: "calculation", label: "計算・符号で落とした", description: "考え方は合っていたが処理を誤った" },
  { id: "careless", label: "うっかり・時間切れ", description: "急ぎすぎた、転記した、時間が足りなかった" },
] as const;

export type ErrorCause = (typeof ERROR_CAUSE_OPTIONS)[number]["id"];
export type PracticePhase = "lesson" | "question";

export type PracticeFeedback = Readonly<{
  correct: boolean;
  explanation: string;
}>;

export type PracticeResumeState = Readonly<{
  active: boolean;
  conceptId: string;
  problemId: string;
  phase: PracticePhase;
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

function validIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
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
      if (!isRecord(rawEntry) || typeof rawEntry.problemId !== "string" || !isErrorCause(rawEntry.cause) || !validIsoDate(rawEntry.at)) continue;
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
  return (level ?? 0) >= 3;
}

export function retryDelayHours(cause: ErrorCause): number {
  if (cause === "concept_gap") return 24;
  if (cause === "procedure") return 12;
  if (cause === "misread") return 6;
  return 2;
}
