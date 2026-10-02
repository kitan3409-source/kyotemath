import type { OsUnit } from "./model";

// 第2社会（世界史/地理）。公共政経を第1解答科目にするため保険枠として最小構成。
export const social2Units: OsUnit[] = [
  {
    id: "world-01", subjectId: "world", title: "世界史の大枠（古代〜近現代の流れ）", estimatedMinutes: 14, importance: 2, weight: 3,
    lesson: {
      summary: "世界史は地域間の交流と変化で捉える。古代文明→中世の帝国→大航海時代→産業革命→帝国主義→二大戦→冷戦→グローバル化。",
      example: "産業革命（18世紀英国）は工業化を広げ、帝国主義（19世紀）で欧米が世界に拡大、20世紀の二大戦と冷戦で現代の枠組みができた。",
      workedExample: { problem: "「帝国主義」の時代として正しいのは？", steps: ["産業革命後、欧米列強が植民地獲得競争", "19世紀後半〜20世紀初頭", "第一次大戦の背景にもなる"], answer: "19世紀後半〜20世紀初頭" },
      examSignal: "時代区分とできごとの対応、地図・図版の読み取り。",
      commonMistakes: ["できごとの年代の前後関係の混同", "地域名と時代の対応"],
    },
    problems: [
      { id: "world-01-q1", prompt: "産業革命が始まった国は？", options: ["フランス", "ドイツ", "イギリス", "アメリカ"], answer: 2, explanation: "18世紀イギリス。", kind: "quick", estimatedSeconds: 20 },
      { id: "world-01-q2", prompt: "第一次世界大戦が始まった年は？", options: ["1914", "1917", "1919", "1939"], answer: 0, explanation: "1914年。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "world-02", subjectId: "world", title: "二大戦と冷戦（20世紀の枠組み）", estimatedMinutes: 14, importance: 2, weight: 3,
    lesson: {
      summary: "第一次大戦（1914-18）→戦間期→第二次大戦（1939-45）→冷戦（1947-91）。国際連盟→国際連合への流れも重要。",
      example: "ベルサイユ条約（1919）の厳しい賠償がドイツの不満を生み、ナチス台頭→第二次大戦へ。",
      workedExample: { problem: "国連が発足したのはいつか？", steps: ["第二次大戦後の国際秩序構築", "1945年10月に発足"], answer: "1945年" },
      examSignal: "年代順・条約名・組織名の対応で出る。",
      commonMistakes: ["国際連盟と国連の時期の混同", "二大戦の前後関係のできごと"],
    },
    problems: [
      { id: "world-02-q1", prompt: "冷戦の対立構造は？", options: ["米英 vs 露独", "米 vs ソ連", "NATO vs ワルシャワ条約機構", "国連 vs 枢軸国"], answer: 1, optionNotes: ["", "正解（米ソ対立）", "軍事同盟の名前で対立軸自体は米ソ", ""], explanation: "米ソ二大大国の対立が冷戦の基本構造。", kind: "quick", estimatedSeconds: 30 },
      { id: "world-02-q2", prompt: "第二次大戦の終結年は？", options: ["1945", "1946", "1939", "1950"], answer: 0, explanation: "1945年9月。", kind: "quick", estimatedSeconds: 15 },
    ],
  },
  {
    id: "geo-01", subjectId: "geo", title: "地形・気候と人間生活", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "地形（山地・平野・海岸・砂漠）と気候（降水量・気温）が農業・住居・交通を決める。気候図の読み取りが基本。",
      example: "地中海気候=夏乾燥・冬湿潤。オリーブやブドウの栽培に適する。",
      workedExample: { problem: "「夏季少雨・冬季多雨」の気候は？", steps: ["地中海性気候", "モンスーン気候や砂漠気候ではない"], answer: "地中海性気候" },
      examSignal: "気候図・地形図・人口密度図の読み取りと地域特性で出る。",
      commonMistakes: ["地中海性気候と温帯モンスーン気候の混同", "降水量と気温の読み違い"],
    },
    problems: [
      { id: "geo-01-q1", prompt: "地中海気候の降水の特徴は？", options: ["夏に多い", "冬に多い", "通年一定", "ほとんどない"], answer: 1, explanation: "夏乾燥・冬湿潤が特徴。", kind: "quick", estimatedSeconds: 25 },
      { id: "geo-01-q2", prompt: "気候図で「雨温図」が示す2つの要素は？", options: ["気温と降水量", "気温と湿度", "降水量と日射量", "気温と気圧"], answer: 0, explanation: "気温（線）と降水量（棒）を組み合わせる。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "geo-02", subjectId: "geo", title: "人口・都市化・産業立地", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "人口推移（出生率・死亡率・自然増加・社会増加）と都市化（人口の都市集中）、産業の立地要因（労働力・市場・交通・原材料）。",
      example: "日本の三大都市圏（東京・大阪・名古屋）は交通の要衝と市場が大きいため産業が集まる。",
      workedExample: { problem: "社会増加が起きる原因は？", steps: ["自然増加=出生-死亡", "社会増加=転入-転出", "都市部で転入が多いと人口が増える"], answer: "転入者が転出者を上回る（移動による増加）" },
      examSignal: "人口ピラミッド・都市化率・産業分布図の読解。",
      commonMistakes: ["自然増加と社会増加の区別", "人口密度と人口規模の混同"],
    },
    problems: [
      { id: "geo-02-q1", prompt: "社会増加とは？", options: ["出生率上昇", "死亡率低下", "転入者が転出者を上回る人口増", "外国からの輸入増"], answer: 2, explanation: "人の移動による増減。", kind: "quick", estimatedSeconds: 30 },
      { id: "geo-02-q2", prompt: "人口ピラミッドで高齢化社会を示す形は？", options: ["つぼ型（上狭下広）", "富士山型（中広上下狭）", "逆三角形", "釣鐘型（上広下狭）"], answer: 1, explanation: "富士山型は生産年齢人口が多い層が膨らみ高齢化の特徴。", kind: "standard", estimatedSeconds: 40 },
    ],
  },
];
