# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
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

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## キャラクターと物語

6人の仮設定と、各10段階の物語を実装しています。街で仕入れ先を訪ねると初対面のイベントが始まり、毎日の会話・贈り物で次の物語が解放されます。人物画面に現在の好感度、次の必要ポイント、読了した物語を表示します。

- 好感度4・7はキャラクター別の返答を選択。好感度9で恋愛／友情を選び、10でその関係に応じた後日談へ進みます。
- 人物画面で口調、好感度5で過去、7で悩み、9で主人公への気持ちを読めます。
- 恋愛／友情で商品や設備の解放条件に差はありません。設備は解放後、料理と設備画面で購入します。
- 新規に60イベント、料理30種、食材13種、装飾8種を追加。既存の共同成長30イベントと隠し料理も継続します。
- セーブキーと内部の人物IDは旧版と共通です。`ren`＝蓮、`sota`＝牧、`aki`＝葵、`itsuki`＝アール、`haru`＝海斗、`nagisa`＝静。保存形式v4へ自動移行し、旧版で達成済みの好感度1〜3に対応する新しい報酬を補完します。
- 人物の立ち絵はまだ含まれていないため、名前の一文字を表示します。`src/data/characters.ts` の `image` に画像パスを設定できます。

通常の会話で加算される交流ポイントは1日1回5点です。好感度1〜10の必要累計ポイントは0、20、45、75、110、150、195、245、300、360。好感度はイベントの読了後に上がります。物語の読み返しでは進行も報酬も変化しません。

`npm run test:game` で、6人×恋愛／友情の完走、条件判定、セーブ移行、報酬の重複防止、他ルートへの依存、既存共同成長との互換性を確認します。`npm test` は本番ビルドとWorkerの表示確認も行います。

## 連続営業・調理と雇用（保存形式 v5 / 2026-09-04）

- 注文を選択して調理開始。完成後に手動で提供すると売上を得る。コーヒー10秒、トースト8秒、その他の飲み物12秒、通常料理16秒、限定料理20秒。
- 調理開始時に必要食材を各1食分消費する。1パック5食分。最初は豆とパン10食分ずつ、基本設備3台を所持する。
- 設備1台につき同時調理1品。完成時に設備は空く。各種3台まで増設、各台Lv.5まで強化。増設価格＝基本価格×1.5^現在台数。強化価格＝基本価格×0.5×現在Lv.（四捨五入）。調理時間＝基本時間×0.85^(Lv.-1)。
- 最大4注文。最初の来客は営業時間1秒後、その後5〜10秒ごと。受付時に待機注文分も考慮して材料のある料理を抽選する。客の時間切れなし。
- 6人それぞれ好感度3から1,200コインで雇用。継続給料なし。調理・提供・休みを選び、担当変更時は今の仕事を完了してから切り替える。
- 好感度6で本人の得意料理の調理時間20%短縮、提供時間は2秒から1.6秒。友情ルートでも雇用可能。仕入れは常に手動。
- 行動回数と贈物の日次制限、営業終了、留守中売上を廃止。同じ関係段階の会話は初回のみ交流+5、手動仕入れ1パックで相手に+2。贈物のポイントは従来通り。
- 好感度3〜10の追加条件：累計提供5 / 10 / 15 / 25 / 40 / 60 / 80 / 100件、および相手の店で累計1〜8パックの仕入れ。既読イベントと獲得済み段階は維持。
- ゲームが表示中の時間だけ経過。街・人物・物語画面でも稼働。非表示・閉じた間・1秒を超える処理休止は進めず、残り時間から再開。街の天気・客層・催しは営業時間5分ごとに変化。
- v4以前の食材は数量×5へ移行し、開始用の豆・パン各10食分と基本設備を追加する。既存コイン・物語・贈物・特殊設備を保持。再読込では重複付与しない。
- `npm test`：本番ビルド、ゲームモデル26件、実際のWorkerによるHTML応答1件。`npx tsc --noEmit`：型検証。ブラウザ操作による検証は実施していない。

ゲームデータは従来通り端末のlocalStorageに保存する。1秒ごと、および非表示・ページ終了時に保存し、失敗時は画面に表示する。
