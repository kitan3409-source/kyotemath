# 共テ数学60

共通テスト数学で6割を目指すための、説明・確認問題・復習を一つの導線にまとめた学習アプリです。問題を出すだけで終わらせず、考え方、典型的なミス、解き直しの入口まで同じ画面で扱うことを目標にしています。

## 現在の判定

2026-08-18、コミット `102d41e` を対象にした独立監査で、教材・学習ループ・保存復帰・模試エンジンの実装ゲートは **SUCCESS** になりました。数学I・A、II・B・C、数学IIIを外部教材なしで進めるための320概念・320ガイド・320レッスン・2,392問と、9つの100点模試を収録しています。

ただし、実ユーザーが未見模試で実際に6割を取ったというG5の結果は、このリポジトリではまだ未検証です。「到達保証」や「ユーザーが6割達成済み」とは表現しません。実装ゲートとG5を分けた判定の根拠は監査レポートに固定しています。

- [アプリ単体到達性監査](docs/AUDIT_APP_ONLY_60.md)
- [最終独立監査レポート](docs/INDEPENDENT_AUDIT_REPORT.md)
- [G5実測ランブック](docs/G5_RUNBOOK.md)
- [次回アップデート計画](docs/NEXT_UPDATE_PLAN.md)
- [ADHD特性を想定したUX仕様](docs/ADHD_UX_SPEC.md)
- [共テ形式・到達判定ブループリント](docs/COMMON_TEST_BLUEPRINT.md)

## 今回の修正（2026-08-18）

- 全320概念に、意味・最初の一手・典型的な罠・段階別問題・解説を用意しました。内訳は手作業レッスン100件、生成レッスン220件です。
- quick → standard → transfer → 7日後のdelayedという習得ループを実装し、ガイド閲覧だけでは習得完了にしません。
- 誤答原因5種、原因別retry、途中位置の保存、JSON入出力、未来時刻・ロック済み問題・不正履歴の拒否を実装しました。
- 数学I・A、II・B・C、数学IIIを各3フォーム、100点・時間制限・誘導・未回答・中断復帰つきで収録しました。
- 数学IIIを教材スコープから除外していません。

## 現在の規模

- 全概念：320
- 共テ対象概念：225
- レッスン：320（手作業100 / 生成220）
- ガイド：320
- 問題：2,392
- 段階選択：960
- 7日後再テスト：320
- 模試：9フォーム（数学I・A 3 / 数学II・B・C 3 / 数学III 3）

数は学習導線の広さを示す指標であり、6割到達の証明ではありません。G5は、G5ランブックに従って実ユーザーが未見フォームを時間内に受けた結果で判定します。

---

以下は、このプロジェクトを動かすVinext/Sites基盤の説明です。

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
