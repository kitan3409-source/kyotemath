# 独立監査プロトコル

## 目的

`/goal success` の判定を、実装者の自己評価や画面上の数値から切り離す。

## 監査順

1. `data/math-concepts.json` の320概念と前提グラフを固定する。
2. 出荷物から lesson / guide / quick / standard / transfer の実数を再集計する。
3. 全フォームの問題ID・配点・正答・未回答・時間切れを再現する。
4. 少なくとも30概念を層化抽出して、説明→例題→問題の意味的一致を読む。
5. 数学IIIから最低10概念、各単元から最低2概念を必ず読む。
6. localStorage、IndexedDB、JSON import/export、ブラウザ再起動、静的GitHub配信を検査する。
7. キーボード操作、フォーカス、読み上げラベル、狭い画面、長文折返しを検査する。
8. FAIL条件が残っていないことを確認してから、G1〜G6を判定する。

## 合格禁止事項

- 共通テスト分母から未完成分野を黙って外す
- 数IIIを地図に表示しただけで完結扱いする
- guide閲覧、着手回数、自己申告を習得証拠にする
- 同じフォームや同じ問題の数値置換を未見フォームと数える
- 8問スキャンをフル模試と呼ぶ
- 監査用の閾値を結果を見た後に変更する
- 問題の数学的正しさを、型・文字列・answer indexだけで済ませる

## 監査成果物

- `docs/GOAL_SUCCESS.md`
- `docs/INDEPENDENT_AUDIT_PROTOCOL.md`
- `scripts/audit-curriculum.mjs`
- `scripts/audit-exams.mjs`
- `tests/` の保存・採点・フォーム・問題整合性テスト
- 独立監査レポート
