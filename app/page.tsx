"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import conceptData from "@/data/math-concepts.json";
import { problemBank, type Problem } from "./problem-bank";
import { clearProgress, loadProgress, saveProgress, type PersistedProgress } from "./storage";

type Concept = (typeof conceptData.concepts)[number];
type Tab = "today" | "map" | "practice" | "mock" | "settings";
type CourseFilter = "all" | "bridge" | "I" | "A" | "II" | "B" | "C" | "III";
type Attempt = { correct: number; total: number; lastAt: string; dueAt?: string; streak?: number };
type Feedback = { correct: boolean; explanation: string };
type MockSession = { active: boolean; index: number; answers: Record<string, number>; finished: boolean };

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
  if (concept.course === "I" || concept.course === "II") return true;
  if (concept.course === "A") return concept.unit === "場合の数と確率" || concept.unit === "図形の性質";
  if (concept.course === "B") return concept.unit === "数列" || concept.unit === "統計的な推測";
  if (concept.course === "C") return concept.unit === "ベクトル" || concept.unit === "平面上の曲線と複素数平面";
  return false;
}
const storageKeys = {
  mastery: "kyote-math-60:mastery",
  attempts: "kyote-math-60:attempts",
  initialized: "kyote-math-60:initialized",
  theme: "kyote-math-60:theme",
  noise: "kyote-math-60:noise",
  studyDates: "kyote-math-60:study-dates",
  focus: "kyote-math-60:focus",
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
  return { mastery: nextMastery, attempts: nextAttempts, studyDates: [...new Set(dates)].slice(-180) };
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
  const [focusStartedAt, setFocusStartedAt] = useState<number | null>(null);
  const [noiseOn, setNoiseOn] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const audioRef = useRef<{ context: AudioContext; node: ScriptProcessorNode } | null>(null);
  const focusModalRef = useRef<HTMLElement | null>(null);
  const setupModalRef = useRef<HTMLElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const setupPrimaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    const timer = window.setTimeout(() => {
      void loadProgress().then((progress) => {
        const storedTheme = readStored(storageKeys.theme);
        const storedFocus = safeParse<{ totalSeconds: number; startedAt: number } | null>(readStored(storageKeys.focus), null);
        const storedMock = normalizeMockSession(safeParse<unknown>(readStored(storageKeys.mock), null));
        setMastery(progress.mastery);
        setAttempts(progress.attempts);
        setStudyDates(progress.studyDates);
        setIsDark(storedTheme !== "light");
        setNoiseOn(false);
        setSetupOpen(!readStored(storageKeys.initialized));
        if (storedMock) {
          setMockActive(storedMock.active);
          setMockIndex(storedMock.index);
          setMockAnswers(storedMock.answers);
          setMockFinished(storedMock.finished);
        }
        if (storedFocus?.startedAt && storedFocus.totalSeconds) {
          const remaining = storedFocus.totalSeconds - Math.floor((Date.now() - storedFocus.startedAt) / 1000);
          if (remaining > 0) {
            setFocusTotalSeconds(storedFocus.totalSeconds);
            setFocusSeconds(remaining);
            setFocusStartedAt(storedFocus.startedAt);
            setFocusRunning(true);
          } else {
            removeStored(storageKeys.focus);
            const completedDay = dayKey();
            setStudyDates((previous) => previous.includes(completedDay) ? previous : [...previous, completedDay].slice(-180));
          }
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
    void saveProgress({ mastery, attempts, studyDates });
  }, [attempts, hydrated, mastery, studyDates]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    writeStored(storageKeys.theme, isDark ? "dark" : "light");
  }, [hydrated, isDark]);

  useEffect(() => {
    if (!focusRunning || focusStartedAt === null) return;
    const update = () => {
      const remaining = Math.max(0, focusTotalSeconds - Math.floor((Date.now() - focusStartedAt) / 1000));
      setFocusSeconds(remaining);
      if (remaining === 0) {
        setFocusRunning(false);
        setFocusStartedAt(null);
        setStudyDates((previous) => previous.includes(dayKey()) ? previous : [...previous, dayKey()].slice(-180));
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning, focusStartedAt, focusTotalSeconds]);

  useEffect(() => {
    if (!hydrated) return;
    if (focusRunning && focusStartedAt !== null) {
      writeStored(storageKeys.focus, JSON.stringify({ totalSeconds: focusTotalSeconds, startedAt: focusStartedAt }));
    } else {
      removeStored(storageKeys.focus);
    }
  }, [focusRunning, focusStartedAt, focusTotalSeconds, hydrated]);

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
    if (!focusOpen && !setupOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    const modal = focusOpen ? focusModalRef : setupModalRef;
    const frame = window.requestAnimationFrame(() => {
      (focusOpen ? modalCloseRef.current : setupPrimaryRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && focusOpen) {
        event.preventDefault();
        setFocusOpen(false);
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
  }, [focusOpen, setupOpen]);

  useEffect(() => {
    return () => {
      const current = audioRef.current;
      if (!current) return;
      current.node.disconnect();
      void current.context.close();
    };
  }, []);

  const hasPractice = (conceptId: string) => problemByConcept.has(conceptId);
  const isUnlocked = (concept: Concept) => concept.requires.every((id) => (mastery[id] ?? 0) >= 3);
  const nextConcept = (() => {
    const now = currentTime();
    const candidates = concepts
      .filter((concept) => {
        const dueAt = attempts[concept.id]?.dueAt;
        const due = Boolean(dueAt && Date.parse(dueAt) <= now);
        return concept.course !== "III" && isUnlocked(concept) && ((mastery[concept.id] ?? 0) < 4 || due) && hasPractice(concept.id);
      })
      .sort((a, b) => {
        const due = (concept: Concept) => {
          const dueAt = attempts[concept.id]?.dueAt;
          return dueAt && Date.parse(dueAt) <= now ? 0 : 1;
        };
        const priority = (value: string) => (value === "core" ? 0 : value === "support" ? 1 : 2);
        return due(a) - due(b) || (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0) || priority(a.priority) - priority(b.priority) || (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999);
      });
    return candidates[0] ?? concepts.find((concept) => concept.course !== "III" && hasPractice(concept.id)) ?? concepts[0];
  })();
  const selectedConcept = conceptById.get(selectedConceptId) ?? nextConcept;
  const currentPractice = problemBank.find((problem) => problem.id === practiceProblemId) ?? problemBank[0];
  const currentMock = mockProblems[mockIndex] ?? mockProblems[0];

  const totalAttempts = Object.values(attempts).reduce((sum, value) => sum + value.total, 0);
  const totalCorrect = Object.values(attempts).reduce((sum, value) => sum + value.correct, 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const commonTestConcepts = concepts.filter(isCommonTestConcept);
  const availableConceptCount = problemByConcept.size;
  const learnedCount = commonTestConcepts.filter((concept) => (mastery[concept.id] ?? 0) >= 3).length;
  const coreConcepts = commonTestConcepts.filter((concept) => concept.priority === "core");
  const coreLearned = coreConcepts.filter((concept) => (mastery[concept.id] ?? 0) >= 3).length;
  const coreCoverage = coreConcepts.length ? Math.round((coreLearned / coreConcepts.length) * 100) : 0;
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
      return Boolean(concept && concept.course !== "III" && isUnlocked(concept));
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

  function beginFocus(minutes: number) {
    const seconds = minutes * 60;
    setFocusTotalSeconds(seconds);
    setFocusSeconds(seconds);
    setFocusStartedAt(Date.now());
    setFocusRunning(true);
    setFocusOpen(false);
  }

  function stopFocus() {
    setFocusRunning(false);
    setFocusStartedAt(null);
    setFocusSeconds(focusTotalSeconds);
    setFocusOpen(false);
    removeStored(storageKeys.focus);
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
    void saveProgress({ mastery: mergedMastery, attempts, studyDates });
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
    const payload = { exportedAt: new Date().toISOString(), mastery, attempts, studyDates, curriculum: "high_school_math_concepts.v1" };
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
    setMastery({});
    setAttempts({});
    setStudyDates([]);
    setFocusRunning(false);
    setFocusStartedAt(null);
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
            <h2>今日は、次の1概念だけ。</h2>
            <p className="hero-description">依存関係と解答履歴から、いま最も伸びやすい入口を選びました。10分で「分かる」を「解ける」に変える。</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => openPracticeFor(target)}>この概念を始める <span>→</span></button>
              <button className="button button-ghost" onClick={() => setFocusOpen(true)}>集中タイマー</button>
            </div>
          </div>
          <div className="coverage-orb" style={{ background: `conic-gradient(var(--lime) ${coreCoverage}%, var(--line) 0)` }}>
            <div className="orb-inner"><strong>{coreCoverage}%</strong><span>共テ対象</span></div>
          </div>
          <div className="hero-meta"><span>{targetDue ? "復習期限" : "現在の推奨"}</span><strong>{courseLabels[target.course]} / {target.id}</strong><small>{target.unit}</small></div>
        </section>

        <section className="target-card panel-card">
          <div className="target-index">01</div>
          <div className="target-content">
            <p className="eyebrow">TODAY&apos;S CONCEPT</p>
            <h3>{target.title}</h3>
            <p>{target.target}</p>
            <div className="tag-row"><span className="tag">{courseLabels[target.course]}</span><span className="tag">{target.priority === "core" ? "共テの幹線" : "補助レーン"}</span>{target.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="target-side"><span>{targetDue ? "復習" : "推定"}</span><strong>{targetProblem?.estimatedSeconds ? `${Math.ceil(targetProblem.estimatedSeconds / 60)}分` : "10分"}</strong><button className="text-button" type="button" onClick={() => setActiveTab("map")}>マップで見る →</button></div>
        </section>

        <div className="section-heading"><div><p className="eyebrow">YOUR SIGNALS</p><h3>学習の現在地</h3></div><span className="quiet-label">端末内に保存</span></div>
        <section className="metric-grid">
          <article className="metric-card"><span className="metric-label">標準到達</span><strong>{learnedCount}<small> / {commonTestConcepts.length}</small></strong><div className="mini-bar"><i style={{ width: `${(learnedCount / commonTestConcepts.length) * 100}%` }} /></div><p>{availableConceptCount}概念に演習あり</p></article>
          <article className="metric-card"><span className="metric-label">正答率</span><strong>{accuracy}<small>%</small></strong><div className="mini-bar"><i style={{ width: `${accuracy}%` }} /></div><p>{totalAttempts ? `${totalCorrect} / ${totalAttempts}問` : "最初の1問を解こう"}</p></article>
          <article className="metric-card"><span className="metric-label">学習した日</span><strong>{studyDates.length}<small>日</small></strong><div className="streak-dots">{[0, 1, 2, 3, 4, 5, 6].map((day) => <i className={day < streak ? "active" : ""} key={day} />)}</div><p>{streak ? `現在の連続は${streak}日` : "今日の1問で記録"}</p></article>
        </section>

        <section className="focus-strip panel-card"><div><p className="eyebrow accent">FOCUS MODE</p><h3>短く集中して、記録を残す</h3><p>タイマー中は画面を絞り、終わったら次の一手へ。</p></div><button className="button button-secondary" onClick={() => setFocusOpen(true)}>時間を選ぶ <span>↗</span></button></section>
      </div>
    );
  }

  function renderMap() {
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">CONCEPT MAP</p><h2>320概念の依存グラフ</h2><p>単元ではなく、1つの技能を解放して進む。</p></div><div className="map-count"><strong>{learnedCount}</strong><span> / {commonTestConcepts.length} 共テ対象</span></div></div>
        <section className="map-toolbar panel-card"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="概念名・ID・タグで検索" value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="概念名・ID・タグで検索" /></label><div className="filter-row">{(["all", "bridge", "I", "A", "II", "B", "C", "III"] as CourseFilter[]).map((course) => <button key={course} className={`filter-chip ${mapCourse === course ? "selected" : ""}`} aria-pressed={mapCourse === course} onClick={() => setMapCourse(course)}>{course === "all" ? "すべて" : courseLabels[course]}</button>)}</div></section>
        <section className="concept-list">
          {filteredConcepts.map((concept) => {
            const level = mastery[concept.id] ?? 0;
            const unlocked = isUnlocked(concept);
            const available = hasPractice(concept.id);
            const expanded = expandedConceptId === concept.id;
            return (
              <div className={`concept-item ${expanded ? "expanded" : ""} ${!unlocked ? "locked" : ""}`} key={concept.id}>
                <button className="concept-row-main" type="button" aria-expanded={expanded} onClick={() => { setSelectedConceptId(concept.id); setExpandedConceptId(expanded ? null : concept.id); }}>
                  <span className="concept-id">{concept.id}</span><span className="concept-name">{concept.title}</span><span className="concept-course">{courseLabels[concept.course]}</span><span className="mastery-dots" aria-label={`レベル${level}`}>{[0, 1, 2, 3].map((dot) => <i className={dot < level ? "filled" : ""} key={dot} />)}</span><span className={`state-label ${unlocked ? "ready" : "locked-label"}`}>{unlocked ? levelLabel(level) : "前提待ち"}</span><span className="chevron">{expanded ? "−" : "+"}</span>
                </button>
                {expanded && <div className="concept-detail"><div><p>{concept.target}</p><div className="tag-row">{concept.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>{concept.requires.length > 0 && <small>前提：{concept.requires.map((id) => conceptById.get(id)?.title ?? id).join(" / ")}</small>}</div><button className="button button-small" type="button" disabled={!unlocked || !available} onClick={() => openPracticeFor(concept)}>{!unlocked ? "前提を先に" : available ? "この概念を練習" : "問題準備中"} <span>→</span></button></div>}
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
          <aside className="side-stack"><section className="concept-side panel-card"><p className="eyebrow">LINKED CONCEPT</p><span className="side-id">{selectedConcept.id}</span><h3>{selectedConcept.title}</h3><p>{selectedConcept.target}</p><div className="side-level"><span>現在地</span><strong>Lv.{selectedLevel}</strong><small>{levelLabel(selectedLevel)}</small></div><button className="text-button" onClick={() => { setActiveTab("map"); setMapSearch(selectedConcept.id); }}>マップで確認 →</button></section><section className="tip-card"><span className="tip-icon">✦</span><div><strong>共テのコツ</strong><p>正答後に「なぜその式になるか」を一文で言えたら、次の概念へ進もう。</p></div></section></aside>
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
      {focusOpen && <div className="modal-backdrop" role="presentation"><section ref={focusModalRef} className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title" aria-describedby="focus-description"><button ref={modalCloseRef} className="modal-close" type="button" onClick={() => setFocusOpen(false)} aria-label="閉じる">×</button><p className="eyebrow accent">FOCUS MODE</p>{focusRunning ? <><h2 id="focus-title">集中を続けています。</h2><p id="focus-description">残り時間は端末内に保存されるので、画面を閉じても再開できます。</p><div className="focus-live"><strong>{formatTime(focusSeconds)}</strong><span>残り時間</span></div><div className="hero-actions"><button className="button button-secondary" type="button" onClick={() => setFocusOpen(false)}>戻る</button><button className="button button-danger" type="button" onClick={stopFocus}>集中を終了</button></div></> : <><h2 id="focus-title">何分、ここに置く？</h2><p id="focus-description">タイマーを終えるまで、今日の1概念に集中する。</p><div className="duration-grid">{[10, 20, 40].map((minutes) => <button key={minutes} type="button" className={`duration-button ${focusTotalSeconds === minutes * 60 ? "selected" : ""}`} onClick={() => { setFocusTotalSeconds(minutes * 60); setFocusSeconds(minutes * 60); }}><strong>{minutes}</strong><span>min</span></button>)}</div><div className="focus-noise"><div><strong>ピンクノイズ</strong><span>{noiseOn ? "再生中" : "オフ"}</span></div><button className="toggle-button" type="button" aria-pressed={noiseOn} onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></div><button className="button button-primary wide" type="button" onClick={() => beginFocus(Math.round(focusTotalSeconds / 60))}>集中を始める <span>→</span></button></>}</section></div>}
      {setupOpen && <div className="modal-backdrop" role="presentation"><section ref={setupModalRef} className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-description"><div className="setup-mark">Σ</div><p className="eyebrow accent">YOUR STARTING POINT</p><h2 id="setup-title">数学を、概念からつなぐ。</h2><p id="setup-description">320の概念を依存順に並べ、毎日の「次の一手」だけを出します。まずは今の状態に近い入口を選んでください。</p><div className="setup-actions"><button ref={setupPrimaryRef} className="setup-choice primary" type="button" onClick={skipFoundation}><span><strong>数学I「数と式」から始める</strong><small>橋渡しを確認済みとして、I-01から始める</small></span><b>→</b></button><button className="setup-choice" type="button" onClick={startDiagnostic}><span><strong>橋渡しから1問ずつ始める</strong><small>F-01から解き、回答に合わせて次の入口を選ぶ</small></span><b>→</b></button></div><small className="setup-note">あとから設定で記録を消去できます。</small></section></div>}
    </main>
  );
}
