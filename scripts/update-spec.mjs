import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = join(projectRoot, "docs", "仕様書.md");
const clean = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const list = (items) => items.map((item) => clean(item)).join("、");
const missionRuntimeRoot = mkdtempSync(join(tmpdir(), "komorebi-spec-missions-"));
const compileTypeScriptTree = (sourceRoot, outputRoot) => {
  const visit = (directory, relativeDirectory = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const sourcePath = join(directory, entry.name);
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(sourcePath, relativePath);
        continue;
      }
      if (!entry.name.endsWith(".ts")) continue;
      const outputPath = join(outputRoot, relativePath.replace(/\.ts$/, ".js"));
      mkdirSync(dirname(outputPath), { recursive: true });
      const source = readFileSync(sourcePath, "utf8");
      const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      writeFileSync(outputPath, compiled, "utf8");
    }
  };
  visit(sourceRoot);
};
compileTypeScriptTree(join(projectRoot, "src", "data"), join(missionRuntimeRoot, "data"));
compileTypeScriptTree(join(projectRoot, "src", "game"), join(missionRuntimeRoot, "game"));
compileTypeScriptTree(join(projectRoot, "src", "types"), join(missionRuntimeRoot, "types"));
const missionRequire = createRequire(join(missionRuntimeRoot, "package.json"));
// Compile data together so cross-file TypeScript imports use the same runtime as game tests.
const { characters } = missionRequire(join(missionRuntimeRoot, "data", "characters.js"));
const { equipment } = missionRequire(join(missionRuntimeRoot, "data", "equipment.js"));
const { relationshipEvents, staffStoryEvents } = missionRequire(join(missionRuntimeRoot, "data", "events.js"));
const { growthEvents } = missionRequire(join(missionRuntimeRoot, "data", "growthEvents.js"));
const { dateEvents, dateLocations } = missionRequire(join(missionRuntimeRoot, "data", "dates.js"));
const { giftRarityInfo, gifts } = missionRequire(join(missionRuntimeRoot, "data", "gifts.js"));
const { ingredients } = missionRequire(join(missionRuntimeRoot, "data", "ingredients.js"));
const { recipes } = missionRequire(join(missionRuntimeRoot, "data", "recipes.js"));
const { suppliers } = missionRequire(join(missionRuntimeRoot, "data", "suppliers.js"));
const { affectionThresholds, GAME_CONFIG, MENU_MASTERY_LEVELS, relationshipNames } = missionRequire(join(missionRuntimeRoot, "game", "config.js"));

const supplierById = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]));
const relationshipByCharacter = Object.groupBy(relationshipEvents, (event) => event.characterId);
const growthByCharacter = Object.groupBy(growthEvents, (event) => event.characterId);
const staffStoriesByCharacter = Object.groupBy(staffStoryEvents, (event) => event.characterId);
const raritySummary=Object.entries(giftRarityInfo).map(([id,info])=>`${info.badge} ${info.label}（倍率${GAME_CONFIG.giftRarityMultiplier[id]}・抽選重み${GAME_CONFIG.giftRarityWeight[id]}）`).join("／");

const { missionChapters, missions, sideMissions } = missionRequire(join(missionRuntimeRoot, "game", "missions.js"));

const navSource = readFileSync(join(projectRoot, "src", "components", "GameUI.tsx"), "utf8");
const navigation = [...navSource.matchAll(/\{id:"([^"]+)",icon:"([^"]+)",label:"([^"]+)"\}/g)]
  .map((match) => `${match[3]}（${match[1]}）`);
const missionSource = readFileSync(join(projectRoot, "src", "game", "missions.ts"), "utf8");
const fixedMissions = [...missionSource.matchAll(/add\("([^"]+)","([^"]+)"/g)]
  .map((match) => ({ id: match[1], title: match[2] }));
const missionCount = missions.length;
const missionDestinationLabels = {
  orders: "注文",
  inventory: "在庫",
  town: "街",
  coffee: "珈琲豆店",
  bakery: "パン屋",
  ranch: "牧場",
  patisserie: "洋菓子店",
  chocolaterie: "ショコラトリー",
  gifts: "ギフト店",
  ren: "蓮の人物画面",
  recipes: "料理一覧",
  equipment: "設備一覧",
  people: "人物一覧",
  staff: "スタッフ一覧",
};
const missionRows = (items) => items.map((mission) => `| ${clean(mission.id)} | ${clean(mission.title)} | ${clean(mission.hint || "—")} | ${mission.target} | ${mission.reward.toLocaleString("ja-JP")} | ${clean(missionDestinationLabels[mission.destination] ?? mission.destination)} |`).join("\n");
const missionSections = missionChapters.map((chapter, index) => `### ${index + 1}. ${clean(chapter.title)}\n\n| ID | ミッション | 条件・補足 | 目標値 | 報酬 | 行き先 |\n|---|---|---|---:|---:|---|\n${missionRows(chapter.missions)}`).join("\n\n");
const sideMissionRows = sideMissions.map((mission) => `| ${clean(mission.id)} | ${clean(mission.title)} | サブミッション。メイン進行とは別に達成・受取 | ${mission.target} | ${mission.reward.toLocaleString("ja-JP")} | — |`).join("\n");
const missionSummary = `- 導入：街、仕入れ、在庫、調理、提供、ギフト、新料理\n- 設備：トースター、早期のキッチン作業台、基本3設備のLv.2強化、コーヒーカウンター増設、人物ごとの専用設備\n- 人物ごと：出会い、仕入れ改善、好感度3、段階的な雇用、好感度7、専用設備の設置、限定料理、好感度10\n- デート：好感度${GAME_CONFIG.dateUnlockStage}で解放、${list(dateLocations.map(location=>location.title))}\n- サブミッション：累計提供数、累計売上、累計ギフト購入数、メニュー解放率、複数料理の熟練度。メイン進行には影響しない\n- 自動化：注文ノートからの仕入れ依頼、好感度9で不足食材の自動仕入れ、全自動提供`;
const seatingSource = readFileSync(join(projectRoot, "src", "game", "seating.ts"), "utf8");
const tableUpgrades = [...seatingSource.matchAll(/\{ count: (\d+), price: (\d+), missionId: "([^"]+)" \}/g)]
  .map((match) => ({ count: Number(match[1]), price: Number(match[2]), missionId: match[3] }));
const tableUpgradeRows = tableUpgrades.map((upgrade) => {
  const mission = fixedMissions.find((item) => item.id === upgrade.missionId);
  return `| ${upgrade.count}セット | ${upgrade.price.toLocaleString("ja-JP")}コイン | ${clean(mission?.title ?? upgrade.missionId)} |`;
}).join("\n");

const characterRows = characters.map((character) => {
  const supplier = supplierById[character.supplierId];
  return `| ${clean(character.name)} | ${clean(character.nameReading)} | ${clean(character.occupation)} | ${clean(supplier?.name ?? character.supplierId)} | ${clean(character.routeTheme)} |`;
}).join("\n");

const characterDetails = characters.map((character) => {
  const stories = relationshipByCharacter[character.id] ?? [];
  const growth = growthByCharacter[character.id] ?? [];
  const staffStories = staffStoriesByCharacter[character.id] ?? [];
  return `### ${character.name}（${character.nameReading}）

- 基本設定：${character.profile}
- 背景：${character.backstory}
- 抱える問題：${character.concern}
- 主人公への気持ち：${character.attraction}
- 好感度ストーリー：${list(stories.sort((a, b) => a.toStage - b.toStage).map((event) => `${event.toStage}.「${event.title}」`))}
- 店づくりの物語：${list(growth.sort((a, b) => a.routeStage - b.routeStage).map((event) => `${event.routeStage}.「${event.title}」`))}${staffStories.length?`\n- カフェを手伝う物語：${list(staffStories.map(event=>`「${event.title}」（好感度${event.requiredRelationshipStage}以上・雇用後）`))}`:""}`;
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
  ["店づくりで解放", recipes.filter((recipe) => recipe.unlockEventId?.includes("growth"))],
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
- 対応画面：${navigation.length ? list(navigation) : "店、街、ギフト、人物、スタッフ"}
- 画面文言：操作、状態、必要条件を優先し、装飾的な副見出しや重複説明は表示しない。
- 保存方式：端末の localStorage（セーブ形式 v${GAME_CONFIG.saveVersion}）

## 2. 現在の収録内容

| 項目 | 数 |
|---|---:|
| 恋愛対象キャラクター | ${characters.length}人 |
| 好感度ストーリー | ${relationshipEvents.length}件 |
| カフェを手伝う追加ストーリー | ${staffStoryEvents.length}件 |
| 店づくりの物語 | ${growthEvents.length}件 |
| デート | ${dateEvents.length}件 |
| 仕入れ先 | ${suppliers.length}か所 |
| 食材 | ${ingredients.length}種 |
| 料理 | ${recipes.length}種 |
| 設備 | ${equipment.length}種 |
| ギフト | ${gifts.length}種 |

## 3. ゲームの基本ループ

1. 街の仕入れ先を訪ね、食材を1〜${GAME_CONFIG.maxProcurementPacks}パックで発注する。
2. 1パックは通常${GAME_CONFIG.ingredientPackSize}食分。店づくりの仕入れ改善後は${GAME_CONFIG.improvedPackSize}食分。入荷までの基本時間は${GAME_CONFIG.procurementMs / 1000}秒で、好感度により最短${GAME_CONFIG.minProcurementMs / 1000}秒まで短縮される。序盤食材は好感度1からコーヒー豆・焼きたてパンが${GAME_CONFIG.starterProcurementMs / 1000}秒、しぼりたて牛乳・チョコレートが${GAME_CONFIG.earlyProcurementMs / 1000}秒。
3. 来店客の注文を選び、必要食材と設備が揃っていれば調理する。調理時間は序盤・低価格帯が${GAME_CONFIG.starterCookingSeconds}秒、中価格帯が${GAME_CONFIG.midCookingSeconds}秒、高価格帯が${GAME_CONFIG.baseCookingSeconds}秒。
4. 完成後に提供すると売上と累計提供数、人物進行の条件が加算される。
5. 会話、ギフト、仕入れで交流ポイントを増やし、好感度ストーリーを解放する。
6. 蓮は好感度4、ほかの人物は好感度7から雇用できる。店内の調理・提供は合わせて最大${GAME_CONFIG.maxFloorStaff}人、仕入れ担当は最大${GAME_CONFIG.maxProcurementStaff}人。好感度8で得意料理の調理・提供時間が20%短縮される。
7. 好感度${GAME_CONFIG.dateUnlockStage}で街の各人物の店からデートに誘える。初回は1か所につき交流ポイント+${GAME_CONFIG.dateAffection}。
8. 好感度9で恋愛／友情を選択し、10でそれぞれの後日談へ進む。ゲーム報酬は両ルートで同一。

## 4. 主要パラメーター

| 仕様 | 現在値 |
|---|---:|
| 初期コイン | ${GAME_CONFIG.initialCurrency.toLocaleString("ja-JP")} |
| 同時注文数 | 最大${GAME_CONFIG.maxOrders}件 |
| 注文発生間隔 | ${GAME_CONFIG.orderSpawnMinMs / 1000}〜${GAME_CONFIG.orderSpawnMaxMs / 1000}秒 |
| リクエスト発生率 | ${GAME_CONFIG.requestOrderChance * 100}% |
| リクエスト売上倍率 | ${GAME_CONFIG.requestOrderBonus}倍 |
| 蓮の初回雇用料 | ${GAME_CONFIG.renHirePrice.toLocaleString("ja-JP")}コイン |
| ほかの人物の初回雇用料 | ${GAME_CONFIG.hirePrice.toLocaleString("ja-JP")}コイン |
| 調理・提供スタッフ | 合計最大${GAME_CONFIG.maxFloorStaff}人 |
| 仕入れスタッフ | 最大${GAME_CONFIG.maxProcurementStaff}人 |
| 同種設備数 | 最大${GAME_CONFIG.maxStationsPerType}台 |
| 設備レベル | 最大Lv.${GAME_CONFIG.maxStationLevel} |
| 通常提供時間 | ${GAME_CONFIG.serveMs / 1000}秒 |
| 関係段階数 | ${relationshipNames.length - 1}段階 |
| 必要累計交流ポイント | ${list(affectionThresholds)} |
| 会話の交流ポイント | +${GAME_CONFIG.talkAffection} |
| 仕入れの交流ポイント | 1回の発注につき +${GAME_CONFIG.procurementAffection} |
| ギフトの基本交流ポイント | 大好き +${GAME_CONFIG.giftAffection.love}／好き +${GAME_CONFIG.giftAffection.like}／普通 +${GAME_CONFIG.giftAffection.normal}／苦手 ${GAME_CONFIG.giftAffection.dislike} |
| ギフトのレアリティ | ${raritySummary} |
| メニュー熟練度 | Lv.1〜${MENU_MASTERY_LEVELS.at(-1).level}（最大売上+${MENU_MASTERY_LEVELS.at(-1).bonus*100}%） |

## 5. メニュー熟練度、ミッションと客席拡張

- 解放済み料理は累計提供数に応じてLv.1〜${MENU_MASTERY_LEVELS.at(-1).level}まで成長する。必要累計提供数は${list(MENU_MASTERY_LEVELS.map(item=>`Lv.${item.level}=${item.sales}品`))}。
- 熟練度による売上ボーナスは${list(MENU_MASTERY_LEVELS.map(item=>`Lv.${item.level}=+${item.bonus*100}%`))}。リクエスト注文の25%増額とは重ねて計算する。
- 料理一覧にはメニュー解放率、各料理の累計提供数、現在Lv.、次のLv.までの進捗、熟練売上ボーナスを表示する。未発見の隠し料理は解放率の分母に含めず、発見時に分子と分母へ加える。

- メインミッションは全${missionCount}件。常に現在の3件だけを表示し、3件すべての報酬を受け取ると次の3件へ進む。別枠のサブミッションはメイン進行を止めず、累計提供・売上・ギフト購入・メニュー解放率・熟練料理数の目標が段階的に増える。
- 序盤は仕入れ、初調理、人物交流、新料理開発を順に案内する。設備は解放と購入が可能になる進行帯で、全種類の設置をミッションで案内する。その後はキャラクターデータから出会い、仕入れ改善、雇用、好感度、店づくり、3種類のデートを自動生成する。
- 最終目標は全キャラクターの好感度10、自動仕入れ3回、スタッフによる全自動提供10品。キャラクターや料理が追加された場合は対象数も自動で増える。

${missionSummary}

### メインミッション全件（${missions.length}件）

ミッションは章ごとに3件ずつ進行し、各章の3件をすべて受け取ると次の章が表示されます。条件・補足が「—」のものは、ゲーム内の進捗値だけで判定します。

${missionSections}

### サブミッション全件（${sideMissions.length}件）

サブミッションはメインミッションの進行を止めず、各系統で次の目標が順番に解放されます。

| ID | ミッション | 条件・補足 | 目標値 | 報酬 | 行き先 |
|---|---|---|---:|---:|---|
${sideMissionRows}

| 客席数 | 価格 | 解放条件 |
|---|---:|---|
| 1セット | 初期所持 | なし |
${tableUpgradeRows}

- 来店数は購入済みの客席数まで。食材がない場合も来店し、注文は食材の入荷を待つ。

## 6. キャラクター一覧

| 名前 | 読み | 職業 | 仕入れ先 | ルートテーマ |
|---|---|---|---|---|
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

## 11. 好感度と店づくり

- 各キャラクターの好感度ストーリーは${relationshipNames.length - 1}段階。
- 好感度4と7で返答を選ぶ。9で恋愛／友情を決定し、10で後日談と最終報酬を解放する。
- 黒豆 蓮の本編は、豆袋のメモ、ふたつのカップ、取っ手を揃える照れを繰り返し、仕事相手への信頼から個人的な好意へ進む会話シーンで構成する。好感度4は「カウンターのこちら側」で、短い手伝いと休憩から雇用の相談につながる。
- カフェを手伝う追加話は${staffStoryEvents.length}件。${list(staffStoryEvents.map(event=>`${characters.find(character=>character.id===event.characterId)?.name}「${event.title}」は好感度${event.requiredRelationshipStage}以上かつ雇用後に自動開始する`))}。既存の高段階セーブでも未読なら開始し、好感度・ルート・資金・食材・報酬は変更しない。既読状態は人物のviewedEventsへ保存し、人物ページの「カフェを手伝う物語」から読み返せる。友情ルートでは専用の台本を表示する。
- 店づくりの物語は各1人5段階。第1話は仕入れ手順の改善で、担当仕入れ先の1パックを${GAME_CONFIG.ingredientPackSize}食分から${GAME_CONFIG.improvedPackSize}食分へ増やす。以降は食材・料理・設備を解放する。
- デートは好感度${GAME_CONFIG.dateUnlockStage}で解放。各キャラクターに${list(dateLocations.map(location=>location.title))}の3本がある。お家デートは穏やかな会話のみで、性的表現は扱わない。
- 恋愛ルートと友情ルートで、料理や設備の報酬に差はつけない。
- 人物ページは名前、好感度、好感度ストーリー、ギフトの好みを表示する。デートは街の各人物の店から開始する。
- 街と人物一覧の選択カードは、画像があるキャラクターを顔中心の丸いアイコンで表示する。人物詳細と物語では従来の立ち絵表示を使う。
- 顔アイコンと物語開始時の立ち絵は、三ツ葉 葵を基準に全キャラクターの顔の大きさ、表示高、中央位置を揃える。元画像の人物位置が左右に寄っている場合は、人物ごとの補正で頭部を枠の中央へ置き、見切れを防ぐ。
- 顔アイコンは全員共通のクリーム色を背景にし、元画像の白背景も共通色になじませる。デート画面は行き先ごとの専用背景と物語と同じサイズの立ち絵を使う。
- スタッフ一覧、人物詳細、街のお店詳細も、街・人物一覧と同じ人物別の中心補正を使う。全身立ち絵ではなく顔中心の丸い画像に揃え、詳細画面では同じ切り抜きを大きく表示する。
- 画像がある人物では代替文字を重ねず、街のお店画面を含めて画像の背後に文字を表示しない。画像がない場合、読込に失敗した場合、未遭遇の場合だけ代替文字を表示する。
- 黒豆 蓮の立ち絵：\`/assets/characters/ren.png\`
- 灰島 静の立ち絵：\`/assets/characters/shizuka.png\`
- アール・グレイの立ち絵：\`/assets/characters/earl-grey.png\`
- 白川 牧の立ち絵：\`/assets/characters/shirakawa-maki.png\`
- 麦野 太陽の立ち絵：\`/assets/characters/mugino-taiyo.png\`
- 凍堂 冴の立ち絵：\`/assets/characters/toudou-sae.png\`
- カカオの店頭・人物画像：\`/assets/characters/cacao.png\`、物語・デート用の初期立ち絵：\`/assets/characters/cacao-story.png\`
- ギフトの選択画面は、人物ページのスクロール位置にかかわらずゲーム画面中央へ表示する。
- 渡したことのあるギフトだけを、人物ごとに「大好物／好き／ふつう／苦手」へ記録する。未確認の好みは「未発見」とし、記録はセーブに保存する。

## 12. スタッフ

- 蓮は好感度${GAME_CONFIG.renHireStage}以上・${GAME_CONFIG.renHirePrice.toLocaleString("ja-JP")}コイン、ほかの人物は好感度${GAME_CONFIG.staffHireStage}以上・${GAME_CONFIG.hirePrice.toLocaleString("ja-JP")}コインで初回雇用できる。
- 担当は「調理」「提供」「仕入れ」「お休み」。店内の調理・提供は合わせて最大${GAME_CONFIG.maxFloorStaff}人、仕入れは最大${GAME_CONFIG.maxProcurementStaff}人。担当変更時は進行中の仕事を完了してから切り替える。
- 好感度8以上で本人の得意料理は20%短縮、提供時間は${GAME_CONFIG.serveMs / 1000}秒から${GAME_CONFIG.serveMs * 0.8 / 1000}秒に短縮される。
- 提供担当は提供時間の進行に合わせ、カウンターから中央の通路を通って客席までゆっくり移動する。提供後も同じ通路・同じ所要時間でカウンターへ戻り、帰着してから次の仕事を始める。
- 仕入れ担当は店内に表示せず、注文ノートから不足食材の仕入れを頼める。店内では進行中の仕入れを1件ずつ「仕入れ：0:20」「カカオ：0:20」のように短く表示し、背景幅も文章量に合わせる。店長分を必ず先頭にし、食材名と詳細は注文ノートに表示する。
- 店長と各仕入れ担当は、それぞれ同時に1件ずつ仕入れへ出られる。「仕入れを頼む」では待機中の仕入れ担当をランダムに選ぶ。担当を4人にすれば最大4人が並行し、店長も別に仕入れられる。
- 仕入れ担当の好感度9で、注文に足りない食材を1パックずつ自動で仕入れる。複数の対象者は並行して動き、在庫量だけを見た自動補充は行わない。

## 13. セーブと互換性

- 保存キー：\`${GAME_CONFIG.saveKey}\`
- 現在の保存形式：v${GAME_CONFIG.saveVersion}
- 旧セーブのコイン、食材、人物進行、解放料理、設備、ギフト、調理進行を引き継ぐ。
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
rmSync(missionRuntimeRoot, { recursive: true, force: true });
console.log(`Updated ${outputPath}`);
