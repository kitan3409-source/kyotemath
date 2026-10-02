import type { OsUnit } from "./model";

// 物理: 未履修前提。現象→直感→図→最小公式→単位→典型問題の順。
// 力学を優先し、共テレベルの典型パターンで50→60を狙う。
export const physicsUnits: OsUnit[] = [
  {
    id: "phys-01", subjectId: "physics", title: "速度と加速度（まず感覚で掴む）", estimatedMinutes: 15, importance: 3, weight: 4,
    lesson: {
      summary: "速度は「どれだけ速く動くか」（m/s）、加速度は「速度がどれだけ変わるか」（m/s²）。速い≠加速度が大きい。",
      example: "時速60kmで一定に走る車は加速度0。停止から発進するときは加速度が大きい。",
      intuition: "車のアクセルを強く踏むと「加速している」＝加速度が大きい。一定速度で巡航しているだけなら加速度は0。",
      workedExample: { problem: "静止から5秒で10m/sになった車の加速度は？", steps: ["加速度=速度の変化÷時間", "(10-0)/5=2"], answer: "2 m/s²" },
      examSignal: "v-tグラフの傾き=加速度、面積=移動距離として出る。",
      commonMistakes: ["速度と加速度を混同", "グラフの傾きと面積の意味を取り違える"],
    },
    problems: [
      { id: "phys-01-q1", prompt: "一定速度で走っている車の加速度は？", options: ["一定の正の値", "0", "負の値", "速度と同じ"], answer: 1, explanation: "速度が変わらないので加速度は0。", kind: "quick", estimatedSeconds: 25 },
      { id: "phys-01-q2", prompt: "v-tグラフで傾きが大きいほど何が大きいか？", options: ["速度", "加速度", "移動距離", "時間"], answer: 1, explanation: "v-tグラフの傾きは加速度。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "phys-02", subjectId: "physics", title: "等加速度直線運動（3公式だけ）", estimatedMinutes: 16, importance: 3, weight: 4, requires: ["phys-01"],
    lesson: {
      summary: "加速度が一定の運動は3公式だけ: v=v₀+at、x=v₀t+½at²、v²-v₀²=2ax。与えられた文字を当てはめるだけ。",
      example: "車が初速度0で加速度2m/s²で3秒進むと x=0×3+½×2×9=9m。",
      intuition: "「だんだん速くなる」運動を数式で書いたもの。v₀はスタート時の速さ、aは加速の勢い。",
      workedExample: { problem: "初速度10m/s、加速度-2m/s²（ブレーキ）で4秒進んだ距離は？", steps: ["x=v₀t+½at²に代入", "10×4+½×(-2)×16=40-16=24"], answer: "24m" },
      examSignal: "公式に数値を当てはめる直接的な問いと、グラフと組み合わせた読み取り。",
      commonMistakes: ["v₀とvを取り違える", "½at²の½を忘れる"],
    },
    problems: [
      { id: "phys-02-q1", prompt: "初速度0、加速度3m/s²で4秒進んだ距離は？", options: ["12m", "24m", "36m", "48m"], answer: 1, optionNotes: ["3×4の計算（½が抜けている）", "正解", "v×tの計算", "at²そのまま"], explanation: "x=½at²=0.5×3×16=24m。", kind: "standard", estimatedSeconds: 60 },
      { id: "phys-02-q2", prompt: "初速度5m/s、加速度1m/s²で2秒後の速度は？", options: ["7m/s", "10m/s", "11m/s", "2m/s"], answer: 0, explanation: "v=v₀+at=5+1×2=7m/s。", kind: "quick", estimatedSeconds: 40 },
    ],
  },
  {
    id: "phys-03", subjectId: "physics", title: "力と運動の法則（ニュートン）", estimatedMinutes: 16, importance: 3, weight: 4, requires: ["phys-01"],
    lesson: {
      summary: "F=ma が核。力が働くと加速度が生じ、力がなければ等速直線運動（慣性の法則）。作用・反作用は別の物体に働く力。",
      example: "重い荷物は同じ力で押しても加速しにくい（質量mが大きい→加速度aが小さい）。",
      intuition: "力は「運動を変える働き」。止まっている物に力がかかると動き出し、動いている物は力がないと止まらない（慣性）。",
      workedExample: { problem: "質量2kgの物体に10Nの力を加えたときの加速度は？", steps: ["F=maより a=F/m", "a=10/2=5"], answer: "5 m/s²" },
      examSignal: "F=maの計算、作用反作用の識別、慣性の法則で出る。",
      commonMistakes: ["作用と反作用を同じ物体に働く力と誤解", "力があると必ず動くと思う（摩擦力等で動かない場合あり）"],
    },
    problems: [
      { id: "phys-03-q1", prompt: "質量5kgの物体に20Nの力を加えた加速度は？", options: ["4m/s²", "5m/s²", "25m/s²", "100m/s²"], answer: 0, explanation: "a=F/m=20/5=4。", kind: "quick", estimatedSeconds: 35 },
      { id: "phys-03-q2", prompt: "机の上の本に働く重力の反作用は？", options: ["本が机を押す力", "地球が本を引く力", "本が地球を引く力", "机が本を支える力"], answer: 2, optionNotes: ["「本が机を押す」の反作用は「机が本を押す（垂直抗力）」", "これが作用そのもの", "正解。地球の重力の反作用は本が地球を引く力", "垂直抗力は重力の反作用ではない"], explanation: "作用・反作用は同じ種類の力で、働く物体と働かれる物体が入れ替わる。", kind: "standard", estimatedSeconds: 55 },
    ],
  },
  {
    id: "phys-04", subjectId: "physics", title: "仕事とエネルギー（運動エネルギー・位置エネルギー）", estimatedMinutes: 16, importance: 3, weight: 4, requires: ["phys-03"],
    lesson: {
      summary: "仕事=力×距離（J）。運動エネルギー=½mv²、位置エネルギー=mgh。力学的エネルギー保存は「高い所ほど位置エネルギーが大きく、速いほど運動エネルギーが大きい」。",
      example: "高さ10mから落ちた物体は、落ちるほど速くなる（位置エネルギーが運動エネルギーに変換）。",
      intuition: "ジェットコースターで一番高い所が一番遅く、一番低い所が一番速い→位置と運動のエネルギーが変換されている。",
      workedExample: { problem: "質量2kgの物体が高さ5mから落下。エネルギー保存で地上での速度は？（g=10）", steps: ["mgh=½mv² より v=√(2gh)", "v=√(2×10×5)=√100=10"], answer: "10 m/s" },
      examSignal: "エネルギー保存則の立式と値の計算、仕事の概念で出る。",
      commonMistakes: ["質量が式に残ることを忘れず確認（約分できる）", "高さの基準点を間違える"],
    },
    problems: [
      { id: "phys-04-q1", prompt: "質量1kg、速さ4m/sの物体の運動エネルギーは？", options: ["2J", "4J", "8J", "16J"], answer: 2, optionNotes: ["½を落とすと16、mvをそのままだと4", "正解: ½×1×16=8", "", ""], explanation: "K=½mv²=0.5×1×16=8J。", kind: "standard", estimatedSeconds: 50 },
      { id: "phys-04-q2", prompt: "高さを2倍にすると位置エネルギーは？", options: ["変わらない", "2倍", "4倍", "半分"], answer: 1, explanation: "mghは高さhに比例。", kind: "quick", estimatedSeconds: 30 },
    ],
  },
  {
    id: "phys-05", subjectId: "physics", title: "電流・電圧・抵抗（オームの法則）", estimatedMinutes: 14, importance: 3, weight: 3, requires: [],
    lesson: {
      summary: "V=IR（電圧=電流×抵抗）。電流は流れる電気の量、電圧は流そうとする力、抵抗は流れにくさ。直列と並列の違いも頻出。",
      example: "水道に例えると、電圧は水を押す圧力、電流は流れる水の量、抵抗は管の細さ。",
      intuition: "電圧が高いほど強く押すので電流が増える。抵抗が大きいほど流れにくいので電流が減る。",
      workedExample: { problem: "10Ωの抵抗に5Vの電圧をかけると電流は？", steps: ["V=IRより I=V/R", "I=5/10=0.5"], answer: "0.5 A" },
      examSignal: "オームの法則の計算、直列/並列での電流・電圧の違い、消費電力（P=VI）で出る。",
      commonMistakes: ["直列では電流が同じ、並列では電圧が同じを混同", "P=VIの公式を忘れる"],
    },
    problems: [
      { id: "phys-05-q1", prompt: "4Ωの抵抗に2Aの電流が流れている。電圧は？", options: ["0.5V", "2V", "8V", "6V"], answer: 2, explanation: "V=IR=2×4=8V。", kind: "quick", estimatedSeconds: 35 },
      { id: "phys-05-q2", prompt: "100Vで2A流れる機器の消費電力は？", options: ["50W", "102W", "200W", "500W"], answer: 2, explanation: "P=VI=100×2=200W。", kind: "quick", estimatedSeconds: 35 },
    ],
  },
  {
    id: "phys-06", subjectId: "physics", title: "波の基本（振動・波長・周期）", estimatedMinutes: 13, importance: 2, weight: 3, requires: [],
    lesson: {
      summary: "波は振動が伝わる現象。振動数f（1秒の振動回数）、波長λ（波1個の長さ）、速さv=fλ。音波は空気の振動。",
      example: "波が1秒に2回振動する（f=2Hz）なら周期T=1/2=0.5秒。波長2mなら速さv=fλ=4m/s。",
      intuition: "池に石を投げると波が広がる。波の「山と谷」の間隔が波長、山が来る回数が振動数。",
      workedExample: { problem: "振動数5Hz、波長4mの波の速さは？", steps: ["v=fλ", "5×4=20"], answer: "20 m/s" },
      examSignal: "v=fλの計算、波形の読み取り、音の高さと振動数の関係。",
      commonMistakes: ["周期と振動数を混同（T=1/f）", "波長の測り方（山→山が1波長）を誤る"],
    },
    problems: [
      { id: "phys-06-q1", prompt: "振動数が2Hzのとき周期は？", options: ["0.5秒", "2秒", "4秒", "1秒"], answer: 0, explanation: "周期T=1/f=1/2=0.5秒。", kind: "quick", estimatedSeconds: 30 },
      { id: "phys-06-q2", prompt: "波の速さ10m/s、振動数2Hzのとき波長は？", options: ["5m", "20m", "12m", "0.2m"], answer: 0, explanation: "λ=v/f=10/2=5m。", kind: "quick", estimatedSeconds: 40 },
    ],
  },
  {
    id: "phys-07", subjectId: "physics", title: "熱と温度（比熱・熱量）", estimatedMinutes: 12, importance: 2, weight: 2, requires: [],
    lesson: {
      summary: "温度は「熱さ」の指標、熱量はエネルギー。Q=mcΔT（比熱cは温まりにくさ）。水は比熱が大きく温まりにくい。",
      example: "鉄はすぐ熱くなるが水はなかなか温まらない→水の比熱が大きい。",
      intuition: "同じ火力で加熱しても、温まりにくい物質（水）は時間がかかり、温まりやすい物質（鉄）はすぐ熱くなる。",
      workedExample: { problem: "水100gを10℃上げるのに必要な熱量は？（水の比熱4.2J/(g·℃)）", steps: ["Q=mcΔT", "Q=100×4.2×10=4200"], answer: "4200 J" },
      examSignal: "比熱の大小の比較、Q=mcΔTの計算で出る。",
      commonMistakes: ["温度と熱量の混同", "比熱の単位を読み違える"],
    },
    problems: [
      { id: "phys-07-q1", prompt: "比熱が大きい物質の特徴は？", options: ["すぐ温まる", "温まりにくい・冷めにくい", "温度が常に高い", "軽い"], answer: 1, explanation: "比熱大=温まりにくく冷めにくい。", kind: "quick", estimatedSeconds: 30 },
      { id: "phys-07-q2", prompt: "水200gを5℃上げる熱量は？（c=4.2）", options: ["420J", "4200J", "1050J", "2100J"], answer: 1, explanation: "Q=200×4.2×5=4200J。", kind: "standard", estimatedSeconds: 45 },
    ],
  },
  {
    id: "phys-08", subjectId: "physics", title: "光の反射・屈折・レンズ", estimatedMinutes: 12, importance: 2, weight: 2, requires: [],
    lesson: {
      summary: "光は反射（入射角=反射角）と屈折（密度の違いで折れ曲がる）。凸レンズは集め、凹レンズは広げる。",
      example: "コップの中のストローが折れて見えるのは光が空気→水で屈折するから。",
      intuition: "光が物質の境界で曲がる。水面下の物が浅く見えるのも屈折による。",
      workedExample: { problem: "入射角30°で鏡に当たった光の反射角は？", steps: ["入射角=反射角", "したがって30°"], answer: "30°" },
      examSignal: "反射/屈折の図の読み取り、実像と虚像の区別で出る。",
      commonMistakes: ["入射角を鏡面との角度と誤解（法線からの角度）", "実像と虚像を逆に覚える"],
    },
    problems: [
      { id: "phys-08-q1", prompt: "水中の物が浅く見える理由は？", options: ["反射", "屈折", "回折", "干渉"], answer: 1, explanation: "水→空気で光が屈折し、実際より浅い位置に見える。", kind: "quick", estimatedSeconds: 30 },
      { id: "phys-08-q2", prompt: "凸レンズの働きは？", options: ["光を広げる", "光を集める", "光を反射する", "光を吸収する"], answer: 1, explanation: "凸レンズは光を集める（収束）。", kind: "quick", estimatedSeconds: 25 },
    ],
  },
];
