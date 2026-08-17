import { exercise, type ScopeCard } from "./scope-cards.ts";
import { advancedIICards } from "./scope-cards-ii.ts";
import { advancedBCards } from "./scope-cards-b.ts";
import { advancedCCards } from "./scope-cards-c.ts";

const advancedCards: Record<string, ScopeCard> = {
  ...advancedIICards,
  ...advancedBCards,
  ...advancedCCards,
};

// Corrections kept in the public composition layer so a stale long-form card
// literal cannot leak an incorrect condition into the learner-facing route.
advancedCards["II-42"] = {
  ...advancedCards["II-42"],
  standard: exercise("1+tan²θをsin,cosで表せ。ただしtanθが定義される範囲とする。", "1/cos²θ", "tanθが定義されるのでcosθ≠0。1+sin²θ/cos²θ=(sin²θ+cos²θ)/cos²θ=1/cos²θ。", ["1/sin²θ", "cos²θ", "tan²θ"]),
};
advancedCards["II-48"] = {
  ...advancedCards["II-48"],
  standard: exercise("tanx≤0を0≤x<2πで解け。", "{0}∪(π/2,π]∪(3π/2,2π)", "tanは第2・4象限で負、x=πでは0なので含む。x=0もtan0=0なので含む。x=π/2,3π/2は定義されない。", ["(π/2,π]∪(3π/2,2π)", "0≤x≤π/2", "π<x<3π/2"]),
};
advancedCards["B-09"] = {
  ...advancedCards["B-09"],
  standard: exercise("a_1=5、a_(n+1)=2a_n−4の固定点Lを引いたb_1=a_1−Lは？", "1", "固定点はL=2L−4より4。したがってb_1=5−4=1。", ["3", "5", "−1"]),
};
advancedCards["B-26"] = {
  ...advancedCards["B-26"],
  definition: "独立同分布の標本X₁,…,X_n（母平均μ、母標準偏差σ）では、標本平均の平均はμ、標準偏差はσ/√nになる。",
};
advancedCards["B-30"] = {
  ...advancedCards["B-30"],
  workedExample: {
    problem: "新薬の平均効果が0より大きいかを検定するとき、母平均μについてH₀とH₁を一例で書け。",
    steps: ["方向のある主張なので右片側検定にする。", "帰無仮説は境界を含むH₀:μ≤0。", "対立仮説はH₁:μ>0。"],
    answer: "H₀:μ≤0、H₁:μ>0",
  },
};
advancedCards["C-29"] = {
  ...advancedCards["C-29"],
  definition: "r>0なら|z−a|=rは中心a・半径rの円、|z−a|≤rは閉円盤。r=0なら点、r<0の等式・不等式は空集合になる。",
};
advancedCards["C-32"] = {
  ...advancedCards["C-32"],
  standard: exercise("x=t²,y=t³でt≥0の軌跡は？", "y²=x³、x≥0、y≥0", "x=t²、y=t³でt≥0なのでy≥0も必要。消去するとy²=x³だが上側の枝だけを取る。", ["y²=x³だけ", "y=x²", "x²+y²=1"]),
};
advancedCards["C-51"] = {
  ...advancedCards["C-51"],
  standard: exercise("確率の列ベクトルを保つ遷移行列に必要な条件は？", "各成分が非負で、各列の和が1", "確率は非負で、列ベクトルの総和を1に保つため列和が1。", ["各列の和だけが0", "各成分の和が−1", "対角成分だけが1"]),
};

export function scopeCardForAdvanced(conceptId: string): ScopeCard | undefined {
  return advancedCards[conceptId];
}

export function advancedScopeCardIds(): string[] {
  return Object.keys(advancedCards);
}
