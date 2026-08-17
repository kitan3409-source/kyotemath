import type { Problem } from "../problem-bank";
import { math3Specs } from "./math3-course.ts";

type StandardExercise = { problem: string; answer: string; explanation: string; distractors: string[] };

const standardExercises: Record<string, StandardExercise> = {
  "III-01": { problem: "a_n=4−3/nの極限を求めよ。", answer: "4", explanation: "3/n→0なので、4−3/n→4。", distractors: ["0", "−3", "1"] },
  "III-02": { problem: "a_n→−1,b_n→4のとき、3a_n−b_nの極限を求めよ。", answer: "−7", explanation: "極限の線形性より3(−1)−4=−7。", distractors: ["7", "−5", "−1"] },
  "III-03": { problem: "5−5/2+5/4−5/8+…の和を求めよ。", answer: "10/3", explanation: "初項5、公比−1/2で|r|<1。5/(1+1/2)=10/3。", distractors: ["5/3", "10", "−10/3"] },
  "III-04": { problem: "a_1=4,a_(n+1)=(a_n+6)/2の極限を求めよ。", answer: "6", explanation: "L=(L+6)/2よりL=6。実際に6との差は半分になる。", distractors: ["3", "12", "4"] },
  "III-05": { problem: "lim[x→−2](x³−x+1)を求めよ。", answer: "−5", explanation: "多項式なので代入し、−8+2+1=−5。", distractors: ["−9", "5", "−7"] },
  "III-06": { problem: "lim[x→0] |x|/x の両側極限を判定せよ。", answer: "存在しない", explanation: "右からは1、左からは−1で一致しない。", distractors: ["1", "−1", "0"] },
  "III-07": { problem: "f(x)=(x²−4)/(x−2) (x≠2), f(2)=5はx=2で連続か。", answer: "不連続", explanation: "極限は4だがf(2)=5で一致しない。", distractors: ["連続", "極限が0", "定義できない"] },
  "III-08": { problem: "lim[x→0] sin(4x)/(2x)を求めよ。", answer: "2", explanation: "sin(4x)/(2x)=2·sin(4x)/(4x)→2。", distractors: ["1", "4", "1/2"] },
  "III-09": { problem: "lim[x→∞] x/2^xを求めよ。", answer: "0", explanation: "指数関数の増加は一次関数より速く、x/2^x→0。", distractors: ["1", "+∞", "1/2"] },
  "III-10": { problem: "lim[x→0] (e^x−1)/xを求めよ。", answer: "1", explanation: "e^xのx=0での微分係数、または基本極限より1。", distractors: ["0", "e", "−1"] },
  "III-11": { problem: "y=(x−2)/(x+1)の垂直・水平漸近線を求めよ。", answer: "x=−1,y=1", explanation: "分母0でx=−1、最高次係数の比で水平線y=1。", distractors: ["x=1,y=−1", "x=−2,y=1", "x=−1,y=−1"] },
  "III-12": { problem: "f(x)=x/(x²+1)の奇偶性とx→∞の極限を答えよ。", answer: "奇関数、極限0", explanation: "f(−x)=−f(x)、分母の次数が高いので極限0。", distractors: ["偶関数、1", "奇関数、1", "偶関数、0"] },
  "III-13": { problem: "y=(x³−2x)^4を微分せよ。", answer: "4(3x²−2)(x³−2x)^3", explanation: "外側の4乗を微分し、内側3x²−2を掛ける。", distractors: ["4(x³−2x)^3", "(12x²−8x)^4", "(3x²−2)(x³−2x)^4"] },
  "III-14": { problem: "y=(x+1)/(x−1)を微分せよ。", answer: "−2/(x−1)²", explanation: "商の微分で[(x−1)−(x+1)]/(x−1)²=−2/(x−1)²。", distractors: ["2/(x−1)²", "1/(x−1)", "−2/(x−1)"] },
  "III-15": { problem: "y=cos(2x)を微分せよ。", answer: "−2sin(2x)", explanation: "cosの微分−sinに内側の微分2を掛ける。", distractors: ["2sin(2x)", "−sin(2x)", "−2cos(2x)"] },
  "III-16": { problem: "y=e^(3x−1)を微分せよ。", answer: "3e^(3x−1)", explanation: "指数関数の微分に内側3を掛ける。", distractors: ["e^(3x−1)", "(3x−1)e^(3x−1)", "3e^x"] },
  "III-17": { problem: "f(x)=2x+3の逆関数gについてg'(7)を求めよ。", answer: "1/2", explanation: "g(x)=(x−3)/2なのでg'=1/2。", distractors: ["2", "1/7", "−1/2"] },
  "III-18": { problem: "x²+xy+y²=3上の点(1,1)でのdy/dxを求めよ。", answer: "−1", explanation: "2x+y+(x+2y)y'=0へ(1,1)を代入して3+3y'=0。", distractors: ["1", "−3", "−1/3"] },
  "III-19": { problem: "f(x)=x^5−2x^3のf''(1)を求めよ。", answer: "8", explanation: "f'=5x⁴−6x²、f''=20x³−12x、x=1で20−12=8。", distractors: ["4", "−8", "12"] },
  "III-20": { problem: "f(x)=x^4−2x²のx=1での接線の傾きを求めよ。", answer: "0", explanation: "f'=4x³−4x、f'(1)=0。", distractors: ["2", "−2", "4"] },
  "III-21": { problem: "y=x³のx=−1での接線を求めよ。", answer: "y=3x+2", explanation: "点(−1,−1)、傾き3なのでy+1=3(x+1)。", distractors: ["y=−3x−2", "y=3x−2", "y=x+1"] },
  "III-22": { problem: "f(x)=x^4−2x²の極値を求めよ。", answer: "極大0、極小−1", explanation: "f'=2x(2x²−2)でx=−1,0,1。符号から0が極大、±1が極小。", distractors: ["極大1、極小0", "極大0、極小1", "極値なし"] },
  "III-23": { problem: "f(x)=x^4の変曲点を判定せよ。", answer: "変曲点はない", explanation: "f''=12x²はx=0で0だが、符号は前後で負にならず変曲しない。", distractors: ["(0,0)", "x=1", "すべての点"] },
  "III-24": { problem: "f(x)=x/(x²+1)の極値を求めよ。", answer: "極小−1/2、極大1/2", explanation: "f'=(1−x²)/(x²+1)²でx=±1、値は∓1/2。", distractors: ["極小−1、極大1", "極小0、極大1", "極値なし"] },
  "III-25": { problem: "縦x、横12−xの長方形の面積を最大にするxを求めよ。", answer: "6", explanation: "S=x(12−x)=−(x−6)²+36。", distractors: ["3", "12", "4"] },
  "III-26": { problem: "s(t)=2t³−t²のt=1での速度と加速度を求めよ。", answer: "速度4、加速度10", explanation: "v=6t²−2t、a=12t−2。t=1で4,10。", distractors: ["速度2、加速度10", "速度4、加速度12", "速度6、加速度4"] },
  "III-27": { problem: "f(x)=x²+2xの[1,3]で平均変化率と一致するcを求めよ。", answer: "c=2", explanation: "平均変化率=(15−3)/2=6、f'=2x+2=6よりc=2。", distractors: ["c=1", "c=3", "c=0"] },
  "III-28": { problem: "f(x)=x^3+x−1=0の実数解の個数を判定せよ。", answer: "1個", explanation: "f'=3x²+1>0で単調増加、端で符号が変わるので1個。", distractors: ["0個", "2個", "3個"] },
  "III-29": { problem: "∫(4x³−3x²+2)dxを求めよ。", answer: "x^4−x³+2x+C", explanation: "各項を一つずつ積分し、任意定数Cを付ける。", distractors: ["4x^4−3x³+2x+C", "x^4−3x³+2x+C", "x^4−x²+2+C"] },
  "III-30": { problem: "∫6x(3x²+1)^2dxを求めよ。", answer: "(3x²+1)^3/3+C", explanation: "u=3x²+1,du=6x dxとして∫u²du=u³/3。", distractors: ["(3x²+1)^2/2+C", "2(3x²+1)^3+C", "(3x²+1)^3+C"] },
  "III-31": { problem: "∫x cos x dxを求めよ。", answer: "x sin x+cos x+C", explanation: "u=x,dv=cosx dxとしてx sinx−∫sinx dx。", distractors: ["x sinx−cosx+C", "sinx+x cosx+C", "x cosx+sinx+C"] },
  "III-32": { problem: "∫1/[x(x−2)]dxを求めよ。", answer: "(−1/2)ln|x|+(1/2)ln|x−2|+C", explanation: "1/[x(x−2)]=−1/(2x)+1/[2(x−2)]。", distractors: ["ln|x(x−2)|+C", "(1/2)ln|x(x−2)|+C", "−ln|x|+ln|x−2|+C"] },
  "III-33": { problem: "∫cos²x dxを求めよ。", answer: "x/2+sin(2x)/4+C", explanation: "cos²x=(1+cos2x)/2を使う。", distractors: ["x/2−sin(2x)/4+C", "sin²x+C", "x+sin2x+C"] },
  "III-34": { problem: "x>0で∫x ln x dxを求めよ。", answer: "(x²/2)ln x−x²/4+C", explanation: "x>0でu=lnx,dv=x dxとして部分積分。", distractors: ["x²lnx+C", "(x²/2)lnx+x²/4+C", "ln(x²)/2+C"] },
  "III-35": { problem: "∫[−2,2](x³+2x²+1)dxを求めよ。", answer: "44/3", explanation: "奇関数x³は0、残りは2∫[0,2](2x²+1)dx=2(16/3+2)=44/3。", distractors: ["28/3", "16/3", "0"] },
  "III-36": { problem: "F(x)=∫[x,2](t³+1)dtのF'(x)を求めよ。", answer: "−(x³+1)", explanation: "下端がxなので微積分の基本定理にマイナスが付く。", distractors: ["x³+1", "3x²", "−(3x²+1)"] },
  "III-37": { problem: "y=4−x²とx軸で囲まれる面積を求めよ。", answer: "32/3", explanation: "交点±2、対称性より∫−2²(4−x²)dx=32/3。", distractors: ["16/3", "8", "4"] },
  "III-38": { problem: "y=x+2とy=x²で囲まれる面積を求めよ。", answer: "9/2", explanation: "交点はx=−1,2。上−下を−1から2まで積分すると9/2。", distractors: ["10/3", "9/4", "6"] },
  "III-39": { problem: "y=√xを0≤x≤4でx軸の周りに回転した体積を求めよ。", answer: "8π", explanation: "V=π∫₀⁴(√x)²dx=π∫₀⁴x dx=8π。", distractors: ["4π", "16π", "2π"] },
  "III-40": { problem: "0≤x≤1で断面積A(x)=2x+1の立体の体積を求めよ。", answer: "2", explanation: "V=∫₀¹(2x+1)dx=[x²+x]₀¹=2。", distractors: ["1", "3", "4"] },
  "III-41": { problem: "x=3cos t,y=3sin t（0≤t≤π）の曲線長を求めよ。", answer: "3π", explanation: "速さは3、長さ=∫₀^π3dt=3π。", distractors: ["π", "6π", "9π"] },
  "III-42": { problem: "x=t²,y=t（0≤t≤1）とx軸で囲まれる面積を求めよ。", answer: "2/3", explanation: "この区間ではx(t)は増加し、曲線は領域を一度だけなぞる。dx/dt=2t、面積=∫₀¹t·2t dt=2/3。", distractors: ["1/3", "1/2", "1"] },
  "III-43": { problem: "r=1+cosθ（0≤θ≤2π）が囲む面積を求める積分を選べ。", answer: "1/2∫[0,2π](1+cosθ)²dθ", explanation: "極座標面積公式へrをそのまま代入する。", distractors: ["∫(1+cosθ)dθ", "1/2∫(1+cosθ)dθ", "π(1+cosθ)²"] },
  "III-44": { problem: "中点公式を2分割で使い、∫[0,2]x²dxを近似せよ。", answer: "2.5", explanation: "中点0.5,1.5の値は0.25,2.25、幅1で合計2.5。", distractors: ["3", "2", "4"] },
  "III-45": { problem: "0≤x≤2でx≤2の両辺を積分して得る不等式は？", answer: "2≤4", explanation: "∫₀²x dx=2、∫₀²2 dx=4。", distractors: ["4≤2", "1≤2", "0≤2"] },
  "III-46": { problem: "速度v(t)=6t−2、初期位置s(0)=3の位置s(t)を求めよ。", answer: "s(t)=3t²−2t+3", explanation: "速度を積分して3t²−2t+C、初期条件からC=3。", distractors: ["6t²−2t+3", "3t²−t+3", "3t−2"] },
};

function optionsFor(correct: string, seed: number, distractors: string[] = []) {
  const candidates = [...distractors, "0", "1", "−1", "2", "3", "4", "1/2", "π", "定義できない", "条件不足"];
  const wrong = [...new Set(candidates)].filter((value) => value !== correct).slice(0, 3);
  const values = [correct, ...wrong];
  const shift = seed % values.length;
  const options = values.map((_, index) => values[(index - shift + values.length) % values.length]);
  return { options, answer: options.indexOf(correct) };
}

function makeProblem(conceptId: string, kind: Problem["kind"], index: number, title: string, prompt: string, correct: string, explanation: string, distractors: string[] = []): Problem {
  const choice = optionsFor(correct, index + (kind === "quick" ? 0 : kind === "standard" ? 1 : 2), distractors);
  return {
    id: `M3-${conceptId}-${kind}`,
    conceptIds: [conceptId],
    primaryConceptId: conceptId,
    title: `${title}｜${kind === "quick" ? "quick" : kind === "standard" ? "standard" : "transfer"}`,
    prompt,
    options: choice.options,
    answer: choice.answer,
    explanation,
    kind,
    estimatedSeconds: kind === "quick" ? 60 : kind === "standard" ? 90 : 120,
  };
}

export const math3Problems: Problem[] = Object.entries(math3Specs).flatMap(([conceptId, spec], index) => [
  makeProblem(conceptId, "quick", index, spec.quickProblem, spec.quickProblem, spec.quickAnswer, spec.quickExplanation),
  makeProblem(conceptId, "standard", index, standardExercises[conceptId].problem, standardExercises[conceptId].problem, standardExercises[conceptId].answer, standardExercises[conceptId].explanation, standardExercises[conceptId].distractors),
  makeProblem(conceptId, "transfer", index, spec.transferProblem, spec.transferProblem, spec.transferAnswer, spec.transferExplanation),
]);
