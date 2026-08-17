"use client";

import { useEffect, useRef, useState } from "react";
import conceptData from "@/data/math-concepts.json";
import { problemBank, type Problem } from "./problem-bank";

type Concept = (typeof conceptData.concepts)[number];
type Tab = "today" | "map" | "practice" | "mock" | "settings";
type CourseFilter = "all" | "bridge" | "I" | "A" | "II" | "B" | "C" | "III";
type Attempt = { correct: number; total: number; lastAt: string };
type Feedback = { correct: boolean; explanation: string };

const concepts = conceptData.concepts;
const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
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
const storageKeys = {
  mastery: "kyote-math-60:mastery",
  attempts: "kyote-math-60:attempts",
  initialized: "kyote-math-60:initialized",
  theme: "kyote-math-60:theme",
  noise: "kyote-math-60:noise",
};
const mockProblems = [problemBank[0], problemBank[2], problemBank[5], problemBank[8], problemBank[13], problemBank[15], problemBank[20], problemBank[24]].filter((problem): problem is Problem => Boolean(problem));

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

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [selectedConceptId, setSelectedConceptId] = useState("I-01");
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
  const audioRef = useRef<{ context: AudioContext; node: ScriptProcessorNode } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedMastery = safeParse<Record<string, number>>(window.localStorage.getItem(storageKeys.mastery), {});
      const storedAttempts = safeParse<Record<string, Attempt>>(window.localStorage.getItem(storageKeys.attempts), {});
      const storedTheme = window.localStorage.getItem(storageKeys.theme);
      const storedNoise = window.localStorage.getItem(storageKeys.noise);
      setMastery(storedMastery);
      setAttempts(storedAttempts);
      setIsDark(storedTheme !== "light");
      setNoiseOn(storedNoise === "on");
      setSetupOpen(!window.localStorage.getItem(storageKeys.initialized));
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.mastery, JSON.stringify(mastery));
    window.localStorage.setItem(storageKeys.attempts, JSON.stringify(attempts));
  }, [attempts, hydrated, mastery]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    window.localStorage.setItem(storageKeys.theme, isDark ? "dark" : "light");
  }, [hydrated, isDark]);

  useEffect(() => {
    if (!focusRunning || focusStartedAt === null) return;
    const update = () => {
      const remaining = Math.max(0, focusTotalSeconds - Math.floor((Date.now() - focusStartedAt) / 1000));
      setFocusSeconds(remaining);
      if (remaining === 0) {
        setFocusRunning(false);
        setFocusStartedAt(null);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning, focusStartedAt, focusTotalSeconds]);

  useEffect(() => {
    return () => {
      const current = audioRef.current;
      if (!current) return;
      current.node.disconnect();
      void current.context.close();
    };
  }, []);

  const isUnlocked = (concept: Concept) => concept.requires.every((id) => (mastery[id] ?? 0) >= 3);
  const nextConcept = (() => {
    const candidates = concepts
      .filter((concept) => isUnlocked(concept) && (mastery[concept.id] ?? 0) < 4)
      .sort((a, b) => {
        const priority = (value: string) => (value === "core" ? 0 : value === "support" ? 1 : 2);
        return priority(a.priority) - priority(b.priority) || (conceptOrder.get(a.id) ?? 9999) - (conceptOrder.get(b.id) ?? 9999);
      });
    return candidates[0] ?? concepts[0];
  })();
  const selectedConcept = conceptById.get(selectedConceptId) ?? nextConcept;
  const currentPractice = problemBank.find((problem) => problem.id === practiceProblemId) ?? problemBank[0];
  const currentMock = mockProblems[mockIndex] ?? mockProblems[0];

  const totalAttempts = Object.values(attempts).reduce((sum, value) => sum + value.total, 0);
  const totalCorrect = Object.values(attempts).reduce((sum, value) => sum + value.correct, 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const learnedCount = concepts.filter((concept) => (mastery[concept.id] ?? 0) >= 3).length;
  const coreConcepts = concepts.filter((concept) => concept.priority === "core");
  const coreLearned = coreConcepts.filter((concept) => (mastery[concept.id] ?? 0) >= 3).length;
  const coreCoverage = coreConcepts.length ? Math.round((coreLearned / coreConcepts.length) * 100) : 0;
  const selectedLevel = mastery[selectedConcept.id] ?? 0;
  const targetProblem = problemBank.find((problem) => problem.conceptIds.includes(nextConcept.id));
  const mockScore = mockProblems.filter((problem) => mockAnswers[problem.id] === problem.answer).length;

  const filteredConcepts = (() => {
    const query = mapSearch.trim().toLowerCase();
    return concepts.filter((concept) => {
      const courseMatch = mapCourse === "all" || concept.course === mapCourse;
      const text = `${concept.id} ${concept.title} ${concept.unit} ${concept.tags.join(" ")}`.toLowerCase();
      return courseMatch && (!query || text.includes(query));
    });
  })();

  function openPracticeFor(concept: Concept) {
    setSelectedConceptId(concept.id);
    const problem = problemBank.find((item) => item.conceptIds.includes(concept.id)) ?? problemBank[0];
    setPracticeProblemId(problem.id);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    setActiveTab("practice");
  }

  function recordAttempt(problem: Problem, correct: boolean) {
    const now = new Date().toISOString();
    setAttempts((previous) => {
      const next = { ...previous };
      for (const conceptId of problem.conceptIds) {
        const old = next[conceptId] ?? { correct: 0, total: 0, lastAt: now };
        next[conceptId] = { correct: old.correct + (correct ? 1 : 0), total: old.total + 1, lastAt: now };
      }
      return next;
    });
    if (correct) {
      setMastery((previous) => {
        const next = { ...previous };
        for (const conceptId of problem.conceptIds) next[conceptId] = Math.min(4, (next[conceptId] ?? 0) + 1);
        return next;
      });
    }
  }

  function submitPractice() {
    if (practiceAnswer === null || practiceFeedback) return;
    const correct = practiceAnswer === currentPractice.answer;
    setPracticeFeedback({ correct, explanation: currentPractice.explanation });
    recordAttempt(currentPractice, correct);
  }

  function nextPractice() {
    const alternatives = problemBank.filter((problem) => problem.id !== currentPractice.id);
    const next = alternatives.find((problem) => problem.conceptIds.some((id) => (mastery[id] ?? 0) < 3)) ?? alternatives[0];
    setPracticeProblemId(next.id);
    setPracticeAnswer(null);
    setPracticeFeedback(null);
    const firstConcept = conceptById.get(next.conceptIds[0]);
    if (firstConcept) setSelectedConceptId(firstConcept.id);
  }

  function beginFocus(minutes: number) {
    const seconds = minutes * 60;
    setFocusTotalSeconds(seconds);
    setFocusSeconds(seconds);
    setFocusStartedAt(Date.now());
    setFocusRunning(true);
    setFocusOpen(false);
  }

  function startNoise() {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const node = context.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);
        for (let index = 0; index < output.length; index += 1) output[index] = (Math.random() * 2 - 1) * 0.08;
      };
      node.connect(context.destination);
      audioRef.current = { context, node };
      setNoiseOn(true);
      window.localStorage.setItem(storageKeys.noise, "on");
    } catch {
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
    window.localStorage.setItem(storageKeys.noise, "off");
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
    const now = new Date().toISOString();
    setAttempts((previous) => {
      const next = { ...previous };
      for (const problem of mockProblems) {
        const correct = answers[problem.id] === problem.answer;
        for (const conceptId of problem.conceptIds) {
          const old = next[conceptId] ?? { correct: 0, total: 0, lastAt: now };
          next[conceptId] = { correct: old.correct + (correct ? 1 : 0), total: old.total + 1, lastAt: now };
        }
      }
      return next;
    });
    setMastery((previous) => {
      const next = { ...previous };
      for (const problem of mockProblems) {
        if (answers[problem.id] !== problem.answer) continue;
        for (const conceptId of problem.conceptIds) next[conceptId] = Math.min(4, (next[conceptId] ?? 0) + 1);
      }
      return next;
    });
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
    window.localStorage.setItem(storageKeys.mastery, JSON.stringify(mergedMastery));
    setSelectedConceptId("I-01");
    window.localStorage.setItem(storageKeys.initialized, "true");
    setSetupOpen(false);
  }

  function startDiagnostic() {
    window.localStorage.setItem(storageKeys.initialized, "true");
    setSetupOpen(false);
    setSelectedConceptId("F-02");
    setPracticeProblemId("Q-F02-01");
    setActiveTab("practice");
  }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), mastery, attempts, curriculum: "high_school_math_concepts.v1" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kyote-math-60-progress.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (!window.confirm("学習記録をすべて消去します。元に戻せません。")) return;
    window.localStorage.removeItem(storageKeys.mastery);
    window.localStorage.removeItem(storageKeys.attempts);
    window.localStorage.removeItem(storageKeys.initialized);
    setMastery({});
    setAttempts({});
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
              <button className="button button-primary" onClick={() => openPracticeFor(target)}>この概念を始める <span>→</span></button>
              <button className="button button-ghost" onClick={() => setFocusOpen(true)}>集中タイマー</button>
            </div>
          </div>
          <div className="coverage-orb" style={{ background: `conic-gradient(var(--lime) ${coreCoverage}%, var(--line) 0)` }}>
            <div className="orb-inner"><strong>{coreCoverage}%</strong><span>必須概念</span></div>
          </div>
          <div className="hero-meta"><span>現在の推奨</span><strong>{courseLabels[target.course]} / {target.id}</strong><small>{target.unit}</small></div>
        </section>

        <section className="target-card panel-card">
          <div className="target-index">01</div>
          <div className="target-content">
            <p className="eyebrow">TODAY&apos;S CONCEPT</p>
            <h3>{target.title}</h3>
            <p>{target.target}</p>
            <div className="tag-row"><span className="tag">{courseLabels[target.course]}</span><span className="tag">{target.priority === "core" ? "共テの幹線" : "補助レーン"}</span>{target.tags.slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="target-side"><span>推定</span><strong>{targetProblem?.estimatedSeconds ? `${Math.ceil(targetProblem.estimatedSeconds / 60)}分` : "10分"}</strong><button className="text-button" onClick={() => setActiveTab("map")}>マップで見る →</button></div>
        </section>

        <div className="section-heading"><div><p className="eyebrow">YOUR SIGNALS</p><h3>学習の現在地</h3></div><span className="quiet-label">端末内に保存</span></div>
        <section className="metric-grid">
          <article className="metric-card"><span className="metric-label">標準到達</span><strong>{learnedCount}<small> / {concepts.length}</small></strong><div className="mini-bar"><i style={{ width: `${(learnedCount / concepts.length) * 100}%` }} /></div><p>概念レベル3以上</p></article>
          <article className="metric-card"><span className="metric-label">正答率</span><strong>{accuracy}<small>%</small></strong><div className="metric-spark"><i /><i /><i /><i /><i /></div><p>{totalAttempts ? `${totalAttempts}問を記録` : "最初の1問を解こう"}</p></article>
          <article className="metric-card"><span className="metric-label">連続日数</span><strong>0<small>日</small></strong><div className="streak-dots"><i className="active" /><i /><i /><i /><i /><i /><i /></div><p>毎日1概念で十分</p></article>
        </section>

        <section className="focus-strip panel-card"><div><p className="eyebrow accent">FOCUS MODE</p><h3>短く集中して、記録を残す</h3><p>タイマー中は画面を絞り、終わったら次の一手へ。</p></div><button className="button button-secondary" onClick={() => setFocusOpen(true)}>時間を選ぶ <span>↗</span></button></section>
      </div>
    );
  }

  function renderMap() {
    return (
      <div className="page-stack">
        <div className="page-heading"><div><p className="eyebrow accent">CONCEPT MAP</p><h2>320概念の依存グラフ</h2><p>単元ではなく、1つの技能を解放して進む。</p></div><div className="map-count"><strong>{learnedCount}</strong><span> / {concepts.length} 到達</span></div></div>
        <section className="map-toolbar panel-card"><label className="search-box"><span>⌕</span><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="概念名・ID・タグで検索" /></label><div className="filter-row">{(["all", "bridge", "I", "A", "II", "B", "C", "III"] as CourseFilter[]).map((course) => <button key={course} className={`filter-chip ${mapCourse === course ? "selected" : ""}`} onClick={() => setMapCourse(course)}>{course === "all" ? "すべて" : courseLabels[course]}</button>)}</div></section>
        <section className="concept-list">
          {filteredConcepts.map((concept) => {
            const level = mastery[concept.id] ?? 0;
            const unlocked = isUnlocked(concept);
            const expanded = selectedConcept.id === concept.id;
            return (
              <div className={`concept-item ${expanded ? "expanded" : ""} ${!unlocked ? "locked" : ""}`} key={concept.id}>
                <button className="concept-row-main" onClick={() => setSelectedConceptId(concept.id)}>
                  <span className="concept-id">{concept.id}</span><span className="concept-name">{concept.title}</span><span className="concept-course">{courseLabels[concept.course]}</span><span className="mastery-dots" aria-label={`レベル${level}`}>{[0, 1, 2, 3].map((dot) => <i className={dot < level ? "filled" : ""} key={dot} />)}</span><span className={`state-label ${unlocked ? "ready" : "locked-label"}`}>{unlocked ? levelLabel(level) : "前提待ち"}</span><span className="chevron">{expanded ? "−" : "+"}</span>
                </button>
                {expanded && <div className="concept-detail"><div><p>{concept.target}</p><div className="tag-row">{concept.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>{concept.requires.length > 0 && <small>前提：{concept.requires.map((id) => conceptById.get(id)?.title ?? id).join(" / ")}</small>}</div><button className="button button-small" disabled={!unlocked} onClick={() => openPracticeFor(concept)}>{unlocked ? "この概念を練習" : "前提を先に"} <span>→</span></button></div>}
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
          <section className="question-card panel-card"><div className="question-top"><span>{currentPractice.id}</span><span>目安 {currentPractice.estimatedSeconds}秒</span></div><h3>{currentPractice.title}</h3><p className="question-prompt">{currentPractice.prompt}</p><div className="option-list">{currentPractice.options.map((option, index) => <button className={`option-button ${practiceAnswer === index ? "chosen" : ""} ${practiceFeedback && index === currentPractice.answer ? "correct-option" : ""} ${practiceFeedback && practiceAnswer === index && index !== currentPractice.answer ? "wrong-option" : ""}`} key={option} onClick={() => !practiceFeedback && setPracticeAnswer(index)}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span>{practiceFeedback && index === currentPractice.answer && <span className="answer-mark">✓</span>}</button>)}</div><div className="question-actions">{practiceFeedback ? <button className="button button-primary" onClick={nextPractice}>次の1問へ <span>→</span></button> : <button className="button button-primary" disabled={practiceAnswer === null} onClick={submitPractice}>答えを記録する <span>↗</span></button>}{selectedOption && !practiceFeedback && <span className="selected-note">選択：{selectedOption}</span>}</div>{practiceFeedback && <div className={`feedback-box ${practiceFeedback.correct ? "success" : "retry"}`}><strong>{practiceFeedback.correct ? "正解。概念レベルを更新した。" : "今回はここで止めてOK。解説から戻ろう。"}</strong><p>{practiceFeedback.explanation}</p>{!practiceFeedback.correct && <button className="text-button" onClick={() => setPracticeAnswer(currentPractice.answer)}>正答を表示</button>}</div>}</section>
          <aside className="side-stack"><section className="concept-side panel-card"><p className="eyebrow">LINKED CONCEPT</p><span className="side-id">{selectedConcept.id}</span><h3>{selectedConcept.title}</h3><p>{selectedConcept.target}</p><div className="side-level"><span>現在地</span><strong>Lv.{selectedLevel}</strong><small>{levelLabel(selectedLevel)}</small></div><button className="text-button" onClick={() => { setActiveTab("map"); setMapSearch(selectedConcept.id); }}>マップで確認 →</button></section><section className="tip-card"><span className="tip-icon">✦</span><div><strong>共テのコツ</strong><p>正答後に「なぜその式になるか」を一文で言えたら、次の概念へ進もう。</p></div></section></aside>
        </div>
      </div>
    );
  }

  function renderMock() {
    if (mockFinished) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow accent">MINI MOCK</p><h2>結果を次の学習へつなぐ</h2><p>採点は目安。弱点概念をマップから拾い直せる。</p></div></div><section className="result-card panel-card"><div className="result-score"><strong>{mockScore * 12.5}</strong><span>/ 100</span><small>8問ミニ模試</small></div><div className="result-message"><p className="eyebrow">YOUR READOUT</p><h3>{mockScore >= 5 ? "幹線がつながってきた" : "まずは取り切れる概念から"}</h3><p>{mockScore} / {mockProblems.length}問正解。マップで未到達のcore概念を1つ選び、次の10分に変換しよう。</p><button className="button button-primary" onClick={() => { setMockFinished(false); setActiveTab("map"); }}>弱点をマップで見る <span>→</span></button></div></section><button className="button button-ghost" onClick={startMock}>もう一度ミニ模試</button></div>;
    if (!mockActive) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow accent">MINI MOCK</p><h2>本番前の8問スキャン</h2><p>数学I・A・II・B・Cの幹線から、いまの取りこぼしを確認する。</p></div></div><section className="mock-intro panel-card"><div className="mock-number">08</div><div><p className="eyebrow">SHORT SESSION</p><h3>12分で、現在地を測る</h3><p>オリジナル問題8問。解説は後出しにして、本番と同じ順番判断を練習する。</p><button className="button button-primary" onClick={startMock}>模試を始める <span>→</span></button></div></section><div className="mock-rules"><span>01　途中で戻れる</span><span>02　最後に一括採点</span><span>03　概念別に記録</span></div></div>;
    const currentAnswer = mockAnswers[currentMock.id];
    return <div className="page-stack"><div className="mock-progress"><span>MINI MOCK</span><strong>{String(mockIndex + 1).padStart(2, "0")} <small>/ {String(mockProblems.length).padStart(2, "0")}</small></strong><span>採点は最後</span></div><section className="question-card mock-question panel-card"><div className="question-top"><span>{currentMock.id}</span><span>{courseLabels[conceptById.get(currentMock.conceptIds[0])?.course ?? "I"]}</span></div><h3>{currentMock.title}</h3><p className="question-prompt">{currentMock.prompt}</p><div className="option-list">{currentMock.options.map((option, index) => <button className={`option-button ${currentAnswer === index ? "chosen" : ""}`} key={option} onClick={() => setMockAnswers((previous) => ({ ...previous, [currentMock.id]: index }))}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</div><div className="question-actions"><button className="button button-primary" disabled={currentAnswer === undefined} onClick={advanceMock}>{mockIndex === mockProblems.length - 1 ? "採点する" : "次の問題へ"} <span>→</span></button><span className="selected-note">解答済み {Object.keys(mockAnswers).length} / {mockProblems.length}</span></div></section></div>;
  }

  function renderSettings() {
    return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow accent">SETTINGS</p><h2>自分のペースを設計する</h2><p>データはこの端末に保存。いつでも書き出せる。</p></div></div><section className="settings-grid"><article className="setting-card panel-card"><div><p className="eyebrow">DISPLAY</p><h3>表示モード</h3><p>長時間見ても情報量を絞れる配色。</p></div><button className="toggle-button" onClick={() => setIsDark((value) => !value)}><span className={isDark ? "toggle-knob on" : "toggle-knob"} /><span>{isDark ? "Dark" : "Light"}</span></button></article><article className="setting-card panel-card"><div><p className="eyebrow">FOCUS SOUND</p><h3>ピンクノイズ</h3><p>集中モードの開始後に、ブラウザ内で再生。</p></div><button className="toggle-button" onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></article><article className="setting-card panel-card"><div><p className="eyebrow">PORTABILITY</p><h3>学習記録を保存</h3><p>別端末への移行用にJSONで書き出す。</p></div><button className="button button-secondary" onClick={exportData}>エクスポート <span>↓</span></button></article><article className="setting-card panel-card danger-card"><div><p className="eyebrow">RESET</p><h3>最初からやり直す</h3><p>概念の到達度と正答履歴を消去する。</p></div><button className="button button-danger" onClick={resetData}>記録を消去</button></article></section><section className="about-card panel-card"><div className="about-mark">Σ</div><div><p className="eyebrow">ABOUT THIS BUILD</p><h3>共テ数学60 / v0.1</h3><p>高校数学 I・A・II・B・C・III を、依存関係のある320概念として扱うローカルファーストPWA。目標は「全部やる」ではなく、共通テストで取り切る幹線をつなぐこと。</p></div></section></div>;
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
      <header className="topbar"><div className="brand"><div className="brand-mark">Σ</div><div><p className="brand-kicker">COMMON TEST / MATH</p><h1>共テ数学60</h1></div></div><div className="topbar-right"><span className="offline-pill"><i />オフライン対応</span><button className="icon-button" aria-label="テーマ切替" onClick={() => setIsDark((value) => !value)}>{isDark ? "☼" : "◐"}</button></div></header>
      <div className="workspace"><nav className="sidebar" aria-label="メインナビゲーション">{tabItems.map((item) => <button className={`nav-item ${activeTab === item.id ? "active" : ""}`} key={item.id} onClick={() => setActiveTab(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === "practice" && totalAttempts > 0 && <i className="nav-dot" />}</button>)}<div className="sidebar-bottom"><p>概念データ</p><strong>{concepts.length}</strong><span>nodes / local</span></div></nav><section className="main-content">{activeTab === "today" && renderToday()}{activeTab === "map" && renderMap()}{activeTab === "practice" && renderPractice()}{activeTab === "mock" && renderMock()}{activeTab === "settings" && renderSettings()}</section></div>
      {focusRunning && <button className="focus-running" onClick={() => setFocusOpen(true)}><span className="pulse-dot" />FOCUS <strong>{formatTime(focusSeconds)}</strong></button>}
      {focusOpen && <div className="modal-backdrop" role="presentation"><section className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-title"><button className="modal-close" onClick={() => setFocusOpen(false)} aria-label="閉じる">×</button><p className="eyebrow accent">FOCUS MODE</p><h2 id="focus-title">何分、ここに置く？</h2><p>タイマーを終えるまで、今日の1概念に集中する。</p><div className="duration-grid">{[10, 20, 40].map((minutes) => <button key={minutes} className={`duration-button ${focusTotalSeconds === minutes * 60 ? "selected" : ""}`} onClick={() => { setFocusTotalSeconds(minutes * 60); setFocusSeconds(minutes * 60); }}><strong>{minutes}</strong><span>min</span></button>)}</div><div className="focus-noise"><div><strong>ピンクノイズ</strong><span>{noiseOn ? "再生中" : "オフ"}</span></div><button className="toggle-button" onClick={toggleNoise}><span className={noiseOn ? "toggle-knob on" : "toggle-knob"} /><span>{noiseOn ? "On" : "Off"}</span></button></div><button className="button button-primary wide" onClick={() => beginFocus(Math.round(focusTotalSeconds / 60))}>集中を始める <span>→</span></button></section></div>}
      {setupOpen && <div className="modal-backdrop" role="presentation"><section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div className="setup-mark">Σ</div><p className="eyebrow accent">YOUR STARTING POINT</p><h2 id="setup-title">数学を、概念からつなぐ。</h2><p>320の概念を依存順に並べ、毎日の「次の一手」だけを出します。まずは今の状態に近い入口を選んでください。</p><div className="setup-actions"><button className="setup-choice primary" onClick={skipFoundation}><span><strong>数学I「数と式」から始める</strong><small>中学橋渡しを確認済みとして、I-01を解放</small></span><b>→</b></button><button className="setup-choice" onClick={startDiagnostic}><span><strong>まず10分診断する</strong><small>中学橋渡しから、つまずきの入口を探す</small></span><b>→</b></button></div><small className="setup-note">あとから設定で記録を消去できます。</small></section></div>}
    </main>
  );
}
