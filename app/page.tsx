"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import conceptData from "@/data/math-concepts.json";
import { problemBank, type Problem } from "./problem-bank";
import { conceptGuides, type ConceptGuide } from "./content/concept-guides";
import { clearProgress, loadProgress, saveProgress, type PersistedProgress } from "./storage";
import {
  awaySeconds as sessionAwaySeconds,
  checkpointStudySession,
  elapsedSeconds as sessionElapsedSeconds,
  getStudyProgress,
  markPhoneAway,
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
type Attempt = { correct: number; total: number; lastAt: string; dueAt?: string; streak?: number };
type Feedback = { correct: boolean; explanation: string };
type MockSession = { active: boolean; index: number; answers: Record<string, number>; finished: boolean };
type SessionEvidence = { questions: number; routeStart: number; routeEnd: number };
type StoredStudySession = StudySessionState;

function primaryConceptIdFor(problem: Problem) {
  return problem.primaryConceptId ?? problem.conceptIds[0];
}

const concepts = conceptData.concepts;
const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
const problemByConcept = new Map<string, Problem>();
for (const problem of problemBank) {
  const primaryConceptId = primaryConceptIdFor(problem);
  if (primaryConceptId && !problemByConcept.has(primaryConceptId)) problemByConcept.set(primaryConceptId, problem);
}
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

function isCommonTestConcept(concept: Concept) {
  if (!(concept.course === "I" || concept.course === "A" || concept.course === "II" || concept.course === "B" || concept.course === "C")) return false;
  return concept.unit !== "数学と人間の活動" && concept.unit !== "数学と社会生活" && concept.unit !== "数学的な表現の工夫";
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
  mock: "kyote-math-60:mock",
};
const mockProblemIds = ["Q-I07-01", "Q-I16-01", "Q-I45-01", "Q-A05-01", "Q-II36-01", "Q-B04-01", "Q-B16-01", "Q-C10-01"];
const mockProblems = mockProblemIds.map((id) => problemBank.find((problem) => problem.id === id)).filter((problem): problem is Problem => Boolean(problem));

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function levelLabel(level: number) {
  return ["未学習", "意味が分かる", "例題を再現", "標準を解ける", "転移できる"][level] ?? "未学習";
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
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

function normalizeImportedProgress(value: unknown): PersistedProgress | null {
  if (!isRecord(value) || !isRecord(value.mastery) || !isRecord(value.attempts)) return null;
  const nextMastery: Record<string, number> = {};
  for (const [id, rawLevel] of Object.entries(value.mastery)) {
    if (!conceptById.has(id) || typeof rawLevel !== "number" || !Number.isFinite(rawLevel)) continue;
    nextMastery[id] = Math.min(4, Math.max(0, Math.round(rawLevel)));
  }
  const nextAttempts: PersistedProgress["attempts"] = {};
  for (const [id, rawAttempt] of Object.entries(value.attempts)) {
    if (!conceptById.has(id) || !isRecord(rawAttempt)) continue;
    const correct = typeof rawAttempt.correct === "number" ? Math.max(0, Math.floor(rawAttempt.correct)) : 0;
    const total = typeof rawAttempt.total === "number" ? Math.max(correct, Math.floor(rawAttempt.total)) : 0;
    if (total === 0) continue;
    const lastAt = typeof rawAttempt.lastAt === "string" ? rawAttempt.lastAt : new Date().toISOString();
    const dueAt = typeof rawAttempt.dueAt === "string" ? rawAttempt.dueAt : undefined;
    const streak = typeof rawAttempt.streak === "number" ? Math.max(0, Math.floor(rawAttempt.streak)) : undefined;
    nextAttempts[id] = { correct: Math.min(correct, total), total, lastAt, dueAt, streak };
  }
  const dates = Array.isArray(value.studyDates)
    ? value.studyDates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
    : [];
  const studySeconds = typeof value.studySeconds === "number" && Number.isFinite(value.studySeconds) ? Math.max(0, Math.floor(value.studySeconds)) : 0;
  const awaySeconds = typeof value.awaySeconds === "number" && Number.isFinite(value.awaySeconds) ? Math.max(0, Math.floor(value.awaySeconds)) : 0;
  const guideSeen: Record<string, boolean> = {};
  if (isRecord(value.guideSeen)) {
    for (const [id, seen] of Object.entries(value.guideSeen)) {
      if (conceptById.has(id) && seen === true) guideSeen[id] = true;
    }
  }
  return { mastery: nextMastery, attempts: nextAttempts, studyDates: [...new Set(dates)].slice(-180), studySeconds, awaySeconds, guideSeen };
}

function normalizeMockSession(value: unknown): MockSession | null {
  if (!isRecord(value) || typeof value.active !== "boolean" || typeof value.finished !== "boolean" || typeof value.index !== "number" || !isRecord(value.answers)) return null;
  const answers: Record<string, number> = {};
  for (const [id, answer] of Object.entries(value.answers)) {
    if (mockProblems.some((problem) => problem.id === id) && typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < 4) answers[id] = answer;
  }
  return {
    active: value.active,
    finished: value.finished,
    index: Math.min(mockProblems.length - 1, Math.max(0, Math.floor(value.index))),
    answers,
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
  const [practiceProblemId, setPracticeProblemId] = useState(problemBank[0].id);
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<Feedback | null>(null);
  const [mockActive, setMockActive] = useState(false);
  const [mockIndex, setMockIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState<Record<string, number>>({});
  const [mockFinished, setMockFinished] = useState(false);
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
  const focusModalRef = useRef<HTMLElement | null>(null);
  const setupModalRef = useRef<HTMLElement | null>(null);
  const summaryModalRef = useRef<HTMLElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const setupPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const summaryCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    const timer = window.setTimeout(() => {
      void loadProgress().then((progress) => {
        const storedTheme = readStored(storageKeys.theme);
        const legacyFocus = safeParse<{ totalSeconds?: number; startedAt?: number } | null>(readStored(storageKeys.focus), null);
        const storedMock = normalizeMockSession(safeParse<unknown>(readStored(storageKeys.mock), null));
        setMastery(progress.mastery);
        setAttempts(progress.attempts);
        setStudyDates(progress.studyDates);
        setStudySeconds(progress.studySeconds);
        setAwaySeconds(progress.awaySeconds);
        setGuideSeen(progress.guideSeen);
        setIsDark(storedTheme !== "light");
        setNoiseOn(false);
        setSetupOpen(!readStored(storageKeys.initialized));
        if (storedMock) {
          setMockActive(storedMock.active);
          setMockIndex(storedMock.index);
          setMockAnswers(storedMock.answers);
          setMockFinished(storedMock.finished);
        }
        const storedSession = restoreStudySession(safeParse<unknown>(readStored(storageKeys.studySession), null));
        const legacySession = !storedSession && typeof legacyFocus?.startedAt === "number"
          ? startStudySession({ id: `legacy-focus-${legacyFocus.startedAt}`, startedAtMs: legacyFocus.startedAt })
          : null;
        const recoveredSession = storedSession ?? legacySession;
        const recoveredRemaining = legacyFocus?.startedAt && legacyFocus.totalSeconds
          ? legacyFocus.totalSeconds - Math.floor((Date.now() - legacyFocus.startedAt) / 1000)
          : null;
        if (recoveredSession && (recoveredRemaining === null || recoveredRemaining > 0)) {
          const resumed = resumeStudySession(recoveredSession, Date.now());
          studySessionRef.current = resumed;
          setStudySession(resumed);
          const totalSeconds = legacyFocus?.totalSeconds ?? 20 * 60;
          setFocusTotalSeconds(totalSeconds);
          setFocusSeconds(recoveredRemaining === null ? totalSeconds : recoveredRemaining);
          setFocusRunning(true);
        } else if (recoveredSession) {
          const resumed = resumeStudySession(recoveredSession, Date.now());
          const completed = stopStudySession(resumed, Date.now());
          setStudySeconds(progress.studySeconds + completed.studySeconds);
          setAwaySeconds(progress.awaySeconds + completed.awaySeconds);
          setStudyDates((previous) => previous.includes(dayKey()) ? previous : [...previous, dayKey()].slice(-180));
          removeStored(storageKeys.focus);
          removeStored(storageKeys.studySession);
        } else {
          removeStored(storageKeys.focus);
          removeStored(storageKeys.studySession);
        }
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
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
    void saveProgress({ mastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen });
  }, [attempts, awaySeconds, guideSeen, hydrated, mastery, studyDates, studySeconds]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    writeStored(storageKeys.theme, isDark ? "dark" : "light");
  }, [hydrated, isDark]);

  useEffect(() => {
    studySessionRef.current = studySession;
    if (!hydrated) return;
    if (studySession) writeStored(storageKeys.studySession, JSON.stringify(studySession));
    else removeStored(storageKeys.studySession);
  }, [hydrated, studySession]);

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
      setStudySession((previous) => {
        if (!previous) return previous;
        const now = Date.now();
        const next = document.hidden ? markPhoneAway(previous, now) : checkpointStudySession(previous, now);
        studySessionRef.current = next;
        setFocusSeconds(sessionElapsedSeconds(next, now));
        return next;
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);

  useEffect(() => {
    if (!hydrated) return;
    if (mockActive || mockFinished || Object.keys(mockAnswers).length > 0) {
      const session: MockSession = { active: mockActive, index: mockIndex, answers: mockAnswers, finished: mockFinished };
      writeStored(storageKeys.mock, JSON.stringify(session));
    } else {
      removeStored(storageKeys.mock);
    }
  }, [hydrated, mockActive, mockAnswers, mockFinished, mockIndex]);

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
  const isRouteTouched = (concept: Concept) => (mastery[concept.id] ?? 0) > 0 || Boolean(guideSeen[concept.id]) || Boolean(attempts[concept.id]);
  const isRouteComplete = (concept: Concept) => (mastery[concept.id] ?? 0) > 0 || Boolean(guideSeen[concept.id]) || Boolean(attempts[concept.id]);
  const isPrerequisiteReady = (id: string) => {
    const prerequisite = conceptById.get(id);
    return (mastery[id] ?? 0) >= 3 || Boolean(prerequisite && isRouteComplete(prerequisite)) || (!hasPractice(id) && Boolean(guideSeen[id]));
  };
  const isUnlocked = (concept: Concept) => concept.requires.every(isPrerequisiteReady);
  const nextConcept = (() => {
    const now = currentTime();
    const candidates = commonTestConcepts
      .filter((concept) => {
        const dueAt = attempts[concept.id]?.dueAt;
        const due = Boolean(dueAt && Date.parse(dueAt) <= now);
        return isUnlocked(concept) && (!isRouteComplete(concept) || due) && (hasPractice(concept.id) || Boolean(conceptGuides[concept.id]));
      })
      .sort((a, b) => {
        const due = (concept: Concept) => {
          const dueAt = attempts[concept.id]?.dueAt;
          return dueAt && Date.parse(dueAt) <= now ? 0 : 1;
        };
        const untouched = (concept: Concept) => isRouteComplete(concept) ? 1 : 0;
        return untouched(a) - untouched(b) || due(a) - due(b) || (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999);
      });
    return candidates[0] ?? commonTestConcepts.find((concept) => hasPractice(concept.id) || Boolean(conceptGuides[concept.id])) ?? concepts[0];
  })();
  const selectedConcept = conceptById.get(selectedConceptId) ?? nextConcept;
  const selectedGuide: ConceptGuide | undefined = conceptGuides[selectedConcept.id];
  const currentPractice = problemBank.find((problem) => problem.id === practiceProblemId) ?? problemBank[0];
  const currentMock = mockProblems[mockIndex] ?? mockProblems[0];

  const totalAttempts = Object.values(attempts).reduce((sum, value) => sum + value.total, 0);
  const totalCorrect = Object.values(attempts).reduce((sum, value) => sum + value.correct, 0);
  const liveStudySeconds = studySeconds + (studySession ? sessionStudySeconds(studySession, currentTime()) : 0);
  const liveAwaySeconds = awaySeconds + (studySession ? sessionAwaySeconds(studySession, currentTime()) : 0);
  const studyProgress = getStudyProgress(liveStudySeconds);
  const routeTouchedCount = commonTestConcepts.filter(isRouteTouched).length;
  const routeProgress = commonTestConcepts.length ? Math.round((routeTouchedCount / commonTestConcepts.length) * 100) : 0;
  const availableConceptCount = commonTestConcepts.filter((concept) => hasPractice(concept.id)).length;
  const learnedCount = commonTestConcepts.filter((concept) => (mastery[concept.id] ?? 0) >= 3).length;
  const selectedLevel = mastery[selectedConcept.id] ?? 0;
  const targetProblem = problemByConcept.get(nextConcept.id);
  const mockScore = mockProblems.filter((problem) => mockAnswers[problem.id] === problem.answer).length;
  const streak = currentStreak(studyDates);
  const targetDue = Boolean(attempts[nextConcept.id]?.dueAt && Date.parse(attempts[nextConcept.id].dueAt as string) <= currentTime());
  const weakestMockConceptId = (() => {
    const weakest = mockProblems.find((problem) => mockAnswers[problem.id] !== problem.answer);
    return weakest ? primaryConceptIdFor(weakest) : undefined;
  })();

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
    const problem = problemByConcept.get(concept.id);
    if (!problem) return;
    setPracticeProblemId(problem.id);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setActiveTab("practice");
  }

  function recordAttempt(problem: Problem, correct: boolean) {
    const primaryConceptId = primaryConceptIdFor(problem);
    if (!primaryConceptId || !conceptById.has(primaryConceptId)) return;
    const now = new Date().toISOString();
    setAttempts((previous) => {
      const next = { ...previous };
      const currentLevel = mastery[primaryConceptId] ?? 0;
      const nextLevel = correct ? Math.min(4, currentLevel + 1) : currentLevel;
      const intervalDays = correct ? [0, 1, 3, 7, 21][nextLevel] ?? 21 : 0;
      const dueAt = new Date(currentTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
      const old = next[primaryConceptId] ?? { correct: 0, total: 0, lastAt: now };
      next[primaryConceptId] = { correct: old.correct + (correct ? 1 : 0), total: old.total + 1, lastAt: now, dueAt, streak: correct ? (old.streak ?? 0) + 1 : 0 };
      return next;
    });
    if (correct) {
      setMastery((previous) => {
        const next = { ...previous };
        next[primaryConceptId] = Math.min(4, (next[primaryConceptId] ?? 0) + 1);
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
    recordAttempt(currentPractice, correct);
  }

  function nextPractice() {
    const now = currentTime();
    const alternatives = problemBank.filter((problem) => {
      if (problem.id === currentPractice.id) return false;
      const concept = conceptById.get(primaryConceptIdFor(problem));
      return Boolean(concept && isCommonTestConcept(concept) && isUnlocked(concept));
    });
    const next = alternatives.sort((a, b) => {
      const aId = primaryConceptIdFor(a);
      const bId = primaryConceptIdFor(b);
      const aDue = aId && attempts[aId]?.dueAt && Date.parse(attempts[aId].dueAt as string) <= now ? 0 : 1;
      const bDue = bId && attempts[bId]?.dueAt && Date.parse(attempts[bId].dueAt as string) <= now ? 0 : 1;
      return aDue - bDue || (mastery[aId] ?? 0) - (mastery[bId] ?? 0);
    })[0] ?? currentPractice;
    setPracticeProblemId(next.id);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    const firstConcept = conceptById.get(primaryConceptIdFor(next));
    if (firstConcept) setSelectedConceptId(firstConcept.id);
  }

  function retryPractice() {
    setPracticeAnswer(null);
    setPracticeFeedback(null);
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
    studySessionRef.current = session;
    setStudySession(session);
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

  function stopFocus() {
    completeFocusSession(currentTime());
    setFocusRunning(false);
    setFocusSeconds(0);
    setFocusOpen(false);
    removeStored(storageKeys.focus);
  }

  function markGuideRead(concept: Concept) {
    if (!conceptGuides[concept.id]) return;
    setGuideSeen((previous) => previous[concept.id] ? previous : { ...previous, [concept.id]: true });
    setMastery((previous) => ({ ...previous, [concept.id]: Math.max(previous[concept.id] ?? 0, 1) }));
    recordStudyDay();
  }

  function openTarget() {
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

  function startMock() {
    setMockAnswers({});
    setMockIndex(0);
    setMockFinished(false);
    setMockActive(true);
    setActiveTab("mock");
  }

  function finishMock(answers: Record<string, number>) {
    setMockAnswers(answers);
    setMockFinished(true);
    setMockActive(false);
    // The scan is a measurement, not a mastery pass. Only ordinary practice
    // updates the spaced-repetition state, so repeating the scan cannot inflate progress.
    recordStudyDay();
  }

  function advanceMock() {
    if (!currentMock || mockAnswers[currentMock.id] === undefined) return;
    const answers = mockIndex === mockProblems.length - 1 ? mockAnswers : { ...mockAnswers };
    if (mockIndex === mockProblems.length - 1) finishMock(answers);
    else setMockIndex((index) => index + 1);
  }

  function skipFoundation() {
    const bridgeMastery = Object.fromEntries(concepts.filter((concept) => concept.course === "bridge").map((concept) => [concept.id, 3]));
    const mergedMastery = { ...mastery, ...bridgeMastery };
    setMastery(mergedMastery);
    void saveProgress({ mastery: mergedMastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen });
    setSelectedConceptId("I-01");
    setPracticeProblemId("Q-I01-01");
    setActiveTab("practice");
    writeStored(storageKeys.initialized, "true");
    setSetupOpen(false);
  }

  function startDiagnostic() {
    writeStored(storageKeys.initialized, "true");
    setSetupOpen(false);
    setSelectedConceptId("F-01");
    setPracticeProblemId("Q-F01-01");
    setActiveTab("practice");
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), mastery, attempts, studyDates, studySeconds, awaySeconds, guideSeen, curriculum: "high_school_math_concepts.v1" };
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
    removeStored(storageKeys.initialized);
    removeStored(storageKeys.focus);
    removeStored(storageKeys.studySession);
    setMastery({});
    setAttempts({});
    setStudyDates([]);
    setStudySeconds(0);
    setAwaySeconds(0);
    setGuideSeen({});
    setSessionSummary(null);
    studySessionRef.current = null;
    setStudySession(null);
    setFocusRunning(false);
    setMockActive(false);
    setMockIndex(0);
    setMockAnswers({});
    setMockFinished(false);
    setExpandedConceptId(null);
    stopNoise();
    removeStored(storageKeys.mock);
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
              <button className="button button-primary" type="button" onClick={openTarget}>{targetProblem ? "次の1概念を始める" : "解説から進む"} <span>→</span></button>
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
          <article className="metric-card"><span className="metric-label">共テルート</span><strong>{routeProgress}<small>%</small></strong><div className="mini-bar"><i style={{ width: `${routeProgress}%` }} /></div><p>{routeTouchedCount} / {commonTestConcepts.length}概念に触れた</p></article>
          <article className="metric-card"><span className="metric-label">学習貯金</span><strong>{studyProgress.studiedHours.toFixed(1)}<small> / 700h</small></strong><div className="mini-bar"><i style={{ width: `${Math.min(100, studyProgress.percent)}%` }} /></div><p>{liveAwaySeconds ? `${formatTime(liveAwaySeconds)} はスマホを置いた` : "タイマーで証拠を残そう"}</p></article>
          <article className="metric-card"><span className="metric-label">標準到達</span><strong>{learnedCount}<small> / {commonTestConcepts.length}</small></strong><div className="mini-bar"><i style={{ width: `${(learnedCount / commonTestConcepts.length) * 100}%` }} /></div><p>{availableConceptCount}概念に演習あり</p></article>
          <article className="metric-card"><span className="metric-label">今日の証拠</span><strong>{totalAttempts}<small>問</small></strong><div className="streak-dots">{[0, 1, 2, 3, 4, 5, 6].map((day) => <i className={day < streak ? "active" : ""} key={day} />)}</div><p>{totalAttempts ? `${totalCorrect}問正解・${studyDates.length}日記録` : "最初の1問で記録"}</p></article>
        </section>

        <section className="study-progress-card panel-card">
          <div className="study-progress-heading"><div><p className="eyebrow accent">YOUR 700-HOUR TRACK</p><h3>「勉強した感」を、積み上げで見える化</h3><p>集中タイマーの正味時間だけを記録。画面を閉じた時間は水増ししない。</p></div><strong>{studyProgress.percent.toFixed(studyProgress.percent < 10 ? 1 : 0)}<small>%</small></strong></div>
          <div className="study-progress-bar" aria-label={`700時間中${studyProgress.studiedHours.toFixed(1)}時間、${studyProgress.percent.toFixed(1)}パーセント`}><i style={{ width: `${studyProgress.percent}%` }} /></div>
          <div className="study-progress-foot"><span>{studyProgress.studiedHours.toFixed(1)} / 700時間</span><span>あと{studyProgress.remainingHours.toFixed(1)}時間</span></div>
        </section>

        <section className="focus-strip panel-card"><div><p className="eyebrow accent">{focusRunning ? "LEARNING NOW" : "FOCUS MODE"}</p><h3>{focusRunning ? `計測中 ${formatTime(focusSeconds)}` : "短く集中して、記録を残す"}</h3><p>{focusRunning ? "画面を閉じても復帰できます。STOPしたときだけ、学習の証拠を確定します。" : "時間を決めなくてもSTART。戻ってきたら、学習時間とスマホを置いた時間が残ります。"}</p></div><button className="button button-secondary" onClick={() => setFocusOpen(true)}>{focusRunning ? "タイマーを見る" : "START"} <span>↗</span></button></section>
      </div>
    );
  }

  function renderMap() {
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">CONCEPT MAP</p><h2>320概念の依存グラフ</h2><p>共テ対象225概念のルートは0→100%。1概念ずつ、戻らない。</p></div><div className="map-count"><strong>{routeProgress}%</strong><span>{routeTouchedCount} / {commonTestConcepts.length}概念に触れた</span></div></div>
        <section className="map-toolbar panel-card"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="概念名・ID・タグで検索" value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="概念名・ID・タグで検索" /></label><div className="filter-row">{(["all", "bridge", "I", "A", "II", "B", "C", "III"] as CourseFilter[]).map((course) => <button key={course} className={`filter-chip ${mapCourse === course ? "selected" : ""}`} aria-pressed={mapCourse === course} onClick={() => setMapCourse(course)}>{course === "all" ? "すべて" : courseLabels[course]}</button>)}</div></section>
        <section className="concept-list">
          {filteredConcepts.map((concept) => {
            const level = mastery[concept.id] ?? 0;
            const unlocked = isUnlocked(concept);
            const available = hasPractice(concept.id);
            const guide = conceptGuides[concept.id];
            const expanded = expandedConceptId === concept.id;
            return (
              <div className={`concept-item ${expanded ? "expanded" : ""} ${!unlocked ? "locked" : ""}`} key={concept.id}>
                <button className="concept-row-main" type="button" aria-expanded={expanded} onClick={() => { setSelectedConceptId(concept.id); setExpandedConceptId(expanded ? null : concept.id); }}>
                  <span className="concept-id">{concept.id}</span><span className="concept-name">{concept.title}</span><span className="concept-course">{courseLabels[concept.course]}</span><span className="mastery-dots" aria-label={`レベル${level}`}>{[0, 1, 2, 3].map((dot) => <i className={dot < level ? "filled" : ""} key={dot} />)}</span><span className={`state-label ${unlocked ? "ready" : "locked-label"}`}>{unlocked ? levelLabel(level) : "前提待ち"}</span><span className="chevron">{expanded ? "−" : "+"}</span>
                </button>
                {expanded && <div className="concept-detail"><div><p>{concept.target}</p>{guide && <div className="concept-guide"><p><strong>意味</strong>{guide.definition}</p><p><strong>一手</strong>{guide.firstMove}</p><p><strong>罠</strong>{guide.trap}</p></div>}<div className="tag-row">{concept.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>{concept.requires.length > 0 && <small>前提：{concept.requires.map((id) => conceptById.get(id)?.title ?? id).join(" / ")}</small>}</div><div className="concept-detail-actions">{guide && <button className="button button-ghost button-small" type="button" onClick={() => markGuideRead(concept)}>{guideSeen[concept.id] ? "ガイド済み" : "解説を読んだ"}</button>}<button className="button button-small" type="button" disabled={!unlocked || !available} onClick={() => openPracticeFor(concept)}>{!unlocked ? "前提を先に" : available ? "この概念を練習" : "問題準備中"} <span>→</span></button></div></div>}
              </div>
            );
          })}
          {filteredConcepts.length === 0 && <div className="empty-state panel-card">該当する概念がありません。検索語を変えてみよう。</div>}
        </section>
      </div>
    );
  }

  function renderPractice() {
    const selectedOption = practiceAnswer !== null ? currentPractice.options[practiceAnswer] : null;
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">PRACTICE LOOP</p><h2>1問で、理解を更新する</h2><p>答えだけでなく、どの概念を使ったかを記録する。</p></div><span className="mode-badge">{currentPractice.kind === "quick" ? "QUICK CHECK" : currentPractice.kind === "transfer" ? "TRANSFER" : "STANDARD"}</span></div>
        <div className="practice-layout">
          <section className="question-card panel-card"><div className="question-top"><span>{currentPractice.id}</span><span>目安 {currentPractice.estimatedSeconds}秒</span></div><h3>{currentPractice.title}</h3><p className="question-prompt">{currentPractice.prompt}</p><div className="option-list">{currentPractice.options.map((option, index) => <button className={`option-button ${practiceAnswer === index ? "chosen" : ""} ${practiceFeedback && index === currentPractice.answer ? "correct-option" : ""} ${practiceFeedback && practiceAnswer === index && index !== currentPractice.answer ? "wrong-option" : ""}`} type="button" aria-pressed={practiceAnswer === index} key={option} onClick={() => !practiceFeedback && setPracticeAnswer(index)}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span>{practiceFeedback && index === currentPractice.answer && <span className="answer-mark">✓</span>}</button>)}</div><div className="question-actions">{practiceFeedback ? <button className="button button-primary" type="button" onClick={nextPractice}>次の1問へ <span>→</span></button> : <button className="button button-primary" type="button" disabled={practiceAnswer === null} onClick={submitPractice}>答えを記録する <span>↗</span></button>}{selectedOption && !practiceFeedback && <span className="selected-note">選択：{selectedOption}</span>}</div>{practiceFeedback && <div className={`feedback-box ${practiceFeedback.correct ? "success" : "retry"}`} aria-live="polite"><strong>{practiceFeedback.correct ? "正解。概念レベルを更新した。" : "今回はここで止めてOK。解説から戻ろう。"}</strong><p>{practiceFeedback.explanation}</p>{!practiceFeedback.correct && <div className="feedback-actions"><button className="text-button" type="button" onClick={retryPractice}>もう一度解く</button><button className="text-button" type="button" onClick={() => setPracticeAnswer(currentPractice.answer)}>正答を表示</button></div>}</div>}</section>
          <aside className="side-stack">
            <section className="concept-side panel-card"><p className="eyebrow">LINKED CONCEPT</p><span className="side-id">{selectedConcept.id}</span><h3>{selectedConcept.title}</h3><p>{selectedConcept.target}</p><div className="side-level"><span>現在地</span><strong>Lv.{selectedLevel}</strong><small>{levelLabel(selectedLevel)}</small></div><button className="text-button" type="button" onClick={() => { setActiveTab("map"); setMapSearch(selectedConcept.id); }}>マップで確認 →</button></section>
            {selectedGuide && <section className="guide-card panel-card"><div className="guide-heading"><div><p className="eyebrow accent">1-MINUTE GUIDE</p><h3>解く前の3行</h3></div><span>{guideSeen[selectedConcept.id] ? "読了" : "読む"}</span></div><dl><div><dt>意味</dt><dd>{selectedGuide.definition}</dd></div><div><dt>最初の一手</dt><dd>{selectedGuide.firstMove}</dd></div><div><dt>罠</dt><dd>{selectedGuide.trap}</dd></div></dl><button className="button button-ghost button-small" type="button" onClick={() => markGuideRead(selectedConcept)}>{guideSeen[selectedConcept.id] ? "ガイド済み" : "解説を読んだ"} <span>✓</span></button></section>}
            <section className="tip-card"><span className="tip-icon">✦</span><div><strong>共テのコツ</strong><p>正答後に「なぜその式になるか」を一文で言えたら、次の概念へ進もう。</p></div></section>
          </aside>
        </div>
      </div>
    );
  }

  function renderMock() {
    if (mockFinished) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow accent">MINI MOCK</p><h2>結果を次の学習へつなぐ</h2><p>これは8問の技能スキャン。共テ本番の点数には換算しない。</p></div></div><section className="result-card panel-card"><div className="result-score"><strong>{mockScore}</strong><span>/ {mockProblems.length}問</span><small>I・A 4問 / II・B・C 4問</small></div><div className="result-message"><p className="eyebrow">YOUR READOUT</p><h3>{mockScore >= 5 ? "幹線がつながってきた" : "まずは取り切れる概念から"}</h3><p>{mockScore} / {mockProblems.length}問正解。{weakestMockConceptId ? "最初の弱点を1つだけ確認し、次の10分に変換しよう。" : "今日の幹線は一通り確認できた。"}</p><button className="button button-primary" type="button" onClick={() => { setMockFinished(false); if (weakestMockConceptId) { setSelectedConceptId(weakestMockConceptId); setMapSearch(weakestMockConceptId); } setActiveTab("map"); }}>{weakestMockConceptId ? "最初の弱点を見る" : "マップへ戻る"} <span>→</span></button></div></section><button className="button button-ghost" type="button" onClick={startMock}>もう一度ミニ模試</button></div>;
    if (!mockActive) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow accent">MINI MOCK</p><h2>本番前の8問スキャン</h2><p>数学I・A・II・B・Cの幹線から、いまの取りこぼしを確認する。</p></div></div><section className="mock-intro panel-card"><div className="mock-number">08</div><div><p className="eyebrow">SHORT SESSION</p><h3>12分で、現在地を測る</h3><p>オリジナル問題8問。I・Aから4問、II・B・Cから4問。結果は学習用のスキャンとして扱う。</p><button className="button button-primary" type="button" onClick={startMock}>模試を始める <span>→</span></button></div></section><div className="mock-rules"><span>01　順番に進む</span><span>02　最後に一括採点</span><span>03　概念別に記録</span></div></div>;
    const currentAnswer = mockAnswers[currentMock.id];
    return <div className="page-stack"><div className="mock-progress"><span>MINI MOCK</span><strong>{String(mockIndex + 1).padStart(2, "0")} <small>/ {String(mockProblems.length).padStart(2, "0")}</small></strong><span>採点は最後</span></div><section className="question-card mock-question panel-card"><div className="question-top"><span>{currentMock.id}</span><span>{courseLabels[conceptById.get(currentMock.conceptIds[0])?.course ?? "I"]}</span></div><h3>{currentMock.title}</h3><p className="question-prompt">{currentMock.prompt}</p><div className="option-list">{currentMock.options.map((option, index) => <button className={`option-button ${currentAnswer === index ? "chosen" : ""}`} type="button" aria-pressed={currentAnswer === index} key={option} onClick={() => setMockAnswers((previous) => ({ ...previous, [currentMock.id]: index }))}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</div><div className="question-actions"><button className="button button-primary" type="button" disabled={currentAnswer === undefined} onClick={advanceMock}>{mockIndex === mockProblems.length - 1 ? "採点する" : "次の問題へ"} <span>→</span></button><span className="selected-note">解答済み {Object.keys(mockAnswers).length} / {mockProblems.length}</span></div></section></div>;
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
        <section className="about-card panel-card"><div className="about-mark">Σ</div><div><p className="eyebrow">ABOUT THIS BUILD</p><h3>共テ数学60 / v0.2</h3><p>高校数学 I・A・II・B・C・III を、依存関係のある320概念として扱うローカルファーストPWA。目標は「全部やる」ではなく、共通テストで取り切る幹線をつなぐこと。</p></div></section>
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
      <div className="workspace"><nav className="sidebar" aria-label="メインナビゲーション">{tabItems.map((item) => <button className={`nav-item ${activeTab === item.id ? "active" : ""}`} type="button" aria-current={activeTab === item.id ? "page" : undefined} key={item.id} onClick={() => setActiveTab(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.id === "practice" && totalAttempts > 0 && <i className="nav-dot" aria-hidden="true" />}</button>)}<div className="sidebar-bottom"><p>概念データ</p><strong>{concepts.length}</strong><span>nodes / local</span></div></nav><section className="main-content">{activeTab === "today" && renderToday()}{activeTab === "map" && renderMap()}{activeTab === "practice" && renderPractice()}{activeTab === "mock" && renderMock()}{activeTab === "settings" && renderSettings()}</section></div>
      {focusRunning && <button className="focus-running" type="button" aria-label={`集中タイマー ${formatTime(focusSeconds)}。詳細を開く`} onClick={() => setFocusOpen(true)}><span className="pulse-dot" />FOCUS <strong>{formatTime(focusSeconds)}</strong></button>}
      {focusOpen && <div className="modal-backdrop" role="presentation"><section ref={focusModalRef} className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title" aria-describedby="focus-description"><button ref={modalCloseRef} className="modal-close" type="button" onClick={() => setFocusOpen(false)} aria-label="閉じる">×</button><p className="eyebrow accent">FOCUS MODE</p>{focusRunning ? <><h2 id="focus-title">計測中。画面は閉じてOK。</h2><p id="focus-description">STOPするまで自動終了しません。画面を離れた時間は別に記録します。</p><div className="focus-live"><strong>{formatTime(focusSeconds)}</strong><span>経過時間</span><small>{studySession ? `スマホを置いた時間 ${formatTime(sessionAwaySeconds(studySession, currentTime()))}` : ""}</small></div><div className="hero-actions"><button className="button button-secondary" type="button" onClick={() => setFocusOpen(false)}>戻る</button><button className="button button-danger" type="button" onClick={stopFocus}>STOPして記録</button></div></> : <><h2 id="focus-title">まずSTART。時間は自由。</h2><p id="focus-description">10・20・40分は目安です。選ばなくても始められ、STOPしたときだけ今日の証拠になります。</p><div className="duration-grid">{[10, 20, 40].map((minutes) => <button key={minutes} type="button" className={`duration-button ${focusTotalSeconds === minutes * 60 ? "selected" : ""}`} onClick={() => { setFocusTotalSeconds(minutes * 60); setFocusSeconds(0); }}><strong>{minutes}</strong><span>min 目安</span></button>)}</div><div className="focus-noise"><div><strong>ピンクノイズ</strong><span>{noiseOn ? "再生中" : "オフ"}</span></div><button className="toggle-button" type="button" aria-pressed={noiseOn} onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></div><button className="button button-primary wide" type="button" onClick={beginFocus}>STARTする <span>→</span></button></>}</section></div>}
      {sessionSummary && <div className="modal-backdrop" role="presentation"><section ref={summaryModalRef} className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title" aria-describedby="summary-description"><button ref={summaryCloseRef} className="modal-close" type="button" onClick={() => setSessionSummary(null)} aria-label="閉じる">×</button><p className="eyebrow accent">SESSION COMPLETE</p><h2 id="summary-title">積み上げを記録した。</h2><p id="summary-description">今日は画面を見ていた時間ではなく、正味の集中時間だけを進捗に加えました。</p><div className="summary-numbers"><div><strong>{formatTime(sessionSummary.studySeconds)}</strong><span>正味集中</span></div><div><strong>{formatTime(sessionSummary.awaySeconds)}</strong><span>スマホを置いた時間</span></div></div>{sessionEvidence && <div className="session-evidence"><div><strong>{sessionEvidence.questions}</strong><span>解いた問題</span></div><div><strong>{Math.max(0, sessionEvidence.routeEnd - sessionEvidence.routeStart)}</strong><span>進んだ概念</span></div><div><strong>{sessionEvidence.routeStart} → {sessionEvidence.routeEnd}</strong><span>ルート</span></div></div>}<p className="summary-reassurance">進捗は戻りません。次は1問だけでOK。</p><button className="button button-primary wide" type="button" onClick={() => { setSessionSummary(null); setActiveTab("practice"); }}>次の1問へ <span>→</span></button></section></div>}
      {setupOpen && <div className="modal-backdrop" role="presentation"><section ref={setupModalRef} className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-description"><div className="setup-mark">Σ</div><p className="eyebrow accent">YOUR STARTING POINT</p><h2 id="setup-title">数学を、概念からつなぐ。</h2><p id="setup-description">320の概念を依存順に並べ、毎日の「次の一手」だけを出します。まずは今の状態に近い入口を選んでください。</p><div className="setup-actions"><button ref={setupPrimaryRef} className="setup-choice primary" type="button" onClick={skipFoundation}><span><strong>数学I「数と式」から始める</strong><small>橋渡しを確認済みとして、I-01から始める</small></span><b>→</b></button><button className="setup-choice" type="button" onClick={startDiagnostic}><span><strong>橋渡しから1問ずつ始める</strong><small>F-01から解き、回答に合わせて次の入口を選ぶ</small></span><b>→</b></button></div><small className="setup-note">あとから設定で記録を消去できます。</small></section></div>}
    </main>
  );
}
