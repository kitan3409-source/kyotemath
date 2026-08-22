const [{ problemBank }, exam] = await Promise.all([
  import("../app/problem-bank.ts"),
  import("../app/exam-engine.ts"),
]);
const { buildExamForms, examQuestions, eligibleSectionIds } = exam;
const forms = buildExamForms(problemBank);
const errors = [];

if (forms.length !== 9) errors.push(`expected 9 forms (6 official + 3 Math III), got ${forms.length}`);
for (const { paper, durationSeconds } of [{ paper: "math1a", durationSeconds: 4200 }, { paper: "math2bc", durationSeconds: 4200 }, { paper: "math3", durationSeconds: 6000 }]) {
  const paperForms = forms.filter((form) => form.paper === paper);
  if (paperForms.length !== 3) errors.push(`${paper}: expected three forms`);
  for (const form of paperForms) {
    if (form.durationSeconds !== durationSeconds || form.totalPoints !== 100) errors.push(`${form.id}: duration/points mismatch`);
    const questions = examQuestions(form);
    const correctAnswers = Object.fromEntries(questions.map((question) => [question.id, question.answer]));
    const materializedCorrect = examQuestions(form, form.optionalSectionIds.slice(0, 3), correctAnswers);
    const points = questions.reduce((sum, question) => sum + question.points, 0);
    if (points !== 100) errors.push(`${form.id}: selected default points ${points}`);
    if (new Set(questions.map((question) => question.id)).size !== questions.length) errors.push(`${form.id}: duplicate question IDs`);
    if (materializedCorrect.some((question, index) => question.answer !== questions[index]?.answer || question.linkedAnswerValue !== questions[index]?.linkedAnswerValue)) errors.push(`${form.id}: correct-answer materialization drifted`);
    for (const question of questions) {
      if (question.options.length !== 4 || new Set(question.options).size !== 4) errors.push(`${form.id}/${question.id}: invalid options`);
      if (question.answer < 0 || question.answer >= question.options.length) errors.push(`${form.id}/${question.id}: invalid answer`);
    }
    for (const section of form.sections.filter((section) => eligibleSectionIds(form).includes(section.id))) {
      for (const [index, question] of section.questions.entries()) {
        const source = problemBank.find((candidate) => candidate.id === question.sourceProblemId);
        if (!source) {
          errors.push(`${form.id}/${question.id}: source problem is missing`);
          continue;
        }
        if (question.linkedSourceAnswer !== source.answer) errors.push(`${form.id}/${question.id}: link does not use source answer`);
        if (index === 0) {
          if (question.dependsOn.length !== 0 || question.linkedAnswerValue !== source.answer) errors.push(`${form.id}/${question.id}: first link seed is invalid`);
        } else {
          const previous = section.questions[index - 1];
          const expected = previous.linkedAnswerValue + source.answer;
          if (question.dependsOn.length !== 1 || question.dependsOn[0] !== previous.id) errors.push(`${form.id}/${question.id}: dependency edge is invalid`);
          if (question.linkedAnswerValue !== expected || question.options[question.answer] !== String(expected)) errors.push(`${form.id}/${question.id}: linked answer is not derived from the previous result`);
          if (!question.prompt.includes("前問の結果を使う") || !question.prompt.includes("元問題の選択肢")) errors.push(`${form.id}/${question.id}: linked prompt is not visible and solvable`);
          const baseline = materializedCorrect.find((candidate) => candidate.id === question.id);
          const previousId = section.questions[index - 1].id;
          const previousCorrect = correctAnswers[previousId];
          for (const alternativeAnswer of [0, 1, 2, 3].filter((candidate) => candidate !== previousCorrect)) {
            const alternative = { ...correctAnswers, [previousId]: alternativeAnswer };
            const mutated = examQuestions(form, form.optionalSectionIds.slice(0, 3), alternative).find((candidate) => candidate.id === question.id);
            if (!mutated || !baseline || mutated.linkedAnswerValue === baseline.linkedAnswerValue) errors.push(`${form.id}/${question.id}/choice${alternativeAnswer}: actual previous input does not change the follow-up`);
            if (!mutated || !baseline || JSON.stringify(mutated.options) === JSON.stringify(baseline.options)) errors.push(`${form.id}/${question.id}/choice${alternativeAnswer}: actual previous input does not change the follow-up options`);
            if (!mutated || !baseline || mutated.prompt === baseline.prompt || mutated.explanation === baseline.explanation) errors.push(`${form.id}/${question.id}/choice${alternativeAnswer}: actual previous input does not change visible follow-up text`);
          }
        }
      }
    }
  }
}

function optionalCombinations(ids) {
  if (ids.length <= 3) return [ids.slice(0, 3)];
  const combinations = [];
  for (let omitted = 0; omitted < ids.length; omitted += 1) combinations.push(ids.filter((_, index) => index !== omitted));
  return combinations;
}

// A learner must not be able to clear the G5 threshold by repeating one
// option position. Linked option placement is intentionally independent of
// the previous answer; this red-team gate checks all four constant-position
// strategies against every official form and every IIBC section combination.
for (const form of forms.filter((candidate) => candidate.paper !== "math3")) {
  for (const selected of optionalCombinations(form.optionalSectionIds)) {
    const questions = examQuestions(form, selected);
    const fixedChoiceScores = [0, 1, 2, 3].map((choice) => {
      const answers = Object.fromEntries(questions.map((question) => [question.id, choice]));
      return exam.scoreExam(form, answers, selected, "2026-08-18T00:00:00.000Z", "2026-08-18T00:30:00.000Z", false).score;
    });
    if (Math.max(...fixedChoiceScores) >= 60) errors.push(`${form.id}/${selected.join(",")}: fixed option-position strategy reaches ${Math.max(...fixedChoiceScores)} points`);
  }
}
const iibc = forms.find((form) => form.paper === "math2bc");
if (!iibc || iibc.optionalSectionIds.length !== 4 || eligibleSectionIds(iibc).filter((id) => iibc.optionalSectionIds.includes(id)).length !== 3) errors.push("Math II/B/C must offer four optional fields and select three");
const sourceIds = forms.flatMap((form) => form.sections.flatMap((section) => section.questions.map((question) => question.sourceProblemId)));
if (new Set(sourceIds).size !== sourceIds.length) errors.push("forms reuse source problems");

const result = { ok: errors.length === 0, forms: forms.length, math1a: forms.filter((form) => form.paper === "math1a").length, math2bc: forms.filter((form) => form.paper === "math2bc").length, math3: forms.filter((form) => form.paper === "math3").length, sourceProblems: sourceIds.length, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
