import type { OsUnit } from "./model";

// 第2理科: 生物（現在52.9→60+）と化学（未履修、比較用に最小セット）。
export const science2Units: OsUnit[] = [
  {
    id: "bio-01", subjectId: "bio", title: "細胞の構造と働き", estimatedMinutes: 13, importance: 3, weight: 3,
    lesson: {
      summary: "細胞は核・ミトコンドリア・細胞膜・リボソームなどからなる。植物細胞は細胞壁・葉緑体・大きな液胞を持つ。",
      example: "ミトコンドリア=エネルギー（ATP）を作る「発電所」。葉緑体は光合成を行う植物特有の構造。",
      workedExample: { problem: "動物細胞にあって植物細胞にないものは？", steps: ["動物: 中心体（細胞分裂に関与）", "植物特有: 細胞壁・葉緑体・大きな液胞", "中心体は一部の植物にもあるが、典型では動物"], answer: "中心体" },
      examSignal: "細胞小器官の名前と働き、動植物の違いで出る。",
      commonMistakes: ["ミトコンドリアと葉緑体の働きを混同", "原核細胞と真核細胞の区別"],
    },
    problems: [
      { id: "bio-01-q1", prompt: "エネルギーを作り出す細胞小器官は？", options: ["核", "ミトコンドリア", "葉緑体", "リボソーム"], answer: 1, explanation: "ミトコンドリアが呼吸でATPを生成。", kind: "quick", estimatedSeconds: 25 },
      { id: "bio-01-q2", prompt: "植物細胞だけに見られる構造は？", options: ["細胞膜", "核", "細胞壁", "ミトコンドリア"], answer: 2, explanation: "細胞壁は植物（と菌類・細菌）に見られる。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "bio-02", subjectId: "bio", title: "遺伝とDNA（優性・劣性・メンデル）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "DNAは遺伝情報の本体。メンデルの法則: 優性が劣性を隠す。分離の法則（対立遺伝子は分離して配偶子に入る）。",
      example: "エンドウ豆で、丸い種子（優性R）×しわ（劣性r）をかけるとF1は全部丸い（Rr）。F1同士で3:1に分離。",
      workedExample: { problem: "Rr×Rrの交配で、劣性形質（rr）が現れる割合は？", steps: ["Rr×Rr→RR, Rr, Rr, rr", "rrは4分の1", "25%"], answer: "25%（4分の1）" },
      examSignal: "遺伝子型と表現型の対応、交配結果の比率計算で出る。",
      commonMistakes: ["優性と劣性の表現型を混同", "F1とF2の違い"],
    },
    problems: [
      { id: "bio-02-q1", prompt: "Rr×RrでRRとなる確率は？", options: ["1/4", "1/2", "3/4", "1"], answer: 0, explanation: "RR, Rr, Rr, rrのうち1つ。", kind: "quick", estimatedSeconds: 35 },
      { id: "bio-02-q2", prompt: "メンデルの分離の法則が述べることは？", options: ["対立遺伝子が一緒に働く", "対立遺伝子が分離して配偶子に入る", "劣性が優性になる", "遺伝子が変化する"], answer: 1, explanation: "対立遺伝子は分離して各配偶子に1つずつ入る。", kind: "standard", estimatedSeconds: 45 },
    ],
  },
  {
    id: "bio-03", subjectId: "bio", title: "呼吸と光合成", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "呼吸=有機物を分解してエネルギー（ATP）を得る（動植物とも）。光合成=CO₂と水から有機物を作る（植物・藻類のみ）。",
      example: "植物も呼吸をする（昼も夜も）。光合成は光があるときだけ。",
      workedExample: { problem: "「植物は昼に光合成、夜に呼吸をする」は正しいか？", steps: ["呼吸は24時間行う（細胞が生きるため）", "光合成は光があるときのみ", "正確には「昼は両方、夜は呼吸のみ」"], answer: "誤り（植物も昼夜呼吸する）" },
      examSignal: "物質収支の式、動植物の違い、光量と光合成速度のグラフ読解。",
      commonMistakes: ["植物は呼吸しないと思う", "光合成と呼吸の反応を逆に覚える"],
    },
    problems: [
      { id: "bio-03-q1", prompt: "光合成で消費されるのは？", options: ["O₂", "CO₂", "有機物", "ATP"], answer: 1, explanation: "CO₂+水→有機物+O₂。", kind: "quick", estimatedSeconds: 25 },
      { id: "bio-03-q2", prompt: "呼吸が生み出すエネルギーを運ぶ分子は？", options: ["DNA", "ATP", "O₂", "CO₂"], answer: 1, explanation: "呼吸で生成されるのはATP（アデノシン三リン酸）。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "bio-04", subjectId: "bio", title: "恒常性（ホメオスタシス）", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "生物は内部環境（体温・血糖・浸透圧など）を一定に保とうとする=恒常性。血糖値の調節（インスリン・グルカゴン）が頻出。",
      example: "血糖値が上がるとインスリンが出て筋肉や肝臓に糖を取り込ませる。下がるとグルカゴンで肝臓から糖を放出。",
      workedExample: { problem: "食後に血糖値が上がったとき、下げるために働くホルモンは？", steps: ["血糖値を下げるのはインスリン", "膵臓のβ細胞から分泌"], answer: "インスリン" },
      examSignal: "ホルモンと効果の対応、体温・血糖の調節機構。",
      commonMistakes: ["インスリンとグルカゴンの作用を逆に覚える", "恒常性を免疫と混同"],
    },
    problems: [
      { id: "bio-04-q1", prompt: "血糖値を下げるホルモンは？", options: ["グルカゴン", "インスリン", "アドレナリン", "チロキシン"], answer: 1, explanation: "インスリンが唯一の血糖降下ホルモン。", kind: "quick", estimatedSeconds: 25 },
      { id: "bio-04-q2", prompt: "恒常性（ホメオスタシス）とは？", options: ["外部環境に完全に従う", "内部環境を一定に保つ仕組み", "常に変化し続ける状態", "成長すること"], answer: 1, explanation: "内部環境の安定を維持する仕組み。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "bio-05", subjectId: "bio", title: "生態系とエネルギーの流れ", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "生態系は生産者（植物）→消費者（動物）→分解者（細菌・菌類）で物質を循環し、エネルギーは一方向に流れて減少する（約10%ずつ）。",
      example: "植物を食べたウサギは、植物のエネルギーの約10%しか体に使えない。残りは呼吸で失われる。",
      workedExample: { problem: "生産者のエネルギーが100単位なら、肉食動物（3次消費者）には約何単位届くか？", steps: ["各段階で約10%が伝わる", "100→10→1", "3次消費者（肉食の肉食）には約1"], answer: "約1単位" },
      examSignal: "エネルギーピラミッド・生物濃縮・食物網の読解で出る。",
      commonMistakes: ["10%法則を逆に計算する", "分解者の役割を見落とす"],
    },
    problems: [
      { id: "bio-05-q1", prompt: "エネルギーが生態系を流れる際に減る理由は？", options: ["分解者が使う", "呼吸で失われる", "光合成で戻る", "蒸発する"], answer: 1, explanation: "各生物が呼吸で消費し、約10%が次に伝わる。", kind: "quick", estimatedSeconds: 35 },
      { id: "bio-05-q2", prompt: "物質を無機物に戻す生物は？", options: ["生産者", "一次消費者", "分解者", "捕食者"], answer: 2, explanation: "細菌・菌類などの分解者が物質を無機化。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "chem-01", subjectId: "chem", title: "物質の分類（元素・単体・化合物・混合物）", estimatedMinutes: 11, importance: 2, weight: 3,
    lesson: {
      summary: "元素=これ以上分けられない成分。単体=1種類の元素からなる物質。化合物=2種以上の元素が結合。混合物=複数の物質が混在。",
      example: "H₂Oは化合物（HとOの結合）。O₂は単体。空気は混合物（N₂+O₂+CO₂等）。",
      workedExample: { problem: "CO₂を分類すると？", steps: ["CとOの2元素からなる", "結合している=化合物", "混合物ではない"], answer: "化合物" },
      examSignal: "物質の分類の識別、化学式の意味で出る。",
      commonMistakes: ["単体と化合物を混同", "純物質と混合物の区別"],
    },
    problems: [
      { id: "chem-01-q1", prompt: "NaCl（塩化ナトリウム）の分類は？", options: ["単体", "化合物", "混合物", "元素"], answer: 1, explanation: "NaとClの化合物。", kind: "quick", estimatedSeconds: 25 },
      { id: "chem-01-q2", prompt: "空気の分類は？", options: ["単体", "化合物", "混合物", "元素"], answer: 2, explanation: "窒素・酸素・CO₂等の混合。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "chem-02", subjectId: "chem", title: "原子と周期表（原子番号・周期・族）", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "原子番号=陽子の数で決まる。周期表で縦が族（性質が似る）、横が周期。典型元素は1,2,13〜18族。",
      example: "Na（原子番号11）は1族のアルカリ金属。Cl（17番）は17族のハロゲン。",
      workedExample: { problem: "原子番号6の元素は？", steps: ["周期表の6番=炭素（C）", "2周期14族"], answer: "炭素（C）" },
      examSignal: "原子番号・族・元素名の対応、性質の予測で出る。",
      commonMistakes: ["原子番号を質量数と混同", "族の性質の傾向"],
    },
    problems: [
      { id: "chem-02-q1", prompt: "原子番号は何を表すか？", options: ["質量数", "陽子の数", "中性子の数", "電子の数"], answer: 1, explanation: "原子番号=陽子の数（中性子ではない）。", kind: "quick", estimatedSeconds: 25 },
      { id: "chem-02-q2", prompt: "同じ族の元素の性質は？", options: ["まったく同じ", "似た性質を持つ", "必ず同じ状態", "関係ない"], answer: 1, explanation: "同族元素は外殻電子数が同じで性質が似る。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "chem-03", subjectId: "chem", title: "モルと物質量", estimatedMinutes: 14, importance: 2, weight: 3,
    lesson: {
      summary: "1mol=6.02×10²³個の粒子。モル質量（分子量）はg/mol。化学反応式の係数の比=モル比。計算が多いが基本は「モル×モル質量=質量」。",
      example: "水H₂O=18g/mol。1molの水は18gで6.02×10²³個の分子を含む。",
      workedExample: { problem: "0.5molのCO₂の質量は？（CO₂=44g/mol）", steps: ["質量=モル数×モル質量", "0.5×44=22"], answer: "22g" },
      examSignal: "モルと質量の換算、化学式の係数との対応で出る。",
      commonMistakes: ["モルと分子量を混同", "係数の比を分子数の比と読み違える"],
    },
    problems: [
      { id: "chem-03-q1", prompt: "1molの水分子（H₂O、18g/mol）の質量は？", options: ["9g", "18g", "36g", "1g"], answer: 1, explanation: "モル質量=18g/molなので1mol=18g。", kind: "quick", estimatedSeconds: 30 },
      { id: "chem-03-q2", prompt: "0.25molのO₂（32g/mol）の質量は？", options: ["4g", "8g", "16g", "128g"], answer: 1, explanation: "0.25×32=8g。", kind: "quick", estimatedSeconds: 40 },
    ],
  },
  {
    id: "chem-04", subjectId: "chem", title: "酸・塩基と中和", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "酸=H⁺を出す（HCl, H₂SO₄）、塩基=OH⁻を出す（NaOH, Ca(OH)₂）。中和=酸と塩基が反応して塩と水を作る。pHは酸性度の指標（小さいほど酸性）。",
      example: "HCl + NaOH → NaCl + H₂O。塩酸（酸）と水酸化ナトリウム（塩基）が中和して食塩と水。",
      workedExample: { problem: "pH=3の水溶液は？", steps: ["pH<7は酸性", "pH=7は中性", "pH>7は塩基性", "pH=3は強い酸性"], answer: "酸性" },
      examSignal: "酸と塩基の識別、pHの大小関係、中和反応式で出る。",
      commonMistakes: ["pHの大小を逆に覚える（小さいほど酸性）", "中和を酸化と混同"],
    },
    problems: [
      { id: "chem-04-q1", prompt: "pH=7の水溶液は？", options: ["酸性", "中性", "塩基性", "緩衝液"], answer: 1, explanation: "pH=7は中性。", kind: "quick", estimatedSeconds: 20 },
      { id: "chem-04-q2", prompt: "HCl + NaOH → ? の中和反応でできる物質は？", options: ["NaClとH₂O", "NaOHとH₂", "Cl₂とH₂O", "NaClのみ"], answer: 0, explanation: "塩化ナトリウム（塩）と水。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
];
