import conceptData from "../../data/math-concepts.json";
import type { Problem } from "../problem-bank";

/**
 * 共通テスト対象の各概念に、quick / standard / transferを1問ずつ割り当てる補強バンク。
 * 数値・問い方・選択肢は概念のコースと番号から変化させ、同じ問題の複製を避ける。
 */
type Concept = (typeof conceptData.concepts)[number];
type Kind = Problem["kind"];
type Spec = {
  title: string;
  prompt: string;
  correct: string;
  distractors: string[];
  explanation: string;
};

const kinds: Kind[] = ["quick", "standard", "transfer"];
const targetConcepts = conceptData.concepts.filter(
  (concept) => ["I", "A", "II", "B", "C"].includes(concept.course) && concept.priority === "core",
);

function nFor(concept: Concept, index: number) {
  const number = Number(concept.id.split("-")[1]);
  return 2 + ((index * 3 + number) % 6);
}

function choose(correct: string, distractors: string[], seed: number) {
  const values = [correct, ...distractors];
  const shift = seed % 4;
  const options = values.map((_, index) => values[(index - shift + 4) % 4]);
  return { options, answer: options.indexOf(correct) };
}

function makeProblem(concept: Concept, index: number, variant: number, spec: Spec): Problem {
  const choice = choose(spec.correct, spec.distractors, index + variant);
  return {
    id: "X4-B" + String(index * 3 + variant + 1).padStart(3, "0"),
    conceptIds: [concept.id],
    primaryConceptId: concept.id,
    title: concept.title + "｜" + spec.title,
    prompt: spec.prompt,
    options: choice.options,
    answer: choice.answer,
    explanation: spec.explanation,
    kind: kinds[variant],
    estimatedSeconds: 45 + variant * 15,
  };
}

function specFor(concept: Concept, index: number, variant: number): Spec {
  const number = Number(concept.id.split("-")[1]);
  const n = nFor(concept, index);
  const tag = concept.id + "「" + concept.title + "」";

  if (concept.course === "I") {
    if (number <= 6) {
      if (variant === 0) {
        return {
          title: "式の意味を数値で確認",
          prompt: tag + "。a=" + n + "のとき、(a+2)−(a−1)の値はどれか。",
          correct: "3",
          distractors: ["1", "2", "4"],
          explanation: "(a+2)−(a−1)=a+2−a+1=3。同類項をまとめてから値を読む。",
        };
      }
      if (variant === 1) {
        const correct = String(2 * n + 3);
        return {
          title: "条件を関数へ翻訳",
          prompt: tag + "。f(x)=2x+3のとき、f(" + n + ")はどれか。",
          correct,
          distractors: [String(2 * n + 1), String(2 * n + 5), String(n + 3)],
          explanation: "x=" + n + "を代入するとf(" + n + ")=2×" + n + "+3=" + correct + "。",
        };
      }
      const correct = String(n * n);
      return {
        title: "条件を別の表現へ移す",
        prompt: tag + "。x=" + n + "のとき、x²の値はどれか。",
        correct,
        distractors: [String(n * n - 2), String(n * n + 2), String(n * n + n)],
        explanation: "x²はxを2回掛ける量なので、" + n + "²=" + correct + "。",
      };
    }
    if (number <= 34) {
      if (variant === 0) {
        const correct = String(2 * (n + 2));
        return {
          title: "関数の値域を図形量へ移す",
          prompt: tag + "。底辺" + (n + 2) + "、高さ4の三角形の面積はどれか。",
          correct,
          distractors: [String(n + 2), String(2 * (n + 2) + 2), String(2 * (n + 2) - 2)],
          explanation: "三角形の面積は底辺×高さ÷2なので、(" + (n + 2) + ")×4÷2=" + correct + "。",
        };
      }
      if (variant === 1) {
        const correct = String(n + 20);
        return {
          title: "角度条件を数値へ移す",
          prompt: tag + "。二等辺三角形の底角がそれぞれ" + correct + "°のとき、頂角はどれか。",
          correct: String(180 - 2 * (n + 20)),
          distractors: [String(2 * (n + 20)), String(180 - (n + 20)), String(n + 20)],
          explanation: "三角形の内角の和は180°なので、頂角は180−2×" + correct + "°。",
        };
      }
      const r = n + 1;
      return {
        title: "図形量を式で表す",
        prompt: tag + "。半径" + r + "の円の面積をπを使って表したものはどれか。",
        correct: r + "²π",
        distractors: [r + "π", 2 * r + "π", r * r + 1 + "π"],
        explanation: "円の面積はπr²。半径" + r + "を代入して" + r + "²πとなる。",
      };
    }
    if (variant === 0) {
      return {
        title: "代表値を表から読む",
        prompt: tag + "。データ" + n + ", " + (n + 2) + ", " + (n + 4) + "の平均値はどれか。",
        correct: String(n + 2),
        distractors: [String(n), String(n + 3), String(n + 4)],
        explanation: "平均は合計を個数で割る。(" + n + "+" + (n + 2) + "+" + (n + 4) + ")÷3=" + (n + 2) + "。",
      };
    }
    if (variant === 1) {
      return {
        title: "散らばりを読む",
        prompt: tag + "。データ" + n + ", " + (n + 2) + ", " + (n + 4) + "の範囲はどれか。",
        correct: "4",
        distractors: ["2", "3", "6"],
        explanation: "範囲は最大値−最小値。" + (n + 4) + "−" + n + "=4。",
      };
    }
    return {
      title: "割合を相対度数へ移す",
      prompt: tag + "。全体" + 2 * n + "個のうち" + n + "個が条件を満たすとき、相対度数はどれか。",
      correct: "1/2",
      distractors: ["1/4", "2/3", "3/4"],
      explanation: "相対度数は条件を満たす個数÷全体。" + n + "÷" + 2 * n + "=1/2。",
    };
  }

  if (concept.course === "A") {
    if (number <= 18) {
      const m = 4 + ((index + number) % 4);
      if (variant === 0) {
        const correct = String((m * (m - 1)) / 2);
        return {
          title: "場合の数を組合せへ移す",
          prompt: tag + "。" + m + "人から異なる2人を選ぶ方法は何通りか。",
          correct,
          distractors: [String(m * 2 + 1), String(m * (m - 1)), String((m * (m - 1)) / 2 + 2)],
          explanation: m + "C2=" + m + "×" + (m - 1) + "÷2=" + correct + "。順序を数えないため2で割る。",
        };
      }
      if (variant === 1) {
        return {
          title: "独立試行を確率へ移す",
          prompt: tag + "。成功確率1/2の試行を2回行い、ちょうど1回成功する確率はどれか。",
          correct: "1/2",
          distractors: ["1/4", "1/3", "3/4"],
          explanation: "成功・失敗と失敗・成功の2通り。それぞれ1/4なので合計は1/2。",
        };
      }
      return {
        title: "確率変数の平均を読む",
        prompt: tag + "。公平な6面体サイコロの出目Xの期待値E(X)はどれか。",
        correct: "3.5",
        distractors: ["3", "4", "6"],
        explanation: "E(X)=(1+2+3+4+5+6)÷6=3.5。確率で重み付けした平均である。",
      };
    }
    if (number <= 39) {
      if (variant === 0) {
        const correct = String(2 * (n + 2));
        return {
          title: "図形量を条件文から組み立てる",
          prompt: tag + "。底辺" + (n + 2) + "、高さ4の三角形の面積はどれか。",
          correct,
          distractors: [String(n + 2), String(2 * (n + 2) + 4), String(4 * (n + 2))],
          explanation: "底辺×高さ÷2より、(" + (n + 2) + ")×4÷2=" + correct + "。",
        };
      }
      if (variant === 1) {
        const angle = n + 20;
        return {
          title: "円周角を中心角へ移す",
          prompt: tag + "。円周角が" + angle + "°のとき、同じ弧に対する中心角はどれか。",
          correct: String(2 * angle),
          distractors: [String(angle), String(angle + 20), String(180 - angle)],
          explanation: "同じ弧に対する中心角は円周角の2倍。2×" + angle + "°=" + 2 * angle + "°。",
        };
      }
      return {
        title: "相似比を面積比へ移す",
        prompt: tag + "。相似比が2:3の2図形の面積比はどれか。",
        correct: "4:9",
        distractors: ["2:3", "3:2", "8:27"],
        explanation: "面積比は相似比の2乗なので2²:3²=4:9。",
      };
    }
    if (variant === 0) {
      return {
        title: "最大公約数を構造から読む",
        prompt: tag + "。nと2nの最大公約数はどれか（nは正の整数）。",
        correct: "n",
        distractors: ["2n", "n+2", "1"],
        explanation: "nは両方を割り、2nはnの倍数なので最大公約数はn。",
      };
    }
    if (variant === 1) {
      return {
        title: "余りを合同式へ移す",
        prompt: tag + "。3n+2をnで割った余りはどれか（n>2）。",
        correct: "2",
        distractors: ["0", "1", "3"],
        explanation: "3n+2=n×3+2なので、nで割った余りは2。",
      };
    }
    const odd = 2 * (index % 4) + 3;
    return {
      title: "倍数条件を最小公倍数へ移す",
      prompt: tag + "。奇数" + odd + "と2の最小公倍数はどれか。",
      correct: String(2 * odd),
      distractors: [String(odd), String(odd + 2), String(2 * odd + 2)],
      explanation: odd + "は奇数なので2と共通因子をもたない。最小公倍数は2×" + odd + "=" + 2 * odd + "。",
    };
  }

  if (concept.course === "II") {
    if (number <= 15) {
      if (variant === 0) {
        return {
          title: "多項式を代入へ移す",
          prompt: tag + "。P(x)=x²+" + n + "のとき、P(1)はどれか。",
          correct: String(n + 1),
          distractors: [String(n), String(n + 2), String(2 * n)],
          explanation: "P(1)=1²+" + n + "=" + (n + 1) + "。指定された数をそのまま代入する。",
        };
      }
      if (variant === 1) {
        return {
          title: "因数を根へ移す",
          prompt: tag + "。(x−" + n + ")(x+2)=0の大きい解はどれか。",
          correct: String(n),
          distractors: ["-2", String(n + 2), String(n - 2)],
          explanation: "x=" + n + "またはx=−2なので、大きい解は" + n + "。",
        };
      }
      return {
        title: "展開後の係数を読む",
        prompt: tag + "。(x+1)²を展開したとき、xの係数はどれか。",
        correct: "2",
        distractors: ["1", "0", "3"],
        explanation: "(x+1)²=x²+2x+1。平方公式の中央項2xを落とさない。",
      };
    }
    if (number <= 29) {
      if (variant === 0) {
        return {
          title: "傾きを座標差へ移す",
          prompt: tag + "。点(1," + n + ")と(3," + (n + 4) + ")を通る直線の傾きはどれか。",
          correct: "2",
          distractors: ["1", "3", "4"],
          explanation: "傾き=(yの差)/(xの差)=4/2=2。",
        };
      }
      if (variant === 1) {
        return {
          title: "中点を座標の平均へ移す",
          prompt: tag + "。A(" + n + ",2), B(" + (n + 4) + ",6)の中点はどれか。",
          correct: "(" + (n + 2) + ",4)",
          distractors: ["(" + n + ",4)", "(" + (n + 4) + ",2)", "(" + (n + 2) + ",8)"],
          explanation: "中点は各座標の平均。((" + n + "+" + (n + 4) + ")/2,(2+6)/2)=(" + (n + 2) + ",4)。",
        };
      }
      return {
        title: "円の式を中心と半径へ移す",
        prompt: tag + "。円(x−" + n + ")²+(y+1)²=9の半径はどれか。",
        correct: "3",
        distractors: ["1", "6", "9"],
        explanation: "標準形と比べるとr²=9なのでr=3。",
      };
    }
    if (number <= 35) {
      if (variant === 0) {
        return {
          title: "指数法則を同底の比へ移す",
          prompt: tag + "。2^" + n + "÷2^(" + (n - 1) + ")の値はどれか。",
          correct: "2",
          distractors: ["1", "4", String(n)],
          explanation: "同底の割り算は指数を引く。2^(" + n + "−" + (n - 1) + ")=2。",
        };
      }
      if (variant === 1) {
        return {
          title: "対数を指数へ移す",
          prompt: tag + "。log₂(2^" + n + ")の値はどれか。",
          correct: String(n),
          distractors: [String(n - 1), String(n + 1), String(2 * n)],
          explanation: "log₂(2^n)=n。対数は何乗すると真数になるかを表す。",
        };
      }
      return {
        title: "指数方程式を底でそろえる",
        prompt: tag + "。3^x=27を満たすxはどれか。",
        correct: "3",
        distractors: ["2", "4", "9"],
        explanation: "27=3³なので、底をそろえるとx=3。",
      };
    }
    if (number <= 49) {
      if (variant === 0) {
        return {
          title: "三角比を角度へ移す",
          prompt: tag + "。sin30°の値はどれか。",
          correct: "1/2",
          distractors: ["√2/2", "√3/2", "1"],
          explanation: "基本角なのでsin30°=1/2。",
        };
      }
      if (variant === 1) {
        return {
          title: "周期をグラフへ移す",
          prompt: tag + "。y=sin xの周期はどれか。",
          correct: "2π",
          distractors: ["π", "π/2", "4π"],
          explanation: "sinは1周で同じ値に戻るので周期は2π。",
        };
      }
      return {
        title: "加法定理を値へ移す",
        prompt: tag + "。sin(π/2−θ)をcosθで表したものはどれか。",
        correct: "cosθ",
        distractors: ["sinθ", "-cosθ", "-sinθ"],
        explanation: "余角の関係よりsin(π/2−θ)=cosθ。",
      };
    }
    if (variant === 0) {
      return {
        title: "導関数を変化率へ移す",
        prompt: tag + "。f(x)=x³+" + n + "xのときf'(1)はどれか。",
        correct: String(3 + n),
        distractors: [String(1 + n), String(3 * n), String(n)],
        explanation: "f'(x)=3x²+" + n + "なのでf'(1)=3+" + n + "=" + (3 + n) + "。",
      };
    }
    if (variant === 1) {
      return {
        title: "接線の傾きを導関数へ移す",
        prompt: tag + "。f(x)=x²のx=" + n + "における接線の傾きはどれか。",
        correct: String(2 * n),
        distractors: [String(n), String(n * n), String(2 * n + 1)],
        explanation: "f'(x)=2x。x=" + n + "を代入して傾きは" + 2 * n + "。",
      };
    }
    return {
      title: "面積を定積分へ移す",
      prompt: tag + "。0≤x≤1でy=" + (n + 1) + "の下にある面積はどれか。",
      correct: String(n + 1),
      distractors: [String(n), String(2 * (n + 1)), "1"],
      explanation: "長方形の面積なので底辺1×高さ" + (n + 1) + "=" + (n + 1) + "。",
    };
  }

  if (concept.course === "B") {
    if (number <= 13) {
      if (variant === 0) {
        return {
          title: "漸化式を一般項へ移す",
          prompt: tag + "。初項" + n + "、公差2の等差数列の第5項はどれか。",
          correct: String(n + 8),
          distractors: [String(n + 6), String(n + 10), String(2 * n)],
          explanation: "a₅=a₁+4d=" + n + "+4×2=" + (n + 8) + "。公差を足す回数は項番号−1。",
        };
      }
      if (variant === 1) {
        return {
          title: "和を項数と平均へ移す",
          prompt: tag + "。初項" + n + "、公差2の等差数列の最初の4項の和はどれか。",
          correct: String(4 * n + 12),
          distractors: [String(4 * n + 8), String(2 * n + 12), String(n + 12)],
          explanation: "最初の4項はn,n+2,n+4,n+6。合計は4n+12。",
        };
      }
      return {
        title: "等比の和を累積量へ移す",
        prompt: tag + "。初項1、公比2の等比数列の最初の4項の和はどれか。",
        correct: "15",
        distractors: ["8", "14", "16"],
        explanation: "1+2+4+8=15。隣り合う項の比が一定であることを使う。",
      };
    }
    if (number <= 32) {
      if (variant === 0) {
        return {
          title: "標本平均を代表値へ移す",
          prompt: tag + "。データ" + n + ", " + (n + 2) + ", " + (n + 4) + "の標本平均はどれか。",
          correct: String(n + 2),
          distractors: [String(n), String(n + 1), String(n + 4)],
          explanation: "合計3n+6を3で割るので、平均はn+2。",
        };
      }
      if (variant === 1) {
        return {
          title: "分散を偏差へ移す",
          prompt: tag + "。データ0,1,2の分散（母分散）はどれか。",
          correct: "2/3",
          distractors: ["1/3", "1", "2"],
          explanation: "平均は1。偏差平方の平均は(1+0+1)/3=2/3。",
        };
      }
      return {
        title: "期待値を確率加重平均へ移す",
        prompt: tag + "。Xが1をとる確率が1/4、0をとる確率が3/4のときE(X)はどれか。",
        correct: "1/4",
        distractors: ["0", "1/2", "3/4"],
        explanation: "E(X)=1×1/4+0×3/4=1/4。値と確率を掛けて足す。",
      };
    }
    if (variant === 0) {
      return {
        title: "増加率を割合へ移す",
        prompt: tag + "。100から" + (100 + n) + "へ増えたときの増加率はどれか。",
        correct: String(n) + "%",
        distractors: [String(100 + n) + "%", String(n + 1) + "%", String(2 * n) + "%"],
        explanation: "増加率=" + n + "/100×100=" + n + "%。",
      };
    }
    if (variant === 1) {
      return {
        title: "単位量を速さへ移す",
        prompt: tag + "。距離" + 3 * n + "kmを2時間で進む平均速度はどれか。",
        correct: String(1.5 * n) + " km/h",
        distractors: [String(3 * n) + " km/h", String(n / 2) + " km/h", String(2 * n) + " km/h"],
        explanation: "平均速度=距離÷時間。" + 3 * n + "÷2=" + 1.5 * n + " km/h。",
      };
    }
    return {
      title: "重み付き平均をデータへ移す",
      prompt: tag + "。値2を確率1/4、値6を確率3/4でとる確率変数の期待値はどれか。",
      correct: "5",
      distractors: ["4", "6", "8"],
      explanation: "E(X)=2×1/4+6×3/4=5。単純平均ではなく確率で重み付けする。",
    };
  }

  if (number <= 20) {
    if (variant === 0) {
      return {
        title: "移動をベクトルの和へ移す",
        prompt: tag + "。u=(" + n + ",1), v=(2,−1)のときu+vはどれか。",
        correct: "(" + (n + 2) + ",0)",
        distractors: ["(" + n + ",2)", "(" + (n - 2) + ",0)", "(" + 2 * n + ",1)"],
        explanation: "成分ごとに足すのでu+v=(" + (n + 2) + ",0)。",
      };
    }
    if (variant === 1) {
      return {
        title: "内積を直交判定へ移す",
        prompt: tag + "。u=(" + n + ",1), v=(1,2)の内積u・vはどれか。",
        correct: String(n + 2),
        distractors: [String(n), String(2 * n), String(n + 1)],
        explanation: "内積は成分の積の和。" + n + "×1+1×2=" + (n + 2) + "。",
      };
    }
    return {
      title: "中点を位置ベクトルへ移す",
      prompt: tag + "。A(" + n + ",2), B(" + (n + 4) + ",6)の中点の座標はどれか。",
      correct: "(" + (n + 2) + ",4)",
      distractors: ["(" + n + ",4)", "(" + (n + 4) + ",6)", "(" + (n + 2) + ",8)"],
      explanation: "中点は両端の座標の平均。(" + (n + 2) + ",4)となる。",
    };
  }
  if (number <= 40) {
    if (variant === 0) {
      return {
        title: "複素数を実部・虚部へ分ける",
        prompt: tag + "。( " + n + "+i )+(2−i)をa+biで表したときaはどれか。",
        correct: String(n + 2),
        distractors: [String(n), String(n + 3), String(n + 1)],
        explanation: "実部と虚部を分けて足すと、実部は" + n + "+2=" + (n + 2) + "。",
      };
    }
    if (variant === 1) {
      return {
        title: "共役との積を実数へ移す",
        prompt: tag + "。( " + n + "+i )( " + n + "−i )の値はどれか。",
        correct: String(n * n + 1),
        distractors: [String(n * n - 1), String(2 * n), String(n * n + 2)],
        explanation: "共役との積は実部²+虚部²。" + n + "²+1=" + (n * n + 1) + "。",
      };
    }
    return {
      title: "複素数の絶対値を距離へ移す",
      prompt: tag + "。複素数z=" + n + "+" + n + "iの絶対値はどれか。",
      correct: String(n) + "√2",
      distractors: [String(n), String(2 * n), String(n * n + 1)],
      explanation: "|z|=√(" + n + "²+" + n + "²)=" + n + "√2。",
    };
  }
  if (variant === 0) {
    return {
      title: "変換を座標へ移す",
      prompt: tag + "。点(" + n + ",2)をy軸対称移動した点はどれか。",
      correct: "(-" + n + ",2)",
      distractors: ["(" + n + ",-2)", "(-" + n + ",-2)", "(" + (n + 2) + ",2)"],
      explanation: "y軸対称ではx座標の符号だけが反転するので(-" + n + ",2)。",
    };
  }
  if (variant === 1) {
    return {
      title: "線形補間を割合へ移す",
      prompt: tag + "。値2から8へ半分だけ変化した値はどれか。",
      correct: "5",
      distractors: ["3", "4", "6"],
      explanation: "変化量は6、その半分は3なので2+3=5。",
    };
  }
  return {
    title: "表の差分を変化率へ移す",
    prompt: tag + "。xが1増えるごとにyが3増える表の傾きはどれか。",
    correct: "3",
    distractors: ["1/3", "2", "4"],
    explanation: "傾きはyの変化量÷xの変化量=3÷1=3。",
  };
}

export const problemExpansionBulk: Problem[] = targetConcepts.flatMap((concept, index) =>
  kinds.map((_, variant) => makeProblem(concept, index, variant, specFor(concept, index, variant))),
);
