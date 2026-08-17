import conceptData from "../../data/math-concepts.json" with { type: "json" };
import { fullCourseGuides } from "./full-course.ts";
import { lessonModules as lessonModules01 } from "./lesson-modules.ts";
import { lessonModulesBatch02 } from "./lesson-modules-batch-02.ts";
import { lessonModulesBatch03 } from "./lesson-modules-batch-03.ts";
import { lessonModulesBatch04a } from "./lesson-modules-batch-04a.ts";
import { lessonModulesBatch04b } from "./lesson-modules-batch-04b.ts";
import { lessonModulesBatch05a } from "./lesson-modules-batch-05a.ts";
import { lessonModulesBatch05b } from "./lesson-modules-batch-05b.ts";
import { scopeCardFor } from "./scope-cards.ts";
import { scopeCardForAdvanced } from "./scope-cards-advanced.ts";
import type { Problem } from "../problem-bank";

type Concept = (typeof conceptData.concepts)[number];

const kinds: Problem["kind"][] = ["quick", "standard", "transfer"];

function optionsFor(correct: string, seed: number, extraDistractors: string[] = []) {
  const distractors = [
    ...extraDistractors,
    "用語の名前だけを答える",
    "条件を確認せずに計算を始める",
    "前提と結論を逆にする",
    "別の概念の公式を使う",
    "この情報だけでは判断できない",
  ].filter((value) => value !== correct).slice(0, 3);
  const values = [correct, ...distractors];
  const shift = seed % values.length;
  const options = values.map((_, index) => values[(index - shift + values.length) % values.length]);
  return { options, answer: options.indexOf(correct) };
}

function makeFallbackProblem(concept: Concept, kind: Problem["kind"], seed: number): Problem {
  const guide = fullCourseGuides()[concept.id];
  const correct = kind === "quick" ? guide.definition : kind === "standard" ? guide.firstMove : concept.target;
  const prompt = kind === "quick"
    ? `「${concept.title}」の意味として最も適切なものは？`
    : kind === "standard"
      ? `「${concept.title}」を使う問題で、最初に行うべきことは？`
      : `別の文脈で「${concept.title}」を使うとき、保つべき目標は？`;
  const choice = optionsFor(correct, seed);
  return {
    id: `AUTO-${concept.id}-${kind}`,
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: `${concept.title}｜${kind}`,
    prompt,
    options: choice.options,
    answer: choice.answer,
    explanation: `${correct}。${guide.trap}`,
    kind,
    estimatedSeconds: kind === "quick" ? 45 : kind === "standard" ? 75 : 100,
  };
}

const authoredLessonByConcept = new Map([
  ...lessonModules01,
  ...lessonModulesBatch02,
  ...lessonModulesBatch03,
  ...lessonModulesBatch04a,
  ...lessonModulesBatch04b,
  ...lessonModulesBatch05a,
  ...lessonModulesBatch05b,
].map((lesson) => [lesson.conceptId, lesson] as const));

function makeLessonProblem(concept: Concept, kind: Problem["kind"], seed: number): Problem | undefined {
  const lesson = authoredLessonByConcept.get(concept.id);
  if (!lesson) return undefined;
  if (kind === "transfer") {
    const guide = fullCourseGuides()[concept.id];
    const correct = guide.firstMove;
    const choice = optionsFor(correct, seed, [guide.trap, lesson.examSignal, lesson.quickCheck.answer, concept.target]);
    return {
      id: `AUTO-${concept.id}-${kind}`,
      conceptIds: [concept.id],
      primaryConceptId: concept.id,
      title: `${concept.title}｜${kind}（新しい文脈）`,
      prompt: `転用：別の問題で「${concept.target}」を求めるとき、最初の一手として最も適切なのは？`,
      options: choice.options,
      answer: choice.answer,
      explanation: `${correct}。${lesson.examSignal} 条件が変わっても、定義・既知量・未知量を対応させてから処理する。`,
      kind,
      estimatedSeconds: 120,
    };
  }
  const source = kind === "standard"
    ? { problem: lesson.workedExample.problem, answer: lesson.workedExample.answer, explanation: lesson.workedExample.steps.join(" ") }
    : { problem: lesson.quickCheck.problem, answer: lesson.quickCheck.answer, explanation: lesson.quickCheck.explanation };
  const correct = source.answer;
  const choice = optionsFor(correct, seed);
  const prompt = kind === "standard"
    ? `例題を一行ずつ追って答えよ：${source.problem}`
    : source.problem;
  return {
    id: `AUTO-${concept.id}-${kind}`,
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: `${concept.title}｜${kind}`,
    prompt,
    options: choice.options,
    answer: choice.answer,
    explanation: `${source.explanation} ${lesson.commonMistakes[0] ?? "条件を最後に検算する。"}`,
    kind,
    estimatedSeconds: kind === "quick" ? 60 : kind === "standard" ? 90 : 120,
  };
}

function makeScopeProblem(concept: Concept, kind: Problem["kind"], seed: number): Problem | undefined {
  const scope = scopeCardFor(concept) ?? scopeCardForAdvanced(concept.id);
  if (!scope) return undefined;
  const exercise = scope[kind];
  const values = [exercise.answer, ...exercise.distractors].filter((value, index, all) => all.indexOf(value) === index).slice(0, 4);
  if (values.length < 4) return undefined;
  const shift = seed % values.length;
  const options = values.map((_, index) => values[(index - shift + values.length) % values.length]);
  return {
    id: `AUTO-${concept.id}-${kind}`,
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: `${concept.title}｜${kind}`,
    prompt: exercise.prompt,
    options,
    answer: options.indexOf(exercise.answer),
    explanation: exercise.explanation,
    kind,
    estimatedSeconds: kind === "quick" ? 60 : kind === "standard" ? 90 : 120,
  };
}

function makeDelayedProblem(concept: Concept, base: Problem, seed: number): Problem {
  const guide = fullCourseGuides()[concept.id];
  const correct = guide.firstMove;
  const choice = optionsFor(correct, seed + 3, [guide.trap, concept.target, "前回の答えをそのまま写す"]);
  return {
    id: `AUTO-${concept.id}-delayed`,
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: `${concept.title}｜delayed retest`,
    prompt: `時間を置いた別形式の再テスト：「${concept.target}」を求める問題で、最初に確認すべきことを選べ。前回の解法を見ずに答える。`,
    options: choice.options,
    answer: choice.answer,
    explanation: `${correct}。${guide.definition} 遅延再テストでは、同じ問題文の暗記ではなく、判断の入口を再現できたかを記録する。`,
    kind: "transfer",
    estimatedSeconds: Math.max(base.estimatedSeconds, 90) + 15,
  };
}

export function createFullScopeProblems(existingProblems: Problem[]): Problem[] {
  const byConcept = new Map<string, Set<Problem["kind"]>>();
  for (const problem of existingProblems) {
    const conceptId = problem.primaryConceptId ?? problem.conceptIds[0];
    if (!conceptId) continue;
    const kindsForConcept = byConcept.get(conceptId) ?? new Set<Problem["kind"]>();
    kindsForConcept.add(problem.kind);
    byConcept.set(conceptId, kindsForConcept);
  }
  const generated: Problem[] = [];
  for (const [index, concept] of conceptData.concepts.entries()) {
    const present = byConcept.get(concept.id) ?? new Set<Problem["kind"]>();
    const scope = scopeCardFor(concept) ?? scopeCardForAdvanced(concept.id);
    for (const kind of kinds) {
      const candidates = existingProblems.filter((problem) => (problem.primaryConceptId ?? problem.conceptIds[0]) === concept.id && problem.kind === kind);
      const onlyBulkCandidates = candidates.length > 0 && candidates.every((problem) => problem.id.startsWith("X4-"));
      // Always materialize the concrete scope exercise when one exists. The
      // authored expansion bank contains useful exam variants, but it must not
      // shadow the concept's own quick/standard/transfer progression.
      if (scope || !present.has(kind) || onlyBulkCandidates) {
        generated.push(
          makeScopeProblem(concept, kind, index + kinds.indexOf(kind))
          ?? makeLessonProblem(concept, kind, index + kinds.indexOf(kind))
          ?? makeFallbackProblem(concept, kind, index + kinds.indexOf(kind)),
        );
      }
    }
    const transferBase = [
      ...generated.filter((problem) => (problem.primaryConceptId ?? problem.conceptIds[0]) === concept.id && problem.kind === "transfer"),
      ...existingProblems.filter((problem) => (problem.primaryConceptId ?? problem.conceptIds[0]) === concept.id && problem.kind === "transfer"),
    ].find((problem) => problem.id !== `AUTO-${concept.id}-delayed`);
    if (transferBase) generated.push(makeDelayedProblem(concept, transferBase, index));
  }
  return generated;
}
