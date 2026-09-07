import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { characters } from "../src/data/characters.ts";
import { decorations } from "../src/data/decorations.ts";
import { equipment } from "../src/data/equipment.ts";
import { relationshipEvents } from "../src/data/events.ts";
import { growthEvents } from "../src/data/growthEvents.ts";
import { gifts } from "../src/data/gifts.ts";
import { ingredients } from "../src/data/ingredients.ts";
import { recipes } from "../src/data/recipes.ts";
import { suppliers } from "../src/data/suppliers.ts";
import { affectionThresholds, GAME_CONFIG, relationshipNames } from "../src/game/config.ts";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = join(projectRoot, "docs", "仕様書.md");
const clean = (value) => String(value).replaceAll("|", "\|").replaceAll("\n", " ");
const list = (items) => items.map((item) => clean(item)).join("、");
const supplierById = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]));
const relationshipByCharacter = Object.groupBy(relationshipEvents, (event) => event.characterId);
const growthByCharacter = Object.groupBy(growthEvents, (event) => event.characterId);

const navSource = readFileSync(join(projectRoot, "src", "components", "GameUI.tsx"), "utf8");
const navigation = [...navSource.matchAll(/\{id:"([^"]+)",icon:"([^"]+)",label:"([^"]+)"\}/g)]
  .map((match) => `${match[3]}（${match[1]}）`);
const missionSource = readFileSync(join(projectRoot, "src", "game", "missions.ts"), "utf8");
const fixedMissions = [...missionSource.matchAll(/add\("([^"]+)","([^"]+)","([^"]+)","([^"]+)",(\d+),"([^"]+)"/g)]
  .map((match) => ({ id: match[1], chapter: match[2], title: match[3], hint: match[4], reward: Number(match[5]), destination: match[6] }));
const missionsByChapter = Object.groupBy(fixedMissions, (mission) => mission.chapter);
const missionSummary = Object.entries(missionsByChapter).map(([chapter, missions]) =>
  `- ${chapter}：${list(missions.map((mission) => mission.title))}`
).join("\n");
const seatingSource = readFileSync(join(projectRoot, "src", "game", "seating.ts"), "utf8");
const tableUpgrades = [...seatingSource.matchAll(/\{ count: (\d+), price: (\d+), missionId: "([^"]+)" \}/g)]
  .map((match) => ({ count: Number(match[1]), price: Number(match[2]), missionId: match[3] }));
const tableUpgradeRows = tableUpgrades.map((upgrade) => {
  const mission = fixedMissions.find((item) => item.id === upgrade.missionId);
  return `| ${upgrade.count}セット | ${upgrade.price.toLocaleString("ja-JP")}コイン | ${clean(mission?.title ?? upgrade.missionId)} |`;
}).join("\n");

const characterRows = characters.map((character) => {
  const supplier = supplierById[character.supplierId];
  return `| ${clean(character.name)} | ${clean(character.nameReading)} | ${character.age} | ${clean(character.occupation)} | ${clean(supplier?.name ?? character.supplierId)} | ${clean(character.routeTheme)} |`;
}).join("\n");

const characterDetails = characters.map((character) => {
  const stories = relationshipByCharacter[character.id] ?? [];
  const growth = growthByCharacter[character.id] ?? [];
  return `### ${character.name}（${character.nameReading}）

- 基本設定：${character.profile}
- 背景：${character.backstory}
- 抱える問題：${character.concern}
- 主人公への気持ち：${character.attraction}
- 好感度ストーリー：${list(stories.sort((a, b) => a.toStage - b.toStage).map((event) => `${event.toStage}.「${event.title}」`))}
- 共同成長：${list(growth.sort((a, b) => a.routeStage - b.routeStage).map((event) => `${event.routeStage}.「${event.title}」`))}`;
}).join("\n\n");

const supplierRows = suppliers.map((supplier) => {
  const character = characters.find((item) => item.id === supplier.characterId);
  const stock = ingredients.filter((item) => item.supplierId === supplier.id).map((item) => item.name);
  return `| ${supplier.icon} ${clean(supplier.name)} | ${clean(character?.name ?? supplier.characterId)} | ${list(stock)} |`;
}).join("\n");

const equipmentRows = equipment.map((item) => {
  const character = characters.find((candidate) => candidate.id === item.characterId);
  return `| ${item.icon} ${clean(item.name)} | ${item.price.toLocaleString("ja-JP")} | ${clean(character?.name ?? "基本設備")} | ${clean(item.effectText)} |`;
}).join("\n");

const recipeGroups = [
  ["初期レシピ", recipes.filter((recipe) => recipe.initiallyUnlocked)],
  ["食材の入荷で解放", recipes.filter((recipe) => !recipe.initiallyUnlocked && !recipe.unlockEventId)],
  ["共同成長で解放", recipes.filter((recipe) => recipe.unlockEventId?.includes("growth"))],
  ["好感度ストーリーで解放", recipes.filter((recipe) => recipe.unlockEventId?.includes("stage"))],
  ["隠しレシピ", recipes.filter((recipe) => recipe.hidden)],
];
const recipeSections = recipeGroups.map(([label, items]) => `- ${label}（${items.length}種）：${list(items.map((recipe) => recipe.name))}`).join("\n");

const spec = `# こもれびカフェ ゲーム仕様書

> このファイルはゲームデータと設定から自動生成されます。直接編集せず、仕様変更後に \`npm run spec:update\` を実行してください。\`npm run dev\` と \`npm run build\` の前にも自動更新されます。

## 1. 作品概要

- タイトル：こもれびカフェ
- ジャンル：カフェ経営×恋愛シミュレーション
- 主要プレイ：仕入れ、調理、提供、設備拡張、キャラクター交流、共同メニュー開発
- 対応画面：${navigation.length ? list(navigation) : "店、街、贈物、人物、スタッフ"}
- 画面文言：操作、状態、必要条件を優先し、装飾的な副見出しや重複説明は表示しない。
- 保存方式：端末の localStorage（セーブ形式 v${GAME_CONFIG.saveVersion}）

## 2. 現在の収録内容

| 項目 | 数 |
|---|---:|
| 恋愛対象キャラクター | ${characters.length}人 |
| 好感度ストーリー | ${relationshipEvents.length}件 |
| 共同成長ストーリー | ${growthEvents.length}件 |
| 仕入れ先 | ${suppliers.length}か所 |
| 食材 | ${ingredients.length}種 |
| 料理 | ${recipes.length}種 |
| 設備 | ${equipment.length}種 |
| 装飾 | ${decorations.length}種 |
| 贈物 | ${gifts.length}種 |

## 3. ゲームの基本ループ

1. 街の仕入れ先を訪ね、食材を1〜${GAME_CONFIG.maxProcurementPacks}パックで発注する。
2. 1パックは${GAME_CONFIG.ingredientPackSize}食分。入荷までの基本時間は${GAME_CONFIG.procurementMs / 1000}秒で、仕入れ先キャラクターの好感度により最短${GAME_CONFIG.minProcurementMs / 1000}秒まで短縮される。
3. 来店客の注文を選び、必要食材と設備が揃っていれば調理する。基本調理時間は${GAME_CONFIG.baseCookingSeconds}秒。
4. 完成後に提供すると売上と累計提供数、人物進行の条件が加算される。
5. 会話、贈物、仕入れで交流ポイントを増やし、好感度ストーリーを解放する。
6. 好感度3からキャラクターに店を手伝ってもらえる。好感度6で得意料理の調理時間が20%短縮される。
7. 好感度9で恋愛／友情を選択し、10でそれぞれの後日談へ進む。ゲーム報酬は両ルートで同一。

## 4. 主要パラメーター

| 仕様 | 現在値 |
|---|---:|
| 初期コイン | ${GAME_CONFIG.initialCurrency.toLocaleString("ja-JP")} |
| 同時注文数 | 最大${GAME_CONFIG.maxOrders}件 |
| 注文発生間隔 | ${GAME_CONFIG.orderSpawnMinMs / 1000}〜${GAME_CONFIG.orderSpawnMaxMs / 1000}秒 |
| リクエスト発生率 | ${GAME_CONFIG.requestOrderChance * 100}% |
| リクエスト売上倍率 | ${GAME_CONFIG.requestOrderBonus}倍 |
| 雇用料 | ${GAME_CONFIG.hirePrice.toLocaleString("ja-JP")}コイン |
| 同種設備数 | 最大${GAME_CONFIG.maxStationsPerType}台 |
| 設備レベル | 最大Lv.${GAME_CONFIG.maxStationLevel} |
| 通常提供時間 | ${GAME_CONFIG.serveMs / 1000}秒 |
| 関係段階数 | ${relationshipNames.length - 1}段階 |
| 必要累計交流ポイント | ${list(affectionThresholds)} |
| 会話の交流ポイント | +${GAME_CONFIG.talkAffection} |
| 贈物の交流ポイント | 大好き +${GAME_CONFIG.giftAffection.love}／好き +${GAME_CONFIG.giftAffection.like}／普通 +${GAME_CONFIG.giftAffection.normal}／苦手 ${GAME_CONFIG.giftAffection.dislike} |

## 5. ミッションと客席拡張

- 導入ミッションは${fixedMissions.length}件。仕入れ、初調理、キャラクター交流、共同開発、設備強化までを段階的に案内する。
- 達成判定は一度成立したら保持され、報酬はミッション画面で受け取る。表示順は「受取可能 → 挑戦中 → 受取済み」。
- 長期ミッションは「料理の種類」「出会った人数」「共同成長の読了数」「雇用数」を記録する。
- 初回提供後は「一定数を提供」「指定系統の料理を提供」「食材を受け取る」の3種の継続ミッションが更新される。

${missionSummary}

| 客席数 | 価格 | 解放条件 |
|---|---:|---|
| 1セット | 初期所持 | なし |
${tableUpgradeRows}

- 来店数は購入済みの客席数まで。食材がない場合も来店し、注文は食材の入荷を待つ。

## 6. キャラクター一覧

| 名前 | 読み | 年齢 | 職業 | 仕入れ先 | ルートテーマ |
|---|---|---:|---|---|---|
${characterRows}

## 7. キャラクター詳細

${characterDetails}

## 8. 仕入れ先と食材

| 仕入れ先 | 担当 | 取扱食材（未解放を含む） |
|---|---|---|
${supplierRows}

- 発注時に支払い、入荷時に食材が在庫へ加算される。
- 配送はカフェ全体で1件ずつ。入荷待ちは再読込後も引き継がれる。
- 仕入れ先での購入は、その担当キャラクターの交流条件に加算される。

## 9. 料理

${recipeSections}

- 未解放、食材不足、必要設備の未設置、他の料理を調理中の場合は調理を開始できない。
- 調理開始時に必要食材を1食分ずつ消費する。売上は提供完了時にのみ加算される。
- 店全体で同時に調理できる料理は1品。

## 10. 設備

| 設備 | 基本価格 | 関連人物 | 用途 |
|---|---:|---|---|
${equipmentRows}

- 設備の増設価格は「基本価格 × 1.5^現在台数」。
- 強化価格は「基本価格 × 0.5 × 現在Lv.」。強化ごとに調理時間が15%短縮される。

## 11. 好感度と共同成長

- 各キャラクターの好感度ストーリーは${relationshipNames.length - 1}段階。
- 好感度4と7で返答を選ぶ。9で恋愛／友情を決定し、10で後日談と最終報酬を解放する。
- 共同成長は各1人5段階。販売、仕入れ、関係段階、前段階の読了、設備購入を条件とし、食材・料理・設備・装飾を解放する。
- 恋愛ルートと友情ルートで、料理や設備の報酬に差はつけない。
- 人物ページは名前、好感度、好感度ストーリー、贈物の好みの順に絞る。年齢、職業、プロフィール設定、共同成長、スタッフ操作は表示しない。
- 街と人物一覧の選択カードは、画像があるキャラクターを顔中心の丸いアイコンで表示する。人物詳細と物語では従来の立ち絵表示を使う。
- 顔アイコンと物語開始時の立ち絵は、三ツ葉 葵を基準に全キャラクターの顔の大きさ、表示高、中央位置を揃える。元画像の人物位置が左右に寄っている場合は、人物ごとの補正で頭部を枠の中央へ置き、見切れを防ぐ。
- 顔アイコンは全員共通のクリーム色を背景にし、元画像の白背景も共通色になじませる。物語画面の立ち絵も全員同じクリーム系の舞台背景へ表示する。
- スタッフ一覧、人物詳細、街のお店詳細も、街・人物一覧と同じ人物別の中心補正を使う。全身立ち絵ではなく顔中心の丸い画像に揃え、詳細画面では同じ切り抜きを大きく表示する。
- 画像がある人物では代替文字を重ねず、街のお店画面を含めて画像の背後に文字を表示しない。画像がない場合、読込に失敗した場合、未遭遇の場合だけ代替文字を表示する。
- 黒豆 蓮の立ち絵：\`/assets/characters/ren.png\`
- 灰島 静の立ち絵：\`/assets/characters/shizuka.png\`
- アール・グレイの立ち絵：\`/assets/characters/earl-grey.png\`
- 白川 牧の立ち絵：\`/assets/characters/shirakawa-maki.png\`
- 麦野 太陽の立ち絵：\`/assets/characters/mugino-taiyo.png\`
- 凍堂 冴の立ち絵：\`/assets/characters/toudou-sae.png\`
- 贈物の選択画面は、人物ページのスクロール位置にかかわらずゲーム画面中央へ表示する。
- 渡したことのある贈物だけを、人物ごとに「大好物／好き／ふつう／苦手」へ記録する。未確認の好みは「未発見」とし、記録はセーブに保存する。

## 12. スタッフ

- 好感度3以上、${GAME_CONFIG.hirePrice.toLocaleString("ja-JP")}コインで初回雇用できる。
- 担当は「調理」「提供」「お休み」。担当変更時は進行中の仕事を完了してから切り替える。
- 好感度6以上で本人の得意料理は20%短縮、提供時間は${GAME_CONFIG.serveMs / 1000}秒から${GAME_CONFIG.serveMs * 0.8 / 1000}秒に短縮される。

## 13. セーブと互換性

- 保存キー：\`${GAME_CONFIG.saveKey}\`
- 現在の保存形式：v${GAME_CONFIG.saveVersion}
- 旧セーブのコイン、食材、人物進行、解放料理、設備、贈物、調理進行を引き継ぐ。
- 新しいキャラクターは旧セーブの読込時に初期進行状態で自動追加する。
- ゲームの調理や自動提供は画面表示中のみ進行する。仕入れの配送時間は再読込や画面を閉じている間も進む。

## 14. 仕様書の自動更新

- データの正本：\`src/data/*.ts\`
- ゲーム数値の正本：\`src/game/config.ts\`
- 仕様書生成：\`npm run spec:update\`
- 自動実行：\`npm run dev\` と \`npm run build\` の開始前
- 今後、画面やルールの仕様を追加する場合は、実装と同時に \`scripts/update-spec.mjs\` の対応節も更新する。

## 15. 検証基準

- \`npm run spec:update\`：仕様書を現在の実装に同期する。
- \`npm run test:game\`：ストーリー進行、報酬、仕入れ、調理、セーブ移行を検証する。
- \`npm test\`：本番ビルドと全自動テストを実行する。
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, spec, "utf8");
console.log(`Updated ${outputPath}`);
