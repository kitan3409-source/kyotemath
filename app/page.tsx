"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import conceptData from "@/data/math-concepts.json";
import { problemBank as baseProblemBank, type Problem } from "./problem-bank";
import type { ConceptGuide } from "./content/concept-guides";
import { createGeneratedLessons, fullCourseGuides } from "./content/full-course";
import { lessonModules as baseLessonModules, type LessonModule } from "./content/lesson-modules";
import { lessonModulesBatch02 } from "./content/lesson-modules-batch-02";
import { lessonModulesBatch03 } from "./content/lesson-modules-batch-03";
import { lessonModulesBatch04a } from "./content/lesson-modules-batch-04a";
import { lessonModulesBatch04b } from "./content/lesson-modules-batch-04b";
import { lessonModulesBatch05a } from "./content/lesson-modules-batch-05a";
import { lessonModulesBatch05b } from "./content/lesson-modules-batch-05b";
import {
  appendErrorRecord,
  DELAYED_RETEST_WAIT_MS,
  ERROR_CAUSE_OPTIONS,
  isErrorCause,
  isMasteryComplete,
  normalizeErrorHistory,
  normalizeImportedPracticeSnapshot,
  normalizePracticeSnapshot,
  retryDelayHours,
  type ErrorCause,
  type ErrorHistory,
  type AttemptEvidence,
  isValidIsoDate,
  masteryLevelFromEvidence,
  type LessonStep,
  type PracticeFeedback,
  type PracticePhase,
  type PracticeResumeState,
  type RetryState,
} from "./learning-state";
import {
  buildExamForms,
  examQuestions,
  isExamExpired,
  normalizeExamHistory,
  normalizeExamSession,
  scoreExam,
  createExamSession,
  summarizeG5Evidence,
  type ExamForm,
  type ExamResult,
  type ExamSession,
} from "./exam-engine";
import { clearProgress, loadProgress, saveProgress, type PersistedProgress } from "./storage";
import { buildProblemStages, delayedProblemForConcept, problemForConcept, primaryConceptIdForProblem } from "./practice-engine";
import {
  awaySeconds as sessionAwaySeconds,
  checkpointStudySession,
  elapsedSeconds as sessionElapsedSeconds,
  getStudyProgress,
  markPhoneAway,
  normalizeFocusDuration,
  restoreStudySession,
  resumeStudySession,
  startStudySession,
  stopStudySession,
  studySeconds as sessionStudySeconds,
  type CompletedStudySessionSummary,
  type StudySessionState,
} from "./study-session";

type Concept = (typeof conceptData.concepts)[number];
type Tab = "today" | "map" | "practice" | "mock" | "settings";
type CourseFilter = "all" | "bridge" | "I" | "A" | "II" | "B" | "C" | "III";
type Attempt = { correct: number; total: number; lastAt: string; dueAt?: string; streak?: number; lastErrorCause?: ErrorCause; retry?: RetryState; evidence?: AttemptEvidence[] };
type Feedback = PracticeFeedback;
type SessionEvidence = { questions: number; routeStart: number; routeEnd: number };
type StoredStudySession = StudySessionState;
type StoredStudySessionEnvelope = {
  session: StudySessionState;
  focusTotalSeconds: number;
  sessionStartAttempts: number;
  sessionStartRoute: number;
};

function primaryConceptIdFor(problem: Problem) {
  return primaryConceptIdForProblem(problem);
}

const concepts = conceptData.concepts;
const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
const conceptGuides: Record<string, ConceptGuide> = fullCourseGuides();
const authoredLessonModules = [
  ...baseLessonModules,
  ...lessonModulesBatch02,
  ...lessonModulesBatch03,
  ...lessonModulesBatch04a,
  ...lessonModulesBatch04b,
  ...lessonModulesBatch05a,
  ...lessonModulesBatch05b,
];
const lessonModules = [...authoredLessonModules, ...createGeneratedLessons(new Set(authoredLessonModules.map((lesson) => lesson.conceptId)))].map((lesson) => ({
  ...lesson,
  prerequisiteIds: conceptById.get(lesson.conceptId)?.requires ?? lesson.prerequisiteIds,
}));
const problemBank = baseProblemBank;
const examForms = buildExamForms(problemBank);
const examFormById = new Map(examForms.map((form) => [form.id, form]));
const { firstByConcept: problemByConcept, problemsByConcept, stagedProblemsByConcept } = buildProblemStages(problemBank);
const lessonByConcept = new Map<string, LessonModule>(lessonModules.map((lesson) => [lesson.conceptId, lesson]));
const problemById = new Map(problemBank.map((problem) => [problem.id, problem]));
const conceptOrder = new Map(
  conceptData.design.recommended_order.flatMap((phase, phaseIndex) => phase.ids.map((id, idIndex) => [id, phaseIndex * 100 + idIndex] as const)),
);
const courseLabels: Record<string, string> = {
  bridge: "橋渡し",
  I: "数学I",
  A: "数学A",
  II: "数学II",
  B: "数学B",
  C: "数学C",
  III: "数学III",
};

function masteryFromAttempts(source: Record<string, Attempt>) {
  const derived: Record<string, number> = {};
  for (const concept of concepts) {
    const evidence = (source[concept.id]?.evidence ?? []).filter((entry) => {
      const problem = problemById.get(entry.problemId);
      return entry.correct
        && (entry.source === "observed" || entry.source === "imported")
        && Boolean(problem?.conceptIds.includes(concept.id));
    }).slice().sort((left, right) => Date.parse(left.answeredAt) - Date.parse(right.answeredAt));
    const level = masteryLevelFromEvidence(evidence);
    if (level > 0) derived[concept.id] = level;
  }
  return derived;
}

function effectiveDueAtForAttempt(attempt: Attempt | undefined) {
  const storedDueAt = attempt?.dueAt && isValidIsoDate(attempt.dueAt) ? attempt.dueAt : undefined;
  const transfer = (attempt?.evidence ?? [])
    .filter((entry) => entry.correct && !entry.delayed && entry.kind === "transfer" && isValidIsoDate(entry.answeredAt))
    .sort((left, right) => Date.parse(left.answeredAt) - Date.parse(right.answeredAt))
    .at(-1);
  if (!transfer) return storedDueAt;
  const transferAt = Date.parse(transfer.answeredAt);
  if (!Number.isFinite(transferAt) || transferAt > Date.now()) return storedDueAt;
  const evidenceDueAt = new Date(transferAt + DELAYED_RETEST_WAIT_MS).toISOString();
  if (!storedDueAt || Date.parse(storedDueAt) < Date.parse(evidenceDueAt)) return evidenceDueAt;
  return storedDueAt;
}

function sanitizePracticeResume(
  practice: PracticeResumeState | undefined,
  sourceAttempts: Record<string, Attempt>,
  sourceMastery: Record<string, number>,
  allowFoundationSkip = false,
) {
  if (!practice?.active) return practice;
  const problem = problemById.get(practice.problemId);
  if (!problem) return undefined;
  const concept = conceptById.get(practice.conceptId);
  const prerequisitesReady = concept?.requires.every((id) => {
    const prerequisite = conceptById.get(id);
    return (allowFoundationSkip && prerequisite?.course === "bridge") || isMasteryComplete(sourceMastery[id]);
  });
  if (!concept || !prerequisitesReady) return undefined;
  const level = sourceMastery[practice.conceptId] ?? 0;
  const dueAt = level === 3 ? effectiveDueAtForAttempt(sourceAttempts[practice.conceptId]) : undefined;
  const delayedAllowed = level === 3 && Boolean(dueAt && Date.parse(dueAt) <= Date.now());
  if (!problem.id.endsWith("-delayed") || delayedAllowed) return practice;
  const replacement = problemForConcept(
    practice.conceptId,
    level === 3 ? 2 : level,
    { firstByConcept: problemByConcept, problemsByConcept, stagedProblemsByConcept },
  );
  if (!replacement) return undefined;
  return {
    ...practice,
    problemId: replacement.id,
    phase: "lesson" as const,
    lessonStep: "overview" as const,
    answer: null,
    feedback: null,
    errorCause: null,
    reviewCause: null,
  };
}

function isCommonTestConcept(concept: Concept) {
  return ["I", "A", "II", "B", "C"].includes(concept.course) && concept.priority === "core";
}

function prerequisiteClosure(seed: Concept[]) {
  const included = new Set<string>();
  const visit = (conceptId: string) => {
    if (included.has(conceptId)) return;
    const concept = conceptById.get(conceptId);
    if (!concept) return;
    included.add(concept.id);
    concept.requires.forEach(visit);
  };
  seed.forEach((concept) => visit(concept.id));
  return concepts.filter((concept) => included.has(concept.id));
}
const storageKeys = {
  mastery: "kyote-math-60:mastery",
  attempts: "kyote-math-60:attempts",
  initialized: "kyote-math-60:initialized",
  theme: "kyote-math-60:theme",
  noise: "kyote-math-60:noise",
  studyDates: "kyote-math-60:study-dates",
  focus: "kyote-math-60:focus",
  studySession: "kyote-math-60:study-session",
  foundationSkipped: "kyote-math-60:foundation-skipped",
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function formatStudyAmount(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ""}`;
  if (minutes > 0) return `${minutes}分`;
  return safe > 0 ? "1分未満" : "0分";
}

function levelLabel(level: number) {
  return ["未学習", "quick通過", "standard通過", "transfer通過", "遅延再テスト通過"][level] ?? "未学習";
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing and storage-quota failures should not block studying.
  }
}

function removeStored(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The in-memory state remains the source of truth for this session.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePracticeForContent(value: unknown, imported = false): PracticeResumeState | undefined {
  const snapshot = imported ? normalizeImportedPracticeSnapshot(value) : normalizePracticeSnapshot(value);
  if (!snapshot) return undefined;
  const problem = problemBank.find((candidate) => candidate.id === snapshot.problemId);
  if (!problem) return undefined;
  const conceptId = conceptById.has(snapshot.conceptId) && problem.conceptIds.includes(snapshot.conceptId)
    ? snapshot.conceptId
    : primaryConceptIdFor(problem);
  if (!conceptId || !conceptById.has(conceptId)) return undefined;
  return { ...snapshot, conceptId, answer: snapshot.answer !== null && snapshot.answer >= problem.options.length ? null : snapshot.answer };
}

function normalizeErrorHistoryForContent(value: unknown): ErrorHistory {
  const normalized = normalizeErrorHistory(value);
  const knownProblemIds = new Set(problemBank.map((problem) => problem.id));
  const filtered: ErrorHistory = {};
  for (const [conceptId, entries] of Object.entries(normalized)) {
    if (!conceptById.has(conceptId)) continue;
    const validEntries = entries.filter((entry) => knownProblemIds.has(entry.problemId));
    if (validEntries.length > 0) filtered[conceptId] = validEntries;
  }
  return filtered;
}

function normalizeImportedProgress(value: unknown): PersistedProgress | null {
  if (!isRecord(value) || !isRecord(value.mastery) || !isRecord(value.attempts)) return null;
  const safeNow = Date.now();
  const notFuture = (date: unknown): date is string => isValidIsoDate(date) && Date.parse(date) <= safeNow;
  const nextAttempts: PersistedProgress["attempts"] = {};
  for (const [id, rawAttempt] of Object.entries(value.attempts)) {
    if (!conceptById.has(id) || !isRecord(rawAttempt)) continue;
    const correct = typeof rawAttempt.correct === "number" ? Math.max(0, Math.floor(rawAttempt.correct)) : 0;
    const total = typeof rawAttempt.total === "number" ? Math.max(correct, Math.floor(rawAttempt.total)) : 0;
    if (total === 0) continue;
    const lastAt = notFuture(rawAttempt.lastAt) ? rawAttempt.lastAt : undefined;
    if (!lastAt) continue;
    const dueAt = isValidIsoDate(rawAttempt.dueAt) ? rawAttempt.dueAt : undefined;
    const streak = typeof rawAttempt.streak === "number" ? Math.max(0, Math.floor(rawAttempt.streak)) : undefined;
    const lastErrorCause = isErrorCause(rawAttempt.lastErrorCause) ? rawAttempt.lastErrorCause : undefined;
    const rawRetry = isRecord(rawAttempt.retry) ? rawAttempt.retry : null;
    const retry = rawRetry
      && typeof rawRetry.problemId === "string"
      && problemBank.some((problem) => problem.id === rawRetry.problemId)
      && isValidIsoDate(rawRetry.scheduledAt)
      && isErrorCause(rawRetry.cause)
      ? { cause: rawRetry.cause, problemId: rawRetry.problemId, scheduledAt: rawRetry.scheduledAt }
      : undefined;
    const matchesEvidenceProblem = (entry: Record<string, unknown>) => {
      const problemId = typeof entry.problemId === "string" ? entry.problemId : undefined;
      const problem = problemId ? problemById.get(problemId) : undefined;
      if (!problem || !problem.conceptIds.includes(id)) return false;
      if (entry.delayed === true) return problem.id === `AUTO-${id}-delayed` && entry.kind === "transfer";
      return entry.delayed === false && !problem.id.endsWith("-delayed") && problem.kind === entry.kind;
    };
    const evidence = Array.isArray(rawAttempt.evidence)
      ? rawAttempt.evidence.filter((entry): entry is AttemptEvidence => isRecord(entry) && typeof entry.problemId === "string" && matchesEvidenceProblem(entry) && (entry.kind === "quick" || entry.kind === "standard" || entry.kind === "transfer") && typeof entry.delayed === "boolean" && typeof entry.correct === "boolean" && notFuture(entry.answeredAt)).map((entry) => ({ ...entry, source: "imported" as const })).slice(-60)
      : undefined;
    nextAttempts[id] = { correct: Math.min(correct, total), total, lastAt, dueAt, streak, lastErrorCause, retry, evidence };
  }
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const dates = Array.isArray(value.studyDates)
    ? value.studyDates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && isValidIsoDate(date) && date <= today)
    : [];
  const studySeconds = typeof value.studySeconds === "number" && Number.isFinite(value.studySeconds) ? Math.max(0, Math.floor(value.studySeconds)) : 0;
  const awaySeconds = typeof value.awaySeconds === "number" && Number.isFinite(value.awaySeconds) ? Math.max(0, Math.floor(value.awaySeconds)) : 0;
  const guideSeen: Record<string, boolean> = {};
  if (isRecord(value.guideSeen)) {
    for (const [id, seen] of Object.entries(value.guideSeen)) {
      if (conceptById.has(id) && seen === true) guideSeen[id] = true;
    }
  }
  return {
    mastery: masteryFromAttempts(nextAttempts),
    attempts: nextAttempts,
    studyDates: [...new Set(dates)].slice(-180),
    studySeconds,
    awaySeconds,
    guideSeen,
    practice: normalizePracticeForContent(value.practice, true),
    errorHistory: normalizeErrorHistoryForContent(value.errorHistory),
    examSession: (() => {
      const session = normalizeExamSession(value.examSession, Date.now());
      return session && examFormById.has(session.formId) ? session : undefined;
    })(),
    examHistory: normalizeExamHistory(value.examHistory).filter((result) => examFormById.has(result.formId)),
    foundationSkipped: value.foundationSkipped === true,
  };
}

function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function currentStreak(studyDates: string[]) {
  const known = new Set(studyDates);
  const cursor = new Date(`${dayKey()}T12:00:00+09:00`);
  let streak = 0;
  while (known.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function currentTime() {
  return Date.now();
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [studyDates, setStudyDates] = useState<string[]>([]);
  const [studySeconds, setStudySeconds] = useState(0);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const [guideSeen, setGuideSeen] = useState<Record<string, boolean>>({});
  const [selectedConceptId, setSelectedConceptId] = useState("I-01");
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>(null);
  const [mapCourse, setMapCourse] = useState<CourseFilter>("all");
  const [mapSearch, setMapSearch] = useState("");
  const [practiceProblemId, setPracticeProblemId] = useState(problemByConcept.get("I-01")?.id ?? problemBank[0].id);
  const [practicePhase, setPracticePhase] = useState<PracticePhase>("lesson");
  const [lessonStep, setLessonStep] = useState<LessonStep>("overview");
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<Feedback | null>(null);
  const [practiceResumeActive, setPracticeResumeActive] = useState(false);
  const [practiceErrorCause, setPracticeErrorCause] = useState<ErrorCause | null>(null);
  const [practiceReviewCause, setPracticeReviewCause] = useState<ErrorCause | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorHistory>({});
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [examFormId, setExamFormId] = useState("IA-F1");
  const [selectedOptionalSectionIds, setSelectedOptionalSectionIds] = useState(["IIBC-02", "IIBC-03", "IIBC-04"]);
  const [foundationSkipped, setFoundationSkipped] = useState(false);
  const [examNow, setExamNow] = useState(() => Date.now());
  const [setupOpen, setSetupOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusTotalSeconds, setFocusTotalSeconds] = useState(20 * 60);
  const [focusSeconds, setFocusSeconds] = useState(20 * 60);
  const [noiseOn, setNoiseOn] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [studySession, setStudySession] = useState<StoredStudySession | null>(null);
  const [sessionSummary, setSessionSummary] = useState<CompletedStudySessionSummary | null>(null);
  const [sessionEvidence, setSessionEvidence] = useState<SessionEvidence | null>(null);
  const [sessionStartAttempts, setSessionStartAttempts] = useState(0);
  const [sessionStartRoute, setSessionStartRoute] = useState(0);
  const audioRef = useRef<{ context: AudioContext; node: ScriptProcessorNode } | null>(null);
  const studySessionRef = useRef<StoredStudySession | null>(null);
  const focusAutoStopRef = useRef<string | null>(null);
  const completeFocusSessionRef = useRef<(completedAtMs: number) => void>(() => undefined);
  const focusModalRef = useRef<HTMLElement | null>(null);
  const setupModalRef = useRef<HTMLElement | null>(null);
  const summaryModalRef = useRef<HTMLElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const setupPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const summaryCloseRef = useRef<HTMLButtonElement | null>(null);

  function currentPracticeResume(): PracticeResumeState | undefined {
    if (!practiceResumeActive) return undefined;
    return {
      active: true,
      conceptId: selectedConceptId,
      problemId: practiceProblemId,
      phase: practicePhase,
      lessonStep,
      answer: practiceAnswer,
      feedback: practiceFeedback,
      errorCause: practiceErrorCause,
      reviewCause: practiceReviewCause,
    };
  }

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    const timer = window.setTimeout(() => {
      void loadProgress().then((progress) => {
        const storedTheme = readStored(storageKeys.theme);
        const legacyFocus = safeParse<{ totalSeconds?: number; startedAt?: number } | null>(readStored(storageKeys.focus), null);
        const hasPersistedProgress = Object.keys(progress.attempts).length > 0
          || progress.studyDates.length > 0
          || (progress.examHistory?.length ?? 0) > 0
          || Boolean(progress.examSession?.active)
          || Boolean(progress.practice?.active)
          || progress.foundationSkipped === true;
        const firstRun = !readStored(storageKeys.initialized) && !hasPersistedProgress;
        const initialMastery = masteryFromAttempts(progress.attempts);
        if (firstRun) setSetupOpen(true);
        setMastery(initialMastery);
        setAttempts(progress.attempts);
        setStudyDates(progress.studyDates);
        setStudySeconds(progress.studySeconds);
        setAwaySeconds(progress.awaySeconds);
        setGuideSeen(progress.guideSeen);
        setErrorHistory(normalizeErrorHistoryForContent(progress.errorHistory));
        const storedFoundationSkipped = progress.foundationSkipped === true || readStored(storageKeys.foundationSkipped) === "true";
        setFoundationSkipped(storedFoundationSkipped);
        const restoredExam = normalizeExamSession(progress.examSession, Date.now());
        const usableExam = restoredExam && examFormById.has(restoredExam.formId) ? restoredExam : null;
        setExamSession(usableExam);
        setExamHistory(normalizeExamHistory(progress.examHistory));
        if (usableExam) {
          setExamFormId(usableExam.formId);
          setSelectedOptionalSectionIds(usableExam.selectedOptionalSectionIds);
          setActiveTab("mock");
        }
        const restoredPractice = sanitizePracticeResume(normalizePracticeForContent(progress.practice), progress.attempts, initialMastery, storedFoundationSkipped);
        if (restoredPractice?.active) {
          setPracticeResumeActive(true);
          setSelectedConceptId(restoredPractice.conceptId);
          setPracticeProblemId(restoredPractice.problemId);
          setPracticePhase(restoredPractice.phase);
          setLessonStep(restoredPractice.lessonStep);
          setPracticeAnswer(restoredPractice.answer);
          setPracticeFeedback(restoredPractice.feedback);
          setPracticeErrorCause(restoredPractice.errorCause);
          setPracticeReviewCause(restoredPractice.reviewCause);
          if (!usableExam) setActiveTab("practice");
        } else {
          setPracticeResumeActive(false);
          setPracticePhase("lesson");
          setLessonStep("overview");
          setPracticeAnswer(null);
          setPracticeFeedback(null);
          setPracticeErrorCause(null);
          setPracticeReviewCause(null);
        }
        setIsDark(storedTheme !== "light");
        setNoiseOn(false);
        if (!firstRun) setSetupOpen(false);
        const storedSessionValue = safeParse<unknown>(readStored(storageKeys.studySession), null);
        const storedSessionEnvelope = isRecord(storedSessionValue) && isRecord(storedSessionValue.session) ? storedSessionValue : null;
        const now = Date.now();
        const storedSession = restoreStudySession(storedSessionEnvelope?.session ?? storedSessionValue, now);
        const legacyStartedAt = typeof legacyFocus?.startedAt === "number"
          && Number.isSafeInteger(legacyFocus.startedAt)
          && legacyFocus.startedAt >= 0
          && legacyFocus.startedAt <= now
          ? legacyFocus.startedAt
          : null;
        const legacySession = !storedSession && legacyStartedAt !== null
          ? startStudySession({ id: `legacy-focus-${legacyStartedAt}`, startedAtMs: legacyStartedAt })
          : null;
        const recoveredSession = storedSession ?? legacySession;
        if (recoveredSession) {
          const resumed = resumeStudySession(recoveredSession, now);
          studySessionRef.current = resumed;
          setStudySession(resumed);
          const storedTotalSeconds = storedSessionEnvelope ? normalizeFocusDuration(storedSessionEnvelope.focusTotalSeconds) : 20 * 60;
          const legacyTotalSeconds = normalizeFocusDuration(legacyFocus?.totalSeconds);
          const totalSeconds = storedSessionEnvelope ? storedTotalSeconds : legacyTotalSeconds;
          setFocusTotalSeconds(totalSeconds);
          setFocusSeconds(sessionElapsedSeconds(resumed, now));
          setSessionStartAttempts(storedSessionEnvelope ? safeNonNegativeInteger(storedSessionEnvelope.sessionStartAttempts, 0) : 0);
          setSessionStartRoute(storedSessionEnvelope ? safeNonNegativeInteger(storedSessionEnvelope.sessionStartRoute, 0) : 0);
          setFocusRunning(true);
          focusAutoStopRef.current = recoveredSession.id;
          removeStored(storageKeys.focus);
        } else {
          removeStored(storageKeys.focus);
          removeStored(storageKeys.studySession);
        }
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
        }
        setHydrated(true);
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const syncFromAnotherTab = () => {
      void loadProgress().then((progress) => {
        const syncedMastery = masteryFromAttempts(progress.attempts);
        setMastery(syncedMastery);
        setAttempts(progress.attempts);
        setStudyDates(progress.studyDates);
        setStudySeconds(progress.studySeconds);
        setAwaySeconds(progress.awaySeconds);
        setGuideSeen(progress.guideSeen);
        setErrorHistory(normalizeErrorHistoryForContent(progress.errorHistory));
        const syncedFoundationSkipped = progress.foundationSkipped === true || readStored(storageKeys.foundationSkipped) === "true";
        setFoundationSkipped(syncedFoundationSkipped);
        const restoredExam = normalizeExamSession(progress.examSession, Date.now());
        const usableExam = restoredExam && examFormById.has(restoredExam.formId) ? restoredExam : null;
        setExamSession(usableExam);
        setExamHistory(normalizeExamHistory(progress.examHistory));
        if (usableExam) {
          setExamFormId(usableExam.formId);
          setSelectedOptionalSectionIds(usableExam.selectedOptionalSectionIds);
          setActiveTab("mock");
        }
        const restoredPractice = sanitizePracticeResume(normalizePracticeForContent(progress.practice), progress.attempts, syncedMastery, syncedFoundationSkipped);
        if (restoredPractice?.active) {
          setPracticeResumeActive(true);
          setSelectedConceptId(restoredPractice.conceptId);
          setPracticeProblemId(restoredPractice.problemId);
          setPracticePhase(restoredPractice.phase);
          setLessonStep(restoredPractice.lessonStep);
          setPracticeAnswer(restoredPractice.answer);
          setPracticeFeedback(restoredPractice.feedback);
          setPracticeErrorCause(restoredPractice.errorCause);
          setPracticeReviewCause(restoredPractice.reviewCause);
          if (!usableExam) setActiveTab("practice");
        } else {
          setPracticeResumeActive(false);
          setPracticePhase("lesson");
          setLessonStep("overview");
          setPracticeAnswer(null);
          setPracticeFeedback(null);
          setPracticeErrorCause(null);
          setPracticeReviewCause(null);
        }
      });
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const practice = practiceResumeActive
      ? { active: true, conceptId: selectedConceptId, problemId: practiceProblemId, phase: practicePhase, lessonStep, answer: practiceAnswer, feedback: practiceFeedback, errorCause: practiceErrorCause, reviewCause: practiceReviewCause }
      : undefined;
    void saveProgress({ mastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen, practice, errorHistory, examSession: examSession ?? undefined, examHistory, foundationSkipped });
  }, [attempts, awaySeconds, errorHistory, examHistory, examSession, foundationSkipped, guideSeen, hydrated, lessonStep, mastery, practiceAnswer, practiceErrorCause, practiceFeedback, practicePhase, practiceProblemId, practiceResumeActive, practiceReviewCause, selectedConceptId, studyDates, studySeconds]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    writeStored(storageKeys.theme, isDark ? "dark" : "light");
  }, [hydrated, isDark]);

  useEffect(() => {
    studySessionRef.current = studySession;
    if (!hydrated) return;
    if (studySession) {
      const envelope: StoredStudySessionEnvelope = {
        session: studySession,
        focusTotalSeconds,
        sessionStartAttempts,
        sessionStartRoute,
      };
      writeStored(storageKeys.studySession, JSON.stringify(envelope));
    }
    else removeStored(storageKeys.studySession);
  }, [focusTotalSeconds, hydrated, sessionStartAttempts, sessionStartRoute, studySession]);

  useEffect(() => {
    const syncVisibility = () => {
      const current = studySessionRef.current;
      if (!current) return;
      const next = document.hidden ? markPhoneAway(current, Date.now()) : resumeStudySession(current, Date.now());
      studySessionRef.current = next;
      setStudySession(next);
    };
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const update = () => {
      const previous = studySessionRef.current;
      if (!previous) return;
      const now = Date.now();
      const next = document.hidden ? markPhoneAway(previous, now) : checkpointStudySession(previous, now);
      studySessionRef.current = next;
      setStudySession(next);
      const elapsed = sessionElapsedSeconds(next, now);
      setFocusSeconds(Math.min(elapsed, focusTotalSeconds));
      if (focusTotalSeconds > 0 && elapsed >= focusTotalSeconds && focusAutoStopRef.current === next.id) {
        focusAutoStopRef.current = null;
        completeFocusSessionRef.current(now);
        setFocusRunning(false);
        setFocusSeconds(0);
        setFocusOpen(false);
        removeStored(storageKeys.focus);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning, focusTotalSeconds]);

  useEffect(() => {
    if (!hydrated || !examSession?.active) return;
    const timer = window.setInterval(() => setExamNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [examSession?.active, hydrated]);

  useEffect(() => {
    if (!hydrated || !examSession?.active) return;
    const delay = Math.max(0, Date.parse(examSession.deadlineAt) - examNow);
    const timeout = window.setTimeout(() => {
      const form = examFormById.get(examSession.formId);
      if (!form || !isExamExpired(examSession, new Date())) return;
      const submittedAt = examSession.deadlineAt;
      const result = { ...scoreExam(form, examSession.answers, examSession.selectedOptionalSectionIds, examSession.startedAt, submittedAt, true), firstSubmission: !examHistory.some((entry) => entry.formId === examSession.formId) };
      setExamHistory((previous) => previous.some((entry) => entry.formId === result.formId && entry.startedAt === result.startedAt)
        ? previous
        : [...previous, result].slice(-30));
      setExamSession((previous) => previous?.active && previous.startedAt === examSession.startedAt
        ? { ...previous, active: false, finished: true, submittedAt }
        : previous);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [examHistory, examNow, examSession, hydrated]);

  useEffect(() => {
    if (!focusOpen && !setupOpen && !sessionSummary) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const modal = focusOpen ? focusModalRef : setupOpen ? setupModalRef : summaryModalRef;
    const frame = window.requestAnimationFrame(() => {
      (focusOpen ? modalCloseRef.current : setupOpen ? setupPrimaryRef.current : summaryCloseRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (focusOpen || sessionSummary)) {
        event.preventDefault();
        if (focusOpen) setFocusOpen(false);
        else setSessionSummary(null);
        return;
      }
      if (event.key !== "Tab") return;
      const container = modal.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [focusOpen, sessionSummary, setupOpen]);

  useEffect(() => {
    return () => {
      const current = audioRef.current;
      if (!current) return;
      current.node.disconnect();
      void current.context.close();
    };
  }, []);

  const hasPractice = (conceptId: string) => problemByConcept.has(conceptId);
  const commonTestConcepts = concepts.filter(isCommonTestConcept);
  const commonTestRouteConcepts = prerequisiteClosure(commonTestConcepts);
  const routeConcepts = concepts.filter((concept) => concept.course === "bridge" || commonTestRouteConcepts.includes(concept));
  const studyRouteConcepts = foundationSkipped
    ? commonTestRouteConcepts.filter((concept) => concept.course !== "bridge")
    : routeConcepts;
  const isRouteTouched = (concept: Concept) => (mastery[concept.id] ?? 0) > 0 || Boolean(guideSeen[concept.id]) || Boolean(attempts[concept.id]);
  const isRouteComplete = (concept: Concept) => isMasteryComplete(mastery[concept.id]);
  const isPrerequisiteReady = (id: string) => isMasteryComplete(mastery[id]);
  const isUnlocked = (concept: Concept) => concept.requires.every((id) => {
    const prerequisite = conceptById.get(id);
    const bridgeBypass = foundationSkipped && prerequisite?.course === "bridge";
    return bridgeBypass || isPrerequisiteReady(id);
  });
  const dueAtForConcept = (conceptId: string) => {
    const attempt = attempts[conceptId];
    return (mastery[conceptId] ?? 0) === 3 ? effectiveDueAtForAttempt(attempt) : attempt?.dueAt;
  };
  const nextConcept = (() => {
    const now = currentTime();
    const candidates = studyRouteConcepts
      .filter((concept) => {
        const dueAt = dueAtForConcept(concept.id);
        const due = Boolean(dueAt && Date.parse(dueAt) <= now);
        const waitingForDelayed = (mastery[concept.id] ?? 0) === 3 && !(dueAt && Date.parse(dueAt) <= now);
        return isUnlocked(concept) && !waitingForDelayed && (!isRouteComplete(concept) || due) && (hasPractice(concept.id) || Boolean(conceptGuides[concept.id]));
      })
      .sort((a, b) => {
        const due = (concept: Concept) => {
          const dueAt = dueAtForConcept(concept.id);
          return dueAt && Date.parse(dueAt) <= now ? 0 : 1;
        };
        const untouched = (concept: Concept) => isRouteComplete(concept) ? 1 : 0;
        return untouched(a) - untouched(b) || due(a) - due(b) || (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999);
      });
    return candidates[0] ?? studyRouteConcepts.find((concept) => hasPractice(concept.id) || Boolean(conceptGuides[concept.id])) ?? concepts[0];
  })();
  const selectedConcept = conceptById.get(selectedConceptId) ?? nextConcept;
  const selectedGuide: ConceptGuide | undefined = conceptGuides[selectedConcept.id];
  const selectedLesson: LessonModule | undefined = lessonByConcept.get(selectedConcept.id);
  const currentPractice = problemBank.find((problem) => problem.id === practiceProblemId) ?? problemBank[0];
  const currentExamForm: ExamForm = examFormById.get(examSession?.formId ?? examFormId) ?? examForms[0];
  const currentExamQuestions = examQuestions(currentExamForm, examSession?.selectedOptionalSectionIds ?? selectedOptionalSectionIds, examSession?.answers ?? {});
  const currentExamIndex = Math.min(Math.max(0, examSession?.index ?? 0), Math.max(0, currentExamQuestions.length - 1));
  const currentExamQuestion = currentExamQuestions[currentExamIndex];

  const totalAttempts = Object.values(attempts).reduce((sum, value) => sum + value.total, 0);
  const totalCorrect = Object.values(attempts).reduce((sum, value) => sum + value.correct, 0);
  const liveStudySeconds = studySeconds + (studySession ? sessionStudySeconds(studySession, currentTime()) : 0);
  const liveAwaySeconds = awaySeconds + (studySession ? sessionAwaySeconds(studySession, currentTime()) : 0);
  const studyProgress = getStudyProgress(liveStudySeconds);
  const studyMilestones = [10 / 60, 0.5, 1, 3, 5, 10, 25, 50, 100, 200, 350, 500, 700];
  const nextStudyMilestone = studyMilestones.find((hours) => studyProgress.studiedHours < hours) ?? 700;
  const milestoneRemainingSeconds = Math.max(0, Math.ceil(nextStudyMilestone * 3600 - liveStudySeconds));
  const routeTouchedCount = commonTestConcepts.filter(isRouteTouched).length;
  const routeCompleteCount = commonTestConcepts.filter(isRouteComplete).length;
  const routeProgress = commonTestConcepts.length ? Math.round((routeCompleteCount / commonTestConcepts.length) * 100) : 0;
  const availableConceptCount = commonTestConcepts.filter((concept) => hasPractice(concept.id)).length;
  const learnedCount = commonTestConcepts.filter((concept) => (mastery[concept.id] ?? 0) >= 4).length;
  const selectedLevel = mastery[selectedConcept.id] ?? 0;
  const targetProblem = problemByConcept.get(nextConcept.id);
  const streak = currentStreak(studyDates);
  const targetDueAt = dueAtForConcept(nextConcept.id);
  const targetDue = Boolean(targetDueAt && Date.parse(targetDueAt) <= currentTime());
  const examRemainingSeconds = examSession?.active ? Math.max(0, Math.ceil((Date.parse(examSession.deadlineAt) - examNow) / 1000)) : 0;
  const latestExamResult = examSession?.finished && examSession.submittedAt
    ? examHistory.find((result) => result.formId === examSession.formId && result.submittedAt === examSession.submittedAt) ?? examHistory.filter((result) => result.formId === examSession.formId).at(-1)
    : undefined;
  const g5Evidence = summarizeG5Evidence(examHistory);

  const filteredConcepts = (() => {
    const query = mapSearch.trim().toLowerCase();
    return concepts.filter((concept) => {
      const courseMatch = mapCourse === "all" || concept.course === mapCourse;
      const text = `${concept.id} ${concept.title} ${concept.unit} ${concept.tags.join(" ")}`.toLowerCase();
      const exactIdSearch = /^[a-z]+-\d+$/.test(query);
      const queryMatch = !query || (exactIdSearch ? concept.id.toLowerCase() === query : text.includes(query));
      return courseMatch && queryMatch;
    });
  })();

  function openPracticeFor(concept: Concept) {
    setSelectedConceptId(concept.id);
    const level = mastery[concept.id] ?? 0;
    const dueAt = dueAtForConcept(concept.id);
    const delayedWaiting = level === 3 && !(dueAt && Date.parse(dueAt) <= currentTime());
    const problem = problemForConcept(concept.id, delayedWaiting ? 2 : level, { firstByConcept: problemByConcept, problemsByConcept, stagedProblemsByConcept });
    if (!problem) return;
    setPracticeResumeActive(true);
    setPracticeProblemId(problem.id);
    setPracticePhase("lesson");
    setLessonStep("overview");
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeErrorCause(null);
    setPracticeReviewCause(null);
    setActiveTab("practice");
  }

  function practiceConceptIdFor(problem: Problem) {
    return conceptById.has(selectedConceptId) && problem.conceptIds.includes(selectedConceptId) ? selectedConceptId : primaryConceptIdFor(problem);
  }

  function recordAttempt(problem: Problem, correct: boolean) {
    const observedConceptId = practiceConceptIdFor(problem);
    if (!observedConceptId || !conceptById.has(observedConceptId)) return;
    const now = new Date().toISOString();
    const currentLevel = mastery[observedConceptId] ?? 0;
    const expectedStage = currentLevel === 0 ? "quick" : currentLevel === 1 ? "standard" : currentLevel === 2 ? "transfer" : currentLevel === 3 ? "delayed" : "complete";
    const isDelayed = problem.id.endsWith("-delayed");
    const dueAt = currentLevel === 3 ? effectiveDueAtForAttempt(attempts[observedConceptId]) : attempts[observedConceptId]?.dueAt;
    const delayedEligible = !isDelayed || Boolean(dueAt && Date.parse(dueAt) <= Date.parse(now));
    const stageMatches = (expectedStage === "delayed" ? isDelayed : expectedStage === problem.kind && !isDelayed) && delayedEligible;
    setAttempts((previous) => {
      const next = { ...previous };
      const advances = correct && currentLevel < 4 && stageMatches;
      const nextLevel = advances ? currentLevel + 1 : currentLevel;
      const intervalDays = correct ? [0, 1, 3, 7, 21][nextLevel] ?? 21 : 0;
      const old = next[observedConceptId] ?? { correct: 0, total: 0, lastAt: now };
      const nextDueAt = stageMatches
        ? new Date(currentTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
        : (currentLevel === 3 ? effectiveDueAtForAttempt(old) : old.dueAt);
      const evidence = [...(old.evidence ?? []), { problemId: problem.id, kind: problem.kind, delayed: problem.id.endsWith("-delayed"), correct, answeredAt: now, source: "observed" as const }].slice(-60);
      next[observedConceptId] = {
        correct: old.correct + (correct ? 1 : 0),
        total: old.total + 1,
        lastAt: now,
        dueAt: nextDueAt,
        streak: correct ? (old.streak ?? 0) + 1 : 0,
        lastErrorCause: correct ? old.lastErrorCause : undefined,
        retry: undefined,
        evidence,
      };
      return next;
    });
    if (correct && currentLevel < 4 && stageMatches) {
      setMastery((previous) => {
        const next = { ...previous };
        const level = next[observedConceptId] ?? 0;
        if (level === currentLevel) next[observedConceptId] = Math.min(4, level + 1);
        return next;
      });
    }
    recordStudyDay();
  }

  function recordStudyDay() {
    const today = dayKey();
    setStudyDates((previous) => previous.includes(today) ? previous : [...previous, today].slice(-180));
  }

  function submitPractice() {
    if (practiceAnswer === null || practiceFeedback) return;
    const correct = practiceAnswer === currentPractice.answer;
    setPracticeFeedback({ correct, explanation: currentPractice.explanation });
    setPracticeErrorCause(null);
    if (correct) setPracticeReviewCause(null);
    recordAttempt(currentPractice, correct);
  }

  function selectErrorCause(cause: ErrorCause) {
    if (!practiceFeedback || practiceFeedback.correct) return;
    const conceptId = practiceConceptIdFor(currentPractice);
    const scheduledAt = new Date(currentTime() + retryDelayHours(cause) * 60 * 60 * 1000).toISOString();
    setPracticeErrorCause(cause);
    setAttempts((previous) => {
      const current = previous[conceptId] ?? { correct: 0, total: 0, lastAt: scheduledAt };
      const delayedDueAt = (mastery[conceptId] ?? 0) === 3 ? effectiveDueAtForAttempt(current) : undefined;
      const preserveDelayedSchedule = Boolean(delayedDueAt && Date.parse(delayedDueAt) > currentTime());
      return {
        ...previous,
        [conceptId]: {
          ...current,
          lastErrorCause: cause,
          dueAt: preserveDelayedSchedule ? delayedDueAt : scheduledAt,
          retry: { cause, problemId: currentPractice.id, scheduledAt },
        },
      };
    });
    setErrorHistory((previous) => appendErrorRecord(previous, conceptId, { problemId: currentPractice.id, cause, at: new Date().toISOString() }));
    retryFromError(cause);
  }

  function retryFromError(causeOverride?: ErrorCause) {
    const cause = causeOverride ?? practiceErrorCause;
    if (!cause) return;
    const conceptId = practiceConceptIdFor(currentPractice);
    const repairKind: Problem["kind"] = cause === "concept_gap" ? "quick" : cause === "procedure" ? "standard" : cause === "misread" ? "transfer" : currentPractice.kind;
    const staged = stagedProblemsByConcept.get(conceptId) ?? {};
    const candidates = [...(staged[repairKind] ?? []), ...(staged.quick ?? []), ...(staged.standard ?? []), ...(staged.transfer ?? [])]
      .filter((problem) => problem.id !== currentPractice.id && !problem.id.endsWith("-delayed"))
      .filter((problem, index, all) => all.findIndex((candidate) => candidate.id === problem.id) === index);
    const alternative = candidates[0] ?? currentPractice;
    setPracticeResumeActive(true);
    setSelectedConceptId(conceptId);
    setPracticeProblemId(alternative.id);
    setPracticePhase("lesson");
    setLessonStep("overview");
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeReviewCause(cause);
    setPracticeErrorCause(null);
  }

  function nextPractice() {
    const now = currentTime();
    const currentConcept = conceptById.get(selectedConceptId);
    const candidates = studyRouteConcepts.filter((concept) => isUnlocked(concept) && hasPractice(concept.id));
    const dueConcept = candidates.filter((concept) => {
      const dueAt = dueAtForConcept(concept.id);
      return Boolean(dueAt && Date.parse(dueAt) <= now);
    }).sort((a, b) => (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999))[0];
    const currentCandidate = currentConcept && isUnlocked(currentConcept) && hasPractice(currentConcept.id) ? currentConcept : undefined;
    const currentLevel = currentCandidate ? mastery[currentCandidate.id] ?? 0 : 4;
    const currentDueAt = currentCandidate ? dueAtForConcept(currentCandidate.id) : undefined;
    const currentDue = Boolean(currentDueAt && Date.parse(currentDueAt) <= now);
    const canContinueCurrent = Boolean(currentCandidate && (currentLevel < 3 || (currentLevel === 3 && currentDue)));
    const eligibleCandidates = candidates.filter((concept) => {
      const level = mastery[concept.id] ?? 0;
      const dueAt = dueAtForConcept(concept.id);
      const due = Boolean(dueAt && Date.parse(dueAt) <= now);
      return level < 3 || (level === 3 && due);
    }).sort((a, b) => (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999));
    const nextConceptCandidate = dueConcept
      ?? (canContinueCurrent ? currentCandidate : eligibleCandidates[0] ?? currentCandidate ?? candidates[0]);
    const nextLevel = nextConceptCandidate ? mastery[nextConceptCandidate.id] ?? 0 : 0;
    const nextDueAt = nextConceptCandidate ? dueAtForConcept(nextConceptCandidate.id) : undefined;
    const delayed = Boolean(nextLevel === 3 && nextDueAt && Date.parse(nextDueAt) <= now);
    const next = (nextConceptCandidate && (delayed ? delayedProblemForConcept(nextConceptCandidate.id, { problemsByConcept, stagedProblemsByConcept }) : problemForConcept(nextConceptCandidate.id, nextLevel === 3 ? 2 : nextLevel, { firstByConcept: problemByConcept, problemsByConcept, stagedProblemsByConcept }))) ?? currentPractice;
    setPracticeProblemId(next.id);
    setPracticeResumeActive(true);
    setPracticePhase("lesson");
    setLessonStep("overview");
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeErrorCause(null);
    setPracticeReviewCause(null);
    const firstConcept = conceptById.get(primaryConceptIdFor(next));
    if (firstConcept) setSelectedConceptId(firstConcept.id);
  }

  function continueToNextPractice() {
    nextPractice();
    setSessionSummary(null);
    setActiveTab("practice");
  }

  function beginFocus() {
    const seconds = focusTotalSeconds;
    const startedAtMs = Date.now();
    const session = startStudySession({ id: `focus-${startedAtMs}`, startedAtMs });
    setSessionStartAttempts(totalAttempts);
    setSessionStartRoute(routeTouchedCount);
    setSessionEvidence(null);
    setSessionSummary(null);
    setFocusTotalSeconds(seconds);
    setFocusSeconds(0);
    setFocusRunning(true);
    focusAutoStopRef.current = session.id;
    studySessionRef.current = session;
    setStudySession(session);
    writeStored(storageKeys.studySession, JSON.stringify({
      session,
      focusTotalSeconds: seconds,
      sessionStartAttempts: totalAttempts,
      sessionStartRoute: routeTouchedCount,
    } satisfies StoredStudySessionEnvelope));
    setFocusOpen(false);
  }

  function completeFocusSession(completedAtMs: number) {
    const current = studySessionRef.current;
    if (current) {
      const completed = stopStudySession(current, completedAtMs);
      setStudySeconds((previous) => previous + completed.studySeconds);
      setAwaySeconds((previous) => previous + completed.awaySeconds);
      setSessionSummary(completed);
      setSessionEvidence({ questions: Math.max(0, totalAttempts - sessionStartAttempts), routeStart: sessionStartRoute, routeEnd: routeTouchedCount });
      studySessionRef.current = null;
      setStudySession(null);
      removeStored(storageKeys.studySession);
    }
    recordStudyDay();
  }

  useEffect(() => {
    completeFocusSessionRef.current = completeFocusSession;
  });

  function stopFocus() {
    focusAutoStopRef.current = null;
    completeFocusSession(currentTime());
    setFocusRunning(false);
    setFocusSeconds(0);
    setFocusOpen(false);
    removeStored(storageKeys.focus);
  }

  function markGuideRead(concept: Concept) {
    if (!conceptGuides[concept.id] && !lessonByConcept.has(concept.id)) return;
    setGuideSeen((previous) => previous[concept.id] ? previous : { ...previous, [concept.id]: true });
    recordStudyDay();
  }

  function openTarget() {
    if (practiceResumeActive && problemBank.some((problem) => problem.id === practiceProblemId)) {
      setActiveTab("practice");
      return;
    }
    const problem = problemByConcept.get(nextConcept.id);
    if (problem) openPracticeFor(nextConcept);
    else {
      setSelectedConceptId(nextConcept.id);
      setExpandedConceptId(nextConcept.id);
      setMapSearch(nextConcept.id);
      setActiveTab("map");
    }
  }

  function startNoise() {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const node = context.createScriptProcessor(4096, 1, 1);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      node.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        for (let index = 0; index < output.length; index += 1) {
          const white = Math.random() * 2 - 1;
          // A compact 7-pole filter approximation of a pink-noise spectrum.
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          output[index] = Math.max(-1, Math.min(1, pink * 0.055));
        }
      };
      node.connect(context.destination);
      void context.resume();
      audioRef.current = { context, node };
      setNoiseOn(true);
      writeStored(storageKeys.noise, "on");
    } catch {
      const current = audioRef.current;
      if (current) {
        current.node.disconnect();
        void current.context.close();
        audioRef.current = null;
      }
      setNoiseOn(false);
    }
  }

  function stopNoise() {
    const current = audioRef.current;
    if (current) {
      current.node.disconnect();
      void current.context.close();
      audioRef.current = null;
    }
    setNoiseOn(false);
    writeStored(storageKeys.noise, "off");
  }

  function toggleNoise() {
    if (noiseOn) stopNoise();
    else startNoise();
  }

  function chooseExamForm(formId: string) {
    const form = examFormById.get(formId);
    if (!form || examSession?.active) return;
    setExamFormId(form.id);
    if (form.paper === "math2bc") setSelectedOptionalSectionIds(form.optionalSectionIds.slice(0, 3));
    else setSelectedOptionalSectionIds([]);
  }

  function chooseExamPaper(paper: ExamForm["paper"]) {
    if (examSession?.active) return;
    const firstForm = examForms.find((form) => form.paper === paper);
    if (firstForm) chooseExamForm(firstForm.id);
  }

  function toggleOptionalSection(sectionId: string) {
    if (examSession?.active) return;
    setSelectedOptionalSectionIds((previous) => {
      if (previous.includes(sectionId)) return previous.filter((id) => id !== sectionId);
      if (previous.length >= 3) return previous;
      return [...previous, sectionId];
    });
  }

  function startExam(formId = examFormId) {
    const form = examFormById.get(formId);
    if (!form) return;
    const selected = form.paper === "math2bc" ? selectedOptionalSectionIds : [];
    const session = createExamSession(form, new Date(), selected);
    setExamFormId(form.id);
    setExamSession(session);
    setExamNow(Date.parse(session.startedAt));
    setActiveTab("mock");
    recordStudyDay();
  }

  function updateExamAnswer(answer: number) {
    if (!examSession?.active || !currentExamQuestion) return;
    if (isExamExpired(examSession, new Date())) {
      finishExam(true);
      return;
    }
    setExamSession((previous) => {
      if (!previous) return previous;
      const answers = { ...previous.answers, [currentExamQuestion.id]: answer };
      currentExamQuestions.forEach((question, index) => {
        if (question.sectionId === currentExamQuestion.sectionId && index > currentExamIndex) delete answers[question.id];
      });
      return { ...previous, answers };
    });
  }

  function moveExamQuestion(delta: number) {
    if (!examSession?.active) return;
    setExamSession((previous) => previous ? { ...previous, index: Math.min(currentExamQuestions.length - 1, Math.max(0, previous.index + delta)) } : previous);
  }

  function finishExam(timedOut = false, submittedAtOverride?: string) {
    const session = examSession;
    if (!session?.active) return;
    const form = examFormById.get(session.formId);
    if (!form) return;
    const expired = isExamExpired(session, new Date());
    const isTimedOut = timedOut || expired;
    const submittedAt = isTimedOut ? (submittedAtOverride ?? session.deadlineAt) : new Date().toISOString();
    const result = { ...scoreExam(form, session.answers, session.selectedOptionalSectionIds, session.startedAt, submittedAt, isTimedOut), firstSubmission: !examHistory.some((entry) => entry.formId === session.formId) };
    setExamHistory((previous) => previous.some((entry) => entry.formId === result.formId && entry.startedAt === result.startedAt)
      ? previous
      : [...previous, result].slice(-30));
    setExamSession((previous) => previous?.active && previous.startedAt === session.startedAt
      ? { ...previous, active: false, finished: true, submittedAt }
      : previous);
    recordStudyDay();
  }

  function skipFoundation() {
    const mergedMastery = { ...mastery };
    const initialPractice: PracticeResumeState = { active: true, conceptId: "I-01", problemId: "Q-I01-01", phase: "lesson", lessonStep: "overview", answer: null, feedback: null, errorCause: null, reviewCause: null };
    setFoundationSkipped(true);
    writeStored(storageKeys.foundationSkipped, "true");
    setMastery(mergedMastery);
    void saveProgress({ mastery: mergedMastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen, practice: initialPractice, errorHistory, foundationSkipped: true });
    setSelectedConceptId("I-01");
    setPracticeProblemId("Q-I01-01");
    setPracticePhase("lesson");
    setLessonStep("overview");
    setPracticeResumeActive(true);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeErrorCause(null);
    setPracticeReviewCause(null);
    setActiveTab("practice");
    writeStored(storageKeys.initialized, "true");
    setSetupOpen(false);
  }

  function startDiagnostic() {
    setFoundationSkipped(false);
    removeStored(storageKeys.foundationSkipped);
    writeStored(storageKeys.initialized, "true");
    setSetupOpen(false);
    setSelectedConceptId("F-01");
    setPracticeProblemId("Q-F01-01");
    setPracticePhase("lesson");
    setLessonStep("overview");
    setPracticeResumeActive(true);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeErrorCause(null);
    setPracticeReviewCause(null);
    setActiveTab("practice");
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), mastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen, practice: currentPracticeResume(), errorHistory, examSession, examHistory, foundationSkipped, curriculum: "high_school_math_concepts.v1" };
    const fileName = "kyote-math-60-progress.json";
    const content = JSON.stringify(payload, null, 2);
    const file = new File([content], fileName, { type: "application/json" });
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone && navigator.share && navigator.canShare?.({ files: [file] })) {
      void navigator.share({ files: [file], title: "共テ数学60の学習記録" }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        downloadData(content, fileName);
      });
      return;
    }
    downloadData(content, fileName);
  }

  function downloadData(content: string, fileName: string) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = normalizeImportedProgress(JSON.parse(await file.text()) as unknown);
      if (!imported) {
        window.alert("このJSONには利用できる学習記録がありません。");
        return;
      }
      setMastery(imported.mastery);
      setAttempts(imported.attempts);
      setStudyDates(imported.studyDates);
      setStudySeconds(imported.studySeconds);
      setAwaySeconds(imported.awaySeconds);
      setGuideSeen(imported.guideSeen);
      setErrorHistory(normalizeErrorHistoryForContent(imported.errorHistory));
      const importedExam = normalizeExamSession(imported.examSession, Date.now());
      const usableExam = importedExam && examFormById.has(importedExam.formId) ? importedExam : null;
      setExamSession(usableExam);
      setExamHistory(normalizeExamHistory(imported.examHistory).filter((result) => examFormById.has(result.formId)));
      if (usableExam) {
        setExamFormId(usableExam.formId);
        setSelectedOptionalSectionIds(usableExam.selectedOptionalSectionIds);
        setActiveTab("mock");
      }
      const importedFoundationSkipped = imported.foundationSkipped === true;
      const importedPractice = sanitizePracticeResume(normalizePracticeForContent(imported.practice), imported.attempts, imported.mastery, importedFoundationSkipped);
      setFoundationSkipped(importedFoundationSkipped);
      if (importedFoundationSkipped) writeStored(storageKeys.foundationSkipped, "true");
      else removeStored(storageKeys.foundationSkipped);
      if (importedPractice?.active) {
        setPracticeResumeActive(true);
        setSelectedConceptId(importedPractice.conceptId);
        setPracticeProblemId(importedPractice.problemId);
        setPracticePhase(importedPractice.phase);
        setLessonStep(importedPractice.lessonStep);
        setPracticeAnswer(importedPractice.answer);
        setPracticeFeedback(importedPractice.feedback);
        setPracticeErrorCause(importedPractice.errorCause);
        setPracticeReviewCause(importedPractice.reviewCause);
      } else {
        setPracticeResumeActive(false);
        setPracticePhase("lesson");
        setLessonStep("overview");
        setPracticeProblemId("");
        setPracticeAnswer(null);
        setPracticeFeedback(null);
        setPracticeErrorCause(null);
        setPracticeReviewCause(null);
      }
      if (!usableExam && importedPractice?.active) setActiveTab("practice");
      await saveProgress(imported);
      writeStored(storageKeys.initialized, "true");
      setSetupOpen(false);
      window.alert("学習記録を読み込みました。");
    } catch {
      window.alert("JSONを読み込めませんでした。エクスポートしたファイルを選んでください。");
    }
  }

  function resetData() {
    if (!window.confirm("学習記録をすべて消去します。元に戻せません。")) return;
    void clearProgress();
    removeStored("kyote-math-60:mock");
    removeStored(storageKeys.initialized);
    removeStored(storageKeys.focus);
    removeStored(storageKeys.studySession);
    removeStored(storageKeys.foundationSkipped);
    setFoundationSkipped(false);
    setMastery({});
    setAttempts({});
    setStudyDates([]);
    setStudySeconds(0);
    setAwaySeconds(0);
    setGuideSeen({});
    setErrorHistory({});
    setPracticeResumeActive(false);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setPracticeErrorCause(null);
    setPracticeReviewCause(null);
    setSessionSummary(null);
    setSessionEvidence(null);
    studySessionRef.current = null;
    setStudySession(null);
    setFocusRunning(false);
    setFocusSeconds(0);
    setExamSession(null);
    setExamHistory([]);
    setExamFormId("IA-F1");
    setSelectedOptionalSectionIds(["IIBC-02", "IIBC-03", "IIBC-04"]);
    setPracticePhase("lesson");
    setLessonStep("overview");
    setExpandedConceptId(null);
    stopNoise();
    setSetupOpen(true);
    setActiveTab("today");
  }

  function renderToday() {
    const target = nextConcept;
    return (
      <div className="page-stack">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow accent">NEXT BEST ACTION</p>
            <h2>{routeProgress >= 100 ? "共テルート100%。定着へ。" : "今日は、次の1概念だけ。"}</h2>
            <p className="hero-description">{routeProgress >= 100 ? "一度通った道は消えません。復習とミニ模試で、解ける状態を保とう。" : "0→100%の順路から、いまの次の1概念だけを表示。間違えても、触れた証拠は残ります。"}</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={openTarget}>{practiceResumeActive ? "続きから再開" : targetProblem ? "次の1概念を始める" : "解説から進む"} <span>→</span></button>
              <button className="button button-ghost" onClick={() => setFocusOpen(true)}>集中タイマー</button>
            </div>
          </div>
          <div className="coverage-orb" style={{ background: `conic-gradient(var(--lime) ${routeProgress}%, var(--line) 0)` }}>
            <div className="orb-inner"><strong>{routeProgress}%</strong><span>ルート進捗</span></div>
          </div>
          <div className="hero-meta"><span>{targetDue ? "復習期限" : routeProgress >= 100 ? "定着フェーズ" : "次のルート"}</span><strong>{courseLabels[target.course]} / {target.id}</strong><small>{target.unit}</small></div>
        </section>

        <section className="target-card panel-card">
          <div className="target-index">01</div>
          <div className="target-content">
            <p className="eyebrow">TODAY&apos;S CONCEPT</p>
            <h3>{target.title}</h3>
            <p>{target.target}</p>
            <div className="tag-row"><span className="tag">{courseLabels[target.course]}</span><span className="tag">{target.priority === "core" ? "共テの幹線" : "補助レーン"}</span>{target.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="target-side"><span>{targetDue ? "復習" : targetProblem ? "問題" : "ガイド"}</span><strong>{targetProblem?.estimatedSeconds ? `${Math.ceil(targetProblem.estimatedSeconds / 60)}分` : "1分"}</strong><button className="text-button" type="button" onClick={() => { setSelectedConceptId(target.id); setMapSearch(target.id); setActiveTab("map"); }}>マップで見る →</button></div>
        </section>

        <div className="section-heading"><div><p className="eyebrow">YOUR SIGNALS</p><h3>学習の現在地</h3></div><span className="quiet-label">端末内に保存</span></div>
        <section className="metric-grid">
          <article className="metric-card"><span className="metric-label">共テルート</span><strong>{routeProgress}<small>%</small></strong><div className="mini-bar" role="progressbar" aria-label="共テ学習ルート" aria-valuemin={0} aria-valuemax={100} aria-valuenow={routeProgress}><i style={{ width: `${routeProgress}%` }} /></div><p>{routeTouchedCount} / {commonTestConcepts.length}概念に触れた</p></article>
          <article className="metric-card"><span className="metric-label">学習貯金</span><strong>{formatStudyAmount(liveStudySeconds)}<small> / 700h</small></strong><div className="mini-bar" role="progressbar" aria-label="700時間トラック" aria-valuemin={0} aria-valuemax={100} aria-valuenow={studyProgress.percent}><i style={{ width: `${Math.min(100, studyProgress.percent)}%` }} /></div><p>{liveAwaySeconds ? `${formatTime(liveAwaySeconds)} はスマホを置いた` : "タイマーで証拠を残そう"}</p></article>
          <article className="metric-card"><span className="metric-label">習得確認</span><strong>{learnedCount}<small> / {commonTestConcepts.length}</small></strong><div className="mini-bar" role="progressbar" aria-label="遅延再テストまでの習得確認" aria-valuemin={0} aria-valuemax={100} aria-valuenow={(learnedCount / commonTestConcepts.length) * 100}><i style={{ width: `${(learnedCount / commonTestConcepts.length) * 100}%` }} /></div><p>{availableConceptCount}概念に演習あり</p></article>
          <article className="metric-card"><span className="metric-label">累計の証拠</span><strong>{totalAttempts}<small>問</small></strong><div className="streak-dots">{[0, 1, 2, 3, 4, 5, 6].map((day) => <i className={day < streak ? "active" : ""} key={day} />)}</div><p>{totalAttempts ? `${totalCorrect}問正解・${studyDates.length}日記録` : "最初の1問で記録"}</p></article>
        </section>

        <section className="study-progress-card panel-card">
          <div className="study-progress-heading"><div><p className="eyebrow accent">YOUR 700-HOUR TRACK</p><h3>「勉強した感」を、積み上げで見える化</h3><p>集中タイマーの正味時間だけを記録。画面を閉じた時間は水増ししない。</p></div><strong>{studyProgress.percent.toFixed(studyProgress.percent < 10 ? 1 : 0)}<small>%</small></strong></div>
          <div className="study-progress-bar" role="progressbar" aria-label={`700時間中${studyProgress.studiedHours.toFixed(1)}時間、${studyProgress.percent.toFixed(1)}パーセント`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={studyProgress.percent}><i style={{ width: `${studyProgress.percent}%` }} /></div>
          <div className="study-progress-foot"><span>{formatStudyAmount(liveStudySeconds)} / 700時間</span><span>{milestoneRemainingSeconds ? `次の節目まで ${formatTime(milestoneRemainingSeconds)}` : "700時間の節目を達成"}</span></div>
        </section>

        <section className="focus-strip panel-card"><div><p className="eyebrow accent">{focusRunning ? "LEARNING NOW" : "FOCUS MODE"}</p><h3>{focusRunning ? `計測中 ${formatTime(focusSeconds)}` : "短く集中して、記録を残す"}</h3><p>{focusRunning ? "画面を閉じても復帰できます。選んだ時間で自動終了し、途中でSTOPもできます。" : "3・10・20分から選んでSTART。時間が来ると自動終了し、学習時間とスマホを置いた時間が残ります。"}</p></div><button className="button button-secondary" onClick={() => setFocusOpen(true)}>{focusRunning ? "タイマーを見る" : "START"} <span>↗</span></button></section>
      </div>
    );
  }

  function renderMap() {
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">CONCEPT MAP</p><h2>320概念の依存グラフ</h2><p>橋渡しから数学IIIまで320概念を前提順に進む。1概念ずつ、戻らない。</p></div><div className="map-count"><strong>{routeProgress}%</strong><span>{routeTouchedCount} / {commonTestConcepts.length}概念に触れた</span></div></div>
        <section className="map-toolbar panel-card"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="概念名・ID・タグで検索" value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="概念名・ID・タグで検索" /></label><div className="filter-row">{(["all", "bridge", "I", "A", "II", "B", "C", "III"] as CourseFilter[]).map((course) => <button key={course} className={`filter-chip ${mapCourse === course ? "selected" : ""}`} aria-pressed={mapCourse === course} onClick={() => setMapCourse(course)}>{course === "all" ? "すべて" : courseLabels[course]}</button>)}</div></section>
        <section className="concept-list">
          {filteredConcepts.map((concept) => {
            const level = mastery[concept.id] ?? 0;
            const unlocked = isUnlocked(concept);
            const available = hasPractice(concept.id);
            const problemCount = problemsByConcept.get(concept.id)?.length ?? 0;
            const guide = conceptGuides[concept.id];
            const expanded = expandedConceptId === concept.id;
            return (
              <div className={`concept-item ${expanded ? "expanded" : ""} ${!unlocked ? "locked" : ""}`} key={concept.id}>
                <button className="concept-row-main" type="button" aria-expanded={expanded} onClick={() => { setSelectedConceptId(concept.id); setExpandedConceptId(expanded ? null : concept.id); }}>
                  <span className="concept-id">{concept.id}</span><span className="concept-name">{concept.title}</span><span className="concept-course">{courseLabels[concept.course]}</span><span className="mastery-dots" aria-label={`レベル${level} / 4`}>{[0, 1, 2, 3].map((dot) => <i className={dot < level ? "filled" : ""} key={dot} />)}</span><span className={`state-label ${unlocked ? "ready" : "locked-label"}`}>{unlocked ? levelLabel(level) : "前提待ち"}</span><span className="chevron">{expanded ? "−" : "+"}</span>
                </button>
                {expanded && <div className="concept-detail"><div><p>{concept.target}</p>{guide && <div className="concept-guide"><p><strong>意味</strong>{guide.definition}</p><p><strong>一手</strong>{guide.firstMove}</p><p><strong>罠</strong>{guide.trap}</p></div>}<div className="tag-row">{concept.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>{concept.requires.length > 0 && <small>前提：{concept.requires.map((id) => conceptById.get(id)?.title ?? id).join(" / ")}</small>}<small>この概念の問題：{problemCount}問</small></div><div className="concept-detail-actions">{guide && <button className="button button-ghost button-small" type="button" onClick={() => markGuideRead(concept)}>{guideSeen[concept.id] ? "ガイド済み" : "解説を読んだ"}</button>}<button className="button button-small" type="button" disabled={!unlocked || !available} onClick={() => openPracticeFor(concept)}>{!unlocked ? "前提を先に" : available ? "この概念を練習" : "問題準備中"} <span>→</span></button></div></div>}
              </div>
            );
          })}
          {filteredConcepts.length === 0 && <div className="empty-state panel-card">該当する概念がありません。検索語を変えてみよう。</div>}
        </section>
      </div>
    );
  }

  function renderPractice() {
    if (practicePhase === "lesson") return renderLesson();
    const selectedOption = practiceAnswer !== null ? currentPractice.options[practiceAnswer] : null;
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">PRACTICE LOOP</p><h2>1問で、理解を更新する</h2><p>答えだけでなく、どの概念を使ったかを記録する。</p></div><span className="mode-badge">{currentPractice.kind === "quick" ? "QUICK CHECK" : currentPractice.kind === "transfer" ? "TRANSFER" : "STANDARD"}</span></div>
        <div className="practice-layout">
          <section className="question-card panel-card">
            <div className="question-top"><span>{currentPractice.id}</span><span>目安 {currentPractice.estimatedSeconds}秒</span></div>
            <h3>{currentPractice.title}</h3>
            <p className="question-prompt">{currentPractice.prompt}</p>
            <div className="option-list">
              {currentPractice.options.map((option, index) => <button className={["option-button", practiceAnswer === index ? "chosen" : "", practiceFeedback && index === currentPractice.answer ? "correct-option" : "", practiceFeedback && practiceAnswer === index && index !== currentPractice.answer ? "wrong-option" : ""].filter(Boolean).join(" ")} type="button" aria-pressed={practiceAnswer === index} key={option} onClick={() => !practiceFeedback && setPracticeAnswer(index)}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span>{practiceFeedback && index === currentPractice.answer && <span className="answer-mark">✓</span>}</button>)}
            </div>
            <div className="question-actions">
              {practiceFeedback
                ? practiceFeedback.correct
                  ? <button className="button button-primary" type="button" onClick={nextPractice}>次の1問へ <span>→</span></button>
                  : <span className="selected-note">原因を1つ選ぶと、次の一手が出ます。</span>
                : <button className="button button-primary" type="button" disabled={practiceAnswer === null} onClick={submitPractice}>答えを記録する <span>↗</span></button>}
              {selectedOption && !practiceFeedback && <span className="selected-note">選択：{selectedOption}</span>}
            </div>
            {practiceFeedback && <div className={["feedback-box", practiceFeedback.correct ? "success" : "retry"].join(" ")} aria-live="polite">
              <strong>{practiceFeedback.correct ? "正解。概念レベルを更新した。" : "まず、どこで止まったかを1つだけ選ぼう。"}</strong>
              <p>{practiceFeedback.explanation}</p>
              {!practiceFeedback.correct && <div className="error-cause-picker">
                <strong>今回の原因</strong>
                <div className="error-cause-list">
                  {ERROR_CAUSE_OPTIONS.map((option) => <button className={["cause-button", practiceErrorCause === option.id ? "selected" : ""].filter(Boolean).join(" ")} type="button" key={option.id} onClick={() => selectErrorCause(option.id)}><span>{option.label}</span><small>{option.description}</small></button>)}
                </div>
                <div className="feedback-actions"><span className="selected-note">原因を選ぶと、すぐに別表現の1問へ進みます。</span><button className="text-button" type="button" onClick={() => setPracticeAnswer(currentPractice.answer)}>正答を表示</button></div>
              </div>}
            </div>}
          </section>
          <aside className="side-stack">
            <section className="concept-side panel-card"><p className="eyebrow">LINKED CONCEPT</p><span className="side-id">{selectedConcept.id}</span><h3>{selectedConcept.title}</h3><p>{selectedConcept.target}</p><div className="side-level"><span>現在地</span><strong>Lv.{selectedLevel}</strong><small>{levelLabel(selectedLevel)}</small></div><button className="text-button" type="button" onClick={() => { setActiveTab("map"); setMapSearch(selectedConcept.id); }}>マップで確認 →</button></section>
            {selectedGuide && <section className="guide-card panel-card"><div className="guide-heading"><div><p className="eyebrow accent">1-MINUTE GUIDE</p><h3>解く前の3行</h3></div><span>{guideSeen[selectedConcept.id] ? "読了" : "読む"}</span></div><dl><div><dt>意味</dt><dd>{selectedGuide.definition}</dd></div><div><dt>最初の一手</dt><dd>{selectedGuide.firstMove}</dd></div><div><dt>罠</dt><dd>{selectedGuide.trap}</dd></div></dl><button className="button button-ghost button-small" type="button" onClick={() => markGuideRead(selectedConcept)}>{guideSeen[selectedConcept.id] ? "ガイド済み" : "解説を読んだ"} <span>✓</span></button></section>}
            <section className="tip-card"><span className="tip-icon">✦</span><div><strong>共テのコツ</strong><p>正答後に「なぜその式になるか」を一文で言えたら、次の概念へ進もう。</p></div></section>
          </aside>
        </div>
      </div>
    );
  }

  function renderLesson() {
    const guide = selectedGuide;
    const lesson = selectedLesson;
    const prerequisiteIds = lesson?.prerequisiteIds ?? selectedConcept.requires;
    const prerequisiteNames = prerequisiteIds.map((id) => conceptById.get(id)?.title ?? id);
    const reviewOption = practiceReviewCause ? ERROR_CAUSE_OPTIONS.find((option) => option.id === practiceReviewCause) : undefined;
    return (
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <p className="eyebrow accent">LESSON FIRST</p>
            <h2>いきなり解かない。まず理解する。</h2>
            <p>このページを読んでから、最後に確認問題を1問だけ解く。外部教材は前提にしない。</p>
          </div>
          <span className="mode-badge">{courseLabels[selectedConcept.course]} / {selectedConcept.id}</span>
        </div>
        <section className="lesson-hero panel-card">
          <div>
            <p className="eyebrow">TODAY&apos;S CONCEPT</p>
            <h3>{selectedConcept.title}</h3>
            <p>{selectedConcept.target}</p>
            <div className="tag-row"><span className="tag">{selectedConcept.unit}</span><span className="tag">{selectedConcept.priority === "core" ? "共テの幹線" : "補助レーン"}</span>{selectedConcept.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="lesson-time"><strong>{currentPractice.estimatedSeconds < 60 ? "3" : "5"}</strong><span>分で読む</span></div>
        </section>
        {reviewOption && <section className="review-route panel-card"><p className="eyebrow accent">CAUSE-SPECIFIC REVIEW</p><h3>{reviewOption.label}を1問だけやり直す</h3><p>{reviewOption.description}。前回の問題とは別の表現で、同じ概念をもう一度確認します。</p></section>}
        {lessonStep === "overview" ? <>
          {guide ? (
            <section className="lesson-grid">
              <article className="lesson-block panel-card"><span className="lesson-number">01</span><p className="eyebrow accent">CORE IDEA</p><h3>これは何？</h3><p>{guide.definition}</p></article>
              <article className="lesson-block panel-card"><span className="lesson-number">02</span><p className="eyebrow accent">FIRST MOVE</p><h3>問題を見たら最初にすること</h3><p>{guide.firstMove}</p></article>
              <article className="lesson-block panel-card warning"><span className="lesson-number">03</span><p className="eyebrow">COMMON TRAP</p><h3>ここで失点しやすい</h3><p>{guide.trap}</p></article>
            </section>
          ) : (
            <section className="lesson-block panel-card"><p className="eyebrow accent">CONCEPT TARGET</p><h3>この概念でできるようになること</h3><p>{selectedConcept.target}</p></section>
          )}
          {lesson && <details className="lesson-more panel-card">
            <summary>詳しい説明を読む（必要なら）</summary>
            <div className="lesson-detail-grid">
              <article className="lesson-detail"><p className="eyebrow accent">LESSON GOAL</p><h3>今日できるようになること</h3><p className="lesson-prose">{lesson.goal}</p><div className="lesson-why"><strong>なぜ必要？</strong><p>{lesson.whyItMatters}</p></div></article>
              <article className="lesson-detail"><p className="eyebrow accent">HOW TO THINK</p><h3>公式を使う前の考え方</h3><p className="lesson-prose">{lesson.explanation}</p></article>
            </div>
          </details>}
          <section className="lesson-next panel-card"><div><p className="eyebrow accent">STEP 1 / 2</p><h3>意味がつながったら、例題へ</h3><p>ここまでの内容を保存しました。次に開いたときもこの位置から続けられます。</p></div><button className="button button-primary" type="button" onClick={() => setLessonStep("worked")}>例題を見る <span>→</span></button></section>
        </> : <>
          {lesson && <>
            <section className="lesson-example panel-card"><div className="lesson-section-heading"><div><p className="eyebrow accent">WORKED EXAMPLE</p><h3>途中式を見ながら解く</h3></div><span>例題</span></div><p className="lesson-problem">{lesson.workedExample.problem}</p><ol className="lesson-steps">{lesson.workedExample.steps.map((step, index) => <li key={`${lesson.id}-step-${index}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol><div className="lesson-answer"><strong>答え</strong><span>{lesson.workedExample.answer}</span></div></section>
            <section className="lesson-detail-grid"><article className="lesson-detail panel-card warning"><p className="eyebrow">COMMON MISTAKES</p><h3>よくある失敗</h3><ul className="lesson-list">{lesson.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></article><article className="lesson-detail panel-card"><p className="eyebrow accent">EXAM SIGNAL</p><h3>共テでこの型を見抜くサイン</h3><p className="lesson-prose">{lesson.examSignal}</p></article></section>
          </>}
          <section className="lesson-next panel-card"><div><p className="eyebrow accent">STEP 2 / 2</p><h3>例題を見たら、確認問題へ</h3><p>答えを記録すると、quick・standard・transferのどの段階を通ったかが残ります。</p></div><button className="button button-primary" type="button" onClick={() => { markGuideRead(selectedConcept); setPracticePhase("question"); }}>確認問題を解く <span>→</span></button></section>
        </>}
        <section className="lesson-bridge panel-card">
          <div><p className="eyebrow">WHY THIS COMES NOW</p><h3>{prerequisiteNames.length > 0 ? "前提からつながっている" : "ここが出発点"}</h3><p>{prerequisiteNames.length > 0 ? `前提は ${prerequisiteNames.join(" / ")}。この概念は、それらを使って共テの問題文を式へ変換するための部品です。` : "ここで使う言葉と操作を先に固定してから、次の問題へ進みます。"}</p></div>
          <div className="lesson-rule"><strong>読む順番</strong><span>{lesson ? "目標 → 考え方 → 例題 → ミス → 確認問題" : "意味 → 最初の一手 → 罠 → 1問"}</span></div>
        </section>
      </div>
    );
  }

  function renderMock() {
    if (!examSession) {
      const selectedForm = examFormById.get(examFormId) ?? examForms[0];
      const isIibc = selectedForm.paper === "math2bc";
      const isMath3 = selectedForm.paper === "math3";
      const examPaperOptions: Array<{ paper: ExamForm["paper"]; label: string }> = [
        { paper: "math1a", label: "数学I・数学A" },
        { paper: "math2bc", label: "数学II・数学B・数学C" },
        { paper: "math3", label: "数学III" },
      ];
      const durationMinutes = Math.round(selectedForm.durationSeconds / 60);
      const paperLabel = selectedForm.paper === "math1a" ? "数学I・数学A" : selectedForm.paper === "math2bc" ? "数学II・数学B・数学C" : "数学III";
      return <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">{isMath3 ? "MATH III INTEGRATION" : "FULL EXAM MODE"}</p><h2>{isMath3 ? "数学IIIを横断して測る" : "本番と同じ時間で測る"}</h2><p>オリジナルの連続誘導フォーム。解説は提出後だけに表示し、練習の正答率とは別に記録します。</p></div><span className="mode-badge">{durationMinutes}分 / 100点</span></div>
        <section className="mock-intro panel-card"><div className="mock-number">{durationMinutes}</div><div><p className="eyebrow">{isMath3 ? "INTEGRATED MATH III TRACK" : "OFFICIAL FORMAT TARGET"}</p><h3>{paperLabel}</h3><p>制限時間{durationMinutes}分、満点100点。未解答は0点として記録し、時間切れならその時点で自動提出します。</p><div className="exam-paper-grid" role="group" aria-label="模試科目">{examPaperOptions.map((option) => <button className={`button ${selectedForm.paper === option.paper ? "button-primary" : "button-ghost"}`} type="button" aria-pressed={selectedForm.paper === option.paper} key={option.paper} onClick={() => chooseExamPaper(option.paper)}>{option.label}</button>)}</div><div className="exam-form-grid">{examForms.filter((form) => form.paper === selectedForm.paper).map((form) => <button className={`button ${examFormId === form.id ? "button-primary" : "button-ghost"}`} type="button" aria-pressed={examFormId === form.id} key={form.id} onClick={() => chooseExamForm(form.id)}>{form.title}</button>)}</div></div></section>
        {isIibc && <section className="exam-section-picker panel-card"><p className="eyebrow accent">SELECT 3 OF 4</p><h3>選択分野を3つ固定する</h3><p>開始後は変更できません。選んだ3分野だけが100点に含まれます。</p><div className="exam-option-grid">{selectedForm.optionalSectionIds.map((sectionId) => { const section = selectedForm.sections.find((candidate) => candidate.id === sectionId); const selected = selectedOptionalSectionIds.includes(sectionId); return <button className={`exam-option ${selected ? "selected" : ""}`} type="button" aria-pressed={selected} key={sectionId} onClick={() => toggleOptionalSection(sectionId)}><strong>{section?.title ?? sectionId}</strong><span>{selected ? "選択中" : "未選択"}</span></button>; })}</div><small>現在 {selectedOptionalSectionIds.length} / 3 分野</small></section>}
        <section className="mock-rules panel-card"><span>01　{durationMinutes}分を厳守</span><span>02　途中保存・再開</span><span>03　提出後に採点</span></section>
        <section className="g5-gate panel-card"><div className="section-heading"><div><p className="eyebrow accent">G5 EVIDENCE GATE</p><h3>未見6フォームの初回提出</h3></div><strong>{g5Evidence.observedCount} / 6</strong></div><p>IA-F1〜F3、IIBC-F1〜F3を各1回ずつ記録します。再受験で初回結果を上書きせず、60点・70分以内・時間切れなしを機械判定します。最終的なG5判定は実ユーザーの記録を監査して確定します。</p><div className="g5-grid">{g5Evidence.rows.map((row) => { const result = row.result; const status = row.status === "passed" ? "条件達成" : row.status === "failed" ? "条件未達" : "未提出"; return <div className={`g5-row ${row.status}`} key={row.formId}><strong>{row.formId}</strong><span>{result ? `${result.score}/100 · ${formatTime(result.elapsedSeconds)} · 未解答${result.unanswered.length}` : "初回提出なし"}</span><em>{status}</em>{row.reasons.length > 0 && <small>{row.reasons.join(" ")}</small>}</div>; })}</div></section>
        <button className="button button-primary wide" type="button" disabled={isIibc && selectedOptionalSectionIds.length !== 3} onClick={() => startExam(selectedForm.id)}>このフォームを開始 <span>→</span></button>
        {examHistory.length > 0 && <section className="exam-history panel-card"><p className="eyebrow">RECORDED RESULTS</p><h3>過去の提出</h3>{examHistory.slice().reverse().slice(0, 6).map((result) => <div className="exam-history-row" key={`${result.formId}-${result.submittedAt}`}><span>{result.formId}</span><strong>{result.score} / {result.totalPoints}</strong><span>{result.timedOut ? "時間切れ" : "提出"} · {result.unanswered.length}問未解答</span></div>)}</section>}
      </div>;
    }

    if (examSession.finished) {
      const result = latestExamResult;
      return <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">EXAM RESULT</p><h2>提出結果を確認する</h2><p>{currentExamForm.title}。この結果だけで合否や学習到達を断定せず、複数フォームの記録で振り返ります。</p></div><span className="mode-badge">{result?.timedOut ? "TIME OUT" : "SUBMITTED"}</span></div>
        {result ? <section className="result-card panel-card"><div className="result-score"><strong>{result.score}</strong><span>/ {result.totalPoints}点</span><small>{result.percentage}% · {formatTime(result.elapsedSeconds)} · 未解答 {result.unanswered.length}問</small></div><div className="result-message"><p className="eyebrow">POST-SUBMISSION REVIEW</p><h3>{result.percentage >= 60 ? "このフォームでは6割以上" : "次は失点の型を分解する"}</h3><p>{result.timedOut ? "時間切れ時点で提出しました。未解答を含め、時間配分も学習データとして残しています。" : "解説は提出後に初めて見られる設計です。セクションごとの点と未解答を次の復習に使います。"}</p><div className="exam-breakdown">{Object.entries(result.bySection).map(([sectionId, sectionResult]) => <span key={sectionId}>{sectionId} {sectionResult.score}/{sectionResult.points}（未解答{sectionResult.unanswered}）</span>)}</div><button className="button button-primary" type="button" onClick={() => { setExamSession(null); setActiveTab("mock"); }}>別フォームを選ぶ <span>→</span></button></div></section> : <section className="empty-state panel-card">この提出の採点履歴が見つかりません。別フォームを選んでください。</section>}
        {result && <section className="exam-review panel-card"><p className="eyebrow accent">QUESTION REVIEW</p><h3>設問別レビュー</h3><p>正答だけでなく、問題文の条件と解説の最初の一手を確認します。提出前には表示されません。</p>{currentExamQuestions.map((question) => { const answer = examSession.answers[question.id]; const correct = answer === question.answer; return <article className={`exam-review-item ${correct ? "correct" : "incorrect"}`} key={question.id}><div className="question-top"><span>{question.id} · {question.points}点</span><strong>{answer === undefined ? "未解答" : correct ? "正解" : "不正解"}</strong></div><h4>{question.title}</h4><p className="question-prompt">{question.prompt}</p><p><strong>正答：</strong>{question.options[question.answer]}　<strong>あなたの解答：</strong>{answer === undefined ? "なし" : question.options[answer] ?? "不正な解答"}</p><p className="review-explanation"><strong>解説：</strong>{question.explanation}</p></article>; })}</section>}
        {examHistory.length > 0 && <section className="exam-history panel-card"><p className="eyebrow">FORM HISTORY</p><h3>フォーム別の記録</h3>{examHistory.slice().reverse().map((entry) => <div className="exam-history-row" key={`${entry.formId}-${entry.submittedAt}`}><span>{entry.formId}</span><strong>{entry.score}/{entry.totalPoints}</strong><span>{entry.submittedAt.slice(0, 10)} · 未解答{entry.unanswered.length}</span></div>)}</section>}
      </div>;
    }

    if (!currentExamQuestion) return <section className="empty-state panel-card">このフォームの問題を準備できませんでした。別フォームを選んでください。</section>;
    const currentAnswer = examSession.answers[currentExamQuestion.id];
    const currentIndex = Math.min(examSession.index, currentExamQuestions.length - 1);
    return <div className="page-stack">
      <div className="mock-progress"><span>{currentExamForm.title}</span><strong aria-live="polite" aria-atomic="true">残り {formatTime(examRemainingSeconds)}</strong><span>{currentIndex + 1} / {currentExamQuestions.length}問</span></div>
      <section className="exam-context panel-card"><p className="eyebrow accent">{currentExamQuestion.sectionTitle}</p><h3>{currentExamQuestion.context}</h3>{currentExamQuestion.contextTable && <table><thead><tr>{currentExamQuestion.contextTable.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{currentExamQuestion.contextTable.rows.map((row, rowIndex) => <tr key={`${currentExamQuestion.id}-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${currentExamQuestion.id}-cell-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table>}<p className="exam-induction">{currentExamQuestion.induction}</p></section>
      <section className="question-card mock-question panel-card"><div className="question-top"><span>{currentExamQuestion.id}</span><span>{currentExamQuestion.points}点</span></div><h3>{currentExamQuestion.title}</h3><p className="question-prompt">{currentExamQuestion.prompt}</p><div className="option-list">{currentExamQuestion.options.map((option, index) => <button className={`option-button ${currentAnswer === index ? "chosen" : ""}`} type="button" aria-pressed={currentAnswer === index} key={`${currentExamQuestion.id}-${index}`} onClick={() => updateExamAnswer(index)}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</div><div className="question-actions"><button className="button button-ghost" type="button" disabled={currentIndex === 0} onClick={() => moveExamQuestion(-1)}>← 前へ</button><button className="button button-primary" type="button" onClick={() => currentIndex === currentExamQuestions.length - 1 ? finishExam(false) : moveExamQuestion(1)}>{currentIndex === currentExamQuestions.length - 1 ? "提出する" : "次の問題へ"} <span>→</span></button><span className="selected-note">解答済み {Object.keys(examSession.answers).length} / {currentExamQuestions.length}</span></div></section>
      <section className="exam-warning panel-card"><strong>提出前は解説を表示しません。</strong><span>途中で閉じても、このフォーム・選択・解答・現在位置は保存されます。未解答のまま進むこともできます。</span></section>
    </div>;
  }

  function renderSettings() {
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">SETTINGS</p><h2>自分のペースを設計する</h2><p>データはこの端末に保存。いつでも書き出せる。</p></div></div>
        <section className="settings-grid">
          <article className="setting-card panel-card"><div><p className="eyebrow">DISPLAY</p><h3>表示モード</h3><p>長時間見ても情報量を絞れる配色。</p></div><button className="toggle-button" type="button" aria-pressed={isDark} onClick={() => setIsDark((value) => !value)}><span className={isDark ? "toggle-knob on" : "toggle-knob"} /><span>{isDark ? "Dark" : "Light"}</span></button></article>
          <article className="setting-card panel-card"><div><p className="eyebrow">FOCUS SOUND</p><h3>ピンクノイズ</h3><p>集中モードの開始後に、ブラウザ内で再生。</p></div><button className="toggle-button" type="button" aria-pressed={noiseOn} onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></article>
          <article className="setting-card panel-card"><div><p className="eyebrow">PORTABILITY</p><h3>学習記録を保存</h3><p>JSONを端末内で書き出し・読み込みできます。</p></div><div className="setting-actions"><button className="button button-secondary" type="button" onClick={exportData}>エクスポート <span>↓</span></button><label className="button button-ghost file-button">インポート<input className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importData(event); }} /></label></div></article>
          <article className="setting-card panel-card"><div><p className="eyebrow">IOS START</p><h3>ホーム画面に追加</h3><p>Safariの共有ボタンから「ホーム画面に追加」。追加後もオフラインで使えます。</p></div><span className="setting-hint">Safari → 共有 → 追加</span></article>
          <article className="setting-card panel-card danger-card"><div><p className="eyebrow">RESET</p><h3>最初からやり直す</h3><p>概念の到達度と正答履歴を消去する。</p></div><button className="button button-danger" type="button" onClick={resetData}>記録を消去</button></article>
        </section>
        <section className="about-card panel-card"><div className="about-mark">Σ</div><div><p className="eyebrow">ABOUT THIS BUILD</p><h3>共テ数学60 / v0.6 · 4X CONTENT BUILD</h3><p>高校数学 I・A・II・B・C・III を320概念に分解したローカルファーストPWA。共テ幹線{commonTestConcepts.length}概念と橋渡し21概念に{lessonModules.length}本の本編レッスン、{Object.keys(conceptGuides).length}件の短編ガイド、{problemBank.length}問を接続し、外部教材なしで「解説 → 例題 → 確認問題」へ進める。</p></div></section>
      </div>
    );
  }

  if (!hydrated) return <main className="loading-screen"><div className="brand-mark large">Σ</div><p>学習データを読み込んでいます…</p></main>;

  const tabItems: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "today", label: "今日", icon: "⌂" },
    { id: "map", label: "マップ", icon: "⌘" },
    { id: "practice", label: "演習", icon: "✦" },
    { id: "mock", label: "模試", icon: "◫" },
    { id: "settings", label: "設定", icon: "⚙" },
  ];

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><div className="brand-mark">Σ</div><div><p className="brand-kicker">COMMON TEST / MATH</p><h1>共テ数学60</h1></div></div><div className="topbar-right"><span className={`offline-pill ${isOnline ? "online" : "offline"}`}><i /><span className="online-label">{isOnline ? "オンライン / オフライン対応" : "オフライン中"}</span><span className="compact-label">{isOnline ? "利用可能" : "オフライン"}</span></span><button className="icon-button" type="button" aria-label="テーマ切替" onClick={() => setIsDark((value) => !value)}>{isDark ? "☼" : "◐"}</button></div></header>
      <div className="workspace"><nav className="sidebar" aria-label="メインナビゲーション">{tabItems.map((item) => <button className={`nav-item ${activeTab === item.id ? "active" : ""}`} type="button" aria-current={activeTab === item.id ? "page" : undefined} key={item.id} onClick={() => setActiveTab(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.id === "practice" && totalAttempts > 0 && <i className="nav-dot" aria-hidden="true" />}</button>)}<div className="sidebar-bottom"><p>教材バンク</p><strong>{problemBank.length}</strong><span>{lessonModules.length}本編 / {Object.keys(conceptGuides).length}ガイド</span></div></nav><section className="main-content">{activeTab === "today" && renderToday()}{activeTab === "map" && renderMap()}{activeTab === "practice" && renderPractice()}{activeTab === "mock" && renderMock()}{activeTab === "settings" && renderSettings()}</section></div>
      {focusRunning && <button className="focus-running" type="button" aria-label={`集中タイマー ${formatTime(focusSeconds)}。詳細を開く`} onClick={() => setFocusOpen(true)}><span className="pulse-dot" />FOCUS <strong aria-live="polite" aria-atomic="true">{formatTime(focusSeconds)}</strong></button>}
      {focusOpen && <div className="modal-backdrop" role="presentation"><section ref={focusModalRef} className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title" aria-describedby="focus-description"><button ref={modalCloseRef} className="modal-close" type="button" onClick={() => setFocusOpen(false)} aria-label="閉じる">×</button><p className="eyebrow accent">FOCUS MODE</p>{focusRunning ? <><h2 id="focus-title">計測中。画面は閉じてOK。</h2><p id="focus-description">選んだ時間で自動終了します。途中でSTOPもでき、画面を離れた時間は別に記録します。</p><div className="focus-live"><strong aria-live="polite" aria-atomic="true">{formatTime(focusSeconds)}</strong><span>経過時間</span><small>{studySession ? `スマホを置いた時間 ${formatTime(sessionAwaySeconds(studySession, currentTime()))}` : ""}</small></div><div className="hero-actions"><button className="button button-secondary" type="button" onClick={() => setFocusOpen(false)}>戻る</button><button className="button button-danger" type="button" onClick={stopFocus}>STOPして記録</button></div></> : <><h2 id="focus-title">まずSTART。時間を選ぶ。</h2><p id="focus-description">3・10・20分から選べます。時間が来ると自動終了し、途中でSTOPしたときも今日の証拠になります。</p><div className="duration-grid">{[3, 10, 20].map((minutes) => <button key={minutes} type="button" className={`duration-button ${focusTotalSeconds === minutes * 60 ? "selected" : ""}`} onClick={() => { setFocusTotalSeconds(minutes * 60); setFocusSeconds(0); }}><strong>{minutes}</strong><span>min</span></button>)}</div><div className="focus-noise"><div><strong>ピンクノイズ</strong><span>{noiseOn ? "再生中" : "オフ"}</span></div><button className="toggle-button" type="button" aria-pressed={noiseOn} onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></div><button className="button button-primary wide" type="button" onClick={beginFocus}>STARTする <span>→</span></button></>}</section></div>}
      {sessionSummary && <div className="modal-backdrop" role="presentation"><section ref={summaryModalRef} className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title" aria-describedby="summary-description"><button ref={summaryCloseRef} className="modal-close" type="button" onClick={() => setSessionSummary(null)} aria-label="閉じる">×</button><p className="eyebrow accent">SESSION COMPLETE</p><h2 id="summary-title">積み上げを記録した。</h2><p id="summary-description">今日は画面を見ていた時間ではなく、正味の集中時間だけを進捗に加えました。</p><div className="summary-numbers"><div><strong>{formatTime(sessionSummary.studySeconds)}</strong><span>正味集中</span></div><div><strong>{formatTime(sessionSummary.awaySeconds)}</strong><span>スマホを置いた時間</span></div></div>{sessionEvidence && <div className="session-evidence"><div><strong>{sessionEvidence.questions}</strong><span>解いた問題</span></div><div><strong>{Math.max(0, sessionEvidence.routeEnd - sessionEvidence.routeStart)}</strong><span>進んだ概念</span></div><div><strong>{sessionEvidence.routeStart} → {sessionEvidence.routeEnd}</strong><span>ルート</span></div></div>}<p className="summary-reassurance">進捗は戻りません。次は1問だけでOK。</p><button className="button button-primary wide" type="button" onClick={continueToNextPractice}>次の1問へ <span>→</span></button></section></div>}
      {setupOpen && <div className="modal-backdrop" role="presentation"><section ref={setupModalRef} className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-description"><div className="setup-mark">Σ</div><p className="eyebrow accent">YOUR STARTING POINT</p><h2 id="setup-title">まず1問だけ始める。</h2><p id="setup-description">320の概念を依存順に並べ、毎日の「次の一手」だけを出します。迷ったら、おすすめの1問を押せばそのまま始まります。</p><div className="setup-actions"><button ref={setupPrimaryRef} className="setup-choice primary" type="button" onClick={startDiagnostic}><span><strong>おすすめ：まず1問だけ始める</strong><small>F-01から説明を読み、3分以内の確認問題へ進む</small></span><b>→</b></button><button className="setup-choice" type="button" onClick={skipFoundation}><span><strong>数学I「数と式」から始める</strong><small>橋渡しを確認済みとして、I-01から始める</small></span><b>→</b></button></div><small className="setup-note">あとから設定で記録を消去できます。</small></section></div>}
    </main>
  );
}
