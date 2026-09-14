import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
- 黒豆 蓮の日常会話は好感度0〜10に応じて挨拶を変え、来店回数で同段階の台詞を切り替える。恋愛／友情の選択後は専用の挨拶を使う。手動で蓮の店の食材を発注し、入荷待ちの間は準備中の返事を表示する。
- 蓮のギフト返答は初期／親密／恋愛／友情の距離と4種の好み判定に応じて変わる。累計ギフト回数で返事を切り替え、本・手帳・しおり・道具・食品などは品物別の一言を添える。好みや交流ポイントの判定は従来と同じ。
- スタッフページの蓮は未雇用／担当／仕事中／担当変更待ちに応じて短い返事を表示する。未遭遇なら台詞は出さない。日常会話は新たな行動回数・報酬・セーブ項目を追加しない。
- 黒豆 蓮の本編は、豆袋のメモ、ふたつのカップ、取っ手を揃える照れを繰り返し、仕事相手への信頼から個人的な好意へ進む会話シーンで構成する。好感度4は「カウンターのこちら側」で、短い手伝いと休憩から雇用の相談につながる。
- 白川 牧の本編10話は、動物の扱いへの信頼、木陰の昼休み、名前の呼び方、プリンの試作、カフェの客席で待つ時間を積み重ねる。袖口を握る迷いと、うれしい時の早口を繰り返し、自分の休みと希望を相談できる関係から恋心へ進む。既存のイベントID、解放条件、報酬、選択肢ID、恋愛／友情分岐は維持する。
- 牧の日常会話も好感度0〜10・来店回数・恋愛／友情に応じて切り替え、ギフトは初期／親密／恋愛／友情の距離と4種の好み、累計ギフト回数で返事を変える。動物・植物・食品・衣類などの品物別の一言を添え、苦手でも選んでくれたことへの感謝を伝える。初回4種の立ち絵ポップアップにも、この返事を表示する。
- 牧の店づくり5話とデート3本も会話を増補。手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩に応じた短い会話を表示する。追加のお手伝い話は好感度${GAME_CONFIG.staffHireStage}以上で実際に雇用した時に開始し、牧場と相談した時間で働き、約束した時間に交代する。
- 三ツ葉 葵の本編10話は、食材の味を選ぶ信頼、規格外野菜の試作メモ、にんじんの絵、収穫の判断、器の買い出し、隣で調理する距離を繰り返す。照れると鼻の下を指でこする癖と、冗談を止めて相手の返事を待つ変化を通じて恋心を描く。研修は祖父母と仕事を分担して自分で応募し、離れている間の連絡と再会を物語内で扱う。既存のイベントID、好感度条件、報酬、選択肢ID、恋愛／友情分岐を維持する。
- 葵の日常会話は好感度0〜10・来店回数・恋愛／友情に合わせて変える。ギフトは初期／親密／恋愛／友情の関係と4種の好み、累計ギフト回数に合わせ、食品・植物・道具・衣類などの一言を添える。苦手でも正直な好みと感謝を伝え、4種の初回立ち絵ポップアップにも同じ返事を表示する。
- 葵の店づくり5話とデート3本も会話を増補し、手動発注の入荷待ちとスタッフの担当・仕事中・担当変更待ち・休憩に短い返事を表示する。お手伝いの追加話は好感度${GAME_CONFIG.staffHireStage}以上かつ雇用後に開始し、農園と相談した持ち場の確認、エプロンの結び直し、二人の休憩を描く。研修によるスタッフの使用停止や実時間の待機は追加しない。
- アール・グレイは英国帰りで日本と英国にルーツを持つハーフのパティシエ。爽やかな王子様のように上品で物腰が柔らかく、レディファーストが自然に出る。「僕」と柔らかな敬語で話し、好きな相手と会う口実や隣の席をさりげなく用意する少し策士な一面を持つ。旧来の失敗で自分の価値を失う完璧主義・否定された修業の設定は、この帰国後のもてなしと本音の物語へ変更する。
- 本編10話は、青いリボンの味見の箱、袖をまくった職人の手、紙袋の菓子を分ける午後、こもれびに合う甘さ、隣へ座る口実を積み重ねる。上手に迎えられない日も会いたいと言われ、自分の希望を飾らず話す恋へ進む。本編の題名と台本は新設定に変更し、イベントID・好感度条件・選択肢ID・報酬・恋愛／友情分岐は維持する。
- アールの日常会話は好感度0〜10・来店回数・恋愛／友情で切り替える。ギフトは初期／親密／恋愛／友情の距離と4種の好み・累計ギフト回数に応じ、品物別の一言を添える。4種の初回立ち絵ポップアップにはその時の返事を表示する。店づくり5話・デート3本、手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩も新しい口調にする。お手伝い話は好感度${GAME_CONFIG.staffHireStage}以上かつ実際の雇用後に開始する。
- カカオは一人称「僕」の俺様系として、問いかけて遠慮するより「こっちへ」「君は僕の隣」「君を選んだのは僕」「僕を選んだこと、後悔させない」と強く言い切り、試作・席・外出を主導する。本編10話、選択肢の返事、お手伝い話、店づくり5話、デート3本と挨拶へ反映する。普段の自信と余裕を保ち、照れは親密な相手に不意を突かれた時に漏らす。経営上の条件・報酬・選択肢ID・ルート・初回ギフト4種の保存挙動は変更しない。
- カカオ・ショコラの本編10話は、三粒の率直な試食、感想のメモ、ニブのクッキー、ガラスに映る二人、君が選ぶ甘さ、温度計を預ける手の近さを重ねる。挑発に返せる掛け合いと、褒められて崩れる余裕を描き、失敗と途中の記録も見せて、仕事の用がなくても会いたい恋へ進む。既存のID・題名・好感度条件・選択肢ID・報酬・恋愛／友情分岐を維持する。
- カカオの日常会話は好感度0〜10・訪問回数・恋愛／友情で切り替える。贈り物は初期／親密／恋愛／友情と4種の好み・累計ギフト回数に合わせ、菓子・茶葉・道具・衣類・飾りなど品物別の言葉を添える。苦手な無骨な道具や生地、香ばしい菓子にも、好みと感謝を分けて伝える。各初回4種のポップアップに、その時点の返事と物語用立ち絵を表示する。
- カカオの店づくり5話・デート3本、手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩にも同じ口調を用意する。お手伝い話は好感度${GAME_CONFIG.staffHireStage}以上かつ実際に雇用後に開始し、自分の店と両立する時間、主人公に教わるカフェの手順、同じ側の近さと仕事の報告、二人の休憩を描く。友情ルートは専用台本で互いの仕事を任せる信頼を続ける。
- 凍堂 冴の本編10話は、寒くない受付への案内、前の相談を覚えた温度計のメモ、ベリーの待ち時間と見える笑顔、黙って飲むカップ、失敗を見せる試作、二人分のアイスサンドを重ねる。人に期待される怖さを抱えながら、記録の照合を頼み、仕事の用がなくても会いに来て、同じ食卓と恋人としての時間を選ぶ。既存のID・題名・好感度条件・選択肢ID・報酬・恋愛／友情分岐を維持する。
- 冴の日常会話は好感度0〜10・訪問回数・恋愛／友情で切り替える。贈り物は初期／親密／恋愛／友情と4種の好み・累計ギフト回数に合わせ、手袋・マフラー・カップ・道具・食品など品物別の言葉を添える。苦手な目立つ飾りや強い香りにも、好みと感謝を分けて伝える。各初回4種の立ち絵ポップアップに、その時点の返事を保存して表示する。
- 冴の店づくり5話・デート3本、手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩にも同じ口調の会話を用意する。お手伝い話は好感度${GAME_CONFIG.staffHireStage}以上かつ実際に雇用後に開始し、倉庫と両立する持ち場、上着とカップの置き場所、声をかけ合う仕事と一緒の休憩を描く。友情ルートには専用台本がある。
- 灰島 静の本編10話は、鉢の新芽としおれた葉の報告、雨の日の温室、好きな色の花、押し花帳の空白、窓辺で隣に座る時間を重ねる。植物へ向けた視線が主人公へ移り、役立つ納品から会いたい気持ちへ進む。祖母の記憶を残して温室を修繕し、「また今度」から具体的な約束へ変わる。既存ID・題名・好感度条件・選択肢ID・報酬・恋愛／友情分岐は維持する。
- 静の日常会話は好感度0〜10・訪問回数・恋愛／友情で切り替える。ギフトは初期／親密／恋愛／友情と4種の好み・累計ギフト回数に合わせ、花・植物・お茶・香り・道具など品物別の言葉を添える。苦手な強い輝きも、正直な好みと感謝を伝える。各初回の4種の立ち絵ポップアップには、その時点の関係に合う返事を表示する。
- 静の店づくり5話・デート3本、手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩も同じ口調に揃える。お手伝い話は好感度${GAME_CONFIG.staffHireStage}以上かつ実際に雇用後に開始し、花店の予定と相談した持ち場、同じカウンターでの近さ、仕事の報告と二人の休憩を描く。友情ルートには専用の台本を用意する。
- 麦野 太陽の本編10話は、朝の配達、パンの販売記録、閉店後のサンドイッチの試作、何年分もの練習ノート、袖を下ろして客席で休む素顔を積み重ねる。来ない朝の寂しさ、役に立つ用がなくても会いたい気持ち、頼み合う試作から恋心へ進む。既存のイベントID・題名・好感度条件・選択肢ID・報酬・恋愛／友情分岐は維持する。
- 太陽の日常会話は好感度0〜10・来店回数・恋愛／友情に合わせて切り替える。ギフトは初期／親密／恋愛／友情と4種の好み・累計ギフト回数で返事を変え、食品・衣類・手作り品・道具などの一言を添える。苦手な香りも、正直な好みと感謝を両方伝える。初回4種の立ち絵ポップアップには、その時点の距離での返事を表示する。
- 太陽の店づくり5話・デート3本、手動発注の入荷待ち、スタッフの担当・仕事中・担当変更待ち・休憩にも同じ口調の会話を用意する。お手伝い話は好感度${GAME_CONFIG.staffHireStage}以上で実際に雇用すると開始し、パン屋と相談した持ち場の確認、近くで働く緊張、交代と二人の休憩を描く。
- カフェを手伝う追加話は${staffStoryEvents.length}件。${list(staffStoryEvents.map(event=>`${characters.find(character=>character.id===event.characterId)?.name}「${event.title}」は好感度${event.requiredRelationshipStage}以上かつ雇用後に自動開始する`))}。既存の高段階セーブでも未読なら開始し、好感度・ルート・資金・食材・報酬は変更しない。既読状態は人物のviewedEventsへ保存し、人物ページの「カフェを手伝う物語」から読み返せる。友情ルートでは専用の台本を表示する。
- 店づくりの物語は各1人5段階。第1話は仕入れ手順の改善で、担当仕入れ先の1パックを${GAME_CONFIG.ingredientPackSize}食分から${GAME_CONFIG.improvedPackSize}食分へ増やす。以降は食材・料理・設備を解放する。
- デートは好感度${GAME_CONFIG.dateUnlockStage}で解放。各キャラクターに${list(dateLocations.map(location=>location.title))}の3本がある。お家デートは穏やかな会話のみで、性的表現は扱わない。
- 恋愛ルートと友情ルートで、料理や設備の報酬に差はつけない。
- 人物一覧は街と同じ仕入れ先の順序を使用する。表示順は${list(suppliers.map(supplier=>characters.find(character=>character.id===supplier.characterId)?.name))}。未遭遇の人物も同じ位置を保つ。
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
- プレゼントの「大好物／好き／ふつう／苦手」は各キャラクターにつき初回の1回だけ、物語と同じ立ち絵と返事をポップアップで表示する。同じ好みなら別のプレゼントでも2回目以降は人物ページの通常の返事だけになる。
- ポップアップを閉じると人物のviewedGiftReactionsに種類を保存する。旧セーブでは空の履歴から始めるため、追加後に4種類をそれぞれ見られる。表示待ちはpendingGiftReactionに保存し、途中再読込でも贈物や交流ポイントを再付与せずリアクションを再開する。
- リアクション中は追加の贈物と好感度／店づくりの物語の開始を待ち、閉じた後に進む。立ち絵は物語用画像を優先し、画像がない場合や読込失敗時は人物名を代わりに表示する。
- ギフトの選択画面は、人物ページのスクロール位置にかかわらずゲーム画面中央へ表示する。
- 渡したことのあるギフトだけを、人物ごとに「大好物／好き／ふつう／苦手」へ記録する。未確認の好みは「未発見」とし、記録はセーブに保存する。

## 12. スタッフ

- スタッフ一覧は街・人物一覧と同じ仕入れ先の順序を使用する。未遭遇・未雇用・担当にかかわらず同じ位置を保つ。
- スタッフ画面は担当別の人数表示と人物別カードを表示する。「スタッフ仕入れ」の説明パネルは表示しない。
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
const { FOREST_CONFIG, FOREST_COIN_BANDS, forestAreas, forestIngredients, forestRecipes, handmadeGifts } = missionRequire(join(missionRuntimeRoot, "data", "forest.js"));
const forestNames = Object.fromEntries([...ingredients,...forestIngredients].map(i=>[i.id,i.name]));
const forestSection = `
## 16. こもれびの森（実装済み）

- 最初の料理を1皿提供すると、街の森入口から出かけられる。カフェの背景は変えない。入口の帰還後メッセージ「森のおみやげを持ち帰りました」は表示せず、出発と持ち帰り履歴の操作を表示する。
- 体力は初期・最大${FOREST_CONFIG.maxEnergy}。実時間${FOREST_CONFIG.recoveryMs/1000}秒で1回復し、閉じている間も回復。端数を保持し、満タン中の時間を貯めない。帰還や再入場でリセットしない。
- 入口から広場へ1、広場から分かれ道へ1。分かれ道から川辺へ1／木立へ2。川辺から池へ1、池／木立から根元へ2、根元から石畳へ2、石畳から泉へ2。石畳・泉は持ち帰り${FOREST_CONFIG.deepReturns}回と提供${FOREST_CONFIG.deepOrders}皿で解放。
- 探索はスマホ全画面の絵本風の森。広場・川辺・泉の背景を使い、風景の中の分け合い箱・茂み・きのこをタップして採集方法を選ぶ。従来のカード式地図や全地点の文字列一覧は表示しない。
- 各採取地に3か所。採取2、丁寧な採取3。探索ごとに位置を変更。場所ごとの結果は探索ID・種・地点・方法で固定し、再読込で再抽選しない。
- 普通の食材を必ず1個。そのほかに下表の確率で限定食材1個。既に解放済みの物語限定食材があれば追加枠の25%をその食材、75%を森の食材に割り当てる。初回の採取はパン1個。
- 石畳・泉の採取を合わせて4回目までに琥珀花蜜／月しずくベリーが出なければ、4回目の追加枠を保証。下表の通常確率とは別の救済。
- コインを拾う確率は各採取で独立に${FOREST_CONFIG.coinChance*100}%。拾えたときの金額は${FOREST_CONFIG.coinMin}〜${FOREST_CONFIG.coinMax}の整数で、高額ほど出にくい重み付き抽選。${FOREST_COIN_BANDS.map(b => `${b.min}〜${b.max}は${b.weight}%`).join('、')}。300〜1000が${FOREST_COIN_BANDS.filter(b => b.max <= 1000).reduce((sum, b) => sum + b.weight, 0)}%を占め、各区間内は一様抽選。複数回分を合算。既に保留・持ち帰り済みのコイン額は変更しない。
- 調達券は採取1回ごとに独立して${FOREST_CONFIG.ticketChance*100}%の確率で1枚発見。採取回数に応じて複数枚出る場合も、0枚の場合もある。通常・丁寧、場所、最初／2回目以降で確率は同じ。探索単位の保証はなし。切れ端だけ拾って帰る場合は出ない。抽選結果は探索の種と採取地点で固定し、再読込・方法変更で再抽選しない。
- かご初期10枠、持ち帰り3回で12、秘密レシピ2種類完成で14、4種類完成で16。普通食材・森の基本食材は1枠、物語限定食材・琥珀花蜜・月しずくベリーは2枠。コイン・券・切れ端は0枠。
- 場所名、体力ゲージと回復秒数、かごの空きを上部に固定。下部に店へ帰る・かご・手帳を配置。次の行き先は森の道標で選び、必要体力と解放条件を短く表示。採集済みは目印を消してチェックを付ける。
- 採集方法、成果、かごの中、切れ端、帰還成果は下から開くパネル。操作ボタンは44px以上、対象はスマホ幅でも100px程度。短い移動・開閉・発見の動きは動きを減らす設定を尊重。
- 満杯なら保留した採取結果を保存し、既存の持ち物を1個ずつ置いて入れるか、新しい食材を置く。採取の体力は返却しない。帰還は無料で体力0でも可能。受け取りで在庫・コイン・券・切れ端を一括加算し、カフェへ戻る。二重受取できない。
- 森の食材で通常レシピの在庫条件を満たせば解放。仕入れ数・好感度は加算しない。
- 調達券は街の仕入れ先の各食材の調達中表示、またはカフェの在庫画面から使える。仕入れ先には所持枚数を表示し、発注直後に「調達券で即完了」を押せる。ゲーム画面内に収まる確認ポップアップで食材名・全パック数・残り時間・所持券数を表示し、「やめる」または「1枚使って受け取る」を選ぶ。ブラウザの外側に出る確認ダイアログは使わない。1枚を消費し、選んだ入荷1件の全パックを即受取。スタッフの調達にも使える。自然到着・消失済みの入荷には消費しない。通常の入荷統計・レシピ解放処理を再利用。
- 切れ端は探索1回で1枚、各レシピ3枚で永久解放。池は香草ティー、根元はくるみクッキー、泉は花蜜ミルク／月しずくパンケーキの進捗が少ない方（同数ならミルク）。重複なし。
- 森の手帳は「食材」「秘密のレシピ」「限定料理」「手作り」の4ページ。食材の発見、所在、在庫、切れ端進捗、作成済みギフトを表示。
- 探索中も営業・仕入れ・スタッフ作業は続行。完成皿・入荷待ちを小さく表示。探索中の自動仕入れなどの通知バルーンは隠し、採集・道標・状態表示を遮らない。新しい自動物語は帰還受取まで保留。下部ナビは帰還を経由。
- 探索・体力・保留結果・かご・切れ端・券・販売用素材・ギフト履歴をセーブ。既存セーブは体力満タンで森を追加。

### 採取地ごとの食材

| 地点 | 通常の追加率 | 丁寧な追加率 | 普通食材の重み | 森食材の重み |
|---|---:|---:|---|---|
${forestAreas.filter(a=>a.rate).map(a=>`| ${a.name} | ${a.rate}% | ${a.rate+5}% | ${Object.entries(a.normal).map(([id,n])=>forestNames[id]+':'+n).join('、')} | ${Object.entries(a.bonus).map(([id,n])=>forestNames[id]+':'+n).join('、')} |`).join('\n')}

### 限定料理 ${forestRecipes.length}種類

普通の自動注文抽選には入らない。手帳で1〜3皿の素材を先に確保して販売開始。同時に2種類まで、各料理の未提供合計3皿まで。空席ができると通常注文と交互に入る。調理時に二重消費しない。注文前の販売待ちは取消で素材を返却し、注文済みを断ると販売待ちへ戻す。調理開始後の返却はしない。売上は通常の熟練度補正（最大20%）を適用。リクエスト25%上乗せは付けない。

| 料理 | 基本売上 | 基本調理秒 | 素材（各1個） | 解放 |
|---|---:|---:|---|---|
${forestRecipes.map(r=>`| ${r.icon} ${r.name} | ${Math.round(r.price*GAME_CONFIG.saleMultiplier)} | ${r.cookingSeconds} | ${r.requiredIngredients.map(id=>forestNames[id]).join('、')} | ${r.hidden?'切れ端3枚':'最初の提供'} |`).join('\n')}

### 手作りギフト ${handmadeGifts.length}種類

包装代は100コイン、設備不要・即時作成。好感度は大好き8／好き5／普通2／苦手−4、レア度倍率なし。その住人に初めて贈った好き以上の種類のみ+2。手作りの同じギフトを同じ住人へ3回以上連続で渡すと正の基本値を半分（切上げ）。購入ギフトを含む別種類を渡すと連続回数がリセット。購入ギフト自体には減衰を付けない。既知の反応なら今回の増減をプレビュー。贈呈回数は通常の関係進行条件にも加算。

| ギフト | 素材 | 大好きな住人 |
|---|---|---|
${handmadeGifts.map(g=>`| ${g.icon} ${g.name} | ${Object.entries(g.materials).map(([id,n])=>forestNames[id]+' ×'+n).join('、')} | ${g.lovedBy.map(id=>characters.find(c=>c.id===id)?.name).join('、')} |`).join('\n')}

通常のカタログに加えて、森食材${forestIngredients.length}種類・限定料理${forestRecipes.length}種類・手作りギフト${handmadeGifts.length}種類を収録。通常の店売り食材、雑貨店の抽選、物語の解放経路は従来のデータを使用する。
`;
writeFileSync(outputPath, spec + forestSection, "utf8");
rmSync(missionRuntimeRoot, { recursive: true, force: true });
console.log(`Updated ${outputPath}`);
