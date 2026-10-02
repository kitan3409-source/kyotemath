import type { OsUnit } from "./model";

// 情報Ⅰ: ユーザーは履修済み+実践経験があり強い。穴を埋めて80+へ。
// 単元は「情報社会/データ活用/統計/ネットワーク/セキュリティ/情報デザイン/疑似コード/読解」軸。
export const infoUnits: OsUnit[] = [
  {
    id: "info-01", subjectId: "info", title: "情報のデジタル化とアナログ→デジタル", estimatedMinutes: 12, importance: 3, weight: 3,
    lesson: {
      summary: "音・画像・文字は、サンプリング（時間を刻む）と量子化（値を段階に丸める）でデジタルデータになる。刻みが細かいほど元に近いが容量は増える。",
      example: "CDの音は1秒を44100分割し、各瞬間の音量を16bit=65536段階で記録する。画像は1画素をRGB各8bit=256段階で記録する。",
      workedExample: { problem: "1秒あたり8000回サンプリングし、各値を8bitで記録する1分の音声のデータ量は？", steps: ["1秒あたり 8000×8bit = 64000bit", "1分=60秒なので 64000×60 = 3,840,000bit", "8bit=1byteなので 480,000byte ≈ 480KB"], answer: "約480KB" },
      examSignal: "「サンプリング周波数・量子化ビット数・時間から容量を計算」「アナログとデジタルの特徴比較」で出る。",
      commonMistakes: ["bitとbyteの換算（8bit=1byte）を忘れる", "サンプリング（横軸）と量子化（縦軸）を取り違える"],
    },
    problems: [
      { id: "info-01-q1", prompt: "アナログ量をデジタル化するとき、値を有限の段階に丸める処理を何というか？", options: ["サンプリング", "量子化", "符号化", "復号"], answer: 1, optionNotes: ["サンプリングは時間方向の切り取りで、値の丸めではない", "正解", "符号化はルールに沿った表現化で丸め処理の名称ではない", "復号は逆変換"], explanation: "量子化=値を段階に丸める。サンプリング=時間を刻む。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-01-q2", prompt: "RGB各8bitで表現される画像で表せる色の数は？", options: ["約1,600万色", "約65,000色", "約16万色", "256色"], answer: 0, optionNotes: ["正解。256³", "256²に相当する計算", "16万は2¹⁷前後で合わない", "1チャネルの段階数と混同"], explanation: "R,G,Bそれぞれ256段階なので 256×256×256 ≈ 1,678万色。", kind: "standard", estimatedSeconds: 60 },
    ],
  },
  {
    id: "info-02", subjectId: "info", title: "2進数・16進数と情報量の単位", estimatedMinutes: 12, importance: 3, weight: 3,
    lesson: {
      summary: "コンピュータは0/1の2進数。16進数は2進数4桁を1桁に圧縮した表記。容量はbyte=8bit、KB/MB/GBは10の3乗ずつ（2進接頭語KiB等は2の10乗ずつ）。",
      example: "2進数 1011 = 8+0+2+1 = 11（十進）。16進数 0xB も11。文字'A'はASCIIで65=0x41。",
      workedExample: { problem: "2進数11010100を16進数に直すと？", steps: ["4桁ずつ分ける: 1101 | 0100", "1101 = 13 = D、0100 = 4", "したがって 0xD4"], answer: "0xD4" },
      examSignal: "進数変換・bit演算の桁数・容量単位の大小関係で出る。",
      commonMistakes: ["KBとKiBの違いを無視する", "16進数でA-Fを十進に直し忘れる"],
    },
    problems: [
      { id: "info-02-q1", prompt: "2進数1010に対応する十進数は？", options: ["10", "12", "8", "20"], answer: 0, explanation: "8+0+2+0=10。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-02-q2", prompt: "1byte=8bitとして、8bitで表せる情報の種類は？", options: ["8通り", "16通り", "256通り", "1024通り"], answer: 2, optionNotes: ["桁数そのもの", "4bitの場合の数", "正解。2⁸", "10bitの場合の数"], explanation: "8bitでは2⁸=256通り。", kind: "quick", estimatedSeconds: 40 },
    ],
  },
  {
    id: "info-03", subjectId: "info", title: "ネットワークの仕組み（LAN/WAN・IP・プロトコル）", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "LANは建物内など狭域、WANは広域。IPアドレスは機器の住所、DNSは名前→アドレスの変換、HTTPSは暗号化したHTTP。",
      example: "スマホから検索すると、ブラウザがDNSに「google.co.jpはどこ？」と問い合わせ、返ってきたIPアドレスにHTTPSで接続する。",
      workedExample: { problem: "LANとWANの違いとして正しいのは？", steps: ["LAN=狭い範囲のネットワーク（家庭内・校内）", "WAN=離れたLAN同士をつなぐ広域網", "インターネットはWANの代表例"], answer: "LANは狭域、WANは広域" },
      examSignal: "IPアドレスの役割、DNS、HTTPとHTTPS、回線速度と容量の計算。",
      commonMistakes: ["プロトコル名と用途の対応を混同する", "通信速度(bps)と容量(byte)を混ぜる"],
    },
    problems: [
      { id: "info-03-q1", prompt: "ドメイン名からIPアドレスを調べる仕組みは？", options: ["DHCP", "DNS", "VPN", "SMTP"], answer: 1, optionNotes: ["DHCPはIPアドレスの自動割り当て", "正解", "VPNは暗号化トンネル", "SMTPはメール送信"], explanation: "DNS(Domain Name System)が名前解決を担う。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-03-q2", prompt: "HTTPSがHTTPと異なる点は？", options: ["通信が暗号化される", "通信速度が速い", "画像だけ送れる", "ドメイン名が不要"], answer: 0, explanation: "HTTPSはTLSで通信内容を暗号化する。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-04", subjectId: "info", title: "情報セキュリティとリスク管理", estimatedMinutes: 14, importance: 3, weight: 3,
    lesson: {
      summary: "機密性・完全性・可用性の3要素が情報セキュリティの柱。多要素認証・バックアップ・権限管理が基本対策。フィッシング・ランサムウェア等の脅威の特徴を掴む。",
      example: "パスワード+スマホの認証アプリは「知識+所有」の2要素認証。パスワードだけより突破されにくい。",
      workedExample: { problem: "「正規サイトを装いIDを入力させる攻撃」はどれか？", steps: ["フィッシング=偽装サイトに誘導して認証情報を盗む", "ランサムウェア=ファイルを暗号化して身代金", "DDoS=大量アクセスでサービス停止"], answer: "フィッシング" },
      examSignal: "攻撃手法の名前と対策の対応、認証の3要素（知識/所有/生体）で出る。",
      commonMistakes: ["脅威名と内容の対応の混同", "可用性を「アクセスできること」と読み違える"],
    },
    problems: [
      { id: "info-04-q1", prompt: "パスワードと指紋認証の併用は何と呼ばれるか？", options: ["シングルサインオン", "多要素認証", "ソルト", "VPN"], answer: 1, explanation: "知識要素+生体要素の組み合わせは多要素認証。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-04-q2", prompt: "情報セキュリティの3要素に含まれないのは？", options: ["機密性", "完全性", "可用性", "可搬性"], answer: 3, explanation: "機密性・完全性・可用性（CIA）が3要素。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-05", subjectId: "info", title: "データの収集と統計処理（平均・分散・相関）", estimatedMinutes: 15, importance: 3, weight: 3,
    lesson: {
      summary: "共テでは表やグラフの読み取りと基本統計の解釈が頻出。平均・中央値・四分位範囲・箱ひげ図・相関/因果の区別を短く固める。",
      example: "テスト点数の分布で外れ値があると平均は引っ張られるが中央値は動きにくい→「代表値として中央値が適切」系の問い。",
      workedExample: { problem: "散布図で右上がりの点の並び。xが増えるとyも増える傾向。この2変数の関係は？", steps: ["右上がり=正の相関", "ただし相関≠因果。第三の変数（季節など）の影響かもしれない", "選択肢では「相関がある」までが断定できる"], answer: "正の相関がある（因果とは限らない）" },
      examSignal: "箱ひげ図・四分位範囲・ヒストグラム・相関と因果の読解。",
      commonMistakes: ["相関を因果と言い換えてしまう選択肢を選ぶ", "四分位範囲を最大-最小と混同"],
    },
    problems: [
      { id: "info-05-q1", prompt: "箱ひげ図の「箱」の長さが表すのは？", options: ["最大値-最小値", "四分位範囲（IQR）", "標準偏差", "平均との差"], answer: 1, explanation: "箱の両端がQ1とQ3、その幅がIQR。", kind: "quick", estimatedSeconds: 35 },
      { id: "info-05-q2", prompt: "「アイスの売上と水難事故件数が一緒に増える」ことから言えるのは？", options: ["アイスが事故を起こす", "事故がアイスを売る", "第三の要因（気温など）の可能性", "無関係"], answer: 2, explanation: "疑似相関の典型例。相関は因果を意味しない。", kind: "standard", estimatedSeconds: 45 },
    ],
  },
  {
    id: "info-06", subjectId: "info", title: "疑似コードの読み取り（順次・分岐・反復）", estimatedMinutes: 16, importance: 3, weight: 4,
    lesson: {
      summary: "共テの疑似言語は、変数への代入・if文・for/while反復・配列で書かれる。手順を上から追い、値の変化をメモしながら読む。",
      example: "「for i を 1 から N まで」の下に「sum ← sum + i」なら、1+2+…+N を計算するループ。",
      workedExample: { problem: "x←0, y←5 とし、「x<y の間 x←x+1」を繰り返す。終了後のxは？", steps: ["x=0で開始。x<5が真なのでx=1", "同様にx=2,3,4,5", "x=5でx<5が偽になり終了"], answer: "x=5" },
      examSignal: "フローチャートや疑似コードの空欄補充・出力結果の選択で出る。",
      commonMistakes: ["代入を等号として読む", "ループの終了条件を1回ずらす"],
    },
    problems: [
      { id: "info-06-q1", prompt: "疑似コード「a ← 3; a ← a + 2」を実行後、aの値は？", options: ["2", "3", "5", "6"], answer: 2, explanation: "代入なのでa=3の後、a=3+2=5。", kind: "quick", estimatedSeconds: 25 },
      { id: "info-06-q2", prompt: "「for i を 1 から 3 まで」x ← x + 2 を初期値x=0で実行するとxは？", options: ["3", "6", "8", "9"], answer: 1, explanation: "0+2+2+2=6。", kind: "standard", estimatedSeconds: 40 },
    ],
  },
  {
    id: "info-07", subjectId: "info", title: "アルゴリズムの設計（探索・整列の考え方）", estimatedMinutes: 14, importance: 2, weight: 3,
    lesson: {
      summary: "線形探索は先頭から順に見る、2分探索は整列済みデータを半分ずつ絞る。整列はバブル・選択・挿入の基本形を理解する。",
      example: "辞書で単語を探すとき真ん中を開くのが2分探索、最初から順に読むのが線形探索。",
      workedExample: { problem: "ソート済みの1000個のデータから値を探すとき、2分探索で最大何回の比較が必要か？", steps: ["1回ごとに候補が半分になる", "2¹⁰=1024 > 1000", "したがって最大10回"], answer: "10回" },
      examSignal: "探索・整列の手順追跡、計算量の比較（線形vs2分）で出る。",
      commonMistakes: ["2分探索は整列済みが前提である点を見落とす", "回数を半分で割る方向を間違える"],
    },
    problems: [
      { id: "info-07-q1", prompt: "2分探索が使えるのは？", options: ["どんなデータでも", "整列済みデータのみ", "小さいデータのみ", "数値のみ"], answer: 1, explanation: "半分に絞る前提として整列が必要。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-07-q2", prompt: "線形探索でN個から探す最大比較回数は？", options: ["log₂N", "N/2", "N", "N²"], answer: 2, explanation: "最悪でN個全部を確認する。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-08", subjectId: "info", title: "情報社会の課題（情報モラル・法・格差）", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "著作権・個人情報・デジタルデバイド・プロフィーリング・AI利用の課題など、社会と技術の接点を掴む。",
      example: "学習履歴からおすすめを出すプロフィーリングは便利だが、プライバシーとの緊張がある。",
      workedExample: { problem: "「ネットを使える人と使えない人の間の情報格差」を指す言葉は？", steps: ["デジタルデバイド=情報格差", "プロフィーリング=行動履歴からの推定", "フィルターバブル=偏った情報環境"], answer: "デジタルデバイド" },
      examSignal: "用語と現象の対応、正しい取り扱い方の選択で出る。",
      commonMistakes: ["デジタルデバイドとフィルターバブルの混同", "著作権と個人情報保護の混同"],
    },
    problems: [
      { id: "info-08-q1", prompt: "利用者の行動履歴から興味を推定して情報を提示する技術は？", options: ["プロフィーリング", "フィッシング", "アノニマイズ", "リバースエンジニアリング"], answer: 0, explanation: "プロフィーリング。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-08-q2", prompt: "フィルターバブルの問題点として適切なのは？", options: ["自分と違う意見に触れにくくなる", "通信速度が落ちる", "個人情報が盗まれる", "機器が壊れる"], answer: 0, explanation: "似た意見だけが提示され視野が狭まる。", kind: "quick", estimatedSeconds: 35 },
    ],
  },
  {
    id: "info-09", subjectId: "info", title: "データベースと表の操作", estimatedMinutes: 12, importance: 2, weight: 2,
    lesson: {
      summary: "データベースは行=レコード、列=属性。抽出・結合・集計の操作と、主キーの役割を掴む。",
      example: "生徒名簿テーブルから「3年かつ女子」のレコードを抽出→条件に合う行だけを選ぶ操作。",
      workedExample: { problem: "商品テーブルと注文テーブルを共通の商品IDでつなぐ操作は？", steps: ["2つの表を共通列で対応付ける", "この操作を「結合」と呼ぶ"], answer: "結合" },
      examSignal: "表の読み取り・条件抽出・結合の考え方で出る。",
      commonMistakes: ["行と列を取り違える", "主キーを単なる連番と思う（一意性が本質）"],
    },
    problems: [
      { id: "info-09-q1", prompt: "リレーショナルデータベースの「レコード」は何を指すか？", options: ["列", "行", "表", "キー"], answer: 1, explanation: "行=レコード、列=属性。", kind: "quick", estimatedSeconds: 25 },
      { id: "info-09-q2", prompt: "主キー（プライマリキー）に必要な性質は？", options: ["必ず数値であること", "各行で一意であること", "変更できないこと", "外部キーを持つこと"], answer: 1, explanation: "レコードを一意に識別できることが本質。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-10", subjectId: "info", title: "ファイル形式と圧縮", estimatedMinutes: 10, importance: 1, weight: 2,
    lesson: {
      summary: "可逆圧縮（完全に元に戻る: ZIP, PNG）と非可逆圧縮（一部を捨てて小さくする: JPEG, MP3）の区別。",
      example: "写真をJPEGにすると容量は減るが、元の画素には完全には戻らない。テキストのZIPは完全に戻る。",
      workedExample: { problem: "PNGとJPEGの違いは？", steps: ["PNG=可逆圧縮で劣化なし", "JPEG=非可逆圧縮で小さいが劣化する", "用途に応じて使い分ける"], answer: "PNGは可逆・JPEGは非可逆" },
      examSignal: "圧縮方式の特徴比較で出る。",
      commonMistakes: ["PNGを非可逆と取り違える", "MP3を可逆と思い込む"],
    },
    problems: [
      { id: "info-10-q1", prompt: "元のデータを完全に復元できる圧縮を何というか？", options: ["可逆圧縮", "非可逆圧縮", "ロッシー圧縮", "ストリーミング"], answer: 0, explanation: "ZIP/PNGなどの可逆圧縮。", kind: "quick", estimatedSeconds: 25 },
      { id: "info-10-q2", prompt: "JPEGがPNGよりファイルサイズを小さくできる理由は？", options: ["画素を増やすから", "一部の情報を捨てるから", "色が少ないから", "暗号化するから"], answer: 1, explanation: "非可逆圧縮は情報を捨てて容量を減らす。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-11", subjectId: "info", title: "情報デザインとコミュニケーション", estimatedMinutes: 10, importance: 1, weight: 2,
    lesson: {
      summary: "UI/UX、ユニバーサルデザイン、アクセシビリティ、情報のわかりやすい表現の考え方。",
      example: "駅の案内で色だけに頼らず形や文字も併記するのは、色覚特性への配慮（ユニバーサルデザイン）。",
      workedExample: { problem: "「すべての人が使いやすいデザイン」を目指す考え方は？", steps: ["ユニバーサルデザイン=最初から幅広い人を対象", "バリアフリー=障壁を除く事後対応が中心", "アクセシビリティ=到達しやすさの指標"], answer: "ユニバーサルデザイン" },
      examSignal: "用語の対応・適切なUI設計の選択で出る。",
      commonMistakes: ["ユニバーサルデザインとバリアフリーの混同"],
    },
    problems: [
      { id: "info-11-q1", prompt: "高齢者や障害のある人も含め、幅広い人が最初から使える設計思想は？", options: ["ユニバーサルデザイン", "オープンソース", "クラウドソーシング", "レスポンシブ"], answer: 0, explanation: "ユニバーサルデザイン。", kind: "quick", estimatedSeconds: 30 },
      { id: "info-11-q2", prompt: "情報アクセシビリティを高める工夫として適切なのは？", options: ["色だけで情報を伝える", "音声読み上げに対応する", "画像だけで案内する", "専門用語を多用する"], answer: 1, explanation: "音声読み上げは視覚に頼らないアクセスを可能にする。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "info-12", subjectId: "info", title: "シミュレーションとモデル化", estimatedMinutes: 10, importance: 1, weight: 2,
    lesson: {
      summary: "現実をモデルに落として計算で試す考え方。モンテカルロ法や条件を変えた試行を理解する。",
      example: "サイコロをたくさん振るシミュレーションで出る目の確率を推定する、という使い方。",
      workedExample: { problem: "乱数を使って円周率を推定する方法は？", steps: ["正方形と内接円に乱数で点を打つ", "円内の点の割合から面積比=円周率を推定", "モンテカルロ法と呼ぶ"], answer: "モンテカルロ法" },
      examSignal: "シミュレーションの考え方・モデルの適切さの選択で出る。",
      commonMistakes: ["シミュレーションを実験の代替として絶対視する"],
    },
    problems: [
      { id: "info-12-q1", prompt: "乱数を用いた試行で確率や値を推定する手法は？", options: ["モンテカルロ法", "二分探索", "動的計画法", "正規化"], answer: 0, explanation: "モンテカルロ法。", kind: "quick", estimatedSeconds: 25 },
      { id: "info-12-q2", prompt: "シミュレーションを使う利点として最も適切なのは？", options: ["実験が完全に不要になる", "条件を変えて安全に何度も試せる", "必ず正確な結果が出る", "計算が不要になる"], answer: 1, explanation: "条件変更が容易で安全・安価。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
];
