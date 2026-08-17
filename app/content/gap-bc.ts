import type { Problem } from "../problem-bank";

/**
 * 共通テスト対象の数学B・Cで、既存バンクの演習を補うオリジナル問題。
 * B-02, C-07, C-12, C-14を1問ずつ収録する。
 */
export const gapBC: Problem[] = [
  {
    id: "GAP-BC-01",
    conceptIds: ["B-02"],
    primaryConceptId: "B-02",
    title: "一般項を漸化式に読み替える",
    prompt: "数列{aₙ}の一般項が aₙ=3×2^(n−1)−1 (n=1,2,…) で与えられている。この数列を表す漸化式として正しいものはどれ？",
    options: [
      "a₁=2, aₙ₊₁=2aₙ−1",
      "a₁=2, aₙ₊₁=2aₙ+1",
      "a₁=3, aₙ₊₁=2aₙ−1",
      "a₁=2, aₙ₊₁=aₙ+3",
    ],
    answer: 1,
    explanation: "一般項からa₁=3×2^0−1=2。また、aₙ₊₁=3×2^n−1=2(3×2^(n−1)−1)+1=2aₙ+1だから、2が正しい。",
    kind: "quick",
    estimatedSeconds: 60,
  },
  {
    id: "GAP-BC-02",
    conceptIds: ["C-07"],
    primaryConceptId: "C-07",
    title: "内分点を重み付き平均で求める",
    prompt: "2点A(−1,4), B(5,−2)を結ぶ線分を、点PがAP:PB=2:1に内分するとき、Pの座標はどれ？",
    options: ["(3,0)", "(1,2)", "(−3,0)", "(4,−1)"],
    answer: 0,
    explanation: "AP:PB=2:1なので、Pの各座標はAの重み1、Bの重み2の加重平均。よってP=((1×(−1)+2×5)/3,(1×4+2×(−2))/3)=(3,0)。",
    kind: "standard",
    estimatedSeconds: 70,
  },
  {
    id: "GAP-BC-03",
    conceptIds: ["C-12"],
    primaryConceptId: "C-12",
    title: "内積の符号から角度を判定する",
    prompt: "0でないベクトルu=(1,2), v=(−2,t)のなす角が鈍角となるtの範囲はどれ？",
    options: ["t<1", "t≤1", "t>1", "t≥1"],
    answer: 0,
    explanation: "u・v=1×(−2)+2t=2(t−1)。なす角が鈍角であるための条件は内積が負であることなので、2(t−1)<0、すなわちt<1。",
    kind: "transfer",
    estimatedSeconds: 75,
  },
  {
    id: "GAP-BC-04",
    conceptIds: ["C-14"],
    primaryConceptId: "C-14",
    title: "ベクトルが作る三角形の面積",
    prompt: "共通の始点から出る2つのベクトルの大きさが4と3、そのなす角が60°である。この2ベクトルを2辺とする三角形の面積はどれ？",
    options: ["6", "3√3", "6√3", "12"],
    answer: 1,
    explanation: "2ベクトルを2辺とする三角形の面積は、底辺×高さ÷2より(1/2)×4×3×sin60°=6×(√3/2)=3√3。",
    kind: "standard",
    estimatedSeconds: 65,
  },
];
