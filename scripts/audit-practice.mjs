import fs from "node:fs";

const concepts = JSON.parse(fs.readFileSync("data/math-concepts.json", "utf8")).concepts;
const [{ problemBank }, { buildProblemStages, problemForConcept, delayedProblemForConcept }] = await Promise.all([
  import("../app/problem-bank.ts"),
  import("../app/practice-engine.ts"),
]);

const stages = buildProblemStages(problemBank);
const errors = [];
const selected = [];
const genericPatterns = ["最初に行うべきことは？", "保つべき目標は？", "用語の名前だけを答える"];

for (const concept of concepts) {
  const row = [];
  let quickPrompt;
  for (const [level, kind] of [[0, "quick"], [1, "standard"], [2, "transfer"]]) {
    const problem = problemForConcept(concept.id, level, stages);
    if (!problem) {
      errors.push(`${concept.id}/${kind}: no selected problem`);
      continue;
    }
    selected.push(problem.id);
    row.push(problem.id);
    if (problem.kind !== kind) errors.push(`${concept.id}/${kind}: selected ${problem.id} is ${problem.kind}`);
    if (kind === "quick") quickPrompt = problem.prompt;
    if (kind === "transfer" && quickPrompt && problem.prompt.replace(/^転移練習：/u, "") === quickPrompt) errors.push(`${concept.id}/transfer: transfer prompt repeats quick prompt`);
    if (!problem.conceptIds.includes(concept.id)) errors.push(`${concept.id}/${kind}: selected problem is not tagged to concept`);
    if (problem.options.length !== 4 || new Set(problem.options).size !== 4) errors.push(`${concept.id}/${kind}: expected four unique options`);
    if (!Number.isSafeInteger(problem.answer) || problem.answer < 0 || problem.answer >= problem.options.length) errors.push(`${concept.id}/${kind}: invalid answer index`);
    if (!problem.prompt.trim() || !problem.explanation.trim()) errors.push(`${concept.id}/${kind}: missing prompt or explanation`);
    if (problem.id.startsWith("X4-B")) errors.push(`${concept.id}/${kind}: generic bulk item selected (${problem.id})`);
    if (genericPatterns.some((pattern) => problem.prompt.includes(pattern))) errors.push(`${concept.id}/${kind}: generic prompt selected (${problem.id})`);
  }
  if (new Set(row).size !== 3) errors.push(`${concept.id}: staged quick/standard/transfer are not three distinct items`);
  const delayed = delayedProblemForConcept(concept.id, stages);
  if (!delayed || delayed.id !== `AUTO-${concept.id}-delayed`) errors.push(`${concept.id}/delayed: no dedicated delayed retest`);
  const transfer = row[2] ? problemBank.find((problem) => problem.id === row[2]) : undefined;
  if (delayed && (delayed.kind !== "transfer" || row.includes(delayed.id) || delayed.prompt.includes("次の問題を解き直せ") || (transfer && delayed.prompt === transfer.prompt && delayed.options.join("\u001f") === transfer.options.join("\u001f") && delayed.answer === transfer.answer))) errors.push(`${concept.id}/delayed: delayed retest is not distinct from the staged transfer`);
}

const promptOwners = new Map();
for (const problem of problemBank) {
  if (problem.id.startsWith("X4-B")) {
    const [conceptId] = problem.conceptIds;
    if (!conceptId || problem.conceptIds.length !== 1 || !problem.prompt.includes(conceptId)) errors.push(`${problem.id}: bulk problem is not explicitly tied to one concept`);
    if (!problem.options.includes(problem.options[problem.answer]) || !problem.explanation.includes(problem.options[problem.answer])) errors.push(`${problem.id}: bulk explanation does not name its correct option`);
  }
  const owners = promptOwners.get(problem.prompt) ?? [];
  owners.push(problem.id);
  promptOwners.set(problem.prompt, owners);
}
for (const [prompt, owners] of promptOwners) {
  if (owners.length > 1) errors.push(`duplicate problem prompt: ${owners.join(", ")} (${prompt})`);
}

const result = {
  ok: errors.length === 0,
  concepts: concepts.length,
  problems: problemBank.length,
  stagedSelections: selected.length,
  distinctSelections: new Set(selected).size,
  delayedRetests: concepts.filter((concept) => delayedProblemForConcept(concept.id, stages)?.id === `AUTO-${concept.id}-delayed`).length,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
