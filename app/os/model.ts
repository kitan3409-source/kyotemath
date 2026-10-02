// 受験OSレイヤーのデータモデル。
// 数学は既存の320概念/問題バンクを使い、ここでは数学以外の科目を定義する。

export type LearningSubjectId =
  | "modern"      // 現代文（国語・近代以降）
  | "kobun"       // 古文
  | "kanbun"      // 漢文
  | "eng-r"       // 英語リーディング
  | "eng-l"       // 英語リスニング
  | "info"        // 情報Ⅰ
  | "seikei"      // 公共・政治経済
  | "physics"     // 物理
  | "bio"         // 生物
  | "chem"        // 化学
  | "world"       // 世界史探究
  | "geo";        // 地理探究

export type ScienceChoice = "bio" | "chem";
export type SocialChoice = "world" | "geo";

export type SubjectMeta = {
  id: LearningSubjectId;
  label: string;
  shortLabel: string;
  slotLabel: string;        // 共テでの位置づけ
  maxPoints: number;        // 共テでの満点（国語は分野分け）
  baselinePct: number;      // ユーザーContextからの初期推定（0-1）。推測値。
  importance: number;       // 戦略上の重さ（0-3）
  note?: string;
};

export const SUBJECTS: SubjectMeta[] = [
  { id: "modern", label: "現代文（評論・小説）", shortLabel: "現代文", slotLabel: "国語200点の約100点分", maxPoints: 100, baselinePct: 0.50, importance: 2, note: "現代文40/100（偏差50.6）を起点に形式慣れで安定化" },
  { id: "kobun", label: "古文", shortLabel: "古文", slotLabel: "国語200点の古典側", maxPoints: 60, baselinePct: 0.05, importance: 2.5, note: "0→50%の伸びしろが大きい" },
  { id: "kanbun", label: "漢文", shortLabel: "漢文", slotLabel: "国語200点の古典側", maxPoints: 40, baselinePct: 0.05, importance: 2, note: "基本句形の型化で得点化しやすい" },
  { id: "eng-r", label: "英語リーディング", shortLabel: "英語R", slotLabel: "英語R100点（大学換算ではR160分）", maxPoints: 100, baselinePct: 0.45, importance: 2.5, note: "英検2級の素地。語彙+共テ形式演習" },
  { id: "eng-l", label: "英語リスニング", shortLabel: "英語L", slotLabel: "英語L100点（換算L40分）", maxPoints: 100, baselinePct: 0.40, importance: 1, note: "換算比重が小さいが欠席は致命傷" },
  { id: "info", label: "情報Ⅰ", shortLabel: "情報Ⅰ", slotLabel: "情報Ⅰ100点", maxPoints: 100, baselinePct: 0.80, importance: 3, note: "最強の得点源。穴だけ埋めて80+へ" },
  { id: "seikei", label: "公共・政治経済", shortLabel: "政経", slotLabel: "地歴公民100点（第1解答科目推奨）", maxPoints: 100, baselinePct: 0.40, importance: 2.5, note: "38/100→60+。演習で穴を塞ぐ" },
  { id: "physics", label: "物理（未履修前提）", shortLabel: "物理", slotLabel: "理科100点・鳥取/香川で必須", maxPoints: 100, baselinePct: 0.03, importance: 3, note: "力学の典型で50→60を狙う" },
  { id: "bio", label: "生物", shortLabel: "生物", slotLabel: "理科100点（第2理科候補）", maxPoints: 100, baselinePct: 0.52, importance: 2, note: "生物基礎58.3が起点" },
  { id: "chem", label: "化学", shortLabel: "化学", slotLabel: "理科100点（第2理科の比較相手）", maxPoints: 100, baselinePct: 0.05, importance: 1, note: "未履修寄り。比較のため最小単元" },
  { id: "world", label: "世界史探究", shortLabel: "世界史", slotLabel: "地歴公民100点（第2社会・保険枠）", maxPoints: 100, baselinePct: 0.30, importance: 1, note: "他大学要件の保険として低優先" },
  { id: "geo", label: "地理探究", shortLabel: "地理", slotLabel: "地歴公民100点（第2社会・保険枠）", maxPoints: 100, baselinePct: 0.30, importance: 1, note: "同上" },
];

export const SUBJECT_BY_ID = new Map<LearningSubjectId, SubjectMeta>(SUBJECTS.map((subject) => [subject.id, subject]));

export type UnitProblem = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  // 各選択肢がなぜ違うか（任意）。answerと同じ長さでなくてよい。
  optionNotes?: string[];
  explanation: string;
  kind: "quick" | "standard" | "transfer";
  estimatedSeconds: number;
};

export type UnitLesson = {
  summary: string;                    // 超短い説明（2-3文）
  example: string;                    // 具体例
  intuition?: string;                 // 直感説明（物理など）
  workedExample: { problem: string; steps: string[]; answer: string };
  examSignal?: string;                // 共テでの問われ方
  commonMistakes?: string[];
};

export type OsUnit = {
  id: string;
  subjectId: LearningSubjectId;
  title: string;
  estimatedMinutes: number;
  importance: 1 | 2 | 3;          // 出題頻度の目安（推測）
  weight: number;                 // 科目内の配分重み（合計を揃える必要なし）
  requires?: string[];            // 同一subject内の前提unit id
  lesson: UnitLesson;
  problems: UnitProblem[];
};

export type UnitState = {
  level: number;                  // 0未履修 1クイック通過 2標準通過 3転用通過 4遅延復習済
  attempts: number;
  correct: number;
  lastAt?: string;                // ISO
  dueAt?: string;                 // ISO 復習期限
  lastErrorCause?: string;
};

export type RecordEntry = {
  id: string;
  date: string;                   // ISO or YYYY-MM-DD
  material: string;               // 教材名（例: センター過去問2025, 進研模試7月）
  slotId: string;                 // score slot id (kokugo/math-ia/math-iibc/eng-r/eng-l/info/physics/bio/chem/seikei/world/geo)
  score: number;
  maxScore: number;
  minutes?: number;
};

// 共テの採点スロット（大学換算・合計点計算の単位）
export type ScoreSlot = { id: string; label: string; maxPoints: number; subjects: LearningSubjectId[] };
export const SCORE_SLOTS: ScoreSlot[] = [
  { id: "kokugo", label: "国語", maxPoints: 200, subjects: ["modern", "kobun", "kanbun"] },
  { id: "math-ia", label: "数学ⅠA", maxPoints: 100, subjects: [] /* 数学は既存エンジン */ },
  { id: "math-iibc", label: "数学ⅡBC", maxPoints: 100, subjects: [] },
  { id: "eng-r", label: "英語R", maxPoints: 100, subjects: ["eng-r"] },
  { id: "eng-l", label: "英語L", maxPoints: 100, subjects: ["eng-l"] },
  { id: "info", label: "情報Ⅰ", maxPoints: 100, subjects: ["info"] },
  { id: "physics", label: "物理", maxPoints: 100, subjects: ["physics"] },
  { id: "science2", label: "第2理科", maxPoints: 100, subjects: ["bio", "chem"] },
  { id: "seikei", label: "公共政経", maxPoints: 100, subjects: ["seikei"] },
  { id: "social2", label: "第2社会", maxPoints: 100, subjects: ["world", "geo"] },
];

export const EXAM_DATE = "2027-01-16T00:00:00+09:00";
export const EXAM_DATE_LABEL = "2027年1月16日";

export function daysLeft(nowMs: number) {
  const diff = Date.parse(EXAM_DATE) - nowMs;
  return Math.max(0, Math.ceil(diff / 86400000));
}
