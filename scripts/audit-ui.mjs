import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const examEngine = fs.readFileSync("app/exam-engine.ts", "utf8");
const errors = [];

const requiredSourceMarkers = [
  ["common-test route is limited to core I/A/II/B/C", "[\"I\", \"A\", \"II\", \"B\", \"C\"].includes(concept.course) && concept.priority === \"core\""],
  ["mock paper selector", "function chooseExamPaper"],
  ["mock paper selector markup", "exam-paper-grid"],
  ["automatic timeout uses deadline timestamp", "const submittedAt = examSession.deadlineAt"],
  ["manual timeout uses deadline timestamp", "submittedAtOverride ?? session.deadlineAt"],
  ["foundation bypass survives reload", "storageKeys.foundationSkipped"],
  ["recommended first-run action", "おすすめ：まず1問だけ始める"],
  ["diagnostic route includes bridge concepts", "concept.course === \"bridge\" || commonTestRouteConcepts.includes(concept)"],
  ["foundation skip auto-route excludes bridge concepts", "commonTestRouteConcepts.filter((concept) => concept.course !== \"bridge\")"],
  ["route includes prerequisite closure", "const commonTestRouteConcepts = prerequisiteClosure(commonTestConcepts)"],
  ["import prioritizes resumable exam tab", "if (!usableExam && importedPractice?.active) setActiveTab(\"practice\")"],
  ["cross-tab foundation flag is restored", "const syncedFoundationSkipped = progress.foundationSkipped === true || readStored(storageKeys.foundationSkipped) === \"true\""],
  ["first run respects existing persisted progress", "const hasPersistedProgress = Object.keys(progress.attempts).length > 0"],
  ["first run respects an active exam session", "Boolean(progress.examSession?.active)"],
  ["import evidence matches the current problem stage", "problem.id === `AUTO-${id}-delayed` && entry.kind === \"transfer\""],
  ["foundation skip bypasses bridge prerequisites", "bridgeBypass = foundationSkipped && prerequisite?.course === \"bridge\""],
  ["foundation skip is included in export", "foundationSkipped, curriculum: \"high_school_math_concepts.v1\""],
  ["foundation skip is restored from import", "imported.foundationSkipped === true"],
  ["first submission is recorded", "firstSubmission: !examHistory.some"],
];
for (const [label, marker] of requiredSourceMarkers) {
  if (!page.includes(marker)) errors.push(`${label}: missing implementation marker`);
}
if (!examEngine.includes("explanationViewedBeforeSubmit: false")) errors.push("pre-submit explanations are blocked in evidence: missing implementation marker");
if (!examEngine.includes("result.firstSubmission === true")) errors.push("G5 first-submission annotation is checked: missing implementation marker");
if (!examEngine.includes("const firstG5 = G5_FORM_IDS.map")) errors.push("G5 first records survive history retention: missing implementation marker");

const result = {
  ok: errors.length === 0,
  checks: requiredSourceMarkers.length + 1,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
