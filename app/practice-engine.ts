import type { Problem } from "./problem-bank";

export type ProblemStageMap = Map<string, Partial<Record<Problem["kind"], Problem[]>>>;

export const problemKindOrder: Record<Problem["kind"], number> = { quick: 0, standard: 1, transfer: 2 };

export function primaryConceptIdForProblem(problem: Problem) {
  return problem.primaryConceptId ?? problem.conceptIds[0];
}

export function buildProblemStages(problemBank: Problem[]) {
  const firstByConcept = new Map<string, Problem>();
  const problemsByConcept = new Map<string, Problem[]>();
  const stagedProblemsByConcept: ProblemStageMap = new Map();
  for (const problem of problemBank) {
    for (const conceptId of problem.conceptIds) {
      const related = problemsByConcept.get(conceptId) ?? [];
      related.push(problem);
      problemsByConcept.set(conceptId, related);
    }
    const primaryConceptId = primaryConceptIdForProblem(problem);
    if (!primaryConceptId) continue;
    if (!firstByConcept.has(primaryConceptId)) firstByConcept.set(primaryConceptId, problem);
    const byKind = stagedProblemsByConcept.get(primaryConceptId) ?? {};
    const list = byKind[problem.kind] ?? [];
    list.push(problem);
    byKind[problem.kind] = list;
    stagedProblemsByConcept.set(primaryConceptId, byKind);
  }
  return { firstByConcept, problemsByConcept, stagedProblemsByConcept };
}

export function problemForConcept(
  conceptId: string,
  masteryLevel: number,
  stages: Pick<ReturnType<typeof buildProblemStages>, "firstByConcept" | "problemsByConcept" | "stagedProblemsByConcept">,
) {
  const stage: Problem["kind"] = masteryLevel <= 0 ? "quick" : masteryLevel === 1 ? "standard" : "transfer";
  const staged = stages.stagedProblemsByConcept.get(conceptId)?.[stage] ?? [];
  if (masteryLevel === 3) {
    const delayed = staged.find((problem) => problem.id === `AUTO-${conceptId}-delayed`);
    if (delayed) return delayed;
  }
  const concrete = staged.filter((problem) => problem.id.startsWith(`AUTO-${conceptId}-`) && !problem.id.endsWith("-delayed"));
  const fallback = [...(stages.problemsByConcept.get(conceptId) ?? [])]
    .sort((a, b) => problemKindOrder[a.kind] - problemKindOrder[b.kind] || a.id.localeCompare(b.id))[0];
  return concrete[0] ?? staged[0] ?? fallback ?? stages.firstByConcept.get(conceptId);
}

export function delayedProblemForConcept(
  conceptId: string,
  stages: Pick<ReturnType<typeof buildProblemStages>, "problemsByConcept" | "stagedProblemsByConcept">,
) {
  const candidates = [
    ...(stages.stagedProblemsByConcept.get(conceptId)?.transfer ?? []),
    ...(stages.problemsByConcept.get(conceptId) ?? []),
  ].filter((problem, index, all) => all.findIndex((candidate) => candidate.id === problem.id) === index);
  return candidates.find((problem) => problem.id === `AUTO-${conceptId}-delayed`)
    ?? candidates.find((problem) => problem.kind === "transfer" && problem.id !== `AUTO-${conceptId}-transfer`)
    ?? candidates[0];
}
