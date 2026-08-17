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

function distractorsFor(concept: Concept, variant: number) {
  if (variant === 0) {
    return [
      `「${concept.title}」を、条件や定義を確認せず数値だけ計算すること。`,
      `「${concept.title}」は、問題に出た記号の名前をそのまま答えること。`,
      `「${concept.title}」では、どの問題にも同じ公式を条件なしで使うこと。`,
    ];
  }
  if (variant === 1) {
    return [
      "問題文の条件を読まず、記憶した公式をいきなり適用する。",
      "答えの選択肢から逆算し、定義や条件を確認しない。",
      "必要な量を整理せず、計算結果を最後に推測する。",
    ];
  }
  return [
    "定義と条件を確認してから、対象概念に沿って処理する。",
    "必要な条件を式・図・表に整理し、答えを検算する。",
    "別の公式を決め打ちせず、問題の対象概念との対応を確かめる。",
  ];
}

function specFor(concept: Concept, variant: number): Spec {
  const guide = guides[concept.id];
  if (variant === 0) {
    const correct = guide.definition;
    return {
      title: "意味を定義から確認",
      prompt: `「${concept.id} ${concept.title}」について、意味・定義として正しいものはどれか。`,
      correct,
      distractors: distractorsFor(concept, variant),
      explanation: `この概念の定義は「${correct}」。まず何を表す概念かを固定してから計算へ進む。`,
    };
  }
  if (variant === 1) {
    const correct = guide.firstMove;
    return {
      title: "最初の一手を選ぶ",
      prompt: `「${concept.id} ${concept.title}」を使う問題で、最初の一手として最も適切なものはどれか。`,
      correct,
      distractors: distractorsFor(concept, variant),
      explanation: `最初に行うのは「${correct}」。条件を整理してから式・図・表へ移す。`,
    };
  }
  const correct = guide.trap;
  return {
    title: "典型的な罠を見抜く",
    prompt: `「${concept.id} ${concept.title}」で起こりやすい誤り・注意点として正しいものはどれか。`,
    correct,
    distractors: distractorsFor(concept, variant),
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
  kinds.map((_, variant) => makeProblem(concept, index, variant, specFor(concept, variant))),
);
