// 優先度エンジン + 今日のプラン生成 + スコア推定。
// 指針: 期待得点上昇 × 出題重要度 × 配点価値 × 忘却/復習 ÷ 所要時間。
// 数学だけ・全科目均等、のどちらにも偏らないよう科目キャップを設ける。

import { SCORE_SLOTS, SUBJECT_BY_ID, type LearningSubjectId, type OsUnit, type UnitState, daysLeft } from "./model";
import { allUnits } from "./units";
import type { OsState } from "./state";

export type TaskKind = "learn" | "review" | "record" | "diagnostic";

export type PlanTask = {
  id: string;
  kind: TaskKind;
  subjectId?: LearningSubjectId;
  unitId?: string;
  label: string;
  minutes: number;
  reason: string;
};

// ---- 単位時間あたりの得点効率で優先度を決める ----
export function unitPriority(unit: OsUnit, state: UnitState | undefined, nowMs: number): number {
  const level = state?.level ?? 0;
  if (level >= 4) return 0; // 遅延復習済は新規タスクにしない
  const remaining = (4 - level) / 4;                          // 伸びしろ 0-1
  const importance = unit.importance;                          // 出題頻度 1-3
  const weight = unit.weight;                                  // 配点価値
  const reviewBoost = state?.dueAt && Date.parse(state.dueAt) <= nowMs ? 1.5 : 1; // 忘れる前に
  const newBoost = level === 0 ? 1.2 : 1;                      // 未履修は解説コストが低い
  const minutes = Math.max(5, unit.estimatedMinutes);
  return (remaining * importance * weight * reviewBoost * newBoost * 100) / minutes;
}

// ---- 科目の推定得点率（0-1） ----
export function subjectEstimate(subjectId: LearningSubjectId, osState: OsState): number {
  const subject = SUBJECT_BY_ID.get(subjectId);
  if (!subject) return 0;
  const units = allUnits.filter((unit) => unit.subjectId === subjectId);
  if (units.length === 0) return subject.baselinePct;
  // コンテンツ理解スコア
  const totalWeight = units.reduce((sum, unit) => sum + unit.weight, 0);
  const achieved = units.reduce((sum, unit) => {
    const level = osState.unitStates[unit.id]?.level ?? 0;
    return sum + (Math.min(4, level) / 4) * unit.weight;
  }, 0);
  const contentScore = totalWeight > 0 ? achieved / totalWeight : 0;
  // 記録スコア（直近3件の平均）。科目名で記録しても集約slotで記録しても拾う。
  const slotId = SCORE_SLOTS.find((slot) => slot.subjects.includes(subjectId))?.id;
  const recentRecords = osState.records.filter((record) => record.slotId === subjectId || (slotId !== undefined && record.slotId === slotId))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 3);
  const recordScore = recentRecords.length > 0
    ? recentRecords.reduce((sum, record) => sum + record.score / record.maxScore, 0) / recentRecords.length
    : null;
  // 推定: 記録があるなら記録寄り、ないなら基準値にコンテンツ進捗で上乗せ
  if (recordScore !== null) {
    return Math.min(0.98, Math.max(subject.baselinePct, 0.5 * recordScore + 0.5 * Math.max(contentScore, subject.baselinePct)));
  }
  // baselineを下限、学習で上限0.9に近づくモデル（現実的な推定値）
  const ceiling = subjectId === "info" ? 0.95 : 0.85;
  return Math.min(ceiling, subject.baselinePct + (ceiling - subject.baselinePct) * Math.max(0, contentScore));
}

// ---- 全体推定（1000点満点換算） ----
export function totalEstimate(osState: OsState, mathEstimate: { ia: number; iibc: number }): { points: number; pct: number } {
  const science2 = osState.scienceChoice ?? "bio";
  const social2 = osState.socialChoice ?? "world";
  const slotPct: Record<string, number> = {
    kokugo: Math.max(subjectEstimate("modern", osState), 0.3) * 0.5 + Math.max(subjectEstimate("kobun", osState), 0.05) * 0.3 + Math.max(subjectEstimate("kanbun", osState), 0.05) * 0.2,
    "math-ia": mathEstimate.ia,
    "math-iibc": mathEstimate.iibc,
    "eng-r": subjectEstimate("eng-r", osState),
    "eng-l": subjectEstimate("eng-l", osState),
    info: subjectEstimate("info", osState),
    physics: subjectEstimate("physics", osState),
    science2: subjectEstimate(science2, osState),
    seikei: subjectEstimate("seikei", osState),
    social2: subjectEstimate(social2, osState),
  };
  let points = 0;
  for (const slot of SCORE_SLOTS) {
    const pct = slotPct[slot.id] ?? 0;
    points += pct * slot.maxPoints;
  }
  return { points: Math.round(points), pct: Math.round((points / 1000) * 100) };
}

// ---- 今日のプラン（時間→タスク列） ----
export function buildPlan(minutes: number, osState: OsState, mathNextUnitId?: string, mathNextLabel?: string, nowMs = Date.now()): PlanTask[] {
  const tasks: PlanTask[] = [];
  const subjectMinutes: Partial<Record<LearningSubjectId, number>> = {};
  const cap = Math.max(45, Math.floor(minutes * 0.55)); // 1科目に最大55% or 45分

  const candidates = allUnits
    .filter((unit) => {
      const st = osState.unitStates[unit.id];
      return (st?.level ?? 0) < 4;
    })
    .sort((a, b) => unitPriority(b, osState.unitStates[b.id], nowMs) - unitPriority(a, osState.unitStates[a.id], nowMs));

  const dueReviews = candidates.filter((unit) => {
    const st = osState.unitStates[unit.id];
    return st?.dueAt && Date.parse(st.dueAt) <= nowMs && st.level >= 1;
  });
  const fresh = candidates.filter((unit) => !dueReviews.find((d) => d.id === unit.id));

  // まず復習期限のもの（上位3件まで）
  for (const unit of dueReviews.slice(0, 3)) {
    if (tasks.length >= 3) break;
    const remaining = minutes - tasks.reduce((s, t) => s + t.minutes, 0);
    const min = Math.min(unit.estimatedMinutes, remaining);
    if (min < 5) break;
    tasks.push({ id: `rev-${unit.id}`, kind: "review", subjectId: unit.subjectId, unitId: unit.id, label: `${SUBJECT_BY_ID.get(unit.subjectId)?.shortLabel}: ${unit.title}の復習`, minutes: min, reason: "復習期限" });
    subjectMinutes[unit.subjectId] = (subjectMinutes[unit.subjectId] ?? 0) + min;
  }

  // 数学タスク（既存エンジンの次の概念）。非数学の候補があるときはその分を残す。
  if (mathNextUnitId && tasks.length < 3) {
    const remaining = minutes - tasks.reduce((s, t) => s + t.minutes, 0);
    const mathMinutes = Math.min(30, fresh.length > 0 ? Math.max(10, remaining - 12) : remaining);
    if (mathMinutes >= 10 && remaining >= 10) {
      tasks.push({ id: `math-${mathNextUnitId}`, kind: "learn", unitId: mathNextUnitId, label: `数学: ${mathNextLabel ?? mathNextUnitId}`, minutes: mathMinutes, reason: "優先度高" });
    }
  }

  // 新規単元（科目キャップをかけながら）
  for (const unit of fresh) {
    if (tasks.length >= 3) break;
    const used = subjectMinutes[unit.subjectId] ?? 0;
    const remaining = minutes - tasks.reduce((s, t) => s + t.minutes, 0);
    const allowed = Math.min(cap - used, remaining);
    const min = Math.min(unit.estimatedMinutes, allowed);
    if (min < 8) continue;
    tasks.push({ id: `learn-${unit.id}`, kind: "learn", subjectId: unit.subjectId, unitId: unit.id, label: `${SUBJECT_BY_ID.get(unit.subjectId)?.shortLabel}: ${unit.title}`, minutes: min, reason: (osState.unitStates[unit.id]?.level ?? 0) === 0 ? "未履修" : "優先度高" });
    subjectMinutes[unit.subjectId] = used + min;
  }

  // 診断が未完了なら提案（最初の2日のみ）
  const days = daysLeft(nowMs);
  if (tasks.length === 0 && days > 100) {
    const undiagnosed = (Object.keys(SUBJECT_BY_ID) as LearningSubjectId[]).find((id) => !osState.diagnosticsDone[id] && (unitsBySubjectSize(id) ?? 0) > 0);
    if (undiagnosed) {
      tasks.push({ id: `diag-${undiagnosed}`, kind: "diagnostic", subjectId: undiagnosed, label: `${SUBJECT_BY_ID.get(undiagnosed)?.shortLabel}の診断`, minutes: Math.min(15, minutes), reason: "診断で穴を特定" });
    }
  }
  return tasks;
}

function unitsBySubjectSize(subjectId: LearningSubjectId) {
  return allUnits.filter((unit) => unit.subjectId === subjectId).length;
}

// ---- 60/65/70% シナリオ ----
export type Scenario = { targetPct: number; perSubject: Record<string, number> };
export const SCENARIOS: Scenario[] = [
  {
    targetPct: 60,
    perSubject: {
      kokugo: 60, "math-ia": 60, "math-iibc": 55, "eng-r": 62, "eng-l": 60, info: 82, physics: 50, science2: 55, seikei: 60, social2: 55,
    },
  },
  {
    targetPct: 65,
    perSubject: {
      kokugo: 65, "math-ia": 65, "math-iibc": 62, "eng-r": 68, "eng-l": 65, info: 85, physics: 55, science2: 60, seikei: 65, social2: 60,
    },
  },
  {
    targetPct: 70,
    perSubject: {
      kokugo: 68, "math-ia": 70, "math-iibc": 68, "eng-r": 72, "eng-l": 70, info: 90, physics: 62, science2: 65, seikei: 70, social2: 65,
    },
  },
];

export function gapToScenario(scenario: Scenario, osState: OsState, mathEstimate: { ia: number; iibc: number }) {
  const science2 = osState.scienceChoice ?? "bio";
  const social2 = osState.socialChoice ?? "world";
  const current: Record<string, number> = {
    kokugo: Math.round(Math.max(subjectEstimate("modern", osState), 0.3) * 50 + Math.max(subjectEstimate("kobun", osState), 0.05) * 30 + Math.max(subjectEstimate("kanbun", osState), 0.05) * 20),
    "math-ia": Math.round(mathEstimate.ia * 100),
    "math-iibc": Math.round(mathEstimate.iibc * 100),
    "eng-r": Math.round(subjectEstimate("eng-r", osState) * 100),
    "eng-l": Math.round(subjectEstimate("eng-l", osState) * 100),
    info: Math.round(subjectEstimate("info", osState) * 100),
    physics: Math.round(subjectEstimate("physics", osState) * 100),
    science2: Math.round(subjectEstimate(science2, osState) * 100),
    seikei: Math.round(subjectEstimate("seikei", osState) * 100),
    social2: Math.round(subjectEstimate(social2, osState) * 100),
  };
  return SCORE_SLOTS.map((slot) => ({
    slotId: slot.id,
    label: slot.label,
    current: current[slot.id] ?? 0,
    target: scenario.perSubject[slot.id] ?? 60,
    gap: (scenario.perSubject[slot.id] ?? 60) - (current[slot.id] ?? 0),
  }));
}
