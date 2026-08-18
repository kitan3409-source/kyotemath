import type { Problem } from "./problem-bank";
import { isValidIsoDate } from "./learning-state.ts";

export type ExamPaper = "math1a" | "math2bc" | "math3";
export type ExamSectionKind = "required" | "optional";

export type ExamQuestion = {
  id: string;
  sourceProblemId: string;
  sectionId: string;
  sectionTitle: string;
  context: string;
  contextTable?: { columns: string[]; rows: string[][] };
  induction: string;
  dependsOn: string[];
  linkedAnswerValue: number;
  linkedSourceAnswer: number;
  linkFormula: string;
  sourceMaterial: { title: string; prompt: string; options: string[]; explanation: string };
  conceptIds: string[];
  title: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  points: number;
};

export type ExamSection = {
  id: string;
  title: string;
  kind: ExamSectionKind;
  points: number;
  instruction: string;
  context: string;
  contextTable?: { columns: string[]; rows: string[][] };
  questions: ExamQuestion[];
};

export type ExamForm = {
  id: string;
  paper: ExamPaper;
  title: string;
  durationSeconds: number;
  totalPoints: 100;
  requiredSectionIds: string[];
  optionalSectionIds: string[];
  sections: ExamSection[];
};

export type ExamSession = {
  formId: string;
  paper: ExamPaper;
  active: boolean;
  finished: boolean;
  selectedOptionalSectionIds: string[];
  answers: Record<string, number>;
  index: number;
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
};

export type ExamResult = {
  formId: string;
  paper: ExamPaper;
  score: number;
  totalPoints: number;
  percentage: number;
  selectedOptionalSectionIds: string[];
  startedAt: string;
  submittedAt: string;
  unanswered: string[];
  elapsedSeconds: number;
  timedOut: boolean;
  /** The learner cannot open explanations until the form is submitted. */
  explanationViewedBeforeSubmit: false;
  /** Set by the UI when this is the learner's first submission of the form. */
  firstSubmission?: boolean;
  questionResults: Record<string, "correct" | "wrong" | "unanswered">;
  bySection: Record<string, { score: number; points: number; unanswered: number }>;
};

export const EXAM_CONFIG = {
  math1a: { label: "数学I・数学A", durationSeconds: 70 * 60, totalPoints: 100 },
  math2bc: { label: "数学II・数学B・数学C", durationSeconds: 70 * 60, totalPoints: 100 },
  math3: { label: "数学III", durationSeconds: 100 * 60, totalPoints: 100 },
} as const;

export const G5_FORM_IDS = ["IA-F1", "IA-F2", "IA-F3", "IIBC-F1", "IIBC-F2", "IIBC-F3"] as const;
export type G5FormId = (typeof G5_FORM_IDS)[number];
export type G5EvidenceRow = {
  formId: G5FormId;
  result?: ExamResult;
  status: "missing" | "failed" | "passed";
  reasons: string[];
};
export type G5EvidenceSummary = {
  rows: G5EvidenceRow[];
  observedCount: number;
  passedCount: number;
  allConditionsMet: boolean;
};

type SectionTemplate = {
  id: string;
  title: string;
  kind: ExamSectionKind;
  pointsPerQuestion: number;
  count: number;
  instruction: string;
  context: string;
  contextTable?: { columns: string[]; rows: string[][] };
  matches: (problem: Problem) => boolean;
};

const iaTemplates: SectionTemplate[] = [
  {
    id: "IA-01",
    title: "数と式・二次関数",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "条件を式へ翻訳し、途中の関係を使って最後まで判断する。",
    context: "ある量xの変化を式とグラフで表す。設問は前の計算結果を次の判断へ使う。",
    matches: (problem) => problem.conceptIds.some((id) => {
      if (!id.startsWith("I-")) return false;
      const number = Number(id.slice(2));
      return Number.isInteger(number) && number >= 1 && number <= 34;
    }),
  },
  {
    id: "IA-02",
    title: "図形と計量・図形の性質",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "図の条件を辺・角・比へ置き換え、必要な関係だけを選ぶ。",
    context: "図形の一部を測り、相似・三角比・円の性質を順に使って量を決める。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("A-") || id.startsWith("I-")) && /(図形|三角|円|相似|角)/.test(problem.title + problem.prompt),
  },
  {
    id: "IA-03",
    title: "場合の数と確率",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "標本空間を先に固定し、条件付きの分母・分子を同じ単位で数える。",
    context: "複数の選択や試行を表・樹形図で整理し、確率を段階的に更新する。",
    contextTable: { columns: ["状態", "確率", "条件"], rows: [["A", "未定", "最初の選択"], ["B", "未定", "情報を得た後"], ["C", "未定", "最終結果"]] },
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("A-")) && /(確率|場合|期待|組合せ|順列)/.test(problem.title + problem.prompt),
  },
  {
    id: "IA-04",
    title: "データの分析",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "代表値だけで結論を出さず、散らばり・相関・尺度を合わせて読む。",
    context: "同じデータを表・散布図・標準化した値で見比べ、解釈の妥当性を判断する。",
    contextTable: { columns: ["集団", "平均", "標準偏差"], rows: [["P", "60", "8"], ["Q", "72", "12"], ["R", "55", "5"]] },
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("I-")) && /(平均|中央値|標準|相関|データ|分散|散布)/.test(problem.title + problem.prompt),
  },
];

const iIbcTemplates: SectionTemplate[] = [
  {
    id: "IIBC-01",
    title: "数学IIの関数・微積分",
    kind: "required",
    pointsPerQuestion: 10,
    count: 4,
    instruction: "式・グラフ・変化率を行き来し、設問の誘導を一つずつ確定する。",
    context: "ある現象の量を関数で表し、グラフの特徴と変化量を連続して考える。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("II-")),
  },
  {
    id: "IIBC-02",
    title: "数列",
    kind: "optional",
    pointsPerQuestion: 10,
    count: 2,
    instruction: "初項・漸化式・一般項・和を同じ数列の情報として結び付ける。",
    context: "毎回の更新規則から数列を作り、将来値や累積量を求める。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("B-")) && /(数列|漸化|等差|等比|和)/.test(problem.title + problem.prompt),
  },
  {
    id: "IIBC-03",
    title: "統計的な推測",
    kind: "optional",
    pointsPerQuestion: 10,
    count: 2,
    instruction: "標本の情報と母集団の不確実性を分け、推定・検定の結論を条件付きで述べる。",
    context: "標本から母比率や母平均を考え、誤差を含む判断を表と式で説明する。",
    contextTable: { columns: ["標本", "成功数", "標本数"], rows: [["S1", "42", "80"], ["S2", "54", "100"], ["S3", "63", "120"]] },
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("B-")) && /(統計|推定|検定|標本|母|信頼)/.test(problem.title + problem.prompt),
  },
  {
    id: "IIBC-04",
    title: "ベクトル",
    kind: "optional",
    pointsPerQuestion: 10,
    count: 2,
    instruction: "図形の位置関係をベクトルの係数・内積・成分で一貫して表す。",
    context: "平面上の点をベクトルで表し、内分・垂直・面積の条件を連鎖させる。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("C-")) && /(ベクトル|内積|成分|位置)/.test(problem.title + problem.prompt),
  },
  {
    id: "IIBC-05",
    title: "平面上の曲線と複素数平面",
    kind: "optional",
    pointsPerQuestion: 10,
    count: 2,
    instruction: "複素数を点・回転・拡大縮小として読み替え、式と図形を往復する。",
    context: "複素数平面上の点の移動を、極形式・軌跡・距離で解釈する。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("C-")) && /(複素|曲線|極|軌跡)/.test(problem.title + problem.prompt),
  },
];

const math3Templates: SectionTemplate[] = [
  {
    id: "M3-01",
    title: "極限",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "数列・関数の極限と連続性を、近づき方と定義域を保って判断する。",
    context: "変化する量の極限を数列・関数・片側極限の表現で読み替え、次の判断へつなぐ。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("III-") && Number(id.slice(4)) <= 12),
  },
  {
    id: "M3-02",
    title: "微分と応用",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "導関数を変化率・接線・極値へ翻訳し、定義域と符号を検算する。",
    context: "関数の変化を導関数・接線・増減表で追い、最適化や曲線の特徴を決める。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("III-") && Number(id.slice(4)) >= 13 && Number(id.slice(4)) <= 28),
  },
  {
    id: "M3-03",
    title: "積分と図形",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "原始関数・定積分・面積・体積を、区間と上下関係を確認して結び付ける。",
    context: "変化率から総量へ戻し、区間・回転軸・断面を選んで図形量を求める。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("III-") && Number(id.slice(4)) >= 29 && Number(id.slice(4)) <= 42),
  },
  {
    id: "M3-04",
    title: "極限・微分・積分の統合",
    kind: "required",
    pointsPerQuestion: 5,
    count: 5,
    instruction: "極限・微分・積分のどの見方が必要かを条件から選び、途中の量を次の設問へ渡す。",
    context: "ある関数・運動・図形を、極限で定義し、微分で変化を読み、積分で総量へ戻す。",
    matches: (problem) => problem.conceptIds.some((id) => id.startsWith("III-")),
  },
];

function takeSources(bank: Problem[], template: SectionTemplate, used: Set<string>, count: number): Problem[] {
  const candidates = bank.filter((problem) => !used.has(problem.id) && template.matches(problem)).sort((a, b) => {
    const generatedRank = (problem: Problem) => problem.id.startsWith("AUTO-") ? 1 : 0;
    return generatedRank(a) - generatedRank(b) || a.id.localeCompare(b.id);
  });
  if (candidates.length < count) throw new Error(`${template.id} needs ${count} questions but only ${candidates.length} are available`);
  const selected = candidates.slice(0, count);
  selected.forEach((problem) => used.add(problem.id));
  return selected;
}

function linkedOptions(correct: number, seed: number, answerPosition?: number) {
  const position = answerPosition === undefined
    ? ((seed % 4) + 4) % 4
    : ((answerPosition % 4) + 4) % 4;
  // Keep the distractor range tied to the previous input. A changed input
  // must alter the visible option list even when the derived correct value
  // happens to land in the same small integer set.
  const distractorBase = 1_000_000 + seed * 100 + position * 10;
  const distractors = [distractorBase + 1, distractorBase + 2, distractorBase + 3];
  const values = [correct, ...distractors];
  const answer = position;
  const options = values.map((_, index) => String(values[(index - answer + values.length) % values.length]));
  return { options, answer };
}

function answerValue(question: ExamQuestion, answer: number | undefined) {
  if (answer === undefined) return question.linkedAnswerValue;
  if (question.dependsOn.length === 0) return answer;
  const value = Number(question.options[answer]);
  return Number.isFinite(value) ? value : question.linkedAnswerValue;
}

function materializeSectionQuestions(section: ExamSection, answers: Record<string, number>) {
  const questions: ExamQuestion[] = [];
  section.questions.forEach((base, index) => {
    if (index === 0 || base.dependsOn.length === 0) {
      questions.push(base);
      return;
    }
    const previous = questions[index - 1];
    const previousAnswer = answers[previous.id];
    const previousValue = previousAnswer === undefined
      ? base.linkedAnswerValue - base.linkedSourceAnswer
      : answerValue(previous, previousAnswer);
    const linkedAnswerValue = previousValue + base.linkedSourceAnswer;
    const linked = linkedOptions(linkedAnswerValue, index, previousAnswer ?? previous.answer);
    const choices = base.sourceMaterial.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}: ${option}`).join(" / ");
    const kText = previousAnswer === undefined ? "前問で確定する値 k" : `前問で選んだ値 k=${previousValue}`;
    questions.push({
      ...base,
      linkedAnswerValue,
      linkFormula: `前問入力=${previousAnswer === undefined ? "未回答" : previousAnswer}; k=${previousValue} + 正答選択肢番号(${base.sourceProblemId}:${base.linkedSourceAnswer}) = ${linkedAnswerValue}`,
      induction: `前問「${previous.title}」で確定した値 k を使い、今回の元問題の正答選択肢番号 q を加える。${section.instruction}`,
      prompt: `【前問の結果を使う】${kText}。今回の元問題の正答選択肢番号を q（A=0, B=1, C=2, D=3）とすると、k+q はいくつか。\n元問題：${base.sourceMaterial.prompt}\n元問題の選択肢：${choices}`,
      options: linked.options,
      answer: linked.answer,
      explanation: `前問から k=${previousValue}、元問題「${base.sourceMaterial.title}」を解いて q=${base.linkedSourceAnswer}。したがって k+q=${linkedAnswerValue}。元問題の根拠：${base.sourceMaterial.explanation}`,
    });
  });
  return questions;
}

function makeSection(template: SectionTemplate, formId: string, sources: Problem[]): ExamSection {
  const questions: ExamQuestion[] = [];
  sources.forEach((source, index) => {
    const previous = questions[index - 1];
    const id = `${formId}-${template.id}-${String(index + 1).padStart(2, "0")}`;
    if (!previous) {
      questions.push({
        id,
        sourceProblemId: source.id,
        sectionId: template.id,
        sectionTitle: template.title,
        context: template.context,
        contextTable: template.contextTable,
        induction: "この設問の正答選択肢番号（A=0, B=1, C=2, D=3）を、次の設問で k として使う。",
        dependsOn: [],
        linkedAnswerValue: source.answer,
        linkedSourceAnswer: source.answer,
        linkFormula: `k = 正答選択肢番号(${source.id})`,
        sourceMaterial: { title: source.title, prompt: source.prompt, options: [...source.options], explanation: source.explanation },
        conceptIds: source.conceptIds,
        title: source.title,
        prompt: source.prompt,
        options: source.options,
        answer: source.answer,
        explanation: source.explanation,
        points: template.pointsPerQuestion,
      });
      return;
    }
    const linkedAnswerValue = previous.linkedAnswerValue + source.answer;
    const choices = source.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}: ${option}`).join(" / ");
    const linked = linkedOptions(linkedAnswerValue, index, previous.answer);
    questions.push({
      id,
      sourceProblemId: source.id,
      sectionId: template.id,
      sectionTitle: template.title,
      context: template.context,
      contextTable: template.contextTable,
      induction: `前問「${previous.title}」で確定した値 k を使い、今回の元問題の正答選択肢番号 q を加える。${template.instruction}`,
      dependsOn: [previous.id],
      linkedAnswerValue,
      linkedSourceAnswer: source.answer,
      linkFormula: `前問の確定値(${previous.linkedAnswerValue}) + 正答選択肢番号(${source.id}:${source.answer}) = ${linkedAnswerValue}`,
      sourceMaterial: { title: source.title, prompt: source.prompt, options: [...source.options], explanation: source.explanation },
      conceptIds: source.conceptIds,
      title: `${source.title}（前問連結）`,
      prompt: `【前問の結果を使う】前問「${previous.title}」の正答として確定した値を k とする。今回の元問題の正答選択肢番号を q（A=0, B=1, C=2, D=3）とすると、k+q はいくつか。\n元問題：${source.prompt}\n元問題の選択肢：${choices}`,
      options: linked.options,
      answer: linked.answer,
      explanation: `前問から k=${previous.linkedAnswerValue}、元問題「${source.title}」を解いて q=${source.answer}。したがって k+q=${linkedAnswerValue}。元問題の根拠：${source.explanation}`,
      points: template.pointsPerQuestion,
    });
  });
  return { id: template.id, title: template.title, kind: template.kind, points: template.pointsPerQuestion * sources.length, instruction: template.instruction, context: template.context, contextTable: template.contextTable, questions };
}

export function buildExamForms(bank: Problem[]): ExamForm[] {
  const forms: ExamForm[] = [];
  const globalUsed = new Set<string>();
  for (let variant = 1; variant <= 3; variant += 1) {
    const formId = `IA-F${variant}`;
    const used = new Set(globalUsed);
    const sections = iaTemplates.map((template) => makeSection(template, formId, takeSources(bank, template, used, template.count)));
    sections.flatMap((section) => section.questions).forEach((question) => globalUsed.add(question.sourceProblemId));
    forms.push({ id: formId, paper: "math1a", title: `数学I・数学A フォーム${variant}`, durationSeconds: EXAM_CONFIG.math1a.durationSeconds, totalPoints: 100, requiredSectionIds: iaTemplates.map((template) => template.id), optionalSectionIds: [], sections });
  }
  for (let variant = 1; variant <= 3; variant += 1) {
    const formId = `IIBC-F${variant}`;
    const used = new Set(globalUsed);
    const sections = iIbcTemplates.map((template) => makeSection(template, formId, takeSources(bank, template, used, template.count)));
    sections.flatMap((section) => section.questions).forEach((question) => globalUsed.add(question.sourceProblemId));
    forms.push({ id: formId, paper: "math2bc", title: `数学II・数学B・数学C フォーム${variant}`, durationSeconds: EXAM_CONFIG.math2bc.durationSeconds, totalPoints: 100, requiredSectionIds: ["IIBC-01"], optionalSectionIds: ["IIBC-02", "IIBC-03", "IIBC-04", "IIBC-05"], sections });
  }
  for (let variant = 1; variant <= 3; variant += 1) {
    const formId = `MATH3-F${variant}`;
    const used = new Set(globalUsed);
    const sections = math3Templates.map((template) => makeSection(template, formId, takeSources(bank, template, used, template.count)));
    sections.flatMap((section) => section.questions).forEach((question) => globalUsed.add(question.sourceProblemId));
    forms.push({ id: formId, paper: "math3", title: `数学III 統合フォーム${variant}`, durationSeconds: EXAM_CONFIG.math3.durationSeconds, totalPoints: 100, requiredSectionIds: math3Templates.map((template) => template.id), optionalSectionIds: [], sections });
  }
  return forms;
}

export function eligibleSectionIds(form: ExamForm, selectedOptionalSectionIds: string[] = form.optionalSectionIds.slice(0, 3)) {
  const valid = [...new Set(selectedOptionalSectionIds)].filter((id) => form.optionalSectionIds.includes(id));
  return [...form.requiredSectionIds, ...valid.slice(0, 3)];
}

export function examQuestions(form: ExamForm, selectedOptionalSectionIds = form.optionalSectionIds.slice(0, 3), answers: Record<string, number> = {}) {
  const selected = new Set(eligibleSectionIds(form, selectedOptionalSectionIds));
  return form.sections.filter((section) => selected.has(section.id)).flatMap((section) => materializeSectionQuestions(section, answers));
}

export function scoreExam(form: ExamForm, answers: Record<string, number>, selectedOptionalSectionIds = form.optionalSectionIds.slice(0, 3), startedAt = "", submittedAt = "", timedOut = false): ExamResult {
  const selectedSections = new Set(eligibleSectionIds(form, selectedOptionalSectionIds));
  const bySection: ExamResult["bySection"] = {};
  const unanswered: string[] = [];
  const questionResults: ExamResult["questionResults"] = {};
  let score = 0;
  for (const section of form.sections) {
    if (!selectedSections.has(section.id)) continue;
    const questions = materializeSectionQuestions(section, answers);
    let sectionScore = 0;
    let sectionUnanswered = 0;
    for (const question of questions) {
      const answer = answers[question.id];
      if (answer === undefined) {
        unanswered.push(question.id);
        questionResults[question.id] = "unanswered";
        sectionUnanswered += 1;
      } else if (answer === question.answer) {
        questionResults[question.id] = "correct";
        sectionScore += question.points;
      } else {
        questionResults[question.id] = "wrong";
      }
    }
    score += sectionScore;
    bySection[section.id] = { score: sectionScore, points: section.points, unanswered: sectionUnanswered };
  }
  const started = Date.parse(startedAt);
  const submitted = Date.parse(submittedAt);
  const elapsedSeconds = Number.isFinite(started) && Number.isFinite(submitted) ? Math.max(0, Math.round((submitted - started) / 1000)) : 0;
  return { formId: form.id, paper: form.paper, score, totalPoints: form.totalPoints, percentage: Math.round((score / form.totalPoints) * 100), selectedOptionalSectionIds: eligibleSectionIds(form, selectedOptionalSectionIds).filter((id) => form.optionalSectionIds.includes(id)), startedAt, submittedAt, unanswered, elapsedSeconds, timedOut, explanationViewedBeforeSubmit: false, questionResults, bySection };
}

export function createExamSession(form: ExamForm, now = new Date(), selectedOptionalSectionIds = form.optionalSectionIds.slice(0, 3)): ExamSession {
  const startedAt = now.toISOString();
  const selected = eligibleSectionIds(form, selectedOptionalSectionIds).filter((id) => form.optionalSectionIds.includes(id));
  if (form.paper === "math2bc" && selected.length !== 3) throw new Error("数学II・B・Cは4分野から3分野を選択して開始してください");
  return { formId: form.id, paper: form.paper, active: true, finished: false, selectedOptionalSectionIds: selected, answers: {}, index: 0, startedAt, deadlineAt: new Date(now.getTime() + form.durationSeconds * 1000).toISOString() };
}

export function isExamExpired(session: ExamSession, now = new Date()) {
  const deadline = isValidIsoDate(session.deadlineAt) ? Date.parse(session.deadlineAt) : Number.NaN;
  return session.active && (!Number.isFinite(deadline) || deadline <= now.getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeExamSession(value: unknown, nowMs = Date.now()): ExamSession | undefined {
  if (!isRecord(value) || typeof value.formId !== "string" || (value.paper !== "math1a" && value.paper !== "math2bc" && value.paper !== "math3") || typeof value.active !== "boolean" || typeof value.finished !== "boolean" || !isRecord(value.answers) || !Array.isArray(value.selectedOptionalSectionIds) || typeof value.startedAt !== "string" || typeof value.deadlineAt !== "string") return undefined;
  const answers: Record<string, number> = {};
  for (const [id, answer] of Object.entries(value.answers)) if (typeof answer === "number" && Number.isSafeInteger(answer) && answer >= 0 && answer < 4) answers[id] = answer;
  const startedAt = isValidIsoDate(value.startedAt) ? Date.parse(value.startedAt) : Number.NaN;
  const deadlineAt = isValidIsoDate(value.deadlineAt) ? Date.parse(value.deadlineAt) : Number.NaN;
  const submittedAt = typeof value.submittedAt === "string" && isValidIsoDate(value.submittedAt) ? Date.parse(value.submittedAt) : Number.NaN;
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const formIdPattern = value.paper === "math1a" ? /^IA-F[1-3]$/ : value.paper === "math2bc" ? /^IIBC-F[1-3]$/ : /^MATH3-F[1-3]$/;
  if (!formIdPattern.test(value.formId) || !Number.isFinite(startedAt) || !Number.isFinite(deadlineAt)
    || deadlineAt - startedAt !== EXAM_CONFIG[value.paper].durationSeconds * 1000
    || deadlineAt <= startedAt || startedAt > safeNow) return undefined;
  if (value.active === value.finished) return undefined;
  if (value.finished && (!Number.isFinite(submittedAt) || submittedAt < startedAt || submittedAt > safeNow)) return undefined;
  const knownOptionalIds = value.paper === "math2bc" ? new Set(["IIBC-02", "IIBC-03", "IIBC-04", "IIBC-05"]) : new Set<string>();
  const rawSelectedOptionalSectionIds = value.selectedOptionalSectionIds;
  const selectedOptionalSectionIds = rawSelectedOptionalSectionIds.filter((id): id is string => typeof id === "string");
  if (selectedOptionalSectionIds.length !== rawSelectedOptionalSectionIds.length
    || new Set(selectedOptionalSectionIds).size !== selectedOptionalSectionIds.length
    || selectedOptionalSectionIds.some((id) => !knownOptionalIds.has(id))) return undefined;
  if ((value.paper === "math1a" || value.paper === "math3") && selectedOptionalSectionIds.length > 0) return undefined;
  if (value.paper === "math2bc" && selectedOptionalSectionIds.length !== 3) return undefined;
  return {
    formId: value.formId,
    paper: value.paper,
    active: value.active,
    finished: value.finished,
    selectedOptionalSectionIds,
    answers,
    index: typeof value.index === "number" && Number.isSafeInteger(value.index) && value.index >= 0 ? value.index : 0,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    submittedAt: typeof value.submittedAt === "string" ? value.submittedAt : undefined,
  };
}

export function normalizeExamHistory(value: unknown, nowMs = Date.now()): ExamResult[] {
  if (!Array.isArray(value)) return [];
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const normalized = value.filter((entry): entry is ExamResult => {
    if (!isRecord(entry) || typeof entry.formId !== "string" || (entry.paper !== "math1a" && entry.paper !== "math2bc" && entry.paper !== "math3")) return false;
    const allowedKeys = new Set(["formId", "paper", "score", "totalPoints", "percentage", "selectedOptionalSectionIds", "startedAt", "submittedAt", "unanswered", "elapsedSeconds", "timedOut", "explanationViewedBeforeSubmit", "firstSubmission", "questionResults", "bySection"]);
    if (Object.keys(entry).some((key) => !allowedKeys.has(key))) return false;
    const startedAt = isValidIsoDate(entry.startedAt) ? Date.parse(entry.startedAt) : Number.NaN;
    const submittedAt = isValidIsoDate(entry.submittedAt) ? Date.parse(entry.submittedAt) : Number.NaN;
    const formIdPattern = entry.paper === "math1a" ? /^IA-F[1-3]$/ : entry.paper === "math2bc" ? /^IIBC-F[1-3]$/ : /^MATH3-F[1-3]$/;
    const sectionPattern = entry.paper === "math1a" ? /^IA-0[1-4]$/ : entry.paper === "math2bc" ? /^IIBC-0[1-5]$/ : /^M3-0[1-4]$/;
    const selected = Array.isArray(entry.selectedOptionalSectionIds) ? entry.selectedOptionalSectionIds : [];
    const selectedIds = selected.filter((id): id is string => typeof id === "string");
    const knownOptional = new Set(["IIBC-02", "IIBC-03", "IIBC-04", "IIBC-05"]);
    const validSelection = selectedIds.length === selected.length
      && new Set(selectedIds).size === selectedIds.length
      && (entry.paper === "math2bc"
        ? selectedIds.length === 3 && selectedIds.every((id) => knownOptional.has(id))
        : selectedIds.length === 0);
    if (!formIdPattern.test(entry.formId) || !validSelection) return false;
    if (!Number.isFinite(startedAt) || !Number.isFinite(submittedAt) || startedAt > now || submittedAt > now || submittedAt < startedAt) return false;
    if (entry.explanationViewedBeforeSubmit !== undefined && entry.explanationViewedBeforeSubmit !== false) return false;
    if (entry.firstSubmission !== undefined && typeof entry.firstSubmission !== "boolean") return false;
    // Older exports did not have this field. The current UI has no pre-submit
    // explanation route, so a migrated result is explicitly marked false.
    entry.explanationViewedBeforeSubmit = false;
    const totalPoints = EXAM_CONFIG[entry.paper].totalPoints;
    const score = typeof entry.score === "number" ? entry.score : Number.NaN;
    const percentage = typeof entry.percentage === "number" ? entry.percentage : Number.NaN;
    const elapsedSeconds = typeof entry.elapsedSeconds === "number" ? entry.elapsedSeconds : Number.NaN;
    const expectedSectionIds = entry.paper === "math1a"
      ? ["IA-01", "IA-02", "IA-03", "IA-04"]
      : entry.paper === "math2bc"
        ? ["IIBC-01", ...selectedIds]
        : ["M3-01", "M3-02", "M3-03", "M3-04"];
    const sectionCounts: Record<string, number> = entry.paper === "math1a"
      ? { "IA-01": 5, "IA-02": 5, "IA-03": 5, "IA-04": 5 }
      : entry.paper === "math2bc"
        ? Object.fromEntries(expectedSectionIds.map((id) => [id, id === "IIBC-01" ? 4 : 2]))
        : { "M3-01": 5, "M3-02": 5, "M3-03": 5, "M3-04": 5 };
    const expectedSectionPoints: Record<string, number> = entry.paper === "math2bc"
      ? Object.fromEntries(expectedSectionIds.map((id) => [id, id === "IIBC-01" ? 40 : 20]))
      : Object.fromEntries(expectedSectionIds.map((id) => [id, 25]));
    const expectedQuestionIds = expectedSectionIds.flatMap((sectionId) => Array.from({ length: sectionCounts[sectionId] }, (_, index) => `${entry.formId}-${sectionId}-${String(index + 1).padStart(2, "0")}`));
    const validQuestionId = (id: unknown) => {
      if (typeof id !== "string" || !id.startsWith(`${entry.formId}-`)) return false;
      const suffix = id.slice(`${entry.formId}-`.length);
      const separator = suffix.lastIndexOf("-");
      if (separator <= 0) return false;
      const sectionId = suffix.slice(0, separator);
      const questionNumberText = suffix.slice(separator + 1);
      const questionNumber = Number(questionNumberText);
      return Boolean(sectionId && /^0\d$/.test(questionNumberText) && expectedSectionIds.includes(sectionId)
        && Number.isInteger(questionNumber) && questionNumber >= 1 && questionNumber <= sectionCounts[sectionId]);
    };
    const hasQuestionResults = Object.prototype.hasOwnProperty.call(entry, "questionResults");
    if (hasQuestionResults && !isRecord(entry.questionResults)) return false;
    let questionResults: Record<string, unknown> | undefined = hasQuestionResults ? entry.questionResults as Record<string, unknown> : undefined;
    if (!hasQuestionResults) {
      // Before questionResults was added, an export still contained the
      // section score and unanswered IDs. Reconstruct a deterministic ledger
      // so old progress survives the format upgrade, then validate it below
      // with the same strict rules as current exports.
      if (!Array.isArray(entry.unanswered) || !isRecord(entry.bySection)) return false;
      const legacyResults: Record<string, "correct" | "wrong" | "unanswered"> = {};
      for (const sectionId of expectedSectionIds) {
        const rawSection = entry.bySection[sectionId];
        if (!isRecord(rawSection)) return false;
        const points = typeof rawSection.points === "number" ? rawSection.points : Number.NaN;
        const sectionMark = typeof rawSection.score === "number" ? rawSection.score : Number.NaN;
        const unanswered = typeof rawSection.unanswered === "number" ? rawSection.unanswered : Number.NaN;
        const questionPoints = expectedSectionPoints[sectionId] / sectionCounts[sectionId];
        const sectionQuestionIds = expectedQuestionIds.filter((id) => id.startsWith(`${entry.formId}-${sectionId}-`));
        const unansweredIds = entry.unanswered.filter((id) => typeof id === "string" && id.startsWith(`${entry.formId}-${sectionId}-`));
        if (!Number.isSafeInteger(points) || points !== expectedSectionPoints[sectionId]
          || !Number.isSafeInteger(sectionMark) || sectionMark < 0 || sectionMark > points || sectionMark % questionPoints !== 0
          || !Number.isSafeInteger(unanswered) || unanswered !== unansweredIds.length || unanswered < 0 || unanswered > sectionCounts[sectionId]
          || !unansweredIds.every(validQuestionId)) return false;
        let correctRemaining = sectionMark / questionPoints;
        const unansweredSet = new Set(unansweredIds);
        for (const questionId of sectionQuestionIds) {
          if (unansweredSet.has(questionId)) legacyResults[questionId] = "unanswered";
          else if (correctRemaining > 0) {
            legacyResults[questionId] = "correct";
            correctRemaining -= 1;
          } else legacyResults[questionId] = "wrong";
        }
        if (correctRemaining !== 0) return false;
      }
      entry.questionResults = legacyResults;
      questionResults = legacyResults;
    }
    if (!questionResults) return false;
    const normalizedQuestionResults = questionResults;
    if (Object.keys(normalizedQuestionResults).length !== expectedQuestionIds.length
      || expectedQuestionIds.some((id) => !Object.prototype.hasOwnProperty.call(normalizedQuestionResults, id))) return false;
    const derivedUnansweredIds = expectedQuestionIds.filter((id) => normalizedQuestionResults[id] === "unanswered");
    if (!Number.isSafeInteger(score) || score < 0 || score > totalPoints || entry.totalPoints !== totalPoints
      || !Number.isSafeInteger(percentage) || percentage < 0 || percentage > 100 || percentage !== Math.round((score / totalPoints) * 100)
      || !Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds > EXAM_CONFIG[entry.paper].durationSeconds
      || typeof entry.timedOut !== "boolean" || elapsedSeconds !== Math.max(0, Math.round((submittedAt - startedAt) / 1000))
      || !Array.isArray(entry.unanswered) || new Set(entry.unanswered).size !== entry.unanswered.length
      || !entry.unanswered.every(validQuestionId)
      || entry.unanswered.length !== derivedUnansweredIds.length
      || !entry.unanswered.every((id, index) => id === derivedUnansweredIds[index])
      || !isRecord(entry.bySection)) return false;
    const actualSectionIds = Object.keys(entry.bySection);
    if (actualSectionIds.length !== expectedSectionIds.length || !expectedSectionIds.every((id) => actualSectionIds.includes(id))) return false;
    let sectionPoints = 0;
    let sectionScore = 0;
    let sectionUnanswered = 0;
    for (const [sectionId, rawSection] of Object.entries(entry.bySection)) {
      if (!sectionPattern.test(sectionId) || !isRecord(rawSection)) return false;
      const sectionKeys = Object.keys(rawSection);
      if (sectionKeys.length !== 3 || !["score", "points", "unanswered"].every((key) => sectionKeys.includes(key))) return false;
      const points = typeof rawSection.points === "number" ? rawSection.points : Number.NaN;
      const sectionMark = typeof rawSection.score === "number" ? rawSection.score : Number.NaN;
      const unanswered = typeof rawSection.unanswered === "number" ? rawSection.unanswered : Number.NaN;
      const questionIdsInSection = expectedQuestionIds.filter((id) => id.startsWith(`${entry.formId}-${sectionId}-`));
      let derivedSectionScore = 0;
      let derivedSectionUnanswered = 0;
      for (const questionId of questionIdsInSection) {
        const result = normalizedQuestionResults[questionId];
        if (result === "correct") derivedSectionScore += points / sectionCounts[sectionId];
        else if (result === "unanswered") derivedSectionUnanswered += 1;
        else if (result !== "wrong") return false;
      }
      if (!Number.isSafeInteger(points) || points !== expectedSectionPoints[sectionId]
        || !Number.isSafeInteger(sectionMark) || sectionMark < 0 || sectionMark > points
        || sectionMark % (points / sectionCounts[sectionId]) !== 0
        || !Number.isSafeInteger(unanswered) || unanswered < 0 || unanswered > sectionCounts[sectionId]) return false;
      const unansweredIdsInSection = entry.unanswered.filter((id) => typeof id === "string" && id.startsWith(`${entry.formId}-${sectionId}-`)).length;
      if (unanswered !== unansweredIdsInSection || unanswered !== derivedSectionUnanswered || sectionMark !== derivedSectionScore) return false;
      sectionPoints += points;
      sectionScore += sectionMark;
      sectionUnanswered += unanswered;
    }
    return Object.keys(entry.bySection).length > 0
      && sectionPoints === totalPoints
      && sectionScore === score
      && sectionUnanswered === entry.unanswered.length;
  });
  const firstG5 = G5_FORM_IDS.map((formId) => normalized.find((entry) => entry.formId === formId));
  const retained = [...firstG5, ...normalized.slice(-30)].filter((entry): entry is ExamResult => Boolean(entry));
  return retained.filter((entry, index, all) => index === all.findIndex((candidate) => candidate.formId === entry.formId && candidate.submittedAt === entry.submittedAt));
}

/**
 * G5の実測条件を、フォームごとの初回提出だけで判定する。
 * 同じフォームの再受験で初回失敗を隠せないよう、最初のsubmittedAtを採用する。
 * ここでのpassedはアプリ内の条件判定であり、実ユーザーの監査結果そのものではない。
 */
export function summarizeG5Evidence(history: ExamResult[]): G5EvidenceSummary {
  const rows = G5_FORM_IDS.map((formId): G5EvidenceRow => {
    const formResults = history
      .filter((result) => result.formId === formId)
      .slice()
      .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
    const first = formResults[0];
    if (!first) return { formId, status: "missing", reasons: ["初回提出の記録がありません。"] };
    const reasons: string[] = [];
    const flaggedFirst = formResults.filter((result) => result.firstSubmission === true);
    if (flaggedFirst.length > 0 && (flaggedFirst.length !== 1 || flaggedFirst[0].submittedAt !== first.submittedAt)) {
      reasons.push("初回提出フラグと提出時刻が一致しません。");
    }
    const limit = first.paper === "math1a" || first.paper === "math2bc"
      ? EXAM_CONFIG.math1a.durationSeconds
      : EXAM_CONFIG.math3.durationSeconds;
    if (first.totalPoints !== 100) reasons.push("満点が100点ではありません。");
    if (first.score < 60) reasons.push("60点未満です。");
    if (first.timedOut) reasons.push("時間切れです。");
    if (first.elapsedSeconds > limit) reasons.push("制限時間を超えています。");
    return { formId, result: first, status: reasons.length === 0 ? "passed" : "failed", reasons };
  });
  const passedCount = rows.filter((row) => row.status === "passed").length;
  return {
    rows,
    observedCount: rows.filter((row) => row.result).length,
    passedCount,
    allConditionsMet: rows.length === G5_FORM_IDS.length && passedCount === G5_FORM_IDS.length,
  };
}
