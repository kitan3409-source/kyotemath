import type { OsUnit } from "./model";

// 公共・政治経済: 38/100（偏差52.7）を起点に、統計・制度・因果・グラフ読解を狙う。
export const seikeiUnits: OsUnit[] = [
  {
    id: "seikei-01", subjectId: "seikei", title: "日本国憲法の三大原理と基本的人権", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "日本国憲法の柱は国民主権・基本的人権の尊重・平和主義の3つ。人権は「すべて国民は個人として尊重される」ことを核に、生存権・自由権・社会権・参政権などに整理される。",
      example: "表現の自由=自由権、生存権=社会権、選挙権=参政権。請求権（裁判を受ける権利等）も重要。",
      workedExample: { problem: "生存権を定めた条文は？", steps: ["第25条「すべて国民は、健康で文化的な最低限度の生活を営む権利を有する」", "社会権の中核"], answer: "憲法第25条" },
      examSignal: "人権の分類（自由権/社会権/参政権/請求権）と条文番号、具体的な場面との対応で出る。",
      commonMistakes: ["自由権と社会権の混同", "参政権と請求権の混同"],
    },
    problems: [
      { id: "seikei-01-q1", prompt: "「健康で文化的な最低限度の生活」を定める生存権は日本国憲法何条か？", options: ["第13条", "第25条", "第9条", "第97条"], answer: 1, optionNotes: ["13条=個人の尊重・幸福追求権", "正解", "9条=平和主義", "97条=基本的人権の永久保持"], explanation: "第25条が生存権。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-01-q2", prompt: "裁判を受ける権利は人権分類で何に入るか？", options: ["自由権", "社会権", "請求権", "参政権"], answer: 2, explanation: "国家に対して請求する権利=請求権。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "seikei-02", subjectId: "seikei", title: "国会・内閣・裁判所の役割", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "国会=立法（国権の最高機関・衆参の二院制）、内閣=行政（国会に対して連帯責任・首相指名は国会）、裁判所=司法（違憲立法審査権）。",
      example: "衆議院の優越: 参議院が否決しても衆議院が3分の2以上で再可決すれば成立（予算・条約・首相指名は衆議院の決定が優先）。",
      workedExample: { problem: "内閣総理大臣を指名するのは？", steps: ["天皇は国事行為として任命するだけ", "指名権は国会（両院）が持つ", "衆参で異なった場合は衆議院の指名が優先"], answer: "国会（両院、異なれば衆議院）" },
      examSignal: "三権の役割・衆議院の優越・指名権の所在で出る。",
      commonMistakes: ["天皇が首相を「選ぶ」と誤解（国事行為は任命のみ）", "参議院と衆議院の権限差"],
    },
    problems: [
      { id: "seikei-02-q1", prompt: "違憲立法審査権を持つのは？", options: ["国会", "内閣", "裁判所", "会計検査院"], answer: 2, explanation: "司法権の核心機能。", kind: "quick", estimatedSeconds: 25 },
      { id: "seikei-02-q2", prompt: "衆議院と参議院の意見が食い違った場合に優先されるのは？", options: ["参議院", "衆議院", "内閣", "国民投票"], answer: 1, explanation: "解散・総選挙で民意を問える衆議院が優越。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "seikei-03", subjectId: "seikei", title: "選挙制度と政党・政治参加", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "衆議院は小選挙区+比例代表の並立制、参議院は選挙区+比例代表。18歳以上に選挙権。投票率・政党・圧力団体の役割を掴む。",
      example: "小選挙区は1人当選で死票が多い傾向、比例代表は得票率に応じて議席が配分される。",
      workedExample: { problem: "死票が多くなりやすい選挙制度は？", steps: ["小選挙区=1位だけ当選で他の票は死票", "比例代表=得票に応じ配分で死票が少ない"], answer: "小選挙区制" },
      examSignal: "制度の特徴比較・投票率の推移・政治参加の形態で出る。",
      commonMistakes: ["小選挙区制を比例代表と混同", "18歳選挙権を20歳のまま記憶"],
    },
    problems: [
      { id: "seikei-03-q1", prompt: "日本の衆議院選挙の方式は？", options: ["小選挙区のみ", "比例代表のみ", "小選挙区と比例代表の並立制", "大選挙区制"], answer: 2, explanation: "小選挙区289+比例代表176の並立制。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-03-q2", prompt: "日本の選挙権年齢は？", options: ["16歳以上", "18歳以上", "20歳以上", "25歳以上"], answer: 1, explanation: "2016年から18歳以上。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "seikei-04", subjectId: "seikei", title: "地方自治と財政", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "地方自治は住民自治と団体自治が原理。都道府県・市町村の首長と議会、直接請求（条例制定・監査・解散・リコール）を押さえる。",
      example: "条例制定請求は有権者の50分の1以上の署名で可能。リコールは議会の解散や首長の解職を求める制度。",
      workedExample: { problem: "地方自治における住民の直接請求に含まれないものは？", steps: ["条例制定・監査・解散・解職（リコール）が直接請求の対象", "国政への国民投票は別の仕組み"], answer: "国政に関する国民投票" },
      examSignal: "直接請求の種類と必要な署名数、首長と議会の関係で出る。",
      commonMistakes: ["条例請求とリコールの必要数の混同", "地方議会と国会の権限差"],
    },
    problems: [
      { id: "seikei-04-q1", prompt: "地方自治において住民が条例の制定を直接求める制度は？", options: ["国民投票", "直接請求", "司法審査", "首長専決"], answer: 1, explanation: "直接請求の一種。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-04-q2", prompt: "地方自治の2つの原理は？", options: ["住民自治と団体自治", "直接民主制と間接民主制", "三権分立と地方分権", "法治国家と立憲主義"], answer: 0, explanation: "住民自治と団体自治が基本原理。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "seikei-05", subjectId: "seikei", title: "需要と供給・市場メカニズム", estimatedMinutes: 15, importance: 3, weight: 3,
    lesson: {
      summary: "価格が上がると需要は減り供給は増える。均衡点（需要曲線と供給曲線の交点）で価格と取引量が決まる。需給シフトの読み取りが頻出。",
      example: "ガソリン価格が上がると消費者は買い控え（需要減）、生産者は増産したがる（供給増）。",
      workedExample: { problem: "気温上昇でアイスクリームの需要が増えた。供給曲線が動かなければ価格と取引量は？", steps: ["需要曲線が右にシフト", "交点が右上に動く", "価格上昇・取引量増加"], answer: "価格上昇・取引量増加" },
      examSignal: "グラフのシフト方向・均衡点の変化を問う形式で頻出。",
      commonMistakes: ["需要曲線のシフトと曲線上の移動を混同", "供給曲線の傾きの向きを誤読"],
    },
    problems: [
      { id: "seikei-05-q1", prompt: "ある財の価格が上昇したとき、一般的に需要量は？", options: ["増える", "減る", "変わらない", "ゼロになる"], answer: 1, explanation: "価格と需要量は逆方向に動く（需要法則）。", kind: "quick", estimatedSeconds: 25 },
      { id: "seikei-05-q2", prompt: "需要が供給を上回る不足状態が続くと、価格は通常どう動くか？", options: ["下がる", "上がる", "一定", "ゼロ"], answer: 1, explanation: "不足→買い手競争→価格上昇。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "seikei-06", subjectId: "seikei", title: "GDP・経済成長・景気指標", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "GDP=国内総生産=一定期間に国内で生産された付加価値の合計。名目GDP（時価）と実質GDP（物価変動を除く）の区別、景気の判断指標。",
      example: "パンを100円で売ればGDPに100円加算。材料費50円なら付加価値は50円。",
      workedExample: { problem: "名目GDPが増えたが実質GDPが変わらないとき、何が起きたか？", steps: ["実質=物価変動を除く", "名目増+実質変わらず=物価上昇のみ", "インフレーション（物価上昇）が起きた"], answer: "物価が上昇した" },
      examSignal: "名目/実質の区別、GDPの内訳、景気判断（日銀短観など）で出る。",
      commonMistakes: ["名目と実質を取り違える", "GDPを「所得」や「貯蓄」と混同"],
    },
    problems: [
      { id: "seikei-06-q1", prompt: "GDPとして正しい定義は？", options: ["国内で生産された付加価値の合計", "国民の所得の合計", "国の税収", "家計の貯蓄"], answer: 0, explanation: "GDPは付加価値（生産-中間投入）の合計。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-06-q2", prompt: "物価変動の影響を除いたGDPを何というか？", options: ["名目GDP", "実質GDP", "GNP", "潜在GDP"], answer: 1, explanation: "実質GDPは物価を固定して測る。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "seikei-07", subjectId: "seikei", title: "金融政策と日本銀行", estimatedMinutes: 13, importance: 3, weight: 3,
    lesson: {
      summary: "日銀は政策金利・国債買入などでお金の量を調整する。金利を下げる→借りやすい→景気刺激、金利を上げる→景気抑制。為替との関係も頻出。",
      example: "金利を下げると企業が設備投資しやすくなり、景気が刺激される。逆に金利を上げると景気を冷やす方向。",
      workedExample: { problem: "景気を刺激したいとき日銀が取る金融政策は？", steps: ["金利を下げる（金融緩和）", "国債を買い入れて市場に資金供給", "借りやすくなり投資・消費が増える"], answer: "金利引き下げ（金融緩和）" },
      examSignal: "金融政策の方向と景気・為替の連動で出る。",
      commonMistakes: ["金利を上げると景気刺激と誤解", "日銀と政府の役割の混同"],
    },
    problems: [
      { id: "seikei-07-q1", prompt: "日銀が景気を抑制したいときの政策は？", options: ["金利を下げる", "金利を上げる", "国債を増発する", "消費税を下げる"], answer: 1, optionNotes: ["金利引下げは刺激方向", "正解", "国債増発は財政政策", "消費税は政府の権限"], explanation: "金利上昇は借入を減らし景気を冷やす。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-07-q2", prompt: "日本の金融政策を担当する機関は？", options: ["財務省", "日本銀行", "内閣府", "国会"], answer: 1, explanation: "日本銀行が中央銀行として金融政策を担う。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "seikei-08", subjectId: "seikei", title: "財政政策と社会保障", estimatedMinutes: 13, importance: 3, weight: 3,
    lesson: {
      summary: "財政=政府の収入（税金・国債）と支出（社会保障・公共事業等）。社会保障費が最大の支出項目。財政赤字と国債残高の問題を押さえる。",
      example: "日本の一般会計で最大の支出は社会保障関係費（年金・医療・介護）。税収だけでは足りず国債（借金）で補う構造。",
      workedExample: { problem: "高齢化が進むと財政にどんな影響があるか？", steps: ["社会保障費（年金・医療・介護）が増加", "働く世代の税・保険料負担が増える", "財政赤字の拡大圧力"], answer: "社会保障費の増大で財政負担が増える" },
      examSignal: "歳出の内訳・国債・税の種類・高齢化の影響で出る。",
      commonMistakes: ["最大支出項目を公共事業と誤解", "国債を歳入（収入）と思う"],
    },
    problems: [
      { id: "seikei-08-q1", prompt: "日本の一般会計で最大の支出項目は？", options: ["公共事業", "防衛費", "社会保障関係費", "国債費"], answer: 2, explanation: "社会保障関係費が最大。", kind: "quick", estimatedSeconds: 25 },
      { id: "seikei-08-q2", prompt: "政府が景気を刺激するために取る財政政策は？", options: ["公共事業を増やす", "金利を下げる", "国債を償還する", "税を上げる"], answer: 0, optionNotes: ["正解。支出増で需要創出", "金利は日銀の金融政策", "償還は緊縮方向", "増税は緊縮方向"], explanation: "財政政策=政府の支出・税で景気を調整。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "seikei-09", subjectId: "seikei", title: "国際経済（貿易・為替・比較優位）", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "為替（円高/円安）と貿易の関係、比較優位（得意な財の生産に特化して貿易）が頻出。円安=輸出有利・輸入不利。",
      example: "1ドル=100円→150円は円安。日本の車が海外で安く売れる→輸出に有利。輸入品は高くなる。",
      workedExample: { problem: "円安（1ドル100円→150円）で日本企業に起きることは？", steps: ["輸出品が外国で安くなる→輸出増", "輸入品が日本で高くなる→輸入減", "輸出産業に有利、輸入産業・消費者に不利"], answer: "輸出に有利・輸入に不利" },
      examSignal: "為替変動と貿易収支・産業への影響で出る。",
      commonMistakes: ["円高と円安の向きを逆に覚える", "貿易収支と経常収支の混同"],
    },
    problems: [
      { id: "seikei-09-q1", prompt: "1ドル=100円から1ドル=120円になったとき、円の価値は？", options: ["円高", "円安", "変わらない", "ドル安"], answer: 1, explanation: "同じ1ドルに多くの円が必要=円の価値が下がった=円安。", kind: "quick", estimatedSeconds: 30 },
      { id: "seikei-09-q2", prompt: "比較優位の考え方として正しいのは？", options: ["すべての財を自国で作る", "得意な財に特化して貿易する", "輸出を禁止する", "関税を撤廃しない"], answer: 1, explanation: "各国が得意分野に特化して貿易すると全体の生産が増える。", kind: "standard", estimatedSeconds: 45 },
    ],
  },
  {
    id: "seikei-10", subjectId: "seikei", title: "労働・社会保障・格差", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "労働三権（団結権・団体交渉権・団体行動権）、社会保障（年金・医療・介護・生活保護）、少子高齢化と格差の問題。",
      example: "正規雇用と非正規雇用の賃金差、地域間の医療格差などは統計資料で問われる。",
      workedExample: { problem: "労働三権に含まれないのは？", steps: ["団結権（労働組合を作る）", "団体交渉権（会社と交渉）", "団体行動権（ストライキ）", "「労働権」や「生存権」は別の概念"], answer: "生存権" },
      examSignal: "労働三権・社会保障の4本柱・格差指標（ジニ係数等）で出る。",
      commonMistakes: ["労働三権に労働権や生存権を混ぜる", "ジニ係数の意味（0=均等、1=最大格差）を誤解"],
    },
    problems: [
      { id: "seikei-10-q1", prompt: "労働三権に含まれるのは？", options: ["団結権", "参政権", "生存権", "請求権"], answer: 0, explanation: "団結権・団体交渉権・団体行動権。", kind: "quick", estimatedSeconds: 25 },
      { id: "seikei-10-q2", prompt: "所得格差を示す指標は？", options: ["GDP", "ジニ係数", "失業率", "物価指数"], answer: 1, explanation: "ジニ係数は0に近いほど平等。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "seikei-11", subjectId: "seikei", title: "国際社会と日本の立場", estimatedMinutes: 11, importance: 2, weight: 2,
    lesson: {
      summary: "国連の構成（総会・安全保障理事会）、安全保障（日米同盟・集団的自衛権）、環境・人権などの国際課題。",
      example: "国連安保理の常任理事国5か国（米英仏露中）は拒否権を持つ。日本は日米安全保障条約を結んでいる。",
      workedExample: { problem: "国連安全保障理事会で拒否権を持つのは？", steps: ["常任理事国5か国", "非常任理事国は10か国で拒否権なし"], answer: "常任理事国" },
      examSignal: "国際機関の役割・日本の安全保障の枠組みで出る。",
      commonMistakes: ["常任と非常任の権限差", "国連総会と安保理の決定力の違い"],
    },
    problems: [
      { id: "seikei-11-q1", prompt: "国連安保理の常任理事国に含まれないのは？", options: ["日本", "アメリカ", "中国", "フランス"], answer: 0, explanation: "米英仏露中の5か国。", kind: "quick", estimatedSeconds: 25 },
      { id: "seikei-11-q2", prompt: "日米安全保障条約に基づき、日本が米国に提供するのは？", options: ["基地", "兵器", "兵士", "資金のみ"], answer: 0, explanation: "施設・区域（基地）を提供し米軍が日本を防衛。", kind: "standard", estimatedSeconds: 40 },
    ],
  },
  {
    id: "seikei-12", subjectId: "seikei", title: "統計資料の読み取り（グラフ・表の解釈）", estimatedMinutes: 13, importance: 3, weight: 3,
    lesson: {
      summary: "共テでは折れ線・棒・円グラフ、散布図、統計表の読み取りが頻出。率と数の区別、前年比・対比の正しい読み方を練習する。",
      example: "「失業率が下がった」は失業者数が減ったとは限らない（分母の労働力人口が変わる場合がある）。",
      workedExample: { problem: "A国の輸出が前年比+10%、B国が+5%。A国の方が輸出額が大きいと言えるか？", steps: ["前年比は率であって絶対量ではない", "母数（前年度額）が違えば額の大小は不明", "率だけでは絶対額の大小は断定できない"], answer: "言えない（基準額がわからない）" },
      examSignal: "率と量の区別、前年比の読み違い、グラフの軸のトリックで出る。",
      commonMistakes: ["率の比較を量の比較と誤読", "軸の始まりが0でないグラフで差を過大評価"],
    },
    problems: [
      { id: "seikei-12-q1", prompt: "失業率が低下したが失業者数は増えた。矛盾しない説明は？", options: ["データが誤り", "労働力人口が増えた", "失業率は人数と無関係", "必ず一致するはず"], answer: 1, explanation: "失業率=失業者/労働力人口。分母が増えれば率は下がり得る。", kind: "standard", estimatedSeconds: 50 },
      { id: "seikei-12-q2", prompt: "グラフの縦軸が0から始まっていないときの注意点は？", options: ["差が実際より大きく見える", "読みやすくなる", "誤差がなくなる", "問題ない"], answer: 0, explanation: "軸の省略は差を視覚的に誇張する。", kind: "quick", estimatedSeconds: 35 },
    ],
  },
];
