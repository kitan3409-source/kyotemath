import conceptData from "../../data/math-concepts.json" with { type: "json" };
import { bridgeGuides } from "./bridge-guides.ts";
import { conceptGuides } from "./concept-guides.ts";
import { math3Specs } from "./math3-course.ts";
import { scopeCardFor } from "./scope-cards.ts";
import { scopeCardForAdvanced } from "./scope-cards-advanced.ts";
import type { ConceptGuide } from "./concept-guides";
import type { LessonModule } from "./lesson-modules";

type Concept = (typeof conceptData.concepts)[number];

const guides: Record<string, ConceptGuide> = { ...conceptGuides, ...bridgeGuides };

function fallbackGuide(concept: Concept): ConceptGuide {
  return {
    id: concept.id,
    definition: `${concept.title}は、${concept.target}ための考え方。用語の意味と、何を入力して何を判断するかを先に分ける。`,
    firstMove: `問題文から「${concept.target}」に必要な条件を拾い、既知量・未知量・使える関係を1行に整理する。`,
    trap: `「${concept.title}」という名前だけで公式を選び、定義域・単位・条件・答えの意味を確認しない。`,
  };
}

function concreteGuide(concept: Concept): ConceptGuide | undefined {
  const math3 = math3Specs[concept.id];
  if (math3) {
    return {
      id: concept.id,
      definition: math3.definition,
      firstMove: math3.firstMove,
      trap: math3.trap,
    };
  }
  const scope = scopeCardFor(concept) ?? scopeCardForAdvanced(concept.id);
  if (scope) return { id: concept.id, definition: scope.definition, firstMove: scope.firstMove, trap: scope.trap };
  return undefined;
}

function generatedForConcept(concept: Concept): LessonModule {
  const math3 = math3Specs[concept.id];
  if (math3) {
    return {
      id: `LM-${concept.id}`,
      conceptId: concept.id,
      title: concept.title,
      goal: concept.target,
      prerequisiteIds: concept.requires,
      explanation: `${math3.definition}\n\n最初の一手：${math3.firstMove}`,
      whyItMatters: `${concept.unit}の中で、${concept.target}。この概念を前の概念とつなげると、数IIIの複合問題で式の意味を保ったまま処理できる。`,
      workedExample: { problem: math3.workedProblem, steps: math3.workedSteps, answer: math3.workedAnswer },
      commonMistakes: [math3.trap, "途中式を省略して、どの条件を使ったか分からなくする。", "答えの単位・定義域・符号を最後に確認しない。"],
      quickCheck: { problem: math3.quickProblem, answer: math3.quickAnswer, explanation: math3.quickExplanation },
      examSignal: `「${concept.title}」と判断したら、${math3.firstMove}`,
    };
  }

  const scope = scopeCardFor(concept) ?? scopeCardForAdvanced(concept.id);
  if (scope) {
    return {
      id: `LM-${concept.id}`,
      conceptId: concept.id,
      title: concept.title,
      goal: concept.target,
      prerequisiteIds: concept.requires,
      explanation: `${scope.definition}\n\n最初の一手：${scope.firstMove}`,
      whyItMatters: `${concept.unit}で${concept.target}。定義を具体例へ落とし、条件から方法を選ぶ練習をする。`,
      workedExample: scope.workedExample,
      commonMistakes: [scope.trap, "途中式を省略して、どの条件を使ったか分からなくする。", "答えの単位・定義域・符号を最後に確認しない."],
      quickCheck: { problem: scope.quick.prompt, answer: scope.quick.answer, explanation: scope.quick.explanation },
      examSignal: `「${concept.title}」と判断したら、${scope.firstMove}`,
    };
  }

  const guide = guides[concept.id] ?? fallbackGuide(concept);
  const prerequisiteText = concept.requires.length > 0 ? `前提は${concept.requires.join("・")}。` : "前提概念がないため、用語の意味から始める。";
  return {
    id: `LM-${concept.id}`,
    conceptId: concept.id,
    title: `${concept.title}を、条件から使う`,
    goal: concept.target,
    prerequisiteIds: concept.requires,
    explanation: `${guide.definition}\n\n最初の一手：${guide.firstMove}\n\n${prerequisiteText}問題では、求める量と条件を言葉で分けてから式・図・表へ翻訳する。`,
    whyItMatters: `${concept.unit}で${concept.target}。単独の公式暗記ではなく、条件から方法を選ぶ練習として扱う。`,
    workedExample: {
      problem: `${concept.title}を使う場面を、次の目標に沿って整理せよ：「${concept.target}」`,
      steps: [
        `問題の目的を「${concept.target}」と読み替える。`,
        `条件を既知量・未知量・制約に分け、${guide.firstMove}`,
        `最後に、得た結果が問題の条件と${concept.title}の定義に合うかを検算する。`,
      ],
      answer: `${concept.title}の定義と条件を対応させ、${concept.target}状態まで説明できること。`,
    },
    commonMistakes: [guide.trap, "条件を式へ移す前に、使う公式や記号を決め打ちする。", "答えだけを書き、どの条件から出たかを説明できない。"],
    quickCheck: {
      problem: `次のうち「${concept.title}」を使う最初の一手として適切なのは？`,
      answer: guide.firstMove,
      explanation: `この概念では、まず${guide.firstMove}。定義や条件を飛ばさない。`,
    },
    examSignal: `「${concept.title}」が出たら、${guide.firstMove}`,
  };
}

export function createGeneratedLessons(existingLessonIds: Set<string>): LessonModule[] {
  return conceptData.concepts.filter((concept) => !existingLessonIds.has(concept.id)).map(generatedForConcept);
}

export function fullCourseGuides(): Record<string, ConceptGuide> {
  return Object.fromEntries(conceptData.concepts.map((concept) => [concept.id, guides[concept.id] ?? concreteGuide(concept) ?? fallbackGuide(concept)]));
}
