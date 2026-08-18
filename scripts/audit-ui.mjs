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
];
for (const [label, marker] of requiredSourceMarkers) {
  if (!page.includes(marker)) errors.push(`${label}: missing implementation marker`);
}

const requiredExamEngineMarkers = [
  ["score stores pre-submit review evidence", "explanationViewedBeforeSubmit: false"],
  ["G5 rejects missing review evidence", "提出前の解説非閲覧記録がありません。"],
];
for (const [label, marker] of requiredExamEngineMarkers) {
  if (!examEngine.includes(marker)) errors.push(`${label}: missing implementation marker`);
}

const result = {
  ok: errors.length === 0,
  checks: requiredSourceMarkers.length + requiredExamEngineMarkers.length,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
