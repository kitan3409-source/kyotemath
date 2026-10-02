import { infoUnits } from "./units-info";
import { seikeiUnits } from "./units-seikei";
import { physicsUnits } from "./units-physics";
import { kokugoUnits } from "./units-kokugo";
import { englishUnits } from "./units-english";
import { science2Units } from "./units-science2";
import { social2Units } from "./units-social2";
import type { LearningSubjectId, OsUnit } from "./model";

export const allUnits: OsUnit[] = [
  ...infoUnits,
  ...seikeiUnits,
  ...physicsUnits,
  ...kokugoUnits,
  ...englishUnits,
  ...science2Units,
  ...social2Units,
];

export const unitsBySubject = new Map<LearningSubjectId, OsUnit[]>();
for (const unit of allUnits) {
  const list = unitsBySubject.get(unit.subjectId) ?? [];
  list.push(unit);
  unitsBySubject.set(unit.subjectId, list);
}

export const unitById = new Map<string, OsUnit>(allUnits.map((unit) => [unit.id, unit]));

// 各科目の診断に使う問題（その単元を代表する1問目=quick）
export function diagnosticProblems(subjectId: LearningSubjectId) {
  const units = unitsBySubject.get(subjectId) ?? [];
  return units.flatMap((unit) => unit.problems.filter((p) => p.kind === "quick").map((problem) => ({ unitId: unit.id, unitTitle: unit.title, problem })).slice(0, 1));
}
