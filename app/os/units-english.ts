import type { OsUnit } from "./model";

// 英語R/L: 英検2級の素地あり。共テ形式+時間制限で慣れる。
export const englishUnits: OsUnit[] = [
  {
    id: "eng-r-01", subjectId: "eng-r", title: "共テ長文の構造把握（パラグラフリーディング）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "共テの長文は段落ごとに役割がある（トピック文→説明→例→結論）。各段落の最初と最後を拾って全体の流れを掴む。",
      example: "1段落目の最後に「In this essay, I argue that...」があれば主張が明示されている。",
      workedExample: { problem: "段落の最初に「However, this view overlooks...」が来たら？", steps: ["Howeverは転換のサイン", "前の段落の内容への反論や注意喚起が来る", "筆者の立場はHoweverの後に多い"], answer: "筆者の反論・立場が来る" },
      examSignal: "段落の要旨・主張の特定・論理展開の追跡で出る。",
      commonMistakes: ["全段落を同じ詳しさで読もうとする", "接続詞の転換を見落とす"],
    },
    problems: [
      { id: "eng-r-01-q1", prompt: "段落のトピックセンテンスは通常どこにあるか？", options: ["必ず最後", "多くは最初か最後", "必ず真ん中", "決まった位置はない"], answer: 1, explanation: "冒頭が多いが文末にも来る。先に冒頭・結尾を見るのが効率的。", kind: "quick", estimatedSeconds: 30 },
      { id: "eng-r-01-q2", prompt: "「For example,」が出た直後の文の役割は？", options: ["新しい主張", "直前の内容の具体例", "反論", "結論"], answer: 1, explanation: "For exampleは直前の抽象的内容を具体的に示す。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "eng-r-02", subjectId: "eng-r", title: "代名詞・指示語の指す内容", estimatedMinutes: 12, importance: 3, weight: 3,
    lesson: {
      summary: "it, this, that, theyなどの指示語の指す内容を正確に特定する。直前の文か、文脈上の主語・対象を追う。",
      example: "「The data showed a decline. This suggests that...」のThisは「データが減少を示した」という前の文全体を指す。",
      workedExample: { problem: "「It is often said that X. However, it is wrong.」のitは？", steps: ["最初のitは形式主語", "2つ目のitも文脈上Xへの評価", "「Xは間違っている」が筆者の主張"], answer: "X（最初の文の内容）" },
      examSignal: "代名詞・this/thatの指示内容を選ぶ問題。",
      commonMistakes: ["直前の名詞だけに飛びつく（文脈で全体を指すこともある）", "thisとthatの使い分けを無視する"],
    },
    problems: [
      { id: "eng-r-02-q1", prompt: "「This is why...」のThisが指すのは？", options: ["直前の文・内容", "最後の単語", "次の文", "筆者自身"], answer: 0, explanation: "Thisは直前の内容を指す。", kind: "quick", estimatedSeconds: 25 },
      { id: "eng-r-02-q2", prompt: "「It is important to note that」文のitは？", options: ["形式主語", "具体的名詞", "筆者", "読者"], answer: 0, explanation: "形式主語（本当の主語はto以下）。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "eng-r-03", subjectId: "eng-r", title: "表・グラフ・図の読み取り問題", estimatedMinutes: 13, importance: 3, weight: 3,
    lesson: {
      summary: "共テでは記事や説明文に表・グラフ・図が付き、文中の情報と図の情報を照合する問題が出る。数値の大小・変化の向き・ラベルの対応を正確に。",
      example: "文中「sales doubled」とグラフで2倍になっている系列を一致させる。軸・単位・凡例を確認してから値を読む。",
      workedExample: { problem: "表でA列が「2020: 120」「2021: 180」「2022: 240」。文中で「steadily increased」と対応する列は？", steps: ["steadily increased=着実に増加", "A列は毎年増加している", "他の列と比較して一致を確認"], answer: "A列（またはAを示す系列）" },
      examSignal: "文中の記述と図表の数値・傾向の対応で出る。",
      commonMistakes: ["軸の単位や凡例を見ずに値だけを追う", "文章の抽象的表現と図の具体的数値を対応づけられない"],
    },
    problems: [
      { id: "eng-r-03-q1", prompt: "「increased sharply」の対応するグラフの傾向は？", options: ["緩やかに増加", "急激に増加", "横ばい", "急激に減少"], answer: 1, explanation: "sharply=急激に。", kind: "quick", estimatedSeconds: 20 },
      { id: "eng-r-03-q2", prompt: "「remained stable」の意味は？", options: ["増加した", "減少した", "安定していた", "変動した"], answer: 2, explanation: "remained stable=変わらず安定。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "eng-r-04", subjectId: "eng-r", title: "語彙・言い換え（同意表現の識別）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "共テは本文の単語と選択肢で違う表現に言い換える。同義語・類義語のストックを増やす（important↔crucial, difficult↔challenging, many↔numerous等）。",
      example: "「essential」は「necessary/indispensable/vital」に言い換え可能。「result in」は「lead to/cause」に言い換え可能。",
      workedExample: { problem: "「obtain the information」と同じ意味の選択肢は？", steps: ["obtain=得る", "get/acquire/gainが同義", "選択肢に「get」とあればそれが正解"], answer: "get the information（等の同義表現）" },
      examSignal: "下線部の意味選択・内容一致の言い換えで出る。",
      commonMistakes: ["字面だけで似ている語を選ぶ", "同義語と類義語を混同して選択"],
    },
    problems: [
      { id: "eng-r-04-q1", prompt: "「challenging」と最も近い意味は？", options: ["easy", "difficult", "boring", "common"], answer: 1, explanation: "challenging=difficult（難しい）。", kind: "quick", estimatedSeconds: 20 },
      { id: "eng-r-04-q2", prompt: "「result in」と同じ意味は？", options: ["begin with", "lead to", "depend on", "look for"], answer: 1, explanation: "result in=lead to（〜をもたらす）。", kind: "quick", estimatedSeconds: 20 },
    ],
  },
  {
    id: "eng-r-05", subjectId: "eng-r", title: "速読と時間配分（共テ形式対策）", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "処理速度に差がある場合、まず設問を読んでから本文を読む（先読み）。各段落の役割を掴んでから詳細に入る。",
      example: "設問に「What is the main purpose of the passage?」があれば、詳細よりも全体の主張を先に掴む必要がある。",
      workedExample: { problem: "80分の英語Rで大問6題。各問の目標時間は？", steps: ["全問題数にもよるが、大問あたり10〜13分", "語彙問題に時間をかけすぎない", "最後の大問に余裕を残す"], answer: "各大問に均等かつ最後に余裕を持つ配分" },
      examSignal: "試験時間内に全部を解くための戦略問題。",
      commonMistakes: ["最初から精読して時間切れ", "難問に固執して後半が未着手"],
    },
    problems: [
      { id: "eng-r-05-q1", prompt: "共テ英語で効率的な読み方は？", options: ["最初から全文精読", "設問を見てから本文を読む", "最後の段落だけ読む", "語彙をすべて調べる"], answer: 1, explanation: "設問を先に読めば何を探すか明確になる。", kind: "quick", estimatedSeconds: 30 },
      { id: "eng-r-05-q2", prompt: "時間切れを防ぐ工夫として適切なのは？", options: ["難問に十分時間をかける", "わからない問題はマークして先に進む", "全部を同じ時間で解く", "最初の問題を最後まで粘る"], answer: 1, explanation: "進まない問題は後回しにして全体の得点を最大化。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "eng-l-01", subjectId: "eng-l", title: "リスニングの基本姿勢（先読みと聞き取り）", estimatedMinutes: 12, importance: 2, weight: 3,
    lesson: {
      summary: "リスニングは音声が流れる前に設問と選択肢を先読みする。何を聞き取るか予測してから音声に集中する。",
      example: "選択肢に「at the library / at the station / at the store」があれば、場所を聞き取る問題とわかる。",
      workedExample: { problem: "設問が「What time does the train leave?」とあれば聞き取るべき情報は？", steps: ["時刻（数字）を聞き取る", "leaveの代わりにdepart等が使われる可能性", "複数の時刻が出てくることもある"], answer: "時刻（数字とその文脈）" },
      examSignal: "場面・人物・行動・時刻などの特定情報の聞き取り。",
      commonMistakes: ["先読みせず音声だけを追う", "一部の語に囚われて文脈を見失う"],
    },
    problems: [
      { id: "eng-l-01-q1", prompt: "リスニングで先読みすべきものは？", options: ["音声のみ", "設問と選択肢", "スクリプト", "解答欄"], answer: 1, explanation: "設問と選択肢を先読みして聞き取るポイントを絞る。", kind: "quick", estimatedSeconds: 25 },
      { id: "eng-l-01-q2", prompt: "音声が速いと感じたときの対処は？", options: ["全部を書き留める", "キーワードだけを拾う", "聞き流す", "最初の単語だけ聞く"], answer: 1, explanation: "全部を追うよりキーワードを拾う方が現実的。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
  {
    id: "eng-l-02", subjectId: "eng-l", title: "会話の流れと意図の聞き取り", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "共テリスニングは会話の流れ（依頼→応答、質問→答え、提案→受け入れ/断り）を追う。同意・反対・確認の表現を聞き分ける。",
      example: "「Could you...?」は依頼、「I'd be happy to.」は同意、「I'm afraid not.」は丁寧な断り。",
      workedExample: { problem: "「Would you mind opening the window?」への適切な返答は？", steps: ["依頼への返答が求められる", "同意=Sure/Of course/Not at all", "断り=I'm sorry, but.../I'd rather not"], answer: "Sure / Not at all（同意の表現）" },
      examSignal: "会話の意図・応答の適切さ・場面の特定。",
      commonMistakes: ["丁寧な断り（I'm afraid not等）を同意と誤聴", "Well, actually...の後の本題を見落とす"],
    },
    problems: [
      { id: "eng-l-02-q1", prompt: "「Could you help me?」への適切な応答は？", options: ["Yes, I could", "Sure, no problem", "I would help", "That's right"], answer: 1, explanation: "Could you〜への応答はSure/Of course等。", kind: "quick", estimatedSeconds: 25 },
      { id: "eng-l-02-q2", prompt: "「I'm afraid not」はどんな意味か？", options: ["同意", "丁寧な拒否", "質問", "確認"], answer: 1, explanation: "申し訳ないですが〜ない/できない。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
];
