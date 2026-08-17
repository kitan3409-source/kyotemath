import conceptData from "../../data/math-concepts.json" with { type: "json" };
import type { Problem } from "../problem-bank";
import { fullCourseGuides } from "./full-course.ts";

/**
 * 共通テスト対象の各概念に、quick / standard / transferを1問ずつ割り当てる補強バンク。
 * 問題の本文は概念ごとの定義・最初の一手・典型的な罠から作る。
 * 数字だけを差し替えた別概念の問題を割り当てないため、概念IDと測定内容が一致する。
 */
type Concept = (typeof conceptData.concepts)[number];
type Kind = Problem["kind"];
type GuideField = "definition" | "firstMove" | "trap";
type Spec = {
  title: string;
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
};

const kinds: Kind[] = ["quick", "standard", "transfer"];
const targetConcepts = conceptData.concepts.filter(
  (concept) => ["I", "A", "II", "B", "C"].includes(concept.course) && concept.priority === "core",
);
const guides = fullCourseGuides();

function choose(correct: string, distractors: string[], seed: number) {
  const values = [correct, ...distractors];
  const shift = seed % 4;
  const options = values.map((_, index) => values[(index - shift + 4) % 4]);
  return { options, answer: options.indexOf(correct) };
}

function pickDistractors(field: GuideField, correct: string, seed: number) {
  const pool = targetConcepts
    .map((concept) => guides[concept.id]?.[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0 && value !== correct);
  const unique = [...new Set(pool)];
  const selected: string[] = [];
  for (let offset = 0; selected.length < 3 && offset < unique.length * 2; offset += 1) {
    const candidate = unique[(seed * 11 + offset * 7) % unique.length];
    if (candidate && !selected.includes(candidate)) selected.push(candidate);
  }
  return selected.slice(0, 3);
}

function specFor(concept: Concept, index: number, variant: number): Spec {
  const guide = guides[concept.id];
  const field: GuideField = variant === 0 ? "definition" : variant === 1 ? "firstMove" : "trap";
  const correct = guide[field];
  const distractors = pickDistractors(field, correct, index + variant + 1);
  if (variant === 0) {
    return {
      title: "意味を定義から確認",
      prompt: `「${concept.id} ${concept.title}」について、意味・定義として正しいものはどれか。`,
      correct,
      distractors,
      explanation: `この概念の定義は「${correct}」。まず何を表す概念かを固定してから計算へ進む。`,
    };
  }
  if (variant === 1) {
    return {
      title: "最初の一手を選ぶ",
      prompt: `「${concept.id} ${concept.title}」を使う問題で、最初の一手として最も適切なものはどれか。`,
      correct,
      distractors,
      explanation: `最初に行うのは「${correct}」。条件を整理してから式・図・表へ移す。`,
    };
  }
  return {
    title: "典型的な罠を見抜く",
    prompt: `「${concept.id} ${concept.title}」で起こりやすい誤り・注意点として正しいものはどれか。`,
    correct,
    distractors,
    explanation: `注意点は「${correct}」。答えを出した後も、この条件を使って検算する。`,
  };
}

function makeProblem(concept: Concept, index: number, variant: number, spec: Spec): Problem {
  const choice = choose(spec.correct, spec.distractors, index + variant);
  return {
    id: "X4-B" + String(index * 3 + variant + 1).padStart(3, "0"),
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: concept.title + "｜" + spec.title,
    prompt: spec.prompt,
    options: choice.options,
    answer: choice.answer,
    explanation: spec.explanation,
    kind: kinds[variant],
    estimatedSeconds: 45 + variant * 15,
  };
}

export const problemExpansionBulk: Problem[] = targetConcepts.flatMap((concept, index) =>
  kinds.map((_, variant) => makeProblem(concept, index, variant, specFor(concept, index, variant))),
);
