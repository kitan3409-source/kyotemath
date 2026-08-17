import fs from "node:fs";

const concepts = JSON.parse(fs.readFileSync("data/math-concepts.json", "utf8")).concepts;
const lessonFiles = [
  "app/content/lesson-modules.ts",
  "app/content/lesson-modules-batch-02.ts",
  "app/content/lesson-modules-batch-03.ts",
  "app/content/lesson-modules-batch-04a.ts",
  "app/content/lesson-modules-batch-04b.ts",
  "app/content/lesson-modules-batch-05a.ts",
  "app/content/lesson-modules-batch-05b.ts",
];
const lessonSource = lessonFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const authoredLessonIds = new Set([...lessonSource.matchAll(/conceptId:\s*"([A-Z]+-\d+)"/g)].map((match) => match[1]));

const [{ math3Problems }, { math3Specs }, cards, advanced] = await Promise.all([
  import("../app/content/math3-problems.ts"),
  import("../app/content/math3-course.ts"),
  import("../app/content/scope-cards.ts"),
  import("../app/content/scope-cards-advanced.ts"),
]);

const errors = [];
const generatedNonIII = concepts.filter((concept) => !authoredLessonIds.has(concept.id) && concept.course !== "III");
const missingCards = generatedNonIII.filter((concept) => !cards.scopeCardFor(concept) && !advanced.scopeCardForAdvanced(concept.id));
if (missingCards.length > 0) errors.push(`missing concrete scope cards: ${missingCards.map((concept) => concept.id).join(", ")}`);

const cardIds = new Set();
for (const concept of generatedNonIII) {
  const scope = cards.scopeCardFor(concept) ?? advanced.scopeCardForAdvanced(concept.id);
  if (!scope) continue;
  cardIds.add(concept.id);
  for (const kind of ["quick", "standard", "transfer"]) {
    const exercise = scope[kind];
    if (!exercise?.prompt || !exercise.answer || !exercise.explanation) errors.push(`${concept.id}/${kind}: incomplete exercise`);
    if (!Array.isArray(exercise?.distractors) || exercise.distractors.length !== 3) errors.push(`${concept.id}/${kind}: expected 3 distractors`);
    if (exercise?.distractors && new Set(exercise.distractors).size !== exercise.distractors.length) errors.push(`${concept.id}/${kind}: duplicate distractors`);
    if (exercise?.distractors?.includes(exercise.answer)) errors.push(`${concept.id}/${kind}: answer is also a distractor`);
  }
  if (new Set([scope.quick.prompt, scope.standard.prompt, scope.transfer.prompt]).size !== 3) errors.push(`${concept.id}: duplicate scope prompts`);
  if (!scope.workedExample?.problem || scope.workedExample.steps.length < 2 || !scope.workedExample.answer) errors.push(`${concept.id}: incomplete worked example`);
}

const math3Ids = Object.keys(math3Specs);
if (math3Ids.length !== 46) errors.push(`Math III spec count ${math3Ids.length}, expected 46`);
const math3ByConcept = new Map();
for (const problem of math3Problems) {
  const list = math3ByConcept.get(problem.primaryConceptId) ?? [];
  list.push(problem);
  math3ByConcept.set(problem.primaryConceptId, list);
  if (problem.options.length !== 4 || new Set(problem.options).size !== 4) errors.push(`${problem.id}: options are not four unique choices`);
  if (!Number.isInteger(problem.answer) || problem.answer < 0 || problem.answer >= problem.options.length) errors.push(`${problem.id}: invalid answer index`);
}
for (const id of math3Ids) {
  const list = math3ByConcept.get(id) ?? [];
  if (list.length !== 3) errors.push(`${id}: expected quick/standard/transfer, got ${list.length}`);
  if (new Set(list.map((problem) => problem.prompt)).size !== list.length) errors.push(`${id}: duplicate Math III prompts`);
  const standard = list.find((problem) => problem.kind === "standard");
  if (!standard || standard.prompt === math3Specs[id].workedProblem) errors.push(`${id}: standard repeats worked example`);
}

const result = {
  ok: errors.length === 0,
  generatedNonIII: generatedNonIII.length,
  concreteCards: cardIds.size,
  math3Concepts: math3Ids.length,
  math3Problems: math3Problems.length,
  fallbackRisk: missingCards.length,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
