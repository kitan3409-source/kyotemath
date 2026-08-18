import fs from "node:fs";

const concepts = JSON.parse(fs.readFileSync("data/math-concepts.json", "utf8")).concepts;
const byId = new Map(concepts.map((concept) => [concept.id, concept]));
const common = concepts.filter((concept) => ["I", "A", "II", "B", "C"].includes(concept.course) && concept.priority === "core");
const closure = new Set();
const visit = (id) => {
  if (closure.has(id)) return;
  const concept = byId.get(id);
  if (!concept) return;
  closure.add(id);
  concept.requires.forEach(visit);
};
common.forEach((concept) => visit(concept.id));
const diagnosticRoute = new Set([...closure, ...concepts.filter((concept) => concept.course === "bridge").map((concept) => concept.id)]);
const skippedRoute = new Set(closure);
const errors = [];
for (const concept of common) {
  for (const route of [diagnosticRoute, skippedRoute]) {
    if (!route.has(concept.id)) errors.push(`${concept.id}: missing from route`);
  }
}
for (const id of closure) {
  const concept = byId.get(id);
  if (!concept) continue;
  if (concept.requires.some((required) => !closure.has(required))) errors.push(`${id}: prerequisite closure is incomplete`);
}

const result = {
  ok: errors.length === 0,
  commonCore: common.length,
  prerequisiteClosure: closure.size,
  diagnosticRoute: diagnosticRoute.size,
  skippedRoute: skippedRoute.size,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
