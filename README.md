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

- 注文を選択して調理開始。完成後に手動で提供すると売上を得る。全料理の基本調理時間は30秒。
- 調理開始時に必要食材を各1食分消費する。1パック5食分。最初は豆とパン10食分ずつ、基本設備3台を所持する。
- 店長とスタッフを含め、店全体で1品ずつ調理。完成した料理は提供まで設備を使い、提供すると空く。別設備が空いていれば完成後に次の調理を始められる。各種3台まで増設、各台Lv.5まで強化。増設価格＝基本価格×1.5^現在台数。強化価格＝基本価格×0.5×現在Lv.（四捨五入）。調理時間＝基本時間×0.85^(Lv.-1)。
- 最大4注文。最初の来客は営業時間1秒後、その後5〜10秒ごと。受付時に待機注文分も考慮して材料のある料理を抽選する。客の時間切れなし。
- 6人それぞれ好感度3から1,200コインで雇用。継続給料なし。調理・提供・休みを選び、担当変更時は今の仕事を完了してから切り替える。
- 好感度6で本人の得意料理の調理時間20%短縮、提供時間は2秒から1.6秒。友情ルートでも雇用可能。仕入れは常に手動。
- 行動回数と贈物の日次制限、営業終了、留守中売上を廃止。同じ関係段階の会話は初回のみ交流+5、手動仕入れ1パックで相手に+2。贈物のポイントは従来通り。
- 好感度3〜10の追加条件：累計提供5 / 10 / 15 / 25 / 40 / 60 / 80 / 100件、および相手の店で累計1〜8パックの仕入れ。既読イベントと獲得済み段階は維持。
- ゲームが表示中の時間だけ経過。街・人物・物語画面でも稼働。非表示・閉じた間・1秒を超える処理休止は進めず、残り時間から再開。天気・客層の傾向・催しは表示や抽選、売上に影響しない。販売価格は料理ごとの固定価格。旧セーブの関連項目は互換性のため保持する。
- v4以前の食材は数量×5へ移行し、開始用の豆・パン各10食分と基本設備を追加する。既存コイン・物語・贈物・特殊設備を保持。再読込では重複付与しない。
- `npm test`：本番ビルド、ゲームモデル26件、実際のWorkerによるHTML応答1件。`npx tsc --noEmit`：型検証。ブラウザ操作による検証は実施していない。

ゲームデータは従来通り端末のlocalStorageに保存する。1秒ごと、および非表示・ページ終了時に保存し、失敗時は画面に表示する。

## 店内を中心にしたカフェ画面

カフェは背景・家具・購入設備・テーブルと座席・客・恋愛対象キャラクター・吹き出し・演出の8レイヤーです。注文の吹き出しから調理・提供でき、詳細は右上のノートの「注文ノート」、設備・思い出・累計は「店のようす・思い出」から開きます。物語・所持品・既存セーブの内容を維持します。旧セーブに複数の調理中注文がある場合、残り時間と消費済み食材を保持し、順番に調理を再開します。

素材の配置先・ファイル名・推奨サイズは [カフェ素材ガイド](public/assets/cafe/README.md) を参照してください。PNGを追加すると項目ごとにCSSの仮素材から置き換わります。ゲームのタイマーに追従する来店と退店の演出、通常客4種、スタッフの作業位置、稼働中の設備の湯気、木漏れ日を表示します。人物をタップすると既存の人物詳細を開きます。

店長（プレイヤー）は常に店内に表示されます。注文の「調理開始」を選ぶと対象設備へ歩いて調理を始め、完成後の「提供する」で料理を取り、中央の通路から客席へ運びます。複数の指示は順に実行します。スタッフの自動調理も店全体の1品制限を共有し、提供担当は完成した料理を運びます。設備の解放時に未設置の姿が現れ、購入すると稼働可能になります。店内と店長・スタッフの移動先は共通の設備配置を参照し、待機中・調理中・提供待ちが残り時間と連動します。店長の見た目は `public/assets/characters/manager.png` から差し替えられます。

スマホ版は提供された店内画像と透過テーブル素材を使用し、最大幅430pxの縦画面いっぱいに店内を表示します。コインと右上のノートに加え、店・街・贈物・人物・スタッフの5項目の下部メニューを常時表示します。「設備・料理」は画面上部のコイン表示の下のボタン、または各設備をタップして開きます。店内は下部メニューを除く領域いっぱいに表示します。素材の画像と稼働設備・人物・注文は独立しており、画像がない場合のCSSフォールバックも維持しています。

## 仕入れとリクエスト（保存形式 v6）

- 食材は発注時に支払い、1パック5食分、同じ食材を1〜20パック発注できます。所要時間は1パック当たりの時間×数量。1回の発注分はまとめて届きます。同じ食材の追加発注は先の便の後に並び、先の便の到着時刻は延長しません。カフェ全体で異なる食材の同時発注はできません（同じ仕入れ先の別食材も含む）。
- 1パックの所要時間は、その仕入れ先の好感度Lv.0で180秒、1段階につき15秒短縮、Lv.10で30秒です。恋愛・友情ルート共通、他の仕入れ先の好感度には影響されません。発注時に所要時間を確定し、その後の好感度変化で既存便の予定を変更しません。
- 変更前に支払い済みの同時配送は既存の予定時刻のまま受け取れます。別品目が1つでも配送中なら新規発注を止めます。保存形式とキーはv6のまま維持します。
- 入荷待ちは保存され、再読込・画面を閉じている間も配達時間が進みます。自動調理・自動売上は従来どおり表示中の時間だけ進みます。食材による通常料理の解放は到着時です。
- 累計3件提供後、来客時の20%の抽選でリクエストが入ります。最大1件。対象は通常料理の未解放メニュー、または解放済みで在庫が不足する料理です。必要設備が設置済みで、食材を仕入れ可能かつ不足分を買える予算があるものに限ります。物語限定・隠し料理は解放前に出しません。
- リクエストに応えると売上25%増。注文ノートにレシピ解放、各食材の必要数・在庫・入荷予定・仕入れ先、設備の設置、調理完了の全条件を表示し、調理前なら注文を断れます。断っても売上や提供数は増えません。
- 吹き出しと店長の調理・提供表示に料理名を追加し、入荷待ち・食材待ち・解放待ちを区別します。
- v5以前の所持品、コイン、物語、料理の残り時間を保持して移行します。新しい入荷待ちデータだけを追加します。
