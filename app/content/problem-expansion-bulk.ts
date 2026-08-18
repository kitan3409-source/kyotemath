import conceptData from "../../data/math-concepts.json" with { type: "json" };
import type { Problem } from "../problem-bank";
import { fullCourseGuides } from "./full-course.ts";
import { scopeCardFor, type ScopeExercise } from "./scope-cards.ts";
import { scopeCardForAdvanced } from "./scope-cards-advanced.ts";
import { lessonModules as lessonModules01, type LessonModule } from "./lesson-modules.ts";
import { lessonModulesBatch02 } from "./lesson-modules-batch-02.ts";
import { lessonModulesBatch03 } from "./lesson-modules-batch-03.ts";
import { lessonModulesBatch04a } from "./lesson-modules-batch-04a.ts";
import { lessonModulesBatch04b } from "./lesson-modules-batch-04b.ts";
import { lessonModulesBatch05a } from "./lesson-modules-batch-05a.ts";
import { lessonModulesBatch05b } from "./lesson-modules-batch-05b.ts";

/**
 * 共通テスト対象の各概念に、quick / standard / transferを1問ずつ割り当てる補強バンク。
 * 問題の本文はscope cardまたは手書きレッスンの例題から作る。
 * 概念名だけを問うメタ質問を避け、数値・条件・式を含む補強問題にする。
 */
type Concept = (typeof conceptData.concepts)[number];
type Kind = Problem["kind"];
const kinds: Kind[] = ["quick", "standard", "transfer"];
const targetConcepts = conceptData.concepts.filter(
  (concept) => ["I", "A", "II", "B", "C"].includes(concept.course) && concept.priority === "core",
);
const guides = fullCourseGuides();
const authoredLessonByConcept = new Map<string, LessonModule>([
  ...lessonModules01,
  ...lessonModulesBatch02,
  ...lessonModulesBatch03,
  ...lessonModulesBatch04a,
  ...lessonModulesBatch04b,
  ...lessonModulesBatch05a,
  ...lessonModulesBatch05b,
].map((lesson) => [lesson.conceptId, lesson] as const));

function choose(correct: string, distractors: string[], seed: number) {
  const values = [...new Set([correct, ...distractors.filter((value) => value !== correct)])].slice(0, 4);
  const fallback = [`${correct}ではない値を選ぶ。`, "条件を一つ読み落とした結果", "計算前の式の形"];
  for (const value of fallback) {
    if (values.length >= 4) break;
    if (!values.includes(value) && value !== correct) values.push(value);
  }
  const shift = seed % values.length;
  const options = values.map((_, index) => values[(index - shift + values.length) % values.length]);
  return { options, answer: options.indexOf(correct) };
}

function lessonExercise(lesson: LessonModule, kind: Kind): ScopeExercise {
  if (kind === "quick") return { prompt: lesson.quickCheck.problem, answer: lesson.quickCheck.answer, explanation: lesson.quickCheck.explanation, distractors: [] };
  if (kind === "standard") return { prompt: lesson.workedExample.problem, answer: lesson.workedExample.answer, explanation: lesson.workedExample.steps.join(" "), distractors: [] };
  return {
    prompt: `転移問題（例題とは別の表現）：${lesson.quickCheck.problem}`,
    answer: lesson.quickCheck.answer,
    explanation: `${lesson.quickCheck.explanation} 例題と表現が変わっても、条件から必要な量を決めて答えの意味を確認する。`,
    distractors: [],
  };
}

function sourceFor(concept: Concept, kind: Kind): ScopeExercise {
  const scope = scopeCardFor(concept) ?? scopeCardForAdvanced(concept.id);
  if (scope) return scope[kind];
  const lesson = authoredLessonByConcept.get(concept.id);
  if (lesson) return lessonExercise(lesson, kind);
  const guide = guides[concept.id];
  return {
    prompt: `次の目標を達成するために必要な判断を答えよ：${concept.target}`,
    answer: guide.firstMove,
    explanation: `${guide.firstMove} ${guide.trap}`,
    distractors: [],
  };
}

function distractorsFor(concept: Concept, exercise: ScopeExercise, kind: Kind) {
  const guide = guides[concept.id];
  return [
    ...exercise.distractors,
    guide.trap,
    `「${concept.title}」の条件を一つ無視した処理`,
    kind === "quick" ? guide.firstMove : "答えの単位・符号・定義域を確認しない処理",
  ];
}

function makeProblem(concept: Concept, index: number, kind: Kind, variant: number): Problem {
  const exercise = sourceFor(concept, kind);
  const choice = choose(exercise.answer, distractorsFor(concept, exercise, kind), index + variant);
  return {
    id: "X4-B" + String(index * 3 + variant + 1).padStart(3, "0"),
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: `${concept.title}｜補強${kind}`,
    prompt: `補強演習（${concept.id}）：${exercise.prompt}`,
    options: choice.options,
    answer: choice.answer,
    explanation: `正答は「${exercise.answer}」。${exercise.explanation} ${concept.title}では、問題文の条件と答えの意味を最後に照合する。`,
    kind,
    estimatedSeconds: kind === "quick" ? 60 : kind === "standard" ? 100 : 140,
  };
}

export const problemExpansionBulk: Problem[] = targetConcepts.flatMap((concept, index) =>
  kinds.map((kind, variant) => makeProblem(concept, index, kind, variant)),
);
