import type { OsUnit } from "./model";

// 古文・漢文・現代文。古文漢文はほぼ0→50%を狙う短期集中型。
export const kokugoUnits: OsUnit[] = [
  {
    id: "kobun-01", subjectId: "kobun", title: "古文の基本単語（動詞・形容詞の頻出）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "古文はまず頻出単語を固める。敬語（給ふ、奉る）、判断（なり）、過去（き、けり）、推量（べし、らむ）が核。",
      example: "「宮に仕ふ」=宮殿に仕える。「花咲きにけり」=咲いてしまったなあ（詠嘆）。",
      workedExample: { problem: "「明日こそ来む」中の助動詞「む」の意味は？", steps: ["「む」は推量・意志・仮定などを表す", "文脈で「来るだろう」「来るつもり」の推量", "係助詞「こそ」との結びつきも注目"], answer: "推量（〜だろう・つもり）" },
      examSignal: "単語の意味を選択、または文脈での助動詞の意味判定。",
      commonMistakes: ["助動詞の多義性を区別しない", "敬語と自語の主語を混同"],
    },
    problems: [
      { id: "kobun-01-q1", prompt: "「給ふ」が表すのは？", options: ["謙譲", "尊敬", "判断", "過去"], answer: 1, explanation: "給ふ=尊敬動詞（他人の動作を敬う）。", kind: "quick", estimatedSeconds: 30 },
      { id: "kobun-01-q2", prompt: "「花咲きにけり」の「けり」が表すのは？", options: ["完了", "詠嘆・発見", "推量", "命令"], answer: 1, explanation: "けりは発見・詠嘆を表す。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "kobun-02", subjectId: "kobun", title: "助動詞の意味（識別の最小セット）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "古文の助動詞は意味を1つに絞り切れないことが多い。「き（過去・体験）」「けり（発見・詠嘆）」「べし（推量・意志・当然）」「なり（断定）」「らむ（推量）」の5つをまず固める。",
      example: "「昨日見にけり」→けり=見たことへの気づき・感動。「明日行くべし」→べし=行くつもり・べき。",
      workedExample: { problem: "「我は行かむと思ふ」の「む」は？", steps: ["動詞「思ふ」の前で推量", "意志「〜しようと思う」に相当"], answer: "意志・推量（〜しよう）" },
      examSignal: "助動詞の意味判定と、それに伴う文末表現のニュアンス。",
      commonMistakes: ["「き」を常に過去と読む（体験の場合あり）", "「らむ」を未来と決めつける（現在推量もある）"],
    },
    problems: [
      { id: "kobun-02-q1", prompt: "「明日は雨らむ」の「らむ」は？", options: ["断定", "過去", "推量", "命令"], answer: 2, explanation: "らむ=推量（〜だろう）。", kind: "quick", estimatedSeconds: 25 },
      { id: "kobun-02-q2", prompt: "「昨日来（き）たり」で「き」の意味は？", options: ["発見", "過去・体験", "推量", "断定"], answer: 1, explanation: "き=過去の体験。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "kobun-03", subjectId: "kobun", title: "係り結びと文の切れ目", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "係助詞（ぞ・なむ・や・か・こそ）が来ると文末の動詞・助動詞の形が変わる（係り結び）。ぞ/なむ/や/か→連体形、こそ→已然形。",
      example: "「花ぞ咲く」→咲く（連体形）。「花こそ咲け」→咲け（已然形）。",
      workedExample: { problem: "「あなたこそ来たれ」の「れ」の形は？", steps: ["こそが来たので已然形で結ぶ", "来るの已然形=来れ"], answer: "已然形" },
      examSignal: "係助詞の識別と文末形の対応で出る。",
      commonMistakes: ["こそを連体形で結ぶ（已然形が正）", "係助詞の見落とし"],
    },
    problems: [
      { id: "kobun-03-q1", prompt: "「これぞ本物なり」の「ぞ」の結びは？", options: ["已然形", "連体形", "未然形", "命令形"], answer: 1, explanation: "ぞは連体形で結ぶ。", kind: "quick", estimatedSeconds: 30 },
      { id: "kobun-03-q2", prompt: "「あなたこそ知れ」の「こそ」に対応する文末形は？", options: ["連体形", "未然形", "已然形", "終止形"], answer: 2, explanation: "こそは已然形で結ぶ。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "kobun-04", subjectId: "kobun", title: "敬語と主語の識別", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "尊敬語（給ふ、奉る等）は動作主が目上、謙譲語は動作主が目下。誰が何をしたかを誤ると文意を取り違える。",
      example: "「帝の御前に奉りて読む」→奉る=謙譲なので、読むのは話し手（臣下）。",
      workedExample: { problem: "「大臣給ひて言ふ」の主語は？", steps: ["給ふ=尊敬語", "主語は目上の人=大臣"], answer: "大臣" },
      examSignal: "敬語の種類（尊敬/謙譲/丁寧）と動作主の識別で出る。",
      commonMistakes: ["尊敬語の動作主を話し手と誤る", "丁寧語（侍る等）を尊敬語と混同"],
    },
    problems: [
      { id: "kobun-04-q1", prompt: "謙譲語の動作主は？", options: ["目上の人", "話し手・自分側", "第三者", "神"], answer: 1, explanation: "謙譲語は自分側の動作を低く表現。", kind: "quick", estimatedSeconds: 30 },
      { id: "kobun-04-q2", prompt: "「帝の御前で読み奉る」の主語は？", options: ["帝", "話し手（臣下）", "第三者", "不明"], answer: 1, explanation: "奉る=謙譲語なので主語は話し手。", kind: "standard", estimatedSeconds: 45 },
    ],
  },
  {
    id: "kobun-05", subjectId: "kobun", title: "枕詞・掛詞・縁語", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "修辞技法を知ると読解が速くなる。枕詞（特定語にかかる5音節の飾り）、掛詞（一語に二つの意味をかける）、縁語（連想される言葉を散りばめる）。",
      example: "「あをによし」は奈良にかかる枕詞。「立ちてゐても」は「い（居）」と「井」を掛ける掛詞。",
      workedExample: { problem: "「うれしきを何に例へむ」の「うれし」を使った修辞は？", steps: ["枕詞ではない（特定語への飾りでない）", "掛詞でもない（意味の重なりがない）", "縁語でもない", "一般の形容詞の使い方"], answer: "修辞技法ではない普通の形容詞" },
      examSignal: "枕詞の対応語、掛詞の二重意味の識別で出る。",
      commonMistakes: ["枕詞と掛詞を混同", "縁語を名詞と見抜けない"],
    },
    problems: [
      { id: "kobun-05-q1", prompt: "「あをによし」がかかる地名は？", options: ["大和", "奈良", "京都", "鎌倉"], answer: 1, explanation: "あをによし=奈良にかかる枕詞。", kind: "quick", estimatedSeconds: 25 },
      { id: "kobun-05-q2", prompt: "一つの言葉に二つの意味をかける技法は？", options: ["枕詞", "掛詞", "縁語", "対句"], answer: 1, explanation: "掛詞（かけことば）。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "kanbun-01", subjectId: "kanbun", title: "漢文の基本句形（再読文字・否定・疑問）", estimatedMinutes: 14, importance: 3, weight: 4,
    lesson: {
      summary: "漢文は語順が鍵。再読文字（不・未・非・莫など）で否定、疑問詞（何・安・豈など）で疑問文、使役（令・使）・受身（被・見）の句形を押さえる。",
      example: "「不學無術」=学ばずして術なし。「何陋之有」=何の陋（あなど）りかあらん（疑問）。",
      workedExample: { problem: "「不E言」の「不」の役割は？", steps: ["不は再読文字（下の字を再読する）", "不學=學ばず（否定）", "言葉の前に来てその動作を否定"], answer: "否定（〜しない/〜ず）" },
      examSignal: "基本句形の読み下しと意味判定で出る。",
      commonMistakes: ["否定句を肯定と読み違える", "疑問詞を副詞と誤解"],
    },
    problems: [
      { id: "kanbun-01-q1", prompt: "漢文の再読文字「不」が表すのは？", options: ["肯定", "否定", "疑問", "命令"], answer: 1, explanation: "不は否定を表す再読文字。", kind: "quick", estimatedSeconds: 25 },
      { id: "kanbun-01-q2", prompt: "「何」の役割として正しいのは？", options: ["接続詞", "疑問詞", "助動詞", "感嘆詞"], answer: 1, explanation: "何は疑問を表す。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "kanbun-02", subjectId: "kanbun", title: "漢文の頻出熟語と故事成語", estimatedMinutes: 13, importance: 2, weight: 3,
    lesson: {
      summary: "「矛盾」「画竜点睛」「塞翁が馬」など、漢文由来の成語・故事の意味を知ると読解に使える。",
      example: "「矛盾」=矛（ほこ）と盾（たて）の論理破綻の故事。「画竜点睛」=最後の仕上げ。",
      workedExample: { problem: "「臥薪嘗胆」の意味は？", steps: ["薪（たきぎ）に臥し胆（きも）を嘗（な）める", "越王句践が呉王夫差への復讐を誓った故事", "苦労を重ねて目的を果たす"], answer: "苦労して目的を達成する" },
      examSignal: "成語の意味と故事の出典で出る。",
      commonMistakes: ["字面だけで意味を推測する", "故事と現代の意味を混同"],
    },
    problems: [
      { id: "kanbun-02-q1", prompt: "「矛盾」の本来の意味は？", options: ["争い", "論理の破綻", "武器の名", "城門の構造"], answer: 1, explanation: "最強の矛と最強の盾は同時に成立しない→論理破綻。", kind: "quick", estimatedSeconds: 30 },
      { id: "kanbun-02-q2", prompt: "「五十歩百歩」が意味するのは？", options: ["大きな違い", "些細な違い", "同じもの", "逆転"], answer: 1, explanation: "五十歩と百歩も逃げたことに変わりない→程度の差。", kind: "standard", estimatedSeconds: 35 },
    ],
  },
  {
    id: "modern-01", subjectId: "modern", title: "評論文の読み方（筆者の主張を追う）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "評論文は「筆者が何を主張したいか」を追う。接続語（しかし・つまり・ただし）と文末表現（〜べきだ・〜ではないか）に注目する。",
      example: "「しかし、〜」以降は筆者の本当に言いたいことが来やすい。「つまり」は言い換え・要約のサイン。",
      workedExample: { problem: "「Aが重要だと言われる。しかし本当に大切なのはBだ」この文の筆者の主張は？", steps: ["「しかし」で前の内容を転換", "転換後の内容が筆者の立場", "Aが重要と「言われる」（他人の意見）→Bが本当に大切（筆者）"], answer: "Bが大切だ" },
      examSignal: "筆者の主張・内容の合否判定、指示語の指す内容、段落の役割で出る。",
      commonMistakes: ["筆者の意見と引用された他人の意見を混同", "接続語の転換を見落とす"],
    },
    problems: [
      { id: "modern-01-q1", prompt: "「しかし」が出た直後に来やすいのは？", options: ["具体例", "筆者の本当の主張", "引用", "説明の繰り返し"], answer: 1, explanation: "「しかし」は対比・転換のサインで筆者の立場が来やすい。", kind: "quick", estimatedSeconds: 25 },
      { id: "modern-01-q2", prompt: "「つまり」の機能として適切なのは？", options: ["反論", "要約・言い換え", "新しい話題", "問いかけ"], answer: 1, explanation: "つまり=前の内容を言い換え・まとめる。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "modern-02", subjectId: "modern", title: "小説の読み方（心情と表現）", estimatedMinutes: 14, importance: 2, weight: 3,
    lesson: {
      summary: "小説は登場人物の心情の変化を追う。情景描写・会話・行動から心情を読み取る。比喩表現の効果を問う問題も頻出。",
      example: "「彼は窓の外をじっと見つめた」→行動から心情（不安・考え事）を推測。",
      workedExample: { problem: "「彼の手が微かに震えていた」から読み取れる心情は？", steps: ["身体の反応から心情を推測", "震え=緊張・不安・動揺の表れ", "文脈で前後の出来事と照合"], answer: "緊張や動揺" },
      examSignal: "心情の選択・比喩の意味・場面の役割で出る。",
      commonMistakes: ["心情を字面通りに読みすぎる（深読みしすぎない）", "登場人物を混同する"],
    },
    problems: [
      { id: "modern-02-q1", prompt: "小説で「情景描写」が持つ役割として適切なのは？", options: ["心情の描写に関係ない", "心情や雰囲気を間接的に表す", "話の順序を変える", "登場人物を増やす"], answer: 1, explanation: "情景は心情の投影に使われる。", kind: "quick", estimatedSeconds: 30 },
      { id: "modern-02-q2", prompt: "「彼は重い足取りで歩いた」から推測できるのは？", options: ["足が痛い", "精神的な重さ・疲労", "速く歩けない", "道が悪い"], answer: 1, explanation: "「重い足取り」は気持ちの重さを表す表現。", kind: "standard", estimatedSeconds: 40 },
    ],
  },
  {
    id: "modern-03", subjectId: "modern", title: "随筆・エッセイの読み方", estimatedMinutes: 12, importance: 1, weight: 2,
    lesson: {
      summary: "随筆は筆者の体験や感想を通して主張する。評論より自由な構成で、個人的なエピソードから普遍的主题へ進むことが多い。",
      example: "「私はある日、庭の花に気づいた」→日常の発見から人生や社会への思索へ。",
      workedExample: { problem: "随筆が評論と異なる点は？", steps: ["評論=論理的に主張", "随筆=体験や感じたことを通じて思索", "随筆は論証よりも心情や雰囲気が前面に出やすい"], answer: "体験や感じたことを通じて思索する" },
      examSignal: "筆者の感じたこと・気づいたことの内容把握で出る。",
      commonMistakes: ["評論と同じ読み方で論理だけを追う", "個人的な話を軽視する"],
    },
    problems: [
      { id: "modern-03-q1", prompt: "随筆の特徴として適切なのは？", options: ["論証が中心", "体験や感じたことから思索する", "登場人物がいる", "必ず物語形式"], answer: 1, explanation: "随筆は体験を通じた思索が中心。", kind: "quick", estimatedSeconds: 30 },
      { id: "modern-03-q2", prompt: "随筆で「ふと思った」に続く内容は？", options: ["事実の羅列", "筆者の気づきや考え", "反論", "定義"], answer: 1, explanation: "「ふと思った」は筆者の内面の動き。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
];
