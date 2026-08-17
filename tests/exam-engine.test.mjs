import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExamForms,
  createExamSession,
  eligibleSectionIds,
  examQuestions,
  isExamExpired,
  normalizeExamSession,
  scoreExam,
} from "../app/exam-engine.ts";

function problem(id, conceptIds, title) {
  return {
    id,
    conceptIds,
    title,
    prompt: `${title}の条件を使って判断せよ。`,
    options: ["0", "1", "2", "3"],
    answer: 1,
    explanation: "条件を整理して答えを確定する。",
    kind: "standard",
    estimatedSeconds: 60,
  };
}

function syntheticBank() {
  const bank = [];
  for (let index = 1; index <= 45; index += 1) bank.push(problem(`IA-A-${index}`, [`I-${(index % 34) + 1}`], "二次関数の値"));
  for (let index = 1; index <= 45; index += 1) bank.push(problem(`IA-G-${index}`, [`A-${(index % 30) + 1}`], "図形と三角比"));
  for (let index = 1; index <= 45; index += 1) bank.push(problem(`IA-P-${index}`, [`A-${(index % 30) + 1}`], "確率と場合の数"));
  for (let index = 1; index <= 45; index += 1) bank.push(problem(`IA-D-${index}`, [`I-${43 + (index % 10)}`], "平均と標準偏差"));
  for (let index = 1; index <= 18; index += 1) bank.push(problem(`II-C-${index}`, [`II-${(index % 62) + 1}`], "関数と微積分"));
  for (let index = 1; index <= 9; index += 1) bank.push(problem(`II-S-${index}`, [`B-${(index % 20) + 1}`], "数列の漸化式"));
  for (let index = 1; index <= 9; index += 1) bank.push(problem(`II-T-${index}`, [`B-${20 + (index % 15)}`], "統計的な推測"));
  for (let index = 1; index <= 9; index += 1) bank.push(problem(`II-V-${index}`, [`C-${(index % 25) + 1}`], "ベクトルの内積"));
  for (let index = 1; index <= 9; index += 1) bank.push(problem(`II-Z-${index}`, [`C-${25 + (index % 20)}`], "複素数平面の軌跡"));
  for (let index = 1; index <= 20; index += 1) bank.push(problem(`M3-L-${index}`, [`III-${(index % 12) + 1}`], "数学III 極限"));
  for (let index = 1; index <= 20; index += 1) bank.push(problem(`M3-D-${index}`, [`III-${13 + (index % 16)}`], "数学III 微分と曲線"));
  for (let index = 1; index <= 20; index += 1) bank.push(problem(`M3-I-${index}`, [`III-${29 + (index % 14)}`], "数学III 積分と面積"));
  for (let index = 1; index <= 20; index += 1) bank.push(problem(`M3-X-${index}`, [`III-${(index % 46) + 1}`], "数学III 極限微分積分統合"));
  return bank;
}

test("builds three source-distinct forms for official tracks and Math III", () => {
  const forms = buildExamForms(syntheticBank());
  assert.equal(forms.length, 9);
  assert.deepEqual(forms.map((form) => form.totalPoints), [100, 100, 100, 100, 100, 100, 100, 100, 100]);
  assert.deepEqual(forms.map((form) => examQuestions(form).reduce((sum, question) => sum + question.points, 0)), [100, 100, 100, 100, 100, 100, 100, 100, 100]);
  const sourceIds = forms.flatMap((form) => form.sections.flatMap((section) => section.questions.map((question) => question.sourceProblemId)));
  assert.equal(new Set(sourceIds).size, sourceIds.length);
  assert.equal(eligibleSectionIds(forms[3], ["IIBC-02", "IIBC-03", "IIBC-04"]).length, 4);
  assert.equal(forms.filter((form) => form.paper === "math3").length, 3);
  assert.equal(forms[6].durationSeconds, 6000);
});

test("scores by points, preserves omissions, and records elapsed timing", () => {
  const form = buildExamForms(syntheticBank())[0];
  const startedAt = "2026-08-18T00:00:00.000Z";
  const submittedAt = "2026-08-18T00:30:00.000Z";
  const answers = Object.fromEntries(examQuestions(form).map((question) => [question.id, question.answer]));
  const result = scoreExam(form, answers, [], startedAt, submittedAt, false);
  assert.equal(result.score, 100);
  assert.equal(result.percentage, 100);
  assert.equal(result.unanswered.length, 0);
  assert.equal(result.elapsedSeconds, 1800);
  assert.equal(result.startedAt, startedAt);
  assert.equal(result.submittedAt, submittedAt);
});

test("session normalization and timeout keep the exam resumable", () => {
  const form = buildExamForms(syntheticBank())[3];
  const now = new Date("2026-08-18T00:00:00.000Z");
  const session = createExamSession(form, now, ["IIBC-02", "IIBC-03", "IIBC-04"]);
  assert.equal(session.index, 0);
  assert.equal(session.selectedOptionalSectionIds.length, 3);
  assert.equal(isExamExpired(session, new Date(now.getTime() + form.durationSeconds * 1000 - 1)), false);
  assert.equal(isExamExpired(session, new Date(now.getTime() + form.durationSeconds * 1000)), true);
  assert.deepEqual(normalizeExamSession({ ...session, index: 4, answers: { [examQuestions(form)[0].id]: 1 } })?.index, 4);
});

test("exam sessions reject malformed deadlines and duplicate or unknown optional fields", () => {
  const form = buildExamForms(syntheticBank())[3];
  const session = createExamSession(form, new Date("2026-08-18T00:00:00.000Z"), ["IIBC-02", "IIBC-03", "IIBC-04"]);
  assert.equal(normalizeExamSession({ ...session, deadlineAt: "not-a-date" }), undefined);
  assert.equal(normalizeExamSession({ ...session, selectedOptionalSectionIds: ["IIBC-02", "IIBC-02", "unknown", "IIBC-03", "IIBC-04"] })?.selectedOptionalSectionIds.length, 3);
  assert.equal(normalizeExamSession({ ...session, selectedOptionalSectionIds: ["IIBC-02", "IIBC-03"] }), undefined);
  assert.equal(normalizeExamSession({ ...session, paper: "math1a", selectedOptionalSectionIds: ["IIBC-02", "IIBC-03", "IIBC-04"] }), undefined);
});

test("induction is visible in follow-up prompts and option selection is not duplicated", () => {
  const form = buildExamForms(syntheticBank())[0];
  const section = form.sections[0];
  assert.equal(section.questions[0].dependsOn.length, 0);
  assert.deepEqual(section.questions[1].dependsOn, [section.questions[0].id]);
  assert.match(section.questions[1].prompt, /前問の結果を使う/);
  assert.match(section.questions[1].prompt, /元問題の選択肢/);
  assert.equal(section.questions[1].linkedAnswerValue, section.questions[0].linkedAnswerValue + 1);
  assert.equal(Number(section.questions[1].options[section.questions[1].answer]), section.questions[1].linkedAnswerValue);
  assert.equal(eligibleSectionIds(buildExamForms(syntheticBank())[3], ["IIBC-02", "IIBC-02", "IIBC-03", "IIBC-04"]).length, 4);
});

test("follow-up questions materialize from the learner's previous answer", () => {
  const form = buildExamForms(syntheticBank())[0];
  const section = form.sections[0];
  const baseline = examQuestions(form, [], Object.fromEntries(examQuestions(form).map((question) => [question.id, question.answer])));
  const previous = section.questions[0];
  const changed = examQuestions(form, [], { [previous.id]: (previous.answer + 1) % 4 }).find((question) => question.id === section.questions[1].id);
  const baselineFollowUp = baseline.find((question) => question.id === section.questions[1].id);
  assert.ok(changed);
  assert.ok(baselineFollowUp);
  assert.notEqual(changed?.linkedAnswerValue, baselineFollowUp?.linkedAnswerValue);
  assert.notDeepEqual(changed?.options, baselineFollowUp?.options);
  assert.notEqual(changed?.answer, baselineFollowUp?.answer);
});
