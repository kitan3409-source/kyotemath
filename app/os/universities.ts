// 志望大学の2027年度入試要件（公式調査結果）と換算シミュレーション。
// 合格判定はしない。配点換算と効率の良い科目の可視化のみ。

import type { ScienceChoice, SocialChoice } from "./model";

export type UniversityPlan = {
  id: string;
  name: string;
  faculty: string;
  track: string;                    // 前期/後期など
  totalPoints: number;              // 合計満点（共テ+個別）
  ctWeight: number;                 // 共テ分の満点（全体比で分かる）
  individualWeight: number;         // 個別分の満点
  ctSubjects: { slot: string; points: number; required: boolean; note?: string }[];
  individualNotes: string;
  math3Needed: boolean;             // 個別に数Ⅲを含むか
  notes: string[];
};

// 共テ slotId -> 換算点。ユーザー入力は各slotの得点率(0-100)。
export function convertedScore(plan: UniversityPlan, pct: Record<string, number>, science2: ScienceChoice, social2: SocialChoice) {
  let total = 0;
  const details: { slot: string; points: number; earned: number }[] = [];
  for (const s of plan.ctSubjects) {
    const resolved = resolveSlot(s.slot, science2, social2);
    const p = pct[resolved] ?? 0;
    const earned = (p / 100) * s.points;
    total += earned;
    details.push({ slot: `${s.slot}${s.required ? "" : "（選択）"}`, points: s.points, earned: Math.round(earned) });
  }
  return { total: Math.round(total), max: plan.ctWeight, details };
}

function resolveSlot(slot: string, science2: ScienceChoice, social2: SocialChoice) {
  if (slot === "science2") return science2;
  if (slot === "social2") return social2;
  return slot;
}

export const UNIVERSITIES: UniversityPlan[] = [
  {
    id: "hiroshima-cu-info-zenki",
    name: "広島市立大学",
    faculty: "情報科学部 情報学科",
    track: "前期",
    totalPoints: 1200, ctWeight: 800, individualWeight: 400,
    ctSubjects: [
      { slot: "math-ia", points: 100, required: true, note: "数ⅠA" },
      { slot: "math-iibc", points: 100, required: true, note: "数ⅡBC" },
      { slot: "physics", points: 200, required: true, note: "物/化/生から1科目（高得点利用）" },
      { slot: "info", points: 200, required: true },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
    ],
    individualNotes: "数学400点（ⅠⅡⅢABC・120分）",
    math3Needed: true,
    notes: ["国語・社会不要。理系寄りの構成", "情報Ⅰが共テ800点中200点（25%）"],
  },
  {
    id: "hiroshima-cu-info-kouki",
    name: "広島市立大学",
    faculty: "情報科学部 情報学科",
    track: "後期",
    totalPoints: 900, ctWeight: 600, individualWeight: 300,
    ctSubjects: [
      { slot: "math-ia", points: 100, required: true },
      { slot: "math-iibc", points: 100, required: true },
      { slot: "info", points: 200, required: true },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
    ],
    individualNotes: "情報Ⅰ300点（90分。「コミュニケーションと情報デザイン」は「情報のデジタル化」のみ）",
    math3Needed: false,
    notes: ["国語・社会・理科不要", "情報Ⅰの強みが最も効く形式", "前期不合格でも出願可能"],
  },
  {
    id: "tottori-eng-denki",
    name: "鳥取大学",
    faculty: "工学部 電気情報系学科",
    track: "前期",
    totalPoints: 820, ctWeight: 460, individualWeight: 360,
    ctSubjects: [
      { slot: "kokugo", points: 100, required: true },
      { slot: "seikei", points: 50, required: true, note: "地歴公民1科目（第1解答科目）" },
      { slot: "math-ia", points: 50, required: true, note: "数ⅠA必須" },
      { slot: "math-iibc", points: 50, required: true, note: "数ⅡBC必須" },
      { slot: "physics", points: 50, required: true, note: "物理必須" },
      { slot: "science2", points: 50, required: true, note: "化/生/地から1" },
      { slot: "eng-r", points: 80, required: true },
      { slot: "eng-l", points: 20, required: true },
      { slot: "info", points: 10, required: true },
    ],
    individualNotes: "数（ⅠⅡⅢABC)200 ＋ 理（物基・物）150 or 英150 → 350、書類10",
    math3Needed: true,
    notes: ["物理必須", "6教科8科目のオーソドックス型", "情報Ⅰは10点で比重小"],
  },
  {
    id: "tottori-eng-denki-kouki",
    name: "鳥取大学",
    faculty: "工学部 電気情報系学科",
    track: "後期",
    totalPoints: 870, ctWeight: 660, individualWeight: 210,
    ctSubjects: [
      { slot: "kokugo", points: 100, required: true },
      { slot: "seikei", points: 50, required: true },
      { slot: "math-ia", points: 50, required: true },
      { slot: "math-iibc", points: 50, required: true },
      { slot: "physics", points: 100, required: true, note: "理科2科目のうち物理必須" },
      { slot: "science2", points: 100, required: true },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
      { slot: "info", points: 10, required: true },
    ],
    individualNotes: "数学200（ⅠⅡⅢABC）＋書類10",
    math3Needed: true,
    notes: ["理科・英語の比重が前期より大きい"],
  },
  {
    id: "kagawa-souzou-a",
    name: "香川大学",
    faculty: "創造工学部 創造工学科（情報・人工知能等）",
    track: "前期Aタイプ",
    totalPoints: 1200, ctWeight: 900, individualWeight: 300,
    ctSubjects: [
      { slot: "kokugo", points: 200, required: true },
      { slot: "seikei", points: 100, required: true, note: "地歴公民1科目（第1解答科目）" },
      { slot: "math-ia", points: 100, required: true },
      { slot: "math-iibc", points: 100, required: true },
      { slot: "physics", points: 100, required: true, note: "物理必須" },
      { slot: "science2", points: 100, required: true, note: "化/生/地から1" },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
      { slot: "info", points: 25, required: true },
    ],
    individualNotes: "数学（ⅠⅡⅢABC）・物（基・物）・化（基・化）・地（基・地）から1〜2科目（300〜600）。個別は1科目=300、2科目=配点Ⅰ(300）または配点Ⅱ（高得点教科400+もう一方200=600）",
    math3Needed: true,
    notes: ["物理必須", "情報・人工知能コースも同じ要件", "配点Ⅰ・Ⅱは自動で高い方を採用"],
  },
  {
    id: "kagawa-souzou-kouki",
    name: "香川大学",
    faculty: "創造工学部 創造工学科（全コース）",
    track: "後期",
    totalPoints: 1000, ctWeight: 900, individualWeight: 100,
    ctSubjects: [
      { slot: "kokugo", points: 200, required: true },
      { slot: "seikei", points: 100, required: true },
      { slot: "math-ia", points: 100, required: true },
      { slot: "math-iibc", points: 100, required: true },
      { slot: "physics", points: 100, required: true, note: "理2科目（うち物理必須ではないが物理が有利）" },
      { slot: "science2", points: 100, required: true },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
      { slot: "info", points: 25, required: true },
    ],
    individualNotes: "小論文100",
    math3Needed: false,
    notes: ["個別が小論文のみ（数Ⅲ不要）"],
  },
  {
    id: "kut-info-a",
    name: "高知工科大学",
    faculty: "情報学群（AI・CS・VR・脳情報）",
    track: "前期A方式",
    totalPoints: 1300, ctWeight: 900, individualWeight: 400,
    ctSubjects: [
      { slot: "kokugo", points: 200, required: true },
      { slot: "seikei", points: 100, required: true, note: "地歴公民と情報Ⅰの高得点を利用" },
      { slot: "info", points: 100, required: true },
      { slot: "math-ia", points: 100, required: true },
      { slot: "math-iibc", points: 100, required: true },
      { slot: "physics", points: 100, required: true, note: "理2科目（基礎4[除地学基礎]or物/化/生）" },
      { slot: "science2", points: 100, required: true },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
    ],
    individualNotes: "理科・情報（物基・物/化基・化/生基・生/情Ⅰから1）90分200 ＋ 数学（ⅠⅡⅢABC）120分200",
    math3Needed: true,
    notes: ["個別で「情報Ⅰ」を選べば理科の個別対策を薄められる", "地歴公民と情報Ⅰの高得点を採用"],
  },
  {
    id: "kut-info-kouki",
    name: "高知工科大学",
    faculty: "情報学群",
    track: "後期",
    totalPoints: 900, ctWeight: 900, individualWeight: 0,
    ctSubjects: [
      { slot: "kokugo", points: 200, required: true, note: "国語と理科の高得点" },
      { slot: "info", points: 100, required: true },
      { slot: "math-ia", points: 200, required: true, note: "数学は2倍換算" },
      { slot: "math-iibc", points: 200, required: true },
      { slot: "physics", points: 100, required: true, note: "理1科目（物/化/生）" },
      { slot: "eng-r", points: 160, required: true },
      { slot: "eng-l", points: 40, required: true },
    ],
    individualNotes: "個別なし",
    math3Needed: false,
    notes: ["共テのみ（後期）", "数学の比重が大きい（2倍）"],
  },
];

// 「あと10点ならど科目が最効率」の計算。
// ある科目の得点率を+10%pt上げたときの換算点増分が最大の科目を返す。
export function bestMarginalSubject(plan: UniversityPlan, pct: Record<string, number>, science2: ScienceChoice, social2: SocialChoice) {
  const scored = plan.ctSubjects
    .map((s) => ({ slot: resolveSlot(s.slot, science2, social2), rawSlot: s.slot, points: s.points, headroom: Math.max(0, 100 - (pct[resolveSlot(s.slot, science2, social2)] ?? 0)) }))
    .filter((entry) => entry.headroom >= 5); // ほぼ天井の科目は除く
  if (scored.length === 0) return null;
  const best = scored.reduce((a, b) => (b.points > a.points ? b : a));
  return { slot: best.slot, gainPoints: best.points * 0.1, currentPct: pct[best.slot] ?? 0 };
}
