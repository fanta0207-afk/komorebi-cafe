import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const output = mkdtempSync(join(tmpdir(), 'komorebi-scene-test-'));
after(() => rmSync(output, { recursive: true, force: true }));
writeFileSync(join(output, 'package.json'), JSON.stringify({ type: 'commonjs' }));
symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(output, 'node_modules'), 'dir');
for (const folder of ['data', 'game', 'components', 'components/cafe', 'screens']) {
  mkdirSync(join(output, folder), { recursive: true });
  const source = new URL(`../src/${folder}/`, import.meta.url);
  for (const file of readdirSync(source).filter(name => /\.tsx?$/.test(name))) {
    const compiled = ts.transpileModule(readFileSync(new URL(file, source), 'utf8').replace(/^import ["'][^"']+\.css["'];?$/gm, ''), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    writeFileSync(join(output, folder, file.replace(/\.tsx?$/, '.js')), compiled);
  }
}
const require = createRequire(import.meta.url);
const { makeVisit, reconcileVisits, visitPhase, VISIT_TIMING, cafeAsset, TABLE_POSITIONS } = require(join(output, 'components/cafe/sceneModel.js'));
const { CafeScene } = require(join(output, 'components/cafe/CafeScene.js'));
const { CafeAsset } = require(join(output, 'components/cafe/CafeAsset.js'));
const { createInitialState, reducer, migrateSavedState } = require(join(output, 'game/state.js'));
// Explicit stocked fixture for movement/rendering tests, independent of new-game supplies.
const stockedCafe=()=>{const state=createInitialState();const ids=['coffeeCounter','toastGrill','prepTable'];return {...state,tableCount:4,ingredients:{coffeeBeans:10,bread:10},ownedEquipment:ids,stations:ids.map(id=>({id:`${id}-1`,equipmentId:id,level:1}))};};
const { equipment } = require(join(output, 'data/equipment.js'));
const { decorations } = require(join(output, 'data/decorations.js'));
const { characters } = require(join(output, 'data/characters.js'));
const order = (id = 'one', slot = 0, status = 'queued') => ({ id, customerSlot: slot, recipeId: 'coffee', status, totalMs: 10000, remainingMs: status === 'ready' ? 0 : 5000 });

test('the supplied Ren artwork is used for full portraits and face selectors',()=>{
  const ren=characters.find(character=>character.id==='ren');
  assert.equal(ren.image,'/assets/characters/ren.png');
  const png=readFileSync(new URL('../public/assets/characters/ren.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('the supplied Shizuka artwork is used for full portraits and face selectors',()=>{
  const shizuka=characters.find(character=>character.id==='nagisa');
  assert.equal(shizuka.image,'/assets/characters/shizuka.png');
  const png=readFileSync(new URL('../public/assets/characters/shizuka.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('the supplied Earl Grey artwork is used for full portraits and face selectors',()=>{
  const earlGrey=characters.find(character=>character.id==='itsuki');
  assert.equal(earlGrey.image,'/assets/characters/earl-grey.png');
  const png=readFileSync(new URL('../public/assets/characters/earl-grey.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('the supplied Shirakawa Maki artwork is used for full portraits and face selectors',()=>{
  const maki=characters.find(character=>character.id==='sota');
  assert.equal(maki.image,'/assets/characters/shirakawa-maki.png');
  const png=readFileSync(new URL('../public/assets/characters/shirakawa-maki.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('the supplied Mugino Taiyo artwork is used for full portraits and face selectors',()=>{
  const taiyo=characters.find(character=>character.id==='haru');
  assert.equal(taiyo.image,'/assets/characters/mugino-taiyo.png');
  assert.equal(taiyo.silhouette,'太');
  const png=readFileSync(new URL('../public/assets/characters/mugino-taiyo.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('the supplied Toudou Sae artwork is used for full portraits and face selectors',()=>{
  const sae=characters.find(character=>character.id==='sae');
  assert.equal(sae.image,'/assets/characters/toudou-sae.png');
  const png=readFileSync(new URL('../public/assets/characters/toudou-sae.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
});

test('Cacao keeps the watercolor storefront art and uses the supplied original for stories',()=>{
  const cacao=characters.find(character=>character.id==='cacao');
  assert.equal(cacao.image,'/assets/characters/cacao.png');
  assert.equal(cacao.storyImage,'/assets/characters/cacao-story.png');
  assert.equal(cacao.supplierId,'chocolaterie');
  const png=readFileSync(new URL('../public/assets/characters/cacao.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),512);
  assert.equal(png.readUInt32BE(20),812);
  const storyPng=readFileSync(new URL('../public/assets/characters/cacao-story.png',import.meta.url));
  assert.deepEqual([...storyPng.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(storyPng.readUInt32BE(16),1024);
  assert.equal(storyPng.readUInt32BE(20),1536);
});

test('cafe staff and manager use separate transparent chibi sprites instead of full portraits',()=>{
  for(const id of [...characters.map(character=>character.id),'manager']){
    const asset=`/assets/cafe/characters/${id}.png`;
    assert.equal(cafeAsset.character(id),asset);
    const png=readFileSync(new URL(`../public${asset}`,import.meta.url));
    assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16),512);
    assert.equal(png.readUInt32BE(20),768);
    assert.equal(png[25],6);
  }
  const state={...stockedCafe(),staff:[{characterId:'ren',role:'cook',remainingMs:0}]};
  const html=renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
  assert.match(html,/src="\/assets\/cafe\/characters\/ren\.png"/);
  assert.match(html,/src="\/assets\/cafe\/characters\/manager\.png"/);
  assert.doesNotMatch(html,/src="\/assets\/characters\/ren\.png"/);
  const css=readFileSync(new URL('../src/components/cafe/cafe-scene.css',import.meta.url),'utf8');
  assert.match(css,/\.scene-guest \{[^}]*width:14%; height:19cqw;/);
  assert.match(css,/\.scene-staff \{[^}]*width:14%; height:19cqw;/);
  assert.match(css,/\.scene-manager \{[^}]*width:14%; height:19cqw;/);
  const globals=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(globals,/\.photo-cafe \.scene-guest \{ width:13%; height:22\.35cqw; \}/);
  assert.match(globals,/\.photo-cafe \.scene-manager,\s*\.photo-cafe \.scene-staff \{ width:16%; height:27\.5cqw; \}/);
});

test('the supplied coffee machine is used in idle, cooking and ready states without changing equipment',()=>{
  const asset='/assets/cafe/equipment/coffeeCounter.png?v=dc73b59a';
  assert.equal(cafeAsset.equipment('coffeeCounter'),asset);
  const png=readFileSync(new URL('../public/assets/cafe/equipment/coffeeCounter.png',import.meta.url));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),1254);assert.equal(png.readUInt32BE(20),1254);
  for(const status of ['idle','cooking','ready']){
    const state=createInitialState();
    if(status!=='idle')state.orders=[{...order('coffee',0,status),stationId:'coffeeCounter-1'}];
    const before=JSON.stringify(state);
    const html=renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
    assert.ok(html.includes(`src="${asset}"`));
    assert.match(html,new RegExp(`data-equipment="coffeeCounter" data-equipment-status="${status}"`));
    assert.equal(JSON.stringify(state),before);
  }
});

test('the room renders exactly the purchased table sets and all six guests remain addressable',()=>{
  for(let tableCount=1;tableCount<=6;tableCount++){
    const state={...createInitialState(),tableCount,orders:Array.from({length:tableCount},(_,slot)=>order(`seat-${slot}`,slot))};
    const html=renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
    assert.equal((html.match(/data-table="/g)||[]).length,tableCount);
    assert.equal((html.match(/class="scene-order /g)||[]).length,tableCount);
    assert.doesNotMatch(html,/NaN|undefined%/);
  }
  assert.deepEqual(TABLE_POSITIONS.slice(2),[{x:29,y:64},{x:71,y:64},{x:29,y:76},{x:71,y:76}]);
  const css=readFileSync(new URL('../src/components/cafe/cafe-scene.css',import.meta.url),'utf8');
  assert.match(css,/\.room-table:nth-child\(n\+5\) \{ width:27%; height:14%; \}/);
});

test('seating purchase card shows mission gates, prices and the maximum',()=>{
  const context=require(join(output,'game/GameContext.js')),original=context.useGame;
  const {MenuScreen}=require(join(output,'screens/MenuScreen.js'));
  let state=createInitialState();
  const render=()=>renderToStaticMarkup(React.createElement(MenuScreen,{tab:'equipment',onTabChange(){}}));
  context.useGame=()=>({state,dispatch(){}});
  try{
    assert.match(render(),/コーヒー豆を1パック受け取る/);assert.match(render(),/ミッションで解放.*100/);
    state={...state,currency:100,missions:{...state.missions,completed:['beans-arrive']}};
    assert.match(render(),/class="secondary-button add-station">増設する/);
    state={...state,tableCount:6};assert.match(render(),/最大6セット/);
    assert.doesNotMatch(render(),/増設する/);
  }finally{context.useGame=original;}
});

test('the actual new-game scene shows only the coffee machine and reveals other basic stations on purchase',()=>{
  const state=createInitialState();
  const render=state=>renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
  const initial=render(state);
  assert.match(initial,/data-equipment="coffeeCounter"/);
  assert.doesNotMatch(initial,/data-equipment="toastGrill"|data-equipment="prepTable"/);
  const purchased=reducer({...state,currency:1000},{type:'BUY_EQUIPMENT',equipmentId:'toastGrill'});
  assert.match(render(purchased),/data-equipment="toastGrill" data-equipment-status="idle"/);
  assert.doesNotMatch(render(purchased),/data-equipment="prepTable"/);
});

test('procurement workers stay outside while cooking and serving workers remain in the cafe',()=>{
  const state={...stockedCafe(),staff:[
    {characterId:'ren',role:'cook',remainingMs:0},
    {characterId:'cacao',role:'procurement',remainingMs:0},
  ]};
  const html=renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
  assert.match(html,/\/assets\/cafe\/characters\/ren\.png/);
  assert.doesNotMatch(html,/\/assets\/cafe\/characters\/cacao\.png/);
});

test('screens keep playable controls while removing decorative and repeated copy', () => {
  const context = require(join(output, 'game/GameContext.js'));
  const original = context.useGame;
  const state = stockedCafe();
  const saved = JSON.stringify(state);
  context.useGame = () => ({ state, dispatch() {}, refreshGiftShop() {} });
  const render = (module, component, props = {}) => renderToStaticMarkup(React.createElement(require(join(output, module))[component], props));
  try {
    const equipment = render('screens/MenuScreen.js', 'MenuScreen', { onTabChange() {} });
    const recipes = render('screens/MenuScreen.js', 'MenuScreen', { tab: 'recipes', onTabChange() {} });
    const staff = render('screens/StaffScreen.js', 'StaffScreen');
    const people = render('screens/PeopleScreen.js', 'PeopleScreen', { onOpen() {} });
    const profile = render('screens/PeopleScreen.js', 'CharacterDetail', { characterId: 'ren', onBack() {}, onReplay() {} });
    const town = render('screens/TownScreen.js', 'TownScreen', { onOpen() {} });
    const gifts = render('screens/GiftShopScreen.js', 'GiftShopScreen');
    const { suppliers } = require(join(output, 'data/suppliers.js'));
    const supplier = render('screens/SupplierScreen.js', 'SupplierScreen', { supplierId: suppliers[0].id, onBack() {} });
    const highlightedSupplier = render('screens/SupplierScreen.js', 'SupplierScreen', { supplierId: suppliers[0].id, highlightIngredientId: 'coffeeBeans', onBack() {} });
    const inventory = render('components/cafe/InventoryModal.js', 'InventoryModal', { state, onClose() {}, onTown() {} });
    const suppliedPortrait = render('components/GameUI.js', 'Portrait', { character: characters[0] });
    assert.match(people,/portrait-small portrait-face/);
    assert.match(town,/portrait-small portrait-face/);
    assert.match(staff,/portrait-small portrait-face/);
    assert.match(profile,/portrait-face/);
    assert.match(supplier,/portrait-face/);
    for (const html of [equipment, recipes, staff, people, profile, town, gifts, supplier, inventory]) {
      assert.doesNotMatch(html, /class="(?:intro-copy|investment-note|staff-guide|procurement-guide|procurement-bond|notebook-intro)"/);
      assert.doesNotMatch(html, /売上を貯めて、お店に投資|調理担当 \+ 提供担当で、自動営業へ|<summary>話し方<\/summary>/);
    }
    assert.match(equipment, /設備と料理/);
    assert.match(equipment, /強化 ●/);
    assert.doesNotMatch(equipment, /CAFE GROWTH|STORY LOCKED/);
    assert.match(recipes, /食材代/);
    assert.match(recipes, /利益/);
    assert.doesNotMatch(recipes, /SECRET RECIPE|STORY RECIPE|1品につき各1食分|必要な設備を購入すると販売できます/);
    assert.match(staff, /好感度4で雇用できます/);
    assert.match(staff, /好感度7で雇用できます/);
    assert.match(staff, /仕入れをお願いする/);
    assert.match(staff, /調理をお願いする/);
    assert.match(staff, /初回/);
    assert.match(gifts,/gift-rarity-common/);
    assert.match(gifts,/gift-rarity-rare/);
    assert.doesNotMatch(gifts,/ギフトのレアリティ|好感度効果|ノーマル|最高レア|返品/);
    assert.match(staff, /class="screen staff-screen fade-in"/);
    assert.equal((staff.match(/data-staff-state="locked"/g) || []).length, characters.length);
    assert.doesNotMatch(staff, /得意な仕事が上達しました|担当を変更しても、今のお仕事を終えてから移ります/);
    assert.match(profile, /ギフトを渡す/);
    assert.match(profile, /ふたりの物語/);
    assert.match(profile, /ギフトの好み/);
    assert.ok(profile.indexOf('ふたりの物語') < profile.indexOf('ギフトの好み'));
    assert.match(profile, /大好物/);
    assert.match(profile, /好き/);
    assert.match(profile, /ふつう/);
    assert.match(profile, /苦手/);
    assert.doesNotMatch(profile, /共同成長|次の共同開発|調理をお願いする|提供をお願いする/);
    assert.doesNotMatch(profile, new RegExp(`${characters[0].occupation}|${characters[0].nameReading}`));
    assert.doesNotMatch(profile, new RegExp(characters[0].profile));
    state.characterProgress.ren.giftReactions={mug:'love',ribbon:'dislike'};
    const discoveredProfile=render('screens/PeopleScreen.js', 'CharacterDetail', { characterId: 'ren', onBack() {}, onReplay() {} });
    assert.match(discoveredProfile,/2\/106/);
    assert.match(discoveredProfile,/大好物[\s\S]*陶器のマグ/);
    assert.match(discoveredProfile,/苦手[\s\S]*きらきらリボン/);
    state.characterProgress.ren.giftReactions={};
    assert.match(gifts, /品揃えを更新/);
    assert.doesNotMatch(gifts, new RegExp(require(join(output, 'data/gifts.js')).gifts[0].description));
    assert.match(supplier, /1パック = 4食分/);
    assert.ok(supplier.indexOf("食材の仕入れ")<supplier.indexOf("デートに誘う"));
    assert.match(supplier, /入荷まで/);
    assert.doesNotMatch(supplier, /WHOLESALE|所要時間/);
    assert.doesNotMatch(supplier, new RegExp(`${characters[0].occupation}`));
    assert.match(supplier, /class="dialogue-box(?: [^"]*)?"/);
    assert.match(supplier,/\/assets\/characters\/ren\.png/);
    assert.match(highlightedSupplier,/supply-item-highlight/);
    assert.match(highlightedSupplier,/supply-order-button supply-order-highlight/);
    assert.match(highlightedSupplier,/この食材です/);
    assert.match(suppliedPortrait,/data-character="ren"/);
    assert.doesNotMatch(suppliedPortrait,/<span>蓮<\/span>/);
    assert.match(inventory, /食分/);
    assert.doesNotMatch(inventory, /CAFE STOCK|在庫なし/);
    assert.doesNotMatch(town, new RegExp(suppliers[0].description));
    assert.match(readFileSync(new URL('../src/screens/PeopleScreen.tsx',import.meta.url),'utf8'),/createPortal\(<div className="modal-backdrop gift-backdrop"/);
    assert.match(readFileSync(new URL('../app/globals.css',import.meta.url),'utf8'),/\.gift-backdrop\{position:fixed/);
    const gameUi=readFileSync(new URL('../src/components/GameUI.tsx',import.meta.url),'utf8');
    const storyModal=readFileSync(new URL('../src/components/StoryModal.tsx',import.meta.url),'utf8');
    const storyCss=readFileSync(new URL('../src/components/story-modal.css',import.meta.url),'utf8');
    assert.match(gameUi,/data-character=\{character\.id\}/);
    assert.match(storyModal,/className=\{`story-stage[\s\S]*data-character=\{character\.id\}/);
    const globalCss=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
    const cafeGame=readFileSync(new URL('../src/components/CafeGame.tsx',import.meta.url),'utf8');
    const cafeScreen=readFileSync(new URL('../src/screens/CafeScreen.tsx',import.meta.url),'utf8');
    const recipesSource=readFileSync(new URL('../src/data/recipes.ts',import.meta.url),'utf8');
    const missionsSource=readFileSync(new URL('../src/game/missions.ts',import.meta.url),'utf8');
    for(const rarity of ['common','rare','superRare','ultraRare'])assert.match(globalCss,new RegExp(`\\.gift-rarity-${rarity}\\{--rarity:`));
    assert.match(globalCss,/三ツ葉葵を基準に、顔の大きさと中心位置をそろえる/);
    assert.match(globalCss,/\.portrait-face\[data-character="aki"\] \{ --face-scale:2\.35; \}/);
    assert.match(globalCss,/\.portrait-face\[data-character="ren"\] \{ --face-scale:2\.35; \}/);
    assert.match(globalCss,/\.portrait-face\[data-character="sota"\] \{ --face-scale:2\.15; --face-shift-y:5%; \}/);
    assert.match(globalCss,/\.portrait-face\[data-character="itsuki"\] \{ --face-scale:2\.45; --face-shift-y:18%; \}/);
    assert.match(globalCss,/\.portrait-face\[data-character="cacao"\] \{ --face-scale:2\.15; --face-shift-y:2%; \}/);
    assert.match(globalCss,/\.portrait-face img \{[^}]*mix-blend-mode:multiply;/);
    assert.match(globalCss,/\.profile-card>\.person-summary>\.portrait-face,[\s\S]*\.supplier-hero>\.portrait-face \{[^}]*width:96px;[^}]*height:96px;/);
    assert.match(storyCss,/\.story-standing-art \{[\s\S]*height:var\(--story-height\);[\s\S]*object-position:50% 0;/);
    assert.match(storyCss,/三ツ葉葵（デフォルト100%）を基準に、人物の余白込みで頭身をそろえる/);
    assert.match(storyCss,/data-character="sota"\] \{ --story-height:90%; --story-top:5%; \}/);
    assert.match(storyCss,/data-character="ren"\] \{ --story-height:97%; --story-top:1%; \}/);
    assert.match(storyCss,/data-character="itsuki"\] \{ --story-height:91%; --story-top:8%; \}/);
    assert.match(storyCss,/data-character="haru"\] \{ --story-height:95%; --story-top:1%; \}/);
    assert.match(storyCss,/data-character="cacao"\] \{ --story-height:91%; --story-top:5%; \}/);
    assert.match(cafeGame,/className="story-stage is-speaking" data-character=\{character\.id\}/);
    assert.match(cafeGame,/const screenKey=`\$\{screen\}:\$\{supplierId\|\|""\}:\$\{characterId\|\|""\}`;/);
    assert.match(cafeGame,/<div key=\{screenKey\} className="screen-wrap">/);
    assert.match(cafeGame,/const storyImage=character\.storyImage\|\|character\.image/);
    assert.match(cafeGame,/className="story-standing-art" src=\{storyImage\}/);
    assert.match(cafeScreen,/Number\(!!a\.staffId\)-Number\(!!b\.staffId\)/);
    assert.match(cafeScreen,/delivery\.staffId\?deliveryRunner\(delivery\.staffId\):"仕入れ"\}：\{deliveryCountdown/);
    assert.doesNotMatch(cafeScreen,/入荷まで(?:あと)?\{deliveryCountdown/);
    assert.match(globalCss,/\.cafe-delivery-list \{[^}]*justify-items:start;/);
    assert.match(globalCss,/\.cafe-delivery-status \{[^}]*width:max-content;/);
    assert.doesNotMatch(cafeScreen,/・他\$\{state\.deliveries\.length-1\}件/);
    assert.match(globalCss,/\.growth-event-overlay \.story-stage\{[^}]*twilight-cafe-street\.png/);
    assert.doesNotMatch(globalCss,/\.growth-event-overlay \.event-scene\{background:radial-gradient/);
    assert.match(cafeGame,/className="story-modal story-player date-story-player"/);
    assert.match(cafeGame,/className=\{`story-stage is-speaking date-location-\$\{event\.locationId\}`\}/);
    assert.match(globalCss,/\.story-player\.date-story-player \.story-stage\.date-location-amusement\{[^}]*date-amusement-park\.png/);
    assert.match(globalCss,/\.story-player\.date-story-player \.story-stage\.date-location-walk\{[^}]*twilight-cafe-street\.png/);
    assert.match(globalCss,/\.story-player\.date-story-player \.story-stage\.date-location-home\{[^}]*date-home\.png/);
    assert.match(globalCss,/\.story-player\.date-story-player \.story-standing-art \{[^}]*opacity:1;[^}]*mix-blend-mode:normal;/);
    assert.doesNotMatch(globalCss,/\.date-event-overlay/);
    assert.match(storyCss,/--story-height:100%/);
    assert.doesNotMatch(cafeGame,/>店づくりの物語 · \{event\.routeStage\}\/5</);
    assert.match(cafeGame,/className="event-scene story-player growth-story-scene" role="dialog" aria-label=\{`\$\{event\.title\}のイベント`\}/);
   for (const source of [cafeGame, recipesSource, missionsSource]) assert.doesNotMatch(source,/共同成長/);
    assert.equal(JSON.stringify(state), saved);
  } finally {
    context.useGame = original;
  }
});

test('arrivals, seating, enjoying and departure use foreground game time only', () => {
  const queued = order();
  const visits = reconcileVisits([], [], [queued], 500);
  assert.equal(visitPhase(visits[0], 500), 'entering');
  assert.equal(visitPhase(visits[0], 500 + VISIT_TIMING.enter), 'seated');
  const ready = { ...queued, status: 'ready' };
  const served = reconcileVisits(visits, [ready], [], 11000);
  assert.equal(visitPhase(served[0], 11000), 'enjoying');
  // A hidden tab cannot advance a visual phase without advancing activeMs.
  assert.equal(visitPhase(served[0], 11000), 'enjoying');
  assert.equal(visitPhase(served[0], 11000 + VISIT_TIMING.enjoy), 'leaving');
  assert.equal(visitPhase(served[0], 11000 + VISIT_TIMING.enjoy + VISIT_TIMING.leave), undefined);
  assert.equal(reconcileVisits(served, [], [], 20000).length, 0);
});

test('slot reuse has separate identities and never converts an unserved removal into a reward', () => {
  const first = order('first');
  const visit = makeVisit(first, 0);
  assert.equal(reconcileVisits([visit], [first], [], 500).length, 0);
  const ready = { ...first, status: 'ready' };
  const second = order('second');
  const concurrent = reconcileVisits([visit], [ready], [second], 10000);
  assert.equal(concurrent.length, 2);
  assert.equal(visitPhase(concurrent[0], 10000), 'enjoying');
  assert.equal(visitPhase(concurrent[1], 10000), 'entering');
  assert.notEqual(concurrent[0].id, concurrent[1].id);
});

test('all four customers keep their appearance when recipes become ready or the view remounts', () => {
  const orders = [0, 1, 2, 3].map(slot => order(`guest-${slot}`, slot));
  const before = orders.map(item => makeVisit(item, 0));
  const ready = orders.map(item => ({ ...item, status: 'ready' }));
  const after = reconcileVisits(before, orders, ready, 10000);
  assert.deepEqual(after, before);
  assert.deepEqual(ready.map(item => makeVisit(item, 50000).look), before.map(item => item.look));
});

test('missing asset markup keeps a visible fallback and uses the documented filename', () => {
  const html = renderToStaticMarkup(React.createElement(CafeAsset, { src: cafeAsset.equipment('espressoMachine') }, '☕'));
  assert.match(html, /data-asset-state="fallback"/);
  assert.match(html, /class="cafe-asset-fallback">☕/);
  assert.match(html, /src="\/assets\/cafe\/equipment\/espressoMachine\.png"/);
  assert.doesNotMatch(html, /hidden=/);
});

test('priority artwork paints directly without flashing its legacy fallback', () => {
  const html = renderToStaticMarkup(React.createElement(CafeAsset, {
    src: '/assets/cafe/backgrounds/room.png?v=d9fba6fd',
    className: 'room-art',
    fallbackDuringLoad: false,
    priority: true,
  }, 'OLD ROOM'));
  assert.match(html, /data-asset-state="loading"/);
  assert.match(html, /class="cafe-asset-fallback" hidden="">OLD ROOM/);
  assert.match(html, /class="asset-loaded"/);
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchPriority="high"/);
});

test('a fully developed cafe renders all equipment, staff and 4 usable order bubbles without decorative rewards', () => {
  const state = {
    ...stockedCafe(), activeMs: 5000,
    orders: [order('a', 0), { ...order('b', 1, 'cooking'), stationId: 'station-coffeeCounter' }, order('c', 2, 'ready'), order('d', 3)],
    ownedEquipment: equipment.map(item => item.id),
    stations: equipment.map(item => ({ id: `station-${item.id}`, equipmentId: item.id, level: 3 })),
    unlockedDecorations: decorations.map(item => item.id),
    staff: characters.slice(0,4).map((character, index) => ({ characterId: character.id, role: index % 2 ? 'server' : 'cook', remainingMs: 0 })),
  };
  const before = JSON.stringify(state);
  const html = renderToStaticMarkup(React.createElement(CafeScene, { state, onOrder() {}, onCharacter() {}, onEquipment() {} }));
  assert.deepEqual([...html.matchAll(/data-layer="([^"]+)"/g)].map(match => match[1]), ['background', 'furniture', 'equipment', 'seating', 'customers', 'characters', 'bubbles', 'effects']);
  for (const item of equipment) assert.ok(html.includes(`data-equipment="${item.id}"`));
  assert.doesNotMatch(html,/data-decoration=/);
  for (const character of state.staff.map(person=>characters.find(item=>item.id===person.characterId))) assert.ok(html.includes(`aria-label="${character.name}・`));
  assert.match(html, /aria-label="店長（あなた）・いらっしゃいませ"/);
  assert.equal((html.match(/class="scene-order /g) || []).length, 4);
  assert.match(html, /src="\/assets\/cafe\/backgrounds\/room\.png\?v=d9fba6fd"/);
  assert.equal((html.match(/src="\/assets\/cafe\/furniture\/table-set\.png"/g) || []).length, 4);
  assert.match(html, /あと5秒/);
  assert.ok((html.match(/あと\d+秒/g)||[]).length<=2,'the cafe contains no more than two countdown references');
  assert.match(html,/\+25コイン/);
  assert.match(html, /提供する/);
  assert.equal(JSON.stringify(state), before);
});

test('presentation does not alter v5 round trips, ingredient consumption or manual serving rewards', () => {
  let state = stockedCafe();
  const queued = order();
  state = reducer(state, { type: 'SPAWN_ORDER', order: queued });
  const visits = reconcileVisits([], [], state.orders, state.activeMs);
  const beans = state.ingredients.coffeeBeans;
  state = reducer(state, { type: 'START_COOKING', orderId: queued.id });
  assert.equal(state.ingredients.coffeeBeans, beans - 1);
  for (let i = 0; i < 30; i++) state = reducer(state, { type: 'TICK', deltaMs: 1000 });
  const ready = state.orders.find(item => item.id === queued.id);
  assert.equal(ready.status, 'ready');
  const previous = state.orders;
  const coins = state.currency;
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: queued.id });
  assert.ok(state.currency > coins);
  assert.equal(state.lifetimeStats.totalOrders, 1);
  const json = JSON.stringify(state);
  reconcileVisits(visits, previous, state.orders, state.activeMs);
  assert.equal(JSON.stringify(state), json);
  const restored = migrateSavedState(JSON.parse(json));
  for (const key of ['currency', 'ingredients', 'orders', 'stations', 'staff', 'lifetimeStats', 'characterProgress', 'saveVersion']) assert.deepEqual(restored[key], state[key]);
});

const { aislePosition, createManager, enqueueManager, advanceManager, managerFrame, managerPending, MANAGER_TIMING } = require(join(output, 'components/cafe/managerModel.js'));

test('調理側の移動時間は提供担当に近いゆっくりした速度で進む', () => {
  assert.equal(MANAGER_TIMING.toMachine, 2100);
  assert.equal(MANAGER_TIMING.toTable, 2100);
  assert.equal(MANAGER_TIMING.return, 1600);
});

test('serving staff advances slowly through the center aisle instead of jumping to the table',()=>{
  assert.deepEqual(aislePosition({x:36,y:44},{x:44,y:58},0),{x:36,y:44});
  assert.deepEqual(aislePosition({x:36,y:44},{x:44,y:58},1),{x:44,y:58});
  const state={...stockedCafe(),orders:[order('staff-route',0,'ready')],staff:[{characterId:'ren',role:'server',servingOrderId:'staff-route',remainingMs:2500}]};
  const html=renderToStaticMarkup(React.createElement(CafeScene,{state,onOrder(){},onCharacter(){},onEquipment(){}}));
  assert.match(html,/class="scene-staff staff-serving staff-moving [^"]*"[^>]*style="left:49%;top:47%/);
  const returningState={...stockedCafe(),orders:[],staff:[{characterId:'ren',role:'server',returningFromSlot:0,remainingMs:2500}]};
  const returningHtml=renderToStaticMarkup(React.createElement(CafeScene,{state:returningState,onOrder(){},onCharacter(){},onEquipment(){}}));
  assert.match(returningHtml,/class="scene-staff staff-returning staff-moving [^"]*"[^>]*style="left:49%;top:47%/);
  assert.match(returningHtml,/提供後、カウンターへ戻っています/);
  const css=readFileSync(new URL('../src/components/cafe/cafe-scene.css',import.meta.url),'utf8');
  assert.match(css,/\.scene-staff \{[^}]*transition:left \.14s linear,top \.14s linear;/);
  assert.match(css,/\.manager-moving \.manager-body \{ animation:manager-walk 1\.2s linear infinite;/);
  assert.match(css,/\.manager-moving \.person-legs \{ animation:manager-steps 1\.2s linear infinite;/);
  assert.match(readFileSync(new URL('../src/components/cafe/CafeManager.tsx',import.meta.url),'utf8'),/now % 1200/);
});

test('the manager walks to the assigned machine before existing cooking starts', () => {
  let state = { ...stockedCafe(), activeMs: 0, spawnRemainingMs: 1e12 };
  state = reducer(state, { type: 'SPAWN_ORDER', order: order('manager-coffee') });
  let manager = enqueueManager(createManager(), state, { kind: 'start', orderId: 'manager-coffee' });
  ({ model: manager } = advanceManager(manager, state));
  assert.equal(managerFrame(manager, state).phase, 'walking');
  assert.equal(state.orders[0].status, 'queued');
  state = { ...state, activeMs: MANAGER_TIMING.toMachine - 1 };
  let result = advanceManager(manager, state); manager = result.model;
  assert.equal(result.command, undefined);
  assert.equal(state.orders[0].status, 'queued');
  state = { ...state, activeMs: MANAGER_TIMING.toMachine };
  result = advanceManager(manager, state); manager = result.model;
  assert.deepEqual(result.command, { type: 'START_COOKING', orderId: 'manager-coffee' });
  state = reducer(state, result.command);
  assert.equal(state.orders[0].status, 'cooking');
  assert.equal(managerFrame(manager, state).phase, 'cooking');
  assert.equal(managerPending(manager, 'manager-coffee'), undefined);
});

test('the manager carries a ready dish to its exact table before the existing reward is collected', () => {
  let state = { ...stockedCafe(), activeMs: 2000, orders: [order('ready-for-two', 1, 'ready')], spawnRemainingMs: 1e12 };
  const coins = state.currency;
  let manager = enqueueManager(createManager(state.activeMs), state, { kind: 'serve', orderId: 'ready-for-two' });
  ({ model: manager } = advanceManager(manager, state));
  assert.equal(managerFrame(manager, state).phase, 'walking');
  state = { ...state, activeMs: 2000 + MANAGER_TIMING.toMachine + MANAGER_TIMING.pickup + 500 };
  assert.equal(managerFrame(manager, state).phase, 'carrying');
  let result = advanceManager(manager, state); manager = result.model;
  assert.equal(result.command, undefined);
  assert.equal(state.currency, coins);
  state = { ...state, activeMs: 2000 + MANAGER_TIMING.toMachine + MANAGER_TIMING.pickup + MANAGER_TIMING.toTable };
  result = advanceManager(manager, state); manager = result.model;
  assert.deepEqual(result.command, { type: 'COLLECT_ORDER', orderId: 'ready-for-two' });
  state = reducer(state, result.command);
  assert.equal(state.orders.length, 0);
  assert.ok(state.currency > coins);
  assert.equal(managerFrame(manager, state).phase, 'serving');
  assert.deepEqual(managerFrame(manager, state).position, { x: 56, y: 59 });
});

test('the manager queues separate valid orders without changing save data itself', () => {
  const state = { ...stockedCafe(), orders: [order('first'), order('second', 1)], spawnRemainingMs: 1e12 };
  const saved = JSON.stringify(state);
  let manager = enqueueManager(createManager(), state, { kind: 'start', orderId: 'first' });
  manager = enqueueManager(manager, state, { kind: 'start', orderId: 'second' });
  manager = enqueueManager(manager, state, { kind: 'start', orderId: 'first' });
  assert.equal(manager.queue.length, 2);
  ({ model: manager } = advanceManager(manager, state));
  assert.equal(manager.current.orderId, 'first');
  assert.equal(manager.queue[0].orderId, 'second');
  assert.equal(JSON.stringify(state), saved);
});

test('repeated requests and paused foreground time cannot replay a manager delivery', () => {
  let state = { ...stockedCafe(), activeMs: 0, orders: [order('a', 0, 'ready'), order('b', 1, 'ready')], spawnRemainingMs: 1e12 };
  let manager = createManager();
  for (const id of ['a', 'a', 'b', 'b']) manager = enqueueManager(manager, state, { kind: 'serve', orderId: id });
  ({ model: manager } = advanceManager(manager, state));
  const pausedFrame = managerFrame(manager, state);
  for (let i = 0; i < 20; i++) {
    const result = advanceManager(manager, state); manager = result.model;
    assert.equal(result.command, undefined);
  }
  assert.deepEqual(managerFrame(manager, state), pausedFrame);
  const commands = [];
  for (let i = 0; i < 120; i++) {
    state = reducer(state, { type: 'TICK', deltaMs: 100 });
    const result = advanceManager(manager, state); manager = result.model;
    if (result.command) { commands.push(result.command); state = reducer(state, result.command); }
  }
  assert.deepEqual(commands.map(command => command.orderId), ['a', 'b']);
  assert.equal(state.orders.length, 0);
  assert.equal(state.lifetimeStats.totalOrders, 2);
  assert.equal(managerFrame(manager, state).phase, 'idle');
});

test('staff completing a pending order cancels the manager action without double payment', () => {
  let state = { ...stockedCafe(), activeMs: 0, orders: [order('staff-wins', 0, 'ready')], spawnRemainingMs: 1e12 };
  let manager = enqueueManager(createManager(), state, { kind: 'serve', orderId: 'staff-wins' });
  ({ model: manager } = advanceManager(manager, state));
  // This is the same reducer operation the automated server invokes.
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: 'staff-wins' });
  const coins = state.currency;
  state = { ...state, activeMs: 500 };
  let result = advanceManager(manager, state); manager = result.model;
  assert.equal(result.command, undefined);
  assert.equal(manager.current, undefined);
  state = { ...state, activeMs: 5000 };
  result = advanceManager(manager, state);
  assert.equal(result.command, undefined);
  assert.equal(state.currency, coins);
  assert.equal(state.lifetimeStats.totalOrders, 1);
});

test('the manager starts two free coffee machines without waiting for the first brew', () => {
  let state = { ...stockedCafe(), activeMs: 0, orders: [order('first'), order('second', 1)], spawnRemainingMs: 1e12 };
  state = { ...state, stations: [...state.stations, { id: 'coffeeCounter-2', equipmentId: 'coffeeCounter', level: 1 }] };
  let manager = createManager();
  for (const id of ['first', 'second']) manager = enqueueManager(manager, state, { kind: 'start', orderId: id });
  const commands = [];
  for (let i = 0; i < 650; i++) {
    const result = advanceManager(manager, state); manager = result.model;
    if (result.command) { commands.push({ ...result.command, at: state.activeMs }); state = reducer(state, result.command); }
    state = reducer(state, { type: 'TICK', deltaMs: 100 });
  }
  assert.deepEqual(commands.map(command => command.orderId), ['first', 'second']);
  assert.ok(commands[1].at - commands[0].at < 3000);
  assert.equal(state.ingredients.coffeeBeans, stockedCafe().ingredients.coffeeBeans - 2);
  assert.ok(state.orders.every(item => item.status === 'ready'));
});

const { equipmentLayout, equipmentWorkPosition } = require(join(output, 'components/cafe/equipmentLayout.js'));
const { machinePosition } = require(join(output, 'components/cafe/managerModel.js'));
const { stationActivity } = require(join(output, 'game/kitchen.js'));

test('unlocking reveals a machine before purchase, then installation and work share its actual position', () => {
  const initial = stockedCafe();
  const render = state => renderToStaticMarkup(React.createElement(CafeScene, { state, onOrder() {}, onCharacter() {}, onEquipment() {} }));
  assert.doesNotMatch(render(initial), /data-equipment="espressoMachine"/);
  const unlocked = { ...initial, currency: 10000, unlockedEquipment: [...initial.unlockedEquipment, 'espressoMachine'] };
  assert.match(render(unlocked), /data-equipment="espressoMachine" data-equipment-status="uninstalled"/);
  assert.equal(unlocked.stations.some(item => item.equipmentId === 'espressoMachine'), false);
  const installed = reducer(unlocked, { type: 'BUY_EQUIPMENT', equipmentId: 'espressoMachine' });
  assert.match(render(installed), /data-equipment="espressoMachine" data-equipment-status="idle"/);
  const expanded = { ...installed, unlockedEquipment: equipment.map(item => item.id) };
  for (const state of [installed, expanded]) {
    for (const station of state.stations) {
      const assigned = { ...order(), stationId: station.id };
      const drawn = equipmentLayout(state).find(item => item.item.id === station.equipmentId);
      assert.deepEqual(machinePosition(state, assigned), drawn.workPosition);
      assert.deepEqual(equipmentWorkPosition(state, assigned), drawn.workPosition);
    }
  }
  assert.doesNotMatch(render(expanded), /weather-|scene-rain/);
});

test('equipment and scene track idle, countdown, ready and served from the same order', () => {
  let state = { ...stockedCafe(), spawnRemainingMs: 1e12, orders: [order()] };
  const station = state.stations.find(item => item.equipmentId === 'coffeeCounter');
  assert.equal(stationActivity(state, station.id).status, 'idle');
  state = reducer(state, { type: 'START_COOKING', orderId: 'one' });
  assert.equal(stationActivity(state, station.id).order.remainingMs, 10000);
  const render = () => renderToStaticMarkup(React.createElement(CafeScene, { state, onOrder() {}, onCharacter() {}, onEquipment() {} }));
  assert.match(render(), /data-equipment="coffeeCounter" data-equipment-status="cooking"/);
  assert.match(render(), /あと10秒/);
  assert.match(render(), /equipment-state-label">あと10秒/);
  assert.match(render(), /bubble-label">調理中/);
  for (let i = 0; i < 10; i++) state = reducer(state, { type: 'TICK', deltaMs: 1000 });
  assert.equal(stationActivity(state, station.id).status, 'ready');
  assert.match(render(), /data-equipment="coffeeCounter" data-equipment-status="ready"/);
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: 'one' });
  assert.equal(stationActivity(state, station.id).status, 'idle');
});

test('the three supplied guests retain their artwork and turn with the entrance and exit route', () => {
  const { CustomerSprite } = require(join(output, 'components/cafe/CustomerSprite.js'));
  const { CUSTOMER_LOOKS, customerFacing } = require(join(output, 'components/cafe/sceneModel.js'));
  assert.deepEqual(CUSTOMER_LOOKS.slice(0, 3), ['moss', 'rose', 'navy']);
  for (const [index, look] of CUSTOMER_LOOKS.slice(0, 3).entries()) {
    const html = renderToStaticMarkup(React.createElement(CustomerSprite, { look, phase: 'entering' }));
    assert.match(html, /src="\/assets\/customers\/cafe-guests\.png"/);
    assert.ok(html.includes(`--customer-column:${index}`));
    assert.ok(html.includes(`look-${look}`)); // CSS fallback remains available.
  }
  const left = makeVisit(order('left-seat', 0), 0);
  const right = makeVisit(order('right-seat', 1), 0);
  assert.equal(customerFacing(left, 0), 1);
  assert.equal(customerFacing(left, VISIT_TIMING.enter * .9), -1);
  assert.equal(customerFacing(right, VISIT_TIMING.enter * .9), 1);
  assert.equal(customerFacing(left, VISIT_TIMING.enter), 1);
  const departing = { ...left, servedAt: 5000 };
  assert.equal(customerFacing(departing, 5000 + VISIT_TIMING.enjoy + 10), 1);
  assert.equal(customerFacing(departing, 5000 + VISIT_TIMING.enjoy + VISIT_TIMING.leave * .9), -1);
});

test('the glasses guest joins regular arrivals and uses the supplied PNG through the whole visit', () => {
  const { CustomerSprite } = require(join(output, 'components/cafe/CustomerSprite.js'));
  const { CUSTOMER_LOOKS } = require(join(output, 'components/cafe/sceneModel.js'));
  assert.deepEqual(CUSTOMER_LOOKS, ['moss', 'rose', 'navy', 'glasses']);
  const arrivals = Array.from({ length: 100 }, (_, i) => makeVisit(order(`arrival-${i}`), 0));
  assert.deepEqual(new Set(arrivals.map(visit => visit.look)), new Set(CUSTOMER_LOOKS));
  const guest = arrivals.find(visit => visit.look === 'glasses');
  assert.equal(makeVisit(order(guest.id), 9000).look, 'glasses');
  const ready = order(guest.id, 0, 'ready');
  assert.equal(reconcileVisits([guest], [order(guest.id)], [ready], 4000)[0].look, 'glasses');
  const served = reconcileVisits([guest], [ready], [], 5000)[0];
  assert.equal(served.look, 'glasses');
  assert.equal(visitPhase(served, 5000), 'enjoying');
  assert.equal(visitPhase(served, 5000 + VISIT_TIMING.enjoy), 'leaving');
  for (const phase of ['entering', 'seated', 'enjoying', 'leaving']) {
    const html = renderToStaticMarkup(React.createElement(CustomerSprite, { look: 'glasses', phase }));
    assert.match(html, /src="\/assets\/customers\/glasses\.png"/);
    assert.match(html, /class="cafe-asset customer-standalone"/);
    assert.doesNotMatch(html, /src="[^"]*glasses-(entering|seated|enjoying|leaving)\.png"/);
  }
  const png = readFileSync(new URL('../public/assets/customers/glasses.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1086);
  assert.equal(png.readUInt32BE(20), 1448);
  assert.equal(png[25], 6, 'the original RGBA transparency is preserved');
});

test('standalone guest sizing matches sheet height and feet while preserving aspect ratio and fallback',()=>{
  const {CustomerSprite}=require(join(output,'components/cafe/CustomerSprite.js'));
  const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  const rule=css.match(/\.customer-standalone>img\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  for(const declaration of ['height:95%','width:auto','max-width:none','bottom:3%','left:50%','translateX(-50%)'])assert.ok(rule.includes(declaration));
  const sheetHeight=22.35/13;
  const sheetHead=100/512/sheetHeight-.091,sheetFeet=924/512/sheetHeight-.091;
  const portraitHead=.02+14/1448*.95,portraitFeet=.02+1430/1448*.95;
  assert.ok(Math.abs(portraitHead-sheetHead)<.02,'head height matches within 2% of the guest frame');
  assert.ok(Math.abs(portraitFeet-sheetFeet)<.02,'feet stay on the same ground line');
  for(const look of ['moss','rose','navy']){
    const html=renderToStaticMarkup(React.createElement(CustomerSprite,{look,phase:'seated'}));
    assert.doesNotMatch(html,/customer-standalone/,'existing sheet guests keep their sizing');
  }
});

test('Ren everyday supplier and staff dialogue follows live tasks and keeps shop and hiring controls',()=>{
  const context=require(join(output,'game/GameContext.js'));
  const original=context.useGame;
  const {characterGreeting}=require(join(output,'game/conversation.js'));
  const {renSupplyReplies,renStaffReplies}=require(join(output,'data/renConversations.js'));
  const {SupplierScreen}=require(join(output,'screens/SupplierScreen.js'));
  const {StaffCard}=require(join(output,'screens/StaffScreen.js'));
  let state={...createInitialState(),currency:2000};
  state.characterProgress.ren={...state.characterProgress.ren,met:true,relationshipStage:4,visits:3};
  context.useGame=()=>({state,dispatch(){}});
  const supplier=()=>renderToStaticMarkup(React.createElement(SupplierScreen,{supplierId:'coffee',onBack(){},onDate(){}}));
  const staff=()=>renderToStaticMarkup(React.createElement(StaffCard,{characterId:'ren'}));
  try{
    const saved=JSON.stringify(state);
    assert.ok(supplier().includes(characterGreeting(characters.find(person=>person.id==='ren'),state.characterProgress.ren)));
    assert.match(staff(),/staff-dialogue/);
    assert.match(staff(),/調理をお願いする/);
    state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans',now:1000});
    const pending=supplier();
    assert.ok(pending.includes(renSupplyReplies.close));
    assert.match(pending,/入荷待ち/);
    state=reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'});
    assert.ok(staff().includes(renStaffReplies.cook.assign));
    state={...state,orders:[{...order('ren-job'),cookId:'ren',status:'cooking'}]};
    assert.ok(staff().includes(renStaffReplies.cook.working));
    state=reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'rest'});
    assert.ok(staff().includes(renStaffReplies.rest.busy),'role change during a task waits until it ends');
    state={...state,orders:[]};
    assert.ok(staff().includes(renStaffReplies.rest.assign));
    state.characterProgress.ren={...state.characterProgress.ren,met:false};
    assert.doesNotMatch(staff(),/staff-dialogue/,'unknown people cannot speak');
    const unchanged=JSON.parse(saved);
    state=unchanged;
    supplier();staff();
    assert.equal(JSON.stringify(state),saved,'rendering everyday conversation never spends or grants resources');
  }finally{context.useGame=original;}
});

test('gift reaction popup renders each preference with existing standing artwork and the actual gift response',()=>{
  const {GiftReactionModal}=require(join(output,'components/GiftReactionModal.js'));
  const {giftReactionLabels}=require(join(output,'data/gifts.js'));
  for(const reaction of ['love','like','normal','dislike']){
    const html=renderToStaticMarkup(React.createElement(GiftReactionModal,{reaction:{characterId:'ren',giftId:'book',reaction,response:'選んでくれて、ありがとう。'},onClose(){}}));
    assert.match(html,/gift-reaction-popup/);
    assert.ok(html.includes(giftReactionLabels[reaction]));
    assert.match(html,/src="\/assets\/characters\/ren\.png"/);
    assert.match(html,/黒豆 蓮の立ち絵/);
    assert.match(html,/選んでくれて、ありがとう。/);
    assert.match(html,/プレゼントのリアクションを閉じる/);
    assert.doesNotMatch(html,/完了|解放しました/);
  }
  const cacao=renderToStaticMarkup(React.createElement(GiftReactionModal,{reaction:{characterId:'cacao',giftId:'book',reaction:'like',response:'ありがとう。'},onClose(){}}));
  assert.match(cacao,/src="\/assets\/characters\/cacao-story\.png"/,'uses the same story artwork as episodes');
});

test('forest screen keeps pending loot across navigation and offers zero-energy return after basket resolution',()=>{
 const context=require(join(output,'game/GameContext.js')),original=context.useGame;
 let state=createInitialState();state.lifetimeStats.totalOrders=20;state.forest.returns=5;
 state=reducer(state,{type:'FOREST_ENTER'});state=reducer(state,{type:'FOREST_MOVE',area:'clearing'});state=reducer(state,{type:'FOREST_GATHER',spot:0,careful:false});state.forest.energy=0;
 context.useGame=()=>({state,dispatch(){}});
 const {ForestScreen,ForestBook}=require(join(output,'screens/ForestScreen.js'));
 try{
  let html=renderToStaticMarkup(React.createElement(ForestScreen,{onBook(){},onTown(){}}));assert.match(html,/見つけた！/);assert.match(html,/かごに入れる/);assert.match(html,/街へ帰る（体力0でもOK）/);
  state=reducer(state,{type:'FOREST_TAKE'});state=reducer(state,{type:'FOREST_RETURN'});html=renderToStaticMarkup(React.createElement(ForestScreen,{onBook(){},onTown(){}}));assert.match(html,/受け取る/);assert.doesNotMatch(html,/森へ出かける/);
  html=renderToStaticMarkup(React.createElement(ForestBook,{onBack(){}}));assert.match(html,/秘密のレシピ/);assert.match(html,/限定料理/);assert.match(html,/月しずくベリー/);
 }finally{context.useGame=original;}
});
