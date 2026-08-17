import fs from "node:fs";

const concepts = JSON.parse(fs.readFileSync("data/math-concepts.json", "utf8")).concepts;
const conceptIds = new Set(concepts.map((concept) => concept.id));
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
const math3Source = fs.readFileSync("app/content/math3-course.ts", "utf8");
const math3Ids = new Set([...math3Source.matchAll(/^\s*"(III-\d+)":\s*\{/gm)].map((match) => match[1]));
const fullCourseSource = fs.readFileSync("app/content/full-course.ts", "utf8");
const fullProblemSource = fs.readFileSync("app/content/full-scope-problems.ts", "utf8");
const problemBankSource = fs.readFileSync("app/problem-bank.ts", "utf8");
const errors = [];

if (concepts.length !== 320) errors.push(`concept count is ${concepts.length}, expected 320`);
if (authoredLessonIds.size !== 100) errors.push(`authored lesson count is ${authoredLessonIds.size}, expected 100`);
if (math3Ids.size !== 46 || [...math3Ids].some((id) => !conceptIds.has(id))) errors.push(`Math III lesson specs are ${math3Ids.size}, expected 46`);
if (!fullCourseSource.includes("createGeneratedLessons") || !fullCourseSource.includes("fullCourseGuides")) errors.push("full-course generator is not wired");
if (!fullProblemSource.includes("createFullScopeProblems") || !problemBankSource.includes("createFullScopeProblems")) errors.push("full-scope problem generator is not wired");
for (const concept of concepts) for (const prerequisite of concept.requires) if (!conceptIds.has(prerequisite)) errors.push(`${concept.id}: unknown prerequisite ${prerequisite}`);

const graph = new Map(concepts.map((concept) => [concept.id, concept.requires]));
const visiting = new Set();
const visited = new Set();
function visit(id, path = []) {
  if (visiting.has(id)) errors.push(`prerequisite cycle: ${[...path, id].join(" -> ")}`);
  if (visited.has(id)) return;
  visiting.add(id);
  for (const prerequisite of graph.get(id) ?? []) visit(prerequisite, [...path, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const concept of concepts) visit(concept.id);

const byCourse = {};
for (const concept of concepts) {
  const row = byCourse[concept.course] ?? { concepts: 0, authoredLessons: 0, generatedLessons: 0, math3Specs: 0 };
  row.concepts += 1;
  row.authoredLessons += authoredLessonIds.has(concept.id) ? 1 : 0;
  row.generatedLessons += authoredLessonIds.has(concept.id) ? 0 : 1;
  row.math3Specs += math3Ids.has(concept.id) ? 1 : 0;
  byCourse[concept.course] = row;
}

const result = {
  ok: errors.length === 0,
  concepts: concepts.length,
  authoredLessons: authoredLessonIds.size,
  generatedLessons: concepts.length - authoredLessonIds.size,
  math3Specs: math3Ids.size,
  fullCourseGenerator: fullCourseSource.includes("createGeneratedLessons"),
  fullScopeProblemGenerator: fullProblemSource.includes("createFullScopeProblems"),
  byCourse,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
