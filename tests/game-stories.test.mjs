import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Compile the pure game model using the project's TypeScript dependency, without browser mocks.
const output=mkdtempSync(join(tmpdir(),'komorebi-game-test-'));
after(()=>rmSync(output,{recursive:true,force:true}));
writeFileSync(join(output,'package.json'),JSON.stringify({type:'commonjs'}));
for(const folder of ['data','game']) {
  mkdirSync(join(output,folder));
  const source=new URL(`../src/${folder}/`,import.meta.url);
  for(const file of readdirSync(source).filter(name=>name.endsWith('.ts'))) {
    const compiled=ts.transpileModule(readFileSync(new URL(file,source),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    writeFileSync(join(output,folder,file.replace(/\.ts$/,'.js')),compiled);
  }
}
const require=createRequire(import.meta.url);
const {characters}=require(join(output,'data/characters.js'));
const {relationshipEvents}=require(join(output,'data/events.js'));
const {growthEvents}=require(join(output,'data/growthEvents.js'));
const {dateEvents,dateLocations}=require(join(output,'data/dates.js'));
const {recipes}=require(join(output,'data/recipes.js'));
const {gifts,giftRarityInfo}=require(join(output,'data/gifts.js'));
const {ingredients}=require(join(output,'data/ingredients.js'));
const {equipment}=require(join(output,'data/equipment.js'));
const {decorations}=require(join(output,'data/decorations.js'));
const {createInitialState,reducer,migrateSavedState}=require(join(output,'game/state.js'));
const {availableEvent,isRecipeUsable,giftAffectionAmount,giftReaction,pickWeightedRecipe,randomShopItems,relationshipRequirementTargets}=require(join(output,'game/logic.js'));
const {affectionThresholds,relationshipLabel,GAME_CONFIG}=require(join(output,'game/config.js'));
const {tableUpgrades,tableSlots}=require(join(output,'game/seating.js'));
const {missions,missionChapters,sideMissions,getMissions,sortedMissions,missionRank,currentMission,activeMissionChapter,activeSideMissions,updateMissions}=require(join(output,'game/missions.js'));
const {salePrice,ingredientCost,pickIncomingOrder,availableGrowthEvent}=require(join(output,'game/logic.js'));
const {menuMastery,menuCatalogProgress,recipesAtMasteryLevel}=require(join(output,'game/menuMastery.js'));

const {receiveSupplies,procurementRate,procurementQuote,supplyPackSize,requestStaffSupply,runAutoProcurement}=require(join(output,'game/procurement.js'));
const {autoProcurementUnlocked}=require(join(output,'game/automation.js'));
const receiveAll=state=>state.deliveries.length?receiveSupplies(state,Math.max(...state.deliveries.map(item=>item.arrivesAt))):state;
const routeEvents=id=>relationshipEvents.filter(event=>event.characterId===id);
function closeGiftPopup(state) {
  const pending=state.pendingGiftReaction;
  return pending?reducer(state,{type:'CLOSE_GIFT_REACTION',characterId:pending.characterId,reaction:pending.reaction}):state;
}
function complete(state,event,route='romance') {
  return reducer(state,{type:'COMPLETE_EVENT',eventId:event.id,choiceId:event.choices?.[0]?.id,route:event.toStage===9?route:undefined});
}
function tick(state,ms){while(ms>0){const deltaMs=Math.min(1000,ms);state=reducer(state,{type:'TICK',deltaMs});ms-=deltaMs;}return state;}
function order(id='manual',recipeId='coffee',customerSlot=0){return {id,recipeId,customerSlot,status:'queued',remainingMs:0,totalMs:0};}
function trade(state,count){
  for(let i=0;i<count;i++){
    if(!(state.ingredients.coffeeBeans>0))state=receiveAll(reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'}));
    state=reducer(state,{type:'SPAWN_ORDER',order:order()});
    state=reducer(state,{type:'START_COOKING',orderId:'manual'});
    state=tick(state,30000);state=reducer(state,{type:'COLLECT_ORDER',orderId:'manual'});
  }return state;
}
function play(id,route='romance',until=10) {
  let state={...createInitialState(),spawnRemainingMs:1e12};
  state=trade(state,100);
  state=reducer(state,{type:'VISIT',characterId:id});
  const character=characters.find(c=>c.id===id);
  const supply=ingredients.find(item=>item.supplierId===character.supplierId&&!item.unlockEventId);
  state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:supply.id,packs:8});
  state=receiveAll(state);
  const gift=gifts.filter(item=>state.giftShopItems.includes(item.id)).sort((a,b)=>a.price/giftAffectionAmount(a,giftReaction(character,a))-b.price/giftAffectionAmount(b,giftReaction(character,b))).find(item=>giftAffectionAmount(item,giftReaction(character,item))>0);
  for(const event of routeEvents(id).filter(event=>event.toStage<=until)) {
    let attempts=0;
    while(state.characterProgress[id].affection<event.requiredAffection) {
      assert.ok(attempts++<100,'relationship progression must terminate');
      while(state.currency<gift.price+100)state=trade(state,10);
      if(state.giftShopSoldOut.includes(gift.id))state=reducer(state,{type:'REFRESH_SHOP',items:state.giftShopItems,costAction:false});
      state=reducer(state,{type:'BUY_GIFT',giftId:gift.id});
      state=closeGiftPopup(reducer(state,{type:'GIVE_GIFT',characterId:id,giftId:gift.id,reaction:giftReaction(character,gift)}));
    }
    assert.equal(availableEvent(state,relationshipEvents)?.id,event.id);
    state=complete(state,event,route);
    assert.equal(state.characterProgress[id].relationshipStage,event.toStage);
  }
  return state;
}

test('the eight requested characters have 10 unique stories, consistent rewards and no dangling references',()=>{
  assert.ok(characters.every(character=>!Object.hasOwn(character,'age')));
  assert.equal(relationshipEvents.length,80);
  for(const catalog of [characters,relationshipEvents,recipes,ingredients,equipment,decorations])assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
  const catalogs={recipeIds:recipes,ingredientIds:ingredients,equipmentIds:equipment,decorationIds:decorations};
  for(const character of characters){
    assert.deepEqual(routeEvents(character.id).map(event=>event.toStage),[1,2,3,4,5,6,7,8,9,10]);
    for(const key of ['profile','voice','backstory','concern','attraction'])assert.ok(character[key].length>10);
  }
  for(const event of relationshipEvents){
    assert.equal(event.requiredAffection,affectionThresholds[event.toStage]);
    assert.equal(event.fromStage,event.toStage-1);
    assert.ok(event.dialogue.length>=2);
    assert.ok(event.dialogue.every(line=>line.text&&!line.text.includes('［主人公名］')));
    if(event.toStage>=9)assert.ok(event.friendshipDialogue?.length>=2);
    for(const [key,catalog] of Object.entries(catalogs))for(const id of event.reward?.[key]||[])assert.ok(catalog.some(item=>item.id===id),`${event.id}: missing ${id}`);
  }
  for(const recipe of recipes){
    for(const id of recipe.requiredIngredients)assert.ok(ingredients.some(item=>item.id===id),`${recipe.id}: missing ${id}`);
    for(const id of recipe.requiredEquipmentIds||[])assert.ok(equipment.some(item=>item.id===id));
  }
});

test('100 gifts have balanced preferences and four color-coded rarity tiers',()=>{
  const rarities=['common','rare','superRare','ultraRare'];
  assert.equal(gifts.length,100);
  assert.equal(new Set(gifts.map(gift=>gift.id)).size,100);
  assert.deepEqual(Object.keys(giftRarityInfo),rarities);
  assert.ok(gifts.every(gift=>rarities.includes(gift.rarity)));
  for(const rarity of rarities)assert.ok(gifts.some(gift=>gift.rarity===rarity));
  for(let index=1;index<rarities.length;index++){
    const lower=gifts.filter(gift=>gift.rarity===rarities[index-1]);
    const higher=gifts.filter(gift=>gift.rarity===rarities[index]);
    assert.ok(Math.min(...higher.map(gift=>gift.price))>Math.max(...lower.map(gift=>gift.price)));
    assert.ok(GAME_CONFIG.giftRarityMultiplier[rarities[index]]>GAME_CONFIG.giftRarityMultiplier[rarities[index-1]]);
    assert.ok(GAME_CONFIG.giftRarityWeight[rarities[index]]<GAME_CONFIG.giftRarityWeight[rarities[index-1]]);
    assert.ok(giftAffectionAmount(higher[0],'love')>giftAffectionAmount(lower[0],'love'));
  }
  const shop=randomShopItems(GAME_CONFIG.giftShopSize,()=>.73);
  assert.equal(shop.length,GAME_CONFIG.giftShopSize);
  assert.equal(new Set(shop).size,shop.length);
  const shopRanks=shop.map(id=>rarities.indexOf(gifts.find(gift=>gift.id===id).rarity));
  assert.deepEqual(shopRanks,[...shopRanks].sort((left,right)=>left-right));
  for(const character of characters){
    const reactions=new Set(gifts.map(gift=>giftReaction(character,gift)));
    for(const reaction of ['love','like','normal','dislike'])assert.ok(reactions.has(reaction),`${character.id}: missing ${reaction} gift`);
  }
});

test('each displayed gift sells once and optional missions advance without gating the story',()=>{
  let state={...createInitialState(),currency:10000};
  const giftId=state.giftShopItems[0],price=gifts.find(item=>item.id===giftId).price;
  state=reducer(state,{type:'BUY_GIFT',giftId});
  assert.ok(state.giftShopSoldOut.includes(giftId));assert.equal(state.inventory[giftId],1);assert.equal(state.lifetimeStats.giftPurchases,1);
  const afterFirst=state.currency;state=reducer(state,{type:'BUY_GIFT',giftId});
  assert.equal(state.currency,afterFirst);assert.equal(state.inventory[giftId],1);
  const giftMission=activeSideMissions(state).find(mission=>mission.id.startsWith('side-gifts-'));
  assert.equal(giftMission.target,1);
  state=reducer(state,{type:'CLAIM_SIDE_MISSION',missionId:giftMission.id});
  assert.ok(state.missions.sideClaimed.includes(giftMission.id));assert.equal(state.currency,afterFirst+giftMission.reward);
  assert.equal(activeSideMissions(state).find(mission=>mission.id.startsWith('side-gifts-')).target,3);
  const mainBefore=getMissions(state).map(mission=>mission.id);
  state=reducer(state,{type:'REFRESH_SHOP',items:state.giftShopItems,costAction:false});
  assert.deepEqual(state.giftShopSoldOut,[]);assert.deepEqual(getMissions(state).map(mission=>mission.id),mainBefore);
  assert.equal(price+afterFirst,10000);
});

test('side missions continue through long-running order, revenue and gift milestones',()=>{
  assert.equal(sideMissions.length,101);
  assert.equal(new Set(sideMissions.map(mission=>mission.id)).size,sideMissions.length);
  const legacyClaimed=[
    ...['5','15','30','60','120','250'].map(target=>`side-orders-${target}`),
    ...['300','1000','3000','7500','15000','30000'].map(target=>`side-sales-${target}`),
    ...['1','3','7','15','30','60'].map(target=>`side-gifts-${target}`),
  ];
  let state={...createInitialState(),missions:{...createInitialState().missions,sideClaimed:legacyClaimed},lifetimeStats:{...createInitialState().lifetimeStats,totalOrders:250,totalRevenue:30000,giftPurchases:60}};
  const next=activeSideMissions(state);
  assert.deepEqual(next.map(mission=>mission.target),[500,60000,120,10,3]);
  assert.ok(next.slice(0,3).every(mission=>mission.reward>260));
});

test('menu mastery raises only that recipe price and catalog progress hides undiscovered secret recipes',()=>{
  const initial=createInitialState();
  const initialCatalog=menuCatalogProgress(initial);
  assert.equal(initialCatalog.unlocked,initial.unlockedRecipes.length);
  assert.equal(initialCatalog.total,recipes.filter(recipe=>!recipe.hidden).length);
  assert.equal(menuMastery('coffee',initial).current.level,1);
  assert.equal(salePrice('coffee',initial),25);

  const mastered={...initial,lifetimeStats:{...initial.lifetimeStats,recipeSales:{coffee:160}}};
  assert.equal(menuMastery('coffee',mastered).current.level,10);
  assert.equal(menuMastery('coffee',mastered).current.bonus,.20);
  assert.equal(salePrice('coffee',mastered),30);
  assert.equal(salePrice('toast',mastered),75);
  assert.equal(recipesAtMasteryLevel(mastered,10),1);

  const hidden=recipes.find(recipe=>recipe.hidden);
  const discovered={...initial,unlockedRecipes:[...initial.unlockedRecipes,hidden.id]};
  assert.deepEqual(menuCatalogProgress(discovered),{unlocked:initialCatalog.unlocked+1,total:initialCatalog.total+1,percent:Math.floor((initialCatalog.unlocked+1)/(initialCatalog.total+1)*100)});
});

test('late relationship levels need increasingly more gifts while procurement grants only one affection per order',()=>{
  assert.deepEqual([6,7,8,9,10].map(stage=>relationshipRequirementTargets(stage).giftTarget),[1,2,4,7,10]);
  let state=reducer(createInitialState(),{type:'VISIT',characterId:'ren'});
  const before=state.characterProgress.ren.affection;
  state=reducer({...state,currency:10000},{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans',packs:20,now:1000});
  assert.equal(state.characterProgress.ren.affection-before,GAME_CONFIG.procurementAffection);
  assert.equal(GAME_CONFIG.procurementAffection,1);
});

test('developer affection unlocks every requirement through relationship stage 10',()=>{
  let state=createInitialState();
  const coins=state.currency;
  state=reducer(state,{type:'DEV_AFFECTION',characterId:'aki'});
  const finalTargets=relationshipRequirementTargets(10);
  assert.ok(state.characterProgress.aki.giftsGiven>=finalTargets.giftTarget);
  assert.ok(state.lifetimeStats.totalOrders>=finalTargets.orderTarget);
  for(const event of routeEvents('aki')){
    assert.equal(availableEvent(state,relationshipEvents)?.id,event.id);
    state=complete(state,event,'friendship');
  }
  assert.equal(state.characterProgress.aki.relationshipStage,10);
  assert.equal(state.characterProgress.aki.route,'friendship');
  assert.equal(state.currency,coins);
});

test('developer controls immediately finish active deliveries and cooking',()=>{
  let state=createInitialState();
  const untouched=state;
  assert.equal(reducer(state,{type:'DEV_COMPLETE_DELIVERIES'}),untouched);
  assert.equal(reducer(state,{type:'DEV_COMPLETE_COOKING'}),untouched);

  state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans',packs:2,now:1000});
  assert.equal(state.deliveries.length,1);
  const expectedServings=state.deliveries[0].packs*state.deliveries[0].servingsPerPack;
  state=reducer(state,{type:'DEV_COMPLETE_DELIVERIES'});
  assert.equal(state.deliveries.length,0);
  assert.equal(state.ingredients.coffeeBeans,expectedServings);
  assert.equal(state.missions.receivedPacks.coffeeBeans,2);

  state=reducer(state,{type:'SPAWN_ORDER',order:order('dev-cook')});
  state=reducer(state,{type:'START_COOKING',orderId:'dev-cook'});
  assert.equal(state.orders[0].status,'cooking');
  state=reducer(state,{type:'DEV_COMPLETE_COOKING'});
  assert.equal(state.orders[0].status,'ready');
  assert.equal(state.orders[0].remainingMs,0);
  assert.equal(state.lifetimeStats.totalOrders,0);
});

test('developer reset uses an in-game confirmation instead of a browser dialog',()=>{
  const source=readFileSync(new URL('../src/components/CafeGame.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/window\.confirm/);
  assert.match(source,/セーブデータを初期化して/);
  assert.match(source,/>\s*初期化する\s*</);
});

for(const character of characters.map(item=>item.id))test(`${character}: normal trade and gifts reach level 10 on both routes, with equal rewards and independent supplies`,()=>{
  const romance=play(character,'romance');const friendship=play(character,'friendship');
  assert.equal(romance.characterProgress[character].route,'romance');
  assert.equal(friendship.characterProgress[character].route,'friendship');
  assert.equal(romance.characterProgress[character].viewedEvents.length,10);
  assert.equal(relationshipLabel(10,'romance'),'ふたりの未来');
  assert.equal(relationshipLabel(10,'friendship'),'これからも仕事仲間');
  for(const key of ['unlockedRecipes','unlockedIngredients','unlockedEquipment','unlockedDecorations'])assert.deepEqual(romance[key],friendship[key]);
  assert.equal(availableEvent(romance,relationshipEvents),undefined);
  // No other relationship or growth route is needed for any story recipe's ingredients or equipment.
  for(const id of romance.unlockedRecipes.filter(id=>recipes.some(r=>r.id===id))){
    const recipe=recipes.find(item=>item.id===id);
    for(const materialId of recipe.requiredIngredients){
      const ingredient=ingredients.find(item=>item.id===materialId);
      assert.ok(!ingredient.unlockEventId||romance.unlockedIngredients.includes(materialId),`${character}: ${id} requires locked ${materialId}`);
    }
    for(const equipmentId of recipe.requiredEquipmentIds||[])assert.ok(romance.unlockedEquipment.includes(equipmentId));
  }
});

test('stories require their earned level, a valid reply and an explicit relationship choice; completing twice is harmless',()=>{
  const initial=createInitialState();
  assert.equal(reducer(initial,{type:'COMPLETE_EVENT',eventId:'ren-stage1'}),initial);
  const first=reducer(initial,{type:'VISIT',characterId:'ren'});
  assert.equal(reducer(first,{type:'COMPLETE_EVENT',eventId:'ren-stage10',route:'romance'}),first);
  const completed=complete(first,routeEvents('ren')[0]);
  assert.equal(complete(completed,routeEvents('ren')[0]),completed);
  assert.equal(availableEvent(completed,relationshipEvents),undefined);
  let stage4=play('ren','romance',3);
  stage4={...stage4,characterProgress:{...stage4.characterProgress,ren:{...stage4.characterProgress.ren,affection:300}}};
  assert.equal(reducer(stage4,{type:'COMPLETE_EVENT',eventId:'ren-stage4'}),stage4);
  assert.equal(reducer(stage4,{type:'COMPLETE_EVENT',eventId:'ren-stage4',choiceId:'invented'}),stage4);
  let beforeConfession=play('ren','romance',8);
  beforeConfession={...beforeConfession,characterProgress:{...beforeConfession.characterProgress,ren:{...beforeConfession.characterProgress.ren,affection:routeEvents('ren')[8].requiredAffection}}};
  assert.equal(reducer(beforeConfession,{type:'COMPLETE_EVENT',eventId:'ren-stage9'}),beforeConfession);
  assert.equal(complete(beforeConfession,routeEvents('ren')[8],'friendship').characterProgress.ren.route,'friendship');
});

test('a v3 save keeps progress, possessions and growth unlocks while removing daily limits',()=>{
  const old={...createInitialState(),saveVersion:3,currency:12345,ingredients:{milk:8},inventory:{book:2},day:12,actionsRemaining:2,unlockedRecipes:['coffee','moonLatte'],viewedGrowthEvents:['ren-growth1','ren-growth2'],unlockedEquipment:['espressoMachine'],ownedEquipment:['espressoMachine']};
  old.characterProgress={ren:{affection:60,relationshipStage:3,viewedEvents:['ren-stage2','ren-stage3'],met:true,visits:5},haru:{affection:0,relationshipStage:1,viewedEvents:[],met:false,visits:0}};
  const next=migrateSavedState(old);
  assert.equal(next.saveVersion,GAME_CONFIG.saveVersion);
  assert.equal(next.currency,12345);assert.deepEqual(next.ingredients,{milk:40,coffeeBeans:10,bread:10});assert.deepEqual(next.inventory,{book:2});
  assert.equal(next.day,12);assert.equal(next.actionsRemaining,0);
  assert.deepEqual(next.viewedGrowthEvents,old.viewedGrowthEvents);assert.ok(next.ownedEquipment.includes('espressoMachine'));assert.equal(next.stations.length,4);
  assert.equal(next.characterProgress.ren.affection,60);assert.equal(next.characterProgress.ren.relationshipStage,3);
  assert.deepEqual(next.characterProgress.ren.viewedEvents,['ren-stage1','ren-stage2','ren-stage3']);
  assert.ok(next.unlockedIngredients.includes('singleOrigin'));assert.ok(next.unlockedRecipes.includes('carefulDrip'));assert.ok(next.unlockedRecipes.includes('moonLatte'));
  assert.equal(next.characterProgress.haru.relationshipStage,0);assert.equal(next.characterProgress.haru.met,false);
  assert.equal(Object.keys(next.characterProgress).length,8);
  const again=migrateSavedState(next);
  assert.deepEqual(again.characterProgress,next.characterProgress);assert.deepEqual(again.unlockedRecipes,next.unlockedRecipes);
});

test('reloading a pending introduction does not skip it, and completed choices and routes persist',()=>{
  const first=reducer(createInitialState(),{type:'VISIT',characterId:'nagisa'});
  const resumed=migrateSavedState(JSON.parse(JSON.stringify(first)));
  assert.equal(availableEvent(resumed,relationshipEvents)?.id,'nagisa-stage1');
  for(const route of ['friendship','romance']){
    const completed=play('itsuki',route);
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    assert.deepEqual(loaded.characterProgress,completed.characterProgress);
    assert.equal(loaded.characterProgress.itsuki.eventChoices['itsuki-stage7'],'choice-1');
    assert.equal(loaded.characterProgress.itsuki.route,route);
    const before=JSON.stringify(loaded);
    assert.equal(complete(loaded,routeEvents('itsuki')[9],route),loaded);
    assert.equal(JSON.stringify(loaded),before);
  }
});

test('locked ingredients and equipment cannot be bought; a reward unlocks purchase rather than granting a machine',()=>{
  const initial={...createInitialState(),currency:10000};
  assert.equal(reducer(initial,{type:'BUY_INGREDIENT',ingredientId:'espressoBlend'}),initial);
  assert.equal(reducer(initial,{type:'BUY_EQUIPMENT',equipmentId:'espressoMachine'}),initial);
  const progressed=play('ren','romance',5);
  assert.ok(progressed.unlockedEquipment.includes('espressoMachine'));
  assert.ok(!progressed.ownedEquipment.includes('espressoMachine'));
  assert.equal(isRecipeUsable('espresso',progressed),false);
  const funded={...progressed,currency:10000};
  const purchased=reducer(funded,{type:'BUY_EQUIPMENT',equipmentId:'espressoMachine'});
  assert.equal(purchased.currency,4800);assert.equal(isRecipeUsable('espresso',purchased),true);
  assert.equal(reducer(purchased,{type:'BUY_EQUIPMENT',equipmentId:'espressoMachine'}).currency,purchased.currency);
  const ordered=reducer(purchased,{type:'BUY_INGREDIENT',ingredientId:'espressoBlend'});
  assert.equal(ordered.ingredients.espressoBlend,undefined);
  const stocked=receiveAll(ordered);
  assert.equal(stocked.ingredients.espressoBlend,4);assert.equal(stocked.currency,4800);
});

test('the existing cooperative routes still award their ingredients, equipment and hidden recipes',()=>{
  let state={...createInitialState(),currency:100000};
  const locked=growthEvents[0];assert.equal(reducer(state,{type:'COMPLETE_GROWTH_EVENT',eventId:locked.eventId}),state);
  for(const character of characters)state.characterProgress[character.id]={...state.characterProgress[character.id],met:true,relationshipStage:3};
  for(const event of growthEvents){
    for(const stat of event.requiredStats){
      if(['totalRevenue','totalOrders'].includes(stat.type))state.lifetimeStats[stat.type]=stat.target;
      else state.lifetimeStats[stat.type][stat.id]=stat.target;
    }
    for(const id of event.requiredEquipmentIds||[])state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:id});
    state=reducer(state,{type:'COMPLETE_GROWTH_EVENT',eventId:event.eventId});
    assert.ok(state.viewedGrowthEvents.includes(event.eventId),event.eventId);
  }
  assert.equal(state.viewedGrowthEvents.length,characters.length*5);
  assert.ok(state.unlockedRecipes.includes('richChocolatePudding'));assert.ok(state.unlockedRecipes.includes('gardenBerryTea'));
});

const {preparation,cookingMs,startProblem,equipmentPrice,upgradePrice,serveDuration}=require(join(output,'game/operations.js'));
// These mechanics fixtures are pre-funded and past the guided order phase.
// The new-player economy is exercised separately below without injected funds.
// Kitchen unit tests explicitly start with purchased supplies and all basic stations.
const stockedCafe=()=>{const state=createInitialState();const ids=['coffeeCounter','toastGrill','prepTable'];return {...state,tableCount:4,ingredients:{coffeeBeans:10,bread:10},ownedEquipment:ids,stations:ids.map(id=>({id:`${id}-1`,equipmentId:id,level:1}))};};
const isolated=()=>{const state=stockedCafe();return {...state,currency:3000,missions:{...state.missions,claimed:['serve-mocha']},spawnRemainingMs:1e12};};

test('seating is bought one set at a time after missions, with coin and six-set caps',()=>{
  let state={...createInitialState(),currency:10000};
  const secondTableMission=missions.find(mission=>mission.id==='second-table');
  assert.equal(secondTableMission.title,'2席目を購入');
  assert.equal(secondTableMission.destination,'equipment');
  assert.equal(secondTableMission.value(state),0);
  for(const offer of tableUpgrades){
    const action={type:'BUY_TABLE',expectedCount:state.tableCount};
    assert.equal(reducer(state,action),state,'the next mission must be complete');
    assert.ok(missions.some(m=>m.id===offer.missionId));
    state={...state,missions:{...state.missions,completed:[...state.missions.completed,offer.missionId]}};
    assert.equal(state.tableCount,offer.count-1,'unlock does not grant free seats');
    const poor={...state,currency:offer.price-1};
    assert.equal(reducer(poor,action),poor);
    const coins=state.currency;
    state=reducer(state,action);
    assert.equal(state.tableCount,offer.count);assert.equal(state.currency,coins-offer.price);
    if(offer.count===2)assert.equal(secondTableMission.value(state),1);
    assert.equal(reducer(state,action),state,'a stale click cannot purchase the next set');
    assert.equal(migrateSavedState(JSON.parse(JSON.stringify(state))).tableCount,state.tableCount);
  }
  assert.equal(reducer(state,{type:'BUY_TABLE',expectedCount:6}),state);
  assert.deepEqual(tableSlots(state),[0,1,2,3,4,5]);
  assert.equal(reducer(state,{type:'RESET'}).tableCount,1);
});

test('legacy saves no longer infer free tables and preserve one progressed order at the purchased seat',()=>{
  const old={...stockedCafe(),saveVersion:9,currency:876,orders:[order('waiting','coffee',0),{...order('legacy','toast',3),status:'cooking',remainingMs:12000,totalMs:30000}],staff:[{characterId:'ren',role:'server',servingOrderId:'waiting',remainingMs:1000}]};
  delete old.tableCount;
  const restored=migrateSavedState(old);
  assert.equal(restored.tableCount,1);assert.equal(restored.currency,876);
  assert.equal(restored.orders.length,1);assert.equal(restored.orders[0].id,'legacy');assert.equal(restored.orders[0].customerSlot,0);
  assert.deepEqual(restored.ingredients,old.ingredients);assert.equal(restored.staff[0].servingOrderId,undefined);assert.equal(restored.staff[0].remainingMs,0);
  assert.equal(migrateSavedState(restored).tableCount,1);
  assert.equal(migrateSavedState({...createInitialState(),tableCount:100}).tableCount,6);
  assert.equal(migrateSavedState({...createInitialState(),tableCount:-1}).tableCount,1);
});

test('zero-stock arrivals fill only purchased tables and wait safely until supplies arrive',()=>{
  for(const tableCount of [1,2,3,4,5,6]){
    let state=tick({...createInitialState(),tableCount},120000);
    assert.equal(state.orders.length,tableCount);
    assert.deepEqual(state.orders.map(o=>o.customerSlot).sort(),tableSlots(state));
    assert.ok(state.orders.every(o=>o.status==='queued'));
    const first=state.orders[0].id;
    assert.equal(start(state,first),state);
    assert.deepEqual(state.ingredients,{});assert.equal(state.currency,200);
    state=receiveAll(reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'}));
    state=start({...state,spawnRemainingMs:1e12},first);
    assert.equal(state.ingredients.coffeeBeans,3);
    state=tick(state,10000);state=collect(state,first);
    assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.currency,225);
    assert.equal(state.orders.length,tableCount-1);
    assert.equal(collect(state,first),state);
  }
});

test('manual arrivals enforce purchased slots, uniqueness and the six-table limit',()=>{
  let state={...createInitialState(),tableCount:6};
  for(const slot of [6,-1,1.5])assert.equal(addOrder(state,`bad-${slot}`,'coffee',slot),state);
  for(let slot=0;slot<6;slot++)state=addOrder(state,`guest-${slot}`,'coffee',slot);
  assert.equal(state.orders.length,6);
  assert.equal(addOrder(state,'overflow','coffee',0),state);
  const fresh=createInitialState();assert.equal(addOrder(fresh,'unbought','coffee',1),fresh);
});

test('a new cafe and reset have no supplies, one coffee station, and begin with procurement',()=>{
  const fresh=createInitialState();
  assert.deepEqual(fresh.ingredients,{});
  assert.deepEqual(fresh.inventory,{});
  assert.deepEqual(fresh.deliveries,[]);
  assert.deepEqual(fresh.ownedEquipment,['coffeeCounter']);
  assert.deepEqual(fresh.stations,[{id:'coffeeCounter-1',equipmentId:'coffeeCounter',level:1}]);
  assert.equal(fresh.currency,200);
  assert.equal(currentMission(fresh).id,'visit-town');
  assert.ok(missions.findIndex(m=>m.id==='beans-arrive')<missions.findIndex(m=>m.id==='first-order'));
  assert.equal(fresh.tableCount,1);
  assert.equal(pickWeightedRecipe(fresh),'coffee');
  assert.deepEqual(pickIncomingOrder(fresh),{recipeId:'coffee'});
  const waiting=tick(fresh,30000);
  assert.equal(waiting.orders.length,1);assert.equal(waiting.orders[0].status,'queued');
  assert.deepEqual(waiting.ingredients,{});assert.equal(waiting.currency,200);
  let ordered=reducer(fresh,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans',now:1000});
  assert.equal(ordered.currency,200);assert.deepEqual(ordered.ingredients,{});
  assert.deepEqual(pickIncomingOrder(ordered),{recipeId:'coffee'});
  ordered=updateMissions(receiveAll(ordered));
  assert.equal(ordered.ingredients.coffeeBeans,4);
  assert.deepEqual(pickIncomingOrder(ordered),{recipeId:'coffee'});
  const reset=reducer(stockedCafe(),{type:'RESET'});
  assert.deepEqual(reset.ingredients,{});assert.deepEqual(reset.stations,fresh.stations);
});

test('new-game defaults never remove an existing cafes supplies, stations, coins or mission rewards',()=>{
  const previous=stockedCafe();
  previous.currency=987;previous.ingredients={coffeeBeans:7,bread:4,milk:3};
  previous.missions.claimed=['first-order'];previous.missions.completed=['first-order'];
  const restored=migrateSavedState(JSON.parse(JSON.stringify(previous)));
  for(const field of ['currency','ingredients','ownedEquipment','stations'])assert.deepEqual(restored[field],previous[field]);
  assert.deepEqual(restored.missions.claimed,previous.missions.claimed);
});

test('recipes and requests require the actual base station until it is purchased',()=>{
  let state={...createInitialState(),currency:2000,ingredients:{bread:5},missions:{...createInitialState().missions,claimed:['serve-mocha']},lifetimeStats:{...createInitialState().lifetimeStats,totalOrders:3}};
  assert.equal(isRecipeUsable('toast',state),false);
  assert.equal(pickWeightedRecipe(state),'coffee');
  for(let i=0;i<50;i++)assert.notEqual(pickIncomingOrder(state)?.recipeId,'toast');
  const before=state.currency;
  state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'toastGrill'});
  assert.equal(state.currency,before-50);
  assert.equal(state.stations.length,2);
  assert.equal(isRecipeUsable('toast',state),true);
  assert.ok(['coffee','toast'].includes(pickWeightedRecipe(state)));
});
test('only the first mission toaster costs 50 while expansion and upgrades use the normal 900 base',()=>{
 let state={...createInitialState(),currency:5000};assert.equal(equipment.find(item=>item.id==='toastGrill').price,900);
 assert.equal(equipmentPrice(state,'toastGrill'),50);state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'toastGrill'});assert.equal(state.currency,4950);
 const toaster=state.stations.find(item=>item.equipmentId==='toastGrill');assert.equal(equipmentPrice(state,'toastGrill'),1350);assert.equal(upgradePrice(toaster),450);
 state=reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:toaster.id});assert.equal(state.currency,4500);assert.equal(state.stations.find(item=>item.id===toaster.id).level,2);
 state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'toastGrill'});assert.equal(state.currency,3150);assert.equal(equipmentPrice(state,'toastGrill'),2025);
});
const addOrder=(state,id='manual',recipe='coffee',slot=0)=>reducer(state,{type:'SPAWN_ORDER',order:order(id,recipe,slot)});
const start=(state,id='manual')=>reducer(state,{type:'START_COOKING',orderId:id});
const collect=(state,id='manual')=>reducer(state,{type:'COLLECT_ORDER',orderId:id});
function hired(state,id,role,stage=id==='ren'?4:7){state={...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],met:true,relationshipStage:stage}}};return reducer(state,{type:'HIRE_STAFF',characterId:id,role});}

test('starter coffee uses ingredients once, takes exactly 10 seconds, and earns only when served once',()=>{
  const fresh=addOrder(isolated());
  assert.equal(collect(fresh),fresh);
  let state=start(fresh);assert.equal(state.ingredients.coffeeBeans,9);assert.equal(state.currency,3000);
  assert.equal(start(state),state);assert.equal(collect(state),state);
  state=tick(state,9999);assert.equal(state.orders[0].status,'cooking');assert.equal(state.orders[0].remainingMs,1);
  assert.equal(collect(state),state);
  state=tick(state,1);assert.equal(state.orders[0].status,'ready');assert.equal(state.currency,3000);
  state=tick(state,300000);assert.equal(state.orders[0].status,'ready','no customer timeout');
  const served=collect(state);assert.ok(served.currency>state.currency);assert.equal(served.lifetimeStats.totalOrders,1);assert.equal(served.lifetimeStats.tagSales.coffee,1);
  assert.equal(collect(served),served);assert.equal(served.ingredients.coffeeBeans,9);
});

test('an old 30-second coffee is converted to the 10-second scale without losing progress',()=>{
  const fresh=start(addOrder(isolated()));
  const legacy={...fresh,saveVersion:14,orders:fresh.orders.map(item=>({...item,totalMs:30000,remainingMs:15000}))};
  const restored=migrateSavedState(JSON.parse(JSON.stringify(legacy)));
  assert.equal(restored.orders[0].totalMs,10000);
  assert.equal(restored.orders[0].remainingMs,5000);
  const live=reducer(legacy,{type:'TICK',deltaMs:1000});
  assert.equal(live.orders[0].totalMs,10000);
  assert.equal(live.orders[0].remainingMs,4000);
});

test('an old 30-second toast is converted to the 10-second starter scale',()=>{
  const fresh=start(addOrder(isolated(),'toast','toast'),'toast');
  const legacy={...fresh,saveVersion:15,orders:fresh.orders.map(item=>({...item,totalMs:30000,remainingMs:12000}))};
  const restored=migrateSavedState(JSON.parse(JSON.stringify(legacy)));
  assert.equal(restored.orders[0].totalMs,10000);
  assert.equal(restored.orders[0].remainingMs,4000);
});

test('different machines cook together while one physical machine still handles one dish',()=>{
  let state=addOrder(addOrder(addOrder(isolated(),'first'),'second','coffee',1),'toast','toast',2);
  state=start(state,'first');assert.match(startProblem(state,recipes[0]),/設備の空き/);
  assert.equal(start(state,'second'),state);
  state=start(state,'toast');assert.equal(state.orders.filter(item=>item.status==='cooking').length,2);
  const price=equipmentPrice(state,'coffeeCounter');state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'});assert.equal(state.currency,3000-price);
  state=start(state,'second');assert.equal(state.orders.filter(item=>item.status==='cooking').length,3);
  assert.notEqual(state.orders[0].stationId,state.orders[1].stationId);
  state=tick(state,30000);
  assert.equal(state.orders.filter(item=>item.status==='ready').length,3);
  state=addOrder(state,'next','coffee',3);assert.equal(start(state,'next'),state);
  state=collect(state,'first');state=start(state,'next');assert.equal(state.orders.find(item=>item.id==='next').status,'cooking');
});

test('insufficient food, locked recipes and missing equipment cannot consume stock or cook',()=>{
  let state=addOrder({...isolated(),ingredients:{coffeeBeans:0,bread:1}});assert.equal(start(state),state);
  state=addOrder({...isolated(),unlockedRecipes:['coffee']},'toast','toast');assert.equal(start(state,'toast'),state);
  state=addOrder({...isolated(),unlockedRecipes:['espresso'],ingredients:{espressoBlend:5}},'espresso','espresso');assert.equal(start(state,'espresso'),state);
  const purchased=reducer(isolated(),{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});assert.equal(purchased.ingredients.coffeeBeans,10);assert.equal(purchased.deliveries[0].packs,1);assert.equal(purchased.currency,3000);
});

test('all recipes have real ingredients, a valid station, intended cooking time and a sale price',()=>{
  assert.equal(recipes.length,67);
  for(const recipe of recipes){
    assert.ok(recipe.requiredIngredients.length>0,recipe.id);
    assert.equal(new Set(recipe.requiredIngredients).size,recipe.requiredIngredients.length);
    const prep=preparation(recipe);assert.ok(equipment.some(item=>item.id===prep.equipmentId),recipe.id);assert.equal(prep.seconds,recipe.price<=350?10:recipe.price<=550?20:30);
    assert.ok(salePrice(recipe.id)>0,recipe.id);
    let state={...isolated(),unlockedRecipes:[recipe.id],ownedEquipment:equipment.map(item=>item.id),stations:equipment.map(item=>({id:item.id,equipmentId:item.id,level:1})),ingredients:Object.fromEntries(recipe.requiredIngredients.map(id=>[id,1]))};
    state=start(addOrder(state,'manual',recipe.id));assert.equal(state.orders[0].status,'cooking',recipe.id);
    state=collect(tick(state,prep.seconds*1000));assert.equal(state.lifetimeStats.recipeSales[recipe.id],1,recipe.id);
    assert.ok(Object.values(state.ingredients).every(count=>count===0));
  }
});

test('upgrades shorten preparation and enforce costs, busy state, levels and machine cap',()=>{
  let state={...isolated(),currency:100000};const first=state.stations[0];const cost=upgradePrice(first);
  state=reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id});assert.equal(state.currency,100000-cost);assert.equal(cookingMs(state,recipes[0],state.stations[0]),8500);
  const cooking=start(addOrder(state));assert.equal(reducer(cooking,{type:'UPGRADE_EQUIPMENT',stationId:first.id}),cooking);
  for(let i=0;i<3;i++)state=reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id});assert.equal(state.stations[0].level,5);assert.equal(reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id}),state);
  for(let i=0;i<2;i++)state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'});assert.equal(state.stations.filter(item=>item.equipmentId==='coffeeCounter').length,3);assert.equal(reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'}),state);
});

test('Ren hires at stage 4, others at stage 7, with separate four-person floor and procurement caps',()=>{
  let state=isolated();assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'}),state);
  state=hired(state,'ren','cook',3);assert.equal(state.staff.length,0);
  state=hired(state,'ren','cook',4);assert.equal(state.currency,2400);assert.equal(state.staff.length,1);assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'server'}),state);
  state.characterProgress.haru={...state.characterProgress.haru,met:true,relationshipStage:9,route:'friendship'};
  state=reducer(state,{type:'HIRE_STAFF',characterId:'haru',role:'server'});assert.equal(state.staff.length,2);assert.equal(state.currency,1200);
  state={...state,currency:30000};state=hired(state,'sota','cook');state=hired(state,'aki','server');assert.equal(state.staff.length,4);
  state=hired(state,'itsuki','server');assert.equal(state.staff.length,4,'a fifth cooking or serving worker is rejected');
  state=hired(state,'itsuki','procurement');state=hired(state,'nagisa','procurement');state=hired(state,'sae','procurement');state=hired(state,'cacao','procurement');
  assert.equal(state.staff.length,8);
  assert.equal(state.staff.filter(person=>person.role==='cook'||person.role==='server').length,4);
  assert.equal(state.staff.filter(person=>person.role==='procurement').length,4);
  assert.equal(reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'procurement'}),state,'a fifth procurement assignment is rejected');
  assert.equal(reducer(state,{type:'ASSIGN_STAFF',characterId:'cacao',role:'server'}),state,'a fifth floor assignment is rejected');
});

test('a cook and a server run the whole loop; manual serving during delivery never pays twice',()=>{
  let state=hired(hired(isolated(),'ren','cook'),'haru','server');state=addOrder(state);
  state=tick(state,9999);assert.equal(state.orders[0].status,'cooking');assert.equal(state.currency,1200);
  state=tick(state,1);assert.equal(state.orders[0].status,'ready');assert.equal(state.staff[1].servingOrderId,'manual');
  const manual=collect(state);const afterDelivery=tick(manual,3500);assert.equal(afterDelivery.lifetimeStats.totalOrders,1);
  state=tick(state,4999);assert.equal(state.lifetimeStats.totalOrders,0);state=tick(state,1);assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.ingredients.coffeeBeans,9);assert.equal(state.currency,1225);assert.equal(state.lifetimeStats.automatedOrders,1);
});

test('a server takes the full serving duration to return before accepting another dish',()=>{
  let state=isolated();
  state={...state,spawnRemainingMs:1e12,orders:[{...order('first'),status:'ready'},{...order('second','coffee',1),status:'ready'}],staff:[{characterId:'haru',role:'server',servingOrderId:'first',remainingMs:100}]};
  state=tick(state,100);
  assert.equal(state.orders.some(item=>item.id==='first'),false);
  assert.equal(state.staff[0].returningFromSlot,0);
  assert.equal(state.staff[0].remainingMs,5000);
  assert.equal(state.staff[0].servingOrderId,undefined);
  state=tick(state,4999);
  assert.equal(state.staff[0].returningFromSlot,0);
  assert.equal(state.staff[0].remainingMs,1);
  assert.equal(state.orders.find(item=>item.id==='second').status,'ready');
  state=tick(state,1);
  assert.equal(state.staff[0].returningFromSlot,undefined);
  assert.equal(state.staff[0].servingOrderId,'second');
  assert.equal(state.staff[0].remainingMs,5000);
});

test('multiple cooks and servers cannot reserve one machine, ingredient or finished dish twice',()=>{
  let state={...isolated(),currency:20000,ingredients:{coffeeBeans:1,bread:0}};
  for(const id of ['ren','sota'])state=hired(state,id,'cook');
  for(const id of ['haru','aki'])state=hired(state,id,'server');
  state=addOrder(addOrder(state,'a'),'b','coffee',1);state=tick(state,32000);
  assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.ingredients.coffeeBeans,0);assert.equal(state.orders.length,1);assert.equal(state.orders[0].status,'queued');
  const coins=state.currency;state=tick(state,60000);assert.equal(state.currency,coins);assert.equal(state.lifetimeStats.ingredientPurchases.coffeeBeans,undefined,'no automatic procurement');
});

test('role changes finish current work before starting a new job, including resting',()=>{
  let state=hired(isolated(),'ren','cook');state=addOrder(addOrder(state,'a'),'b','coffee',1);state=tick(state,1000);
  state=reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'server'});assert.equal(state.staff[0].role,'server');
  state=tick(state,9000);assert.equal(state.orders.find(item=>item.id==='a').status,'ready');assert.equal(state.orders.find(item=>item.id==='b').status,'queued');
  state=reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'rest'});state=tick(state,5000);assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.staff[0].role,'rest');
  state=tick(state,10000);assert.equal(state.orders[0].status,'queued');
});

test('each character gains the specified specialty at level 8 only',()=>{
  const recipeIds={ren:'coffee',sota:'latte',aki:'fruitPlatter',itsuki:'strawberryCake',haru:'toast',nagisa:'tea',sae:'vanillaIceCup',cacao:'bonbonPlate'};
  for(const [id,recipeId] of Object.entries(recipeIds)){
    let state={...isolated(),currency:20000};state=hired(state,id,'cook',7);
    const recipe=recipes.find(item=>item.id===recipeId);const station={id:'station',equipmentId:preparation(recipe).equipmentId,level:1};
    const base=cookingMs(state,recipe,station,id);state.characterProgress[id].relationshipStage=8;
    assert.equal(cookingMs(state,recipe,station,id),Math.round(base*0.8),id);
    assert.equal(serveDuration({...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],relationshipStage:7}}},id),5000,id);
    assert.equal(serveDuration(state,id),4000,id);
  }
});

test('publication preserves the save key and v5 possessions, customer and recipe compatibility',()=>{
  assert.equal(GAME_CONFIG.saveKey,'komorebi-cafe-save-v1');
  const initial=createInitialState();
  const legacy={...initial,saveVersion:5,currency:987,ingredients:{coffeeBeans:7},inventory:{book:2},
    orders:[order('v5-guest','coffee',0)],nextOrderNumber:42};
  const loaded=migrateSavedState(JSON.parse(JSON.stringify(legacy)));
  assert.equal(loaded.currency,987);assert.deepEqual(loaded.ingredients,{coffeeBeans:7});
  assert.deepEqual(loaded.inventory,{book:2});assert.deepEqual(loaded.orders,legacy.orders);
  assert.deepEqual(loaded.unlockedRecipes,legacy.unlockedRecipes);
  assert.deepEqual(loaded.stations,legacy.stations);assert.equal(loaded.nextOrderNumber,42);
  assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(loaded))).orders,legacy.orders);
});

test('reload and suspended time never yield offline coins or progress; v4 migration is idempotent',()=>{
  let state=tick(start(addOrder(isolated())),3000);const saved=JSON.parse(JSON.stringify(state));
  for(const deltaMs of [0,-1,1001,86400000,Infinity,NaN])assert.equal(reducer(state,{type:'TICK',deltaMs}),state);
  const resumed=migrateSavedState(saved,Date.now()+86400000);assert.equal(resumed.currency,state.currency);assert.equal(resumed.orders[0].remainingMs,7000);assert.equal(resumed.offlineOffer,0);assert.equal(collect(resumed),resumed);
  const old={...saved,saveVersion:4,ingredients:{coffeeBeans:3},ownedEquipment:['espressoMachine'],unlockedEquipment:['espressoMachine'],orders:[{id:'old',recipeId:'coffee',customerSlot:0}],offlineOffer:480};
  const migrated=migrateSavedState(old);assert.equal(migrated.ingredients.coffeeBeans,25);assert.equal(migrated.stations.length,4);assert.equal(migrated.orders[0].status,'queued');assert.equal(migrated.currency,old.currency);assert.equal(migrated.offlineOffer,0);
  assert.deepEqual(migrateSavedState(migrated).ingredients,migrated.ingredients);
  assert.equal(reducer(migrated,{type:'CLAIM_OFFLINE'}),migrated);
});

test('visiting and gifting have no daily limit, repeated dialogue is not farmable, and trade gates stories',()=>{
  let state=reducer(isolated(),{type:'VISIT',characterId:'ren'});const aff=state.characterProgress.ren.affection;
  for(let i=0;i<20;i++)state=reducer(state,{type:'VISIT',characterId:'ren'});assert.equal(state.characterProgress.ren.affection,aff);
  state={...state,inventory:{mug:2}};for(let i=0;i<2;i++)state=closeGiftPopup(reducer(state,{type:'GIVE_GIFT',characterId:'ren',giftId:'mug',reaction:'love'}));assert.equal(state.inventory.mug,0);assert.ok(state.characterProgress.ren.affection>aff);
  assert.equal(state.characterProgress.ren.giftReactions.mug,'love');
  assert.equal(migrateSavedState(JSON.parse(JSON.stringify(state))).characterProgress.ren.giftReactions.mug,'love');
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,relationshipStage:2,affection:routeEvents('ren')[2].requiredAffection-1,viewedEvents:['ren-stage1','ren-stage2']}}};assert.equal(availableEvent(state,relationshipEvents),undefined);
  state=trade(state,5);state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});assert.equal(availableEvent(state,relationshipEvents)?.id,'ren-stage3');
});

test('automatic order generation respects stock, slots and capacity during sustained play',()=>{
  let state=hired(hired({...isolated(),spawnRemainingMs:1000},'ren','cook'),'haru','server');state=tick(state,700000);
  assert.ok(state.lifetimeStats.totalOrders>=19);assert.ok(state.orders.length<=4);assert.ok(Object.values(state.ingredients).every(count=>count>=0));
  const coins=state.currency;state=tick(state,60000);assert.equal(state.currency,coins);
  state={...state,orders:[],deliveries:[],ingredients:{...state.ingredients,coffeeBeans:4},spawnRemainingMs:1e12,staff:state.staff.map(person=>({...person,servingOrderId:undefined,remainingMs:0}))};
  state=reducer(state,{type:'SPAWN_ORDER',order:order('restocked','coffee')});state=tick(state,120000);assert.ok(state.currency>coins);
});

test('supplies are free, starter coffee is cheap, and later recipes earn more',()=>{
  assert.equal(createInitialState().currency,200);
  assert.equal(salePrice('coffee'),25);
  assert.equal(salePrice('toast'),75);
  assert.equal(salePrice('cafeMocha'),205);
  for(const recipe of recipes){
    assert.equal(ingredientCost(recipe.id),0);
    assert.equal(salePrice(recipe.id),Math.round(recipe.price/2));
    if(recipe.id!=='coffee')assert.ok(salePrice(recipe.id)>salePrice('coffee'));
  }
  assert.equal(missions.find(mission=>mission.id==='coffee-three').target,2);
  assert.equal(missions.find(mission=>mission.id==='coffee-ten').target,5);
  assert.equal(growthEvents.find(event=>event.eventId==='ren-growth1').requiredStats[0].target,2);
  assert.equal(growthEvents.find(event=>event.eventId==='ren-growth3').requiredStats[0].target,5);
  assert.equal(gifts.find(gift=>gift.id==='book').price,300);
  assert.equal(upgradePrice(createInitialState().stations[0]),450);
  const state=createInitialState();
  assert.equal(reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:state.stations[0].id}),state);
  assert.equal(missions.length,59+characters.length*11);
  assert.equal(new Set(missions.map(m=>m.id)).size,147);
  assert.ok(missions.every(m=>m.reward>0&&m.title.length<=30&&m.hint.length<=60),'mission copy stays short and uses hints only for unclear conditions');
  assert.equal(missions.find(mission=>mission.id==='beans-arrive').hint,'');
  assert.equal(missions.find(mission=>mission.id==='ren-growth2').hint,'蓮の好感度2以上\nコーヒー豆を累計2パック発注で発生');
  assert.equal(missionChapters.length,missions.length/3);
});

test('missions are generated in locked groups of three and later progress stays hidden',()=>{
  assert.equal(missions.length,59+characters.length*11);
  assert.equal(new Set(missions.map(m=>m.id)).size,missions.length);
  assert.ok(missionChapters.every(chapter=>chapter.missions.length===3));
  assert.deepEqual(missionChapters[2].missions.map(mission=>mission.id),['first-order','first-cook','first-serve']);
  assert.deepEqual(missionChapters[3].missions.map(mission=>mission.id),['forest-enter','forest-gather','forest-bring-home']);
  assert.deepEqual(missionChapters[4].missions.map(mission=>mission.id),['toast-order','install-toaster','bread-first']);
  for(const character of characters){
    for(const prefix of ['supply','bond3','bond6','growth5','bond10'])assert.ok(missions.some(m=>m.id===`${prefix}-${character.id}`));
    assert.ok(missions.some(m=>m.id===`install-${character.id}-equipment`));
    for(const location of dateLocations)assert.ok(missions.some(m=>m.id===`${character.id}-date-${location.id}`));
  }
  assert.ok(missions.some(mission=>mission.id==='install-prep-table'));
  assert.ok(missions.some(mission=>mission.id==='install-second-coffee-counter'));
  assert.deepEqual(missions.filter(mission=>mission.id.startsWith('upgrade-')).map(mission=>[mission.id,mission.target]),[
    ['upgrade-toast-grill',2],['upgrade-prep-table',2],['upgrade-coffee-counter',2],
  ]);
  assert.equal(missions.filter(mission=>mission.id.startsWith('upgrade-')).length,3);
  assert.deepEqual(missionChapters[10].missions.map(mission=>mission.id),['chocolate-arrive','serve-mocha','chocolate-three']);
  assert.deepEqual(missionChapters[11].missions.map(mission=>mission.id),['bond3-ren','bond4-ren','hire-ren']);
  assert.deepEqual(missionChapters[12].missions.map(mission=>mission.id),['assign-ren-procurement','ren-first-staff-supply','install-prep-table']);
  assert.deepEqual(missionChapters[13].missions.map(mission=>mission.id),['forest-floor-10','forest-fragment-1','forest-floor-20']);
  assert.deepEqual(missionChapters[14].missions.map(mission=>mission.id),['upgrade-toast-grill','upgrade-prep-table','upgrade-coffee-counter']);
  assert.equal(missionChapters[15].missions[0].id,'install-second-coffee-counter');
  const forestChapters=missionChapters.filter(chapter=>chapter.missions.every(mission=>mission.id.startsWith('forest-')));
  assert.deepEqual(forestChapters.map(chapter=>chapter.missions.map(mission=>mission.id)),[
    ['forest-enter','forest-gather','forest-bring-home'],
    ['forest-floor-10','forest-fragment-1','forest-floor-20'],
    ['forest-recipe-1','forest-cook-1','forest-serve-1'],
    ['forest-floor-30','forest-floor-40','forest-recipes-2'],
    ['forest-cook-2','forest-serve-2','forest-floor-50'],
    ['forest-floor-60','forest-recipes-4','forest-serve-4'],
    ['forest-floor-70','forest-recipes-all','forest-serve-all'],
  ]);
  assert.deepEqual(missions.filter(mission=>mission.id.startsWith('hire-')).map(mission=>mission.id),['hire-ren','hire-second','hire-third','hire-fourth']);
  let state=createInitialState();
  assert.deepEqual(getMissions(state).map(m=>m.id),['visit-town','meet-ren','ren-story1']);
  state=addOrder(state);
  assert.ok(!state.missions.completed.includes('first-order'),'a future mission is not active yet');
  state=updateMissions({...state,missions:{...state.missions,visited:['town']},characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,met:true,relationshipStage:1}}});
  assert.ok(getMissions(state).every(m=>state.missions.completed.includes(m.id)));
  assert.equal(reducer(state,{type:'CLAIM_MISSION',missionId:'beans-first'}),state,'the next group cannot be claimed early');
  const before=state.currency;
  for(const mission of [...getMissions(state)].reverse())state=reducer(state,{type:'CLAIM_MISSION',missionId:mission.id});
  assert.equal(state.currency,before+30);
  assert.deepEqual(getMissions(state).map(m=>m.id),['beans-first','beans-arrive','second-table']);
  assert.equal(getMissions(state).length,3);
  assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(state))).missions,state.missions);
});

test('mission UI renders only the current three goals and advances its step',()=>{
  let state=createInitialState();
  const ui={};
  const source=readFileSync(new URL('../src/components/MissionGuide.tsx',import.meta.url),'utf8')+'\nexport { MissionNotebook };';
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports',compiled)(name=>{
    if(name==='../game/GameContext')return {useGame:()=>({state,dispatch(){}})};
    if(name==='../game/missions')return {sortedMissions,missionRank,activeMissionChapter,activeSideMissions,missionChapters};
    return require(name);
  },ui);
  const {createElement}=require('react');
  const {renderToStaticMarkup}=require('react-dom/server');
  const render=component=>renderToStaticMarkup(createElement(component,{onClose(){},onGo(){}}));
  const initial=render(ui.MissionNotebook);
  assert.match(initial, /id="mission-title">ミッション<\/h2>/);
  assert.match(initial,new RegExp(`ステップ 1 \\/ ${missionChapters.length}`));
  assert.equal((initial.match(/data-mission-id=/g)||[]).length,3);
  assert.equal((initial.match(/class="mission-go"/g)||[]).length,3);
  assert.equal((initial.match(/class="mission-footer"/g)||[]).length,3);
  assert.equal((initial.match(/side-orders-|side-sales-|side-gifts-/g)||[]).length,0,'side ids stay internal');
  assert.match(initial,/サブミッション/);
  assert.match(initial,/class="mission-hint"/);
  assert.match(initial,/\+15 コイン/);
  assert.doesNotMatch(initial,/beans-first|first-order|class="mission-claim"/);
  state=updateMissions({...state,missions:{...state.missions,visited:['town']},characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,met:true,relationshipStage:1}}});
  assert.match(render(ui.MissionGuide),/class="mission-badge"/);
  assert.equal((render(ui.MissionNotebook).match(/class="mission-claim"/g)||[]).length,3);
  for(const mission of getMissions(state))state=reducer(state,{type:'CLAIM_MISSION',missionId:mission.id});
  const secondStep=render(ui.MissionNotebook);
  assert.match(secondStep,new RegExp(`ステップ 2 \\/ ${missionChapters.length}`));
  assert.doesNotMatch(secondStep,/visit-town|class="mission-hint"/);
  assert.doesNotMatch(render(ui.MissionGuide),/class="mission-badge"/);
  const prior=missionChapters.slice(0,3).flatMap(c=>c.missions.map(m=>m.id));
  state={...state,lifetimeStats:{...state.lifetimeStats,totalOrders:1},missions:{...state.missions,claimed:prior,completed:prior}};
  const forestStep=render(ui.MissionNotebook);
  assert.match(forestStep,new RegExp(`ステップ 4 \/ ${missionChapters.length}`));
  assert.equal((forestStep.match(/森の入口へ →/g)||[]).length,3);
  assert.match(forestStep,/forest-enter/);assert.match(forestStep,/forest-bring-home/);assert.doesNotMatch(forestStep,/toast-order/);
});

test('old recurring mission data is removed while valid roadmap rewards survive migration',()=>{
  const old=createInitialState();old.saveVersion=7;delete old.missions.ongoing;
  old.currency=1234;old.lifetimeStats.totalOrders=1000;old.lifetimeStats.tagSales.drink=700;
  old.missions.receivedPacks={coffeeBeans:100};old.missions.claimed=['visit-town'];
  const state=migrateSavedState(old);
  assert.equal(state.saveVersion,GAME_CONFIG.saveVersion);assert.equal(state.currency,1234);
  assert.ok(state.missions.claimed.includes('visit-town'));
  assert.deepEqual(state.missions.ongoing,[]);
  assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(state))).missions,state.missions);
  const malformed={...state,missions:{...state.missions,ongoing:[null,{id:'ongoing-service-0',kind:'service',round:0,start:0}]}};
  assert.deepEqual(migrateSavedState(malformed).missions.ongoing,[]);
});

test('v6 saves keep money and reconstruct received packs without granting duplicate mission coins',()=>{
  const old={...isolated(),saveVersion:6,currency:12345,lifetimeStats:{...isolated().lifetimeStats,ingredientPurchases:{coffeeBeans:4}},deliveries:[{id:'pending',ingredientId:'coffeeBeans',packs:2,orderedAt:1000,arrivesAt:5000}]};
  delete old.missions;
  let state=migrateSavedState(old,2000);
  assert.equal(state.currency,12345);assert.equal(state.missions.receivedPacks.coffeeBeans,2);
  assert.equal(state.missions.claimed.length,0);
  state=migrateSavedState(JSON.parse(JSON.stringify(state)),5000);
  assert.equal(state.missions.receivedPacks.coffeeBeans,4);
  const again=migrateSavedState(JSON.parse(JSON.stringify(state)),6000);
  assert.deepEqual(again.missions,state.missions);assert.equal(again.currency,12345);
});

test('mission dishes arrive before their remaining supplies and equipment are ready',()=>{
  let state=stockedCafe();
  const random=Math.random;
  try{
    Math.random=()=>.99;
    assert.deepEqual(pickIncomingOrder(state),{recipeId:'toast'});
    state={...state,ingredients:{coffeeBeans:1,bread:0},orders:[order()]};
    assert.deepEqual(pickIncomingOrder(state),{recipeId:'toast'},'another seat may show a dish whose remaining conditions are not ready');
    state={...state,orders:[],unlockedRecipes:[...state.unlockedRecipes,'cafeMocha'],ingredients:{coffeeBeans:1,milk:1,chocolate:1}};
    assert.deepEqual(pickIncomingOrder(state),{recipeId:'cafeMocha'});
    const missing={...state,ingredients:{coffeeBeans:1}};
    assert.deepEqual(pickIncomingOrder(missing),{recipeId:'cafeMocha'});
    state={...state,missions:{...state.missions,claimed:['serve-mocha']},lifetimeStats:{...state.lifetimeStats,totalOrders:3},ingredients:{coffeeBeans:10,bread:10}};
    Math.random=()=>0;assert.deepEqual(pickIncomingOrder(state),{recipeId:'latte',request:true});
  }finally{Math.random=random;}
});

test('the early toast mission creates one actionable order before bread or a toaster is ready',()=>{
  const claimed=missionChapters.slice(0,4).flatMap(chapter=>chapter.missions.map(mission=>mission.id));
  let state={...createInitialState(),tableCount:2,missions:{...createInitialState().missions,claimed,completed:claimed},spawnRemainingMs:1e12};
  assert.equal(currentMission(state).id,'toast-order');
  assert.deepEqual(pickIncomingOrder(state),{recipeId:'toast'});
  state=reducer(state,{type:'SPAWN_ORDER',order:order('early-toast','toast')});
  assert.ok(state.missions.completed.includes('toast-order'));
  assert.match(startProblem(state,recipes.find(recipe=>recipe.id==='toast')),/設備/);
  assert.deepEqual(pickIncomingOrder(state),{recipeId:'coffee'},'only one unmet mission order occupies the cafe');
});

test('a fresh player follows the early mission groups including forest exploration through the first developed recipe',t=>{
  let state=createInitialState(),now=1000000,elapsed=0,firstDevelopmentAt=0;
  const random=Math.random;Math.random=()=>.9;
  const act=action=>{state=reducer(state,action);assert.ok(state.currency>=0);assert.ok(Object.values(state.ingredients).every(n=>n>=0));};
  const settleStories=()=>{
    for(let i=0;i<15;i++){
      const event=availableEvent(state,relationshipEvents);
      if(event){act({type:'COMPLETE_EVENT',eventId:event.id,choiceId:event.choices?.[0]?.id,route:'friendship'});continue;}
      const growth=availableGrowthEvent(state);
      if(growth){act({type:'COMPLETE_GROWTH_EVENT',eventId:growth.eventId});if(growth.eventId==='ren-growth3')firstDevelopmentAt=elapsed;continue;}
      break;
    }
  };
  const serveWhileWaiting=()=>{
    for(const o of state.orders.filter(o=>o.status==='ready'))act({type:'COLLECT_ORDER',orderId:o.id});
    for(const o of state.orders.filter(o=>o.status==='queued')){act({type:'START_COOKING',orderId:o.id});if(state.orders.some(o=>o.status==='cooking'))break;}
    now+=1000;elapsed+=1000;act({type:'TICK',deltaMs:1000,now});settleStories();
  };
  const view=place=>act({type:'MISSION_VIEW',place});
  const buy=ingredientId=>{
    if(!state.deliveries.length)act({type:'BUY_INGREDIENT',ingredientId,packs:1,now});
    serveWhileWaiting();
  };
  try{
    for(let i=0;i<3000&&!state.missions.claimed.includes('serve-mocha');i++){
      settleStories();
      const mission=currentMission(state);
      if(state.missions.completed.includes(mission.id)){
        const before=state.currency;act({type:'CLAIM_MISSION',missionId:mission.id});assert.equal(state.currency,before+mission.reward);
        const saved=JSON.parse(JSON.stringify(state));state=migrateSavedState(saved,now);assert.equal(state.currency,before+mission.reward);
        continue;
      }
      switch(mission.id){
        case 'visit-town':view('town');break;
        case 'meet-ren':case 'talk-ren':case 'ren-story1':case 'ren-story2':act({type:'VISIT',characterId:'ren'});break;
        case 'beans-first':case 'beans-second':buy('coffeeBeans');break;
        case 'forest-enter':act({type:'FOREST_ENTER',now});break;
        case 'forest-gather':act({type:'FOREST_GATHER',floor:1,spot:0,now});break;
        case 'forest-bring-home':act({type:'FOREST_TAKE'});act({type:'FOREST_RETURN'});act({type:'FOREST_CLAIM'});break;
        case 'second-table':act({type:'BUY_TABLE',expectedCount:state.tableCount});break;
        case 'install-toaster':act({type:'BUY_EQUIPMENT',equipmentId:'toastGrill'});break;
        case 'bread-first':buy('bread');break;
        case 'visit-gifts':view('gifts');break;
        case 'buy-book':act({type:'BUY_GIFT',giftId:'book'});break;
        case 'give-book':act({type:'GIVE_GIFT',characterId:'ren',giftId:'book',reaction:'like'});state=closeGiftPopup(state);break;
        case 'meet-sota':act({type:'VISIT',characterId:'sota'});break;
        case 'buy-milk':buy('milk');break;
        case 'meet-cacao':act({type:'VISIT',characterId:'cacao'});break;
        case 'buy-chocolate':buy('chocolate');break;
        default:{
          // Replenish when the available beans are all consumed or reserved.
          const reserved=state.orders.filter(o=>o.status==='queued').filter(o=>recipes.find(r=>r.id===o.recipeId)?.requiredIngredients.includes('coffeeBeans')).length;
          if((state.ingredients.coffeeBeans||0)<=reserved&&!state.deliveries.length)buy('coffeeBeans');
          else serveWhileWaiting();
        }
      }
    }
    assert.ok(state.missions.claimed.includes('serve-mocha'),`stuck on ${currentMission(state)?.id}, coins=${state.currency}, elapsed=${elapsed/1000}s`);
    assert.equal(state.missions.claimed.length,32);
    assert.ok(firstDevelopmentAt>0&&firstDevelopmentAt<=15*60000,`development took ${firstDevelopmentAt/1000}s`);
    assert.ok(state.lifetimeStats.recipeSales.cafeMocha>=1);
    const claimedRewards=missions.filter(m=>state.missions.claimed.includes(m.id)).reduce((sum,m)=>sum+m.reward,0);
    const expected=GAME_CONFIG.initialCurrency+state.lifetimeStats.totalRevenue+claimedRewards-450;
    assert.equal(state.currency,expected,'free supplies, one table, one toaster and one book are accounted for exactly once');
    t.diagnostic(`guided play: first development ${firstDevelopmentAt/1000}s, introduction ${elapsed/1000}s, ${state.lifetimeStats.totalOrders} dishes`);
  }finally{Math.random=random;}
});

test('unlocked menu orders stay balanced even when every ingredient is out of stock',()=>{
  let state={...isolated(),ingredients:{coffeeBeans:0,bread:0}};
  state=addOrder(state);for(let i=0;i<20;i++)assert.equal(pickWeightedRecipe(state),'toast');
  state=addOrder(state,'toast','toast',1);assert.ok(['coffee','toast'].includes(pickWeightedRecipe(state)));
  assert.equal(state.ingredients.coffeeBeans,0,'admission does not invent or consume ingredients');
});

test('saved simultaneous cooking resumes concurrently without losing time, stock or save compatibility', () => {
  const initial = stockedCafe();
  const coffeeStation = initial.stations.find(item => item.equipmentId === 'coffeeCounter');
  const toastStation = initial.stations.find(item => item.equipmentId === 'toastGrill');
  let state = migrateSavedState({ ...initial, spawnRemainingMs: 1e12, orders: [
    { ...order('old-coffee'), status: 'cooking', totalMs: 10000, remainingMs: 2000, stationId: coffeeStation.id },
    { ...order('old-toast', 'toast', 1), status: 'cooking', totalMs: 8000, remainingMs: 4000, stationId: toastStation.id },
  ] });
  const stock = { ...state.ingredients };
  state = tick(state, 1000);
  assert.deepEqual(state.orders.map(item => item.remainingMs), [1000, 3000]);
  state = tick(state, 1000);
  assert.deepEqual(state.orders.map(item => [item.status, item.remainingMs]), [['ready', 0], ['cooking', 2000]]);
  state = migrateSavedState(JSON.parse(JSON.stringify(state)));
  state = tick(state, 2000);
  assert.ok(state.orders.every(item => item.status === 'ready'));
  assert.deepEqual(state.ingredients, stock);
  assert.equal(state.lifetimeStats.totalOrders, 0);
});

test('staff and manual work can use different machines at the same time', () => {
  let state = { ...stockedCafe(), spawnRemainingMs: 1e12,
    staff: [{ characterId: 'ren', role: 'cook', remainingMs: 0 }, { characterId: 'haru', role: 'cook', remainingMs: 0 }],
    orders: [order('manual'), order('staff-toast', 'toast', 1), order('next-coffee', 'coffee', 2)] };
  state = reducer(state, { type: 'START_COOKING', orderId: 'manual' });
  state = tick(state, 1000);
  assert.equal(state.orders.filter(item => item.status === 'cooking').length, 2);
  assert.equal(state.orders[1].status, 'cooking');
  state = tick(state, 9000);
  assert.equal(state.orders[0].status, 'ready');
  assert.equal(state.orders[1].status, 'ready');
  assert.equal(state.orders[2].status, 'queued');
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: 'manual' });
  state = tick(state, 100);
  assert.equal(state.orders.find(item=>item.id==='next-coffee').status,'cooking');
});

test('legacy weather and trend fields no longer affect orders, prices or rotate during service', () => {
  const { salePrice } = require(join(output, 'game/logic.js'));
  const state = { ...createInitialState(), spawnRemainingMs: 1e12 };
  const originalRandom = Math.random;
  try {
    for (const value of [0, .2, .5, .9]) {
      Math.random = () => value;
      const expected = pickWeightedRecipe(state);
      for (let day = 1; day <= 12; day++) {
        const { conditionForDay } = require(join(output, 'data/dailyConditions.js'));
        const condition = conditionForDay(day);
        const changed = { ...state, dailyWeatherId: condition.weatherId, dailyCustomerGroupId: condition.customerGroupId, dailyEventId: condition.dailyEventId };
        assert.equal(pickWeightedRecipe(changed), expected);
        assert.equal(salePrice('coffee', changed), 25);
      }
    }
  } finally { Math.random = originalRandom; }
  const later = tick(state, 301000);
  for (const key of ["dailyWeatherId", "dailyCustomerGroupId", "dailyEventId"]) assert.equal(later[key], state[key]);
});

test('bulk procurement scales with quantity and rejects further purchases until the complete batch arrives', () => {
  let state = reducer(isolated(), { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 1000 });
  assert.equal(state.currency, 3000);
  assert.equal(state.ingredients.coffeeBeans, 10);
  assert.equal(state.deliveries[0].arrivesAt, 181000);
  for (const now of [1000, 31000, 180999]) {
    const rejected = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 2, now });
    for (const key of ['currency', 'ingredients', 'deliveries', 'characterProgress', 'lifetimeStats']) assert.deepEqual(rejected[key], state[key]);
    assert.match(rejected.notice.text, /追加発注できません/);
  }
  state = migrateSavedState(JSON.parse(JSON.stringify(state)), 31000);
  assert.equal(procurementQuote(state, 'coffeeBeans', 2, 31000).blocking.id, state.deliveries[0].id);
  assert.equal(receiveSupplies(state, 180999), state);
  state = receiveSupplies(state, 181000);
  assert.equal(state.ingredients.coffeeBeans, 22);
  assert.equal(state.deliveries.length, 0);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 2, now: 181000 });
  assert.equal(state.deliveries.length, 1);
  assert.equal(state.deliveries[0].arrivesAt, 301000);
  const restored = migrateSavedState(JSON.parse(JSON.stringify(state)), 301000);
  assert.equal(restored.ingredients.coffeeBeans, 30);
  assert.equal(restored.currency, 3000);
  assert.equal(restored.deliveries.length, 0);
  assert.equal(restored.lifetimeStats.ingredientPurchases.coffeeBeans, 5);
  assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(restored)), 301000).ingredients, restored.ingredients);
  assert.equal(restored.lifetimeStats.totalRevenue, 0);
});

test('invalid procurement is rejected, while free supplies still unlock recipes on arrival', () => {
  const state = isolated();
  for (const packs of [0, -1, 1.5, 21, NaN, Infinity]) assert.equal(reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', packs }), state);
  assert.equal(reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'espressoBlend', packs: 2 }), state);
  const broke = { ...state, currency: 0 };
  const freeOrder = reducer(broke, { type: 'BUY_INGREDIENT', ingredientId: 'milk' });
  assert.equal(freeOrder.currency, 0);
  assert.equal(freeOrder.deliveries.length, 1);
  const ordered = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 1000 });
  assert.equal(ordered.unlockedRecipes.includes('latte'), false);
  const arrived = receiveSupplies(ordered, 61000);
  assert.equal(arrived.unlockedRecipes.includes('latte'), true);
  assert.equal(arrived.ingredients.milk, 4);
});

test('a v5 save keeps all possessions and cooking progress when upgraded to deliveries', () => {
  let state = start(addOrder(isolated()));
  state = tick(state, 1000);
  const old = { ...state, saveVersion: 5 };
  delete old.deliveries;
  const restored = migrateSavedState(JSON.parse(JSON.stringify(old)), 1000000);
  for (const key of ['currency', 'ingredients', 'orders', 'stations', 'staff', 'inventory', 'characterProgress', 'lifetimeStats', 'unlockedRecipes']) assert.deepEqual(restored[key], JSON.parse(JSON.stringify(old[key])));
  assert.deepEqual(restored.deliveries, []);
  assert.equal(restored.saveVersion, GAME_CONFIG.saveVersion);
});

test('requests are attainable, limited to one, and cannot reveal locked story or secret recipes', () => {
  const { pickIncomingOrder } = require(join(output, 'game/logic.js'));
  const originalRandom = Math.random;
  let state = { ...isolated(), lifetimeStats: { ...isolated().lifetimeStats, totalOrders: 3 } };
  try {
    Math.random = () => 0;
    assert.deepEqual(pickIncomingOrder(state), { recipeId: 'latte', request: true });
    const waiting = { ...state, orders: [{ ...order('request', 'latte'), request: true }] };
    assert.equal(pickIncomingOrder(waiting)?.request, undefined);
    for (let i = 0; i < 20; i++) {
      let calls = 0;
      Math.random = () => calls++ % 2 ? i / 20 : 0;
      const picked = pickIncomingOrder(state);
      const recipe = recipes.find(item => item.id === picked.recipeId);
      assert.ok(state.unlockedRecipes.includes(recipe.id) || (!recipe.unlockEventId && !recipe.hidden && !recipe.limited));
    }
    Math.random = () => 0;
    assert.equal(pickIncomingOrder(isolated())?.request, undefined, 'the first three trades remain simple');
    assert.deepEqual(pickIncomingOrder({ ...state, currency: 0, ingredients: {} }), {recipeId:'coffee',request:true}, 'free procurement keeps requests attainable without coins');
    state = { ...state, ingredients: { bread: 10 } };
    assert.deepEqual(pickIncomingOrder(state), { recipeId: 'coffee', request: true });
  } finally { Math.random = originalRandom; }
});

test('a request waits for delivery, cooks serially, earns its bonus only on serving, and can be declined beforehand', () => {
  let state = { ...isolated(), orders: [{ ...order('request', 'latte'), request: true }] };
  assert.equal(start(state, 'request'), state);
  const cancelled = reducer(state, { type: 'DECLINE_ORDER', orderId: 'request' });
  assert.equal(cancelled.orders.length, 0);
  assert.equal(cancelled.currency, state.currency);
  assert.equal(cancelled.lifetimeStats.totalOrders, 0);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 1000 });
  state = reducer(state, { type: 'TICK', deltaMs: 100, now: 61000 });
  state = start(state, 'request');
  assert.equal(state.orders[0].status, 'cooking');
  assert.equal(reducer(state, { type: 'DECLINE_ORDER', orderId: 'request' }), state);
  state = tick(state, 30000);
  const coins = state.currency;
  const served = reducer(state, { type: 'COLLECT_ORDER', orderId: 'request' });
  assert.equal(served.currency - coins, Math.round(salePrice('latte') * GAME_CONFIG.requestOrderBonus));
  assert.equal(served.lifetimeStats.totalOrders, 1);
  assert.equal(reducer(served, { type: 'COLLECT_ORDER', orderId: 'request' }), served);
});


test('one global procurement lane blocks different items without charging or granting affection', () => {
  const state = reducer(isolated(), { type: 'BUY_INGREDIENT', ingredientId: 'bread', packs: 2, now: 1000 });
  for (const ingredientId of ['bread', 'flour', 'milk']) {
    const quote = procurementQuote(state, ingredientId, 1, 1001);
    assert.equal(quote.blocking.ingredientId, 'bread');
    const rejected = reducer(state, { type: 'BUY_INGREDIENT', ingredientId, now: 1001 });
    for (const key of ['currency', 'characterProgress', 'ingredients', 'deliveries', 'lifetimeStats']) assert.deepEqual(rejected[key], state[key]);
    assert.match(rejected.notice.text, /入荷待ち/);
  }
  const restored = migrateSavedState(JSON.parse(JSON.stringify(state)), 2000);
  assert.ok(procurementQuote(restored, 'milk', 1, 2000).blocking);
  const next = reducer(restored, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 121000 });
  assert.equal(next.ingredients.bread, state.ingredients.bread + 8, 'overdue batch settles before next purchase');
  assert.equal(next.deliveries.length, 1);
  assert.equal(next.deliveries[0].ingredientId, 'milk');
  assert.equal(next.deliveries[0].arrivesAt, 181000);
});

test('early supplies shorten at level 1 while later supplies scale from 60 to 30 seconds', () => {
  for (const character of characters) {
    const ingredient = ingredients.find(item => item.supplierId === character.supplierId && !item.unlockEventId);
    for (const route of ['romance', 'friendship']) {
      for (let level = 0; level <= 10; level++) {
        const initial = isolated();
        const state = { ...initial, characterProgress: { ...initial.characterProgress, [character.id]: { ...initial.characterProgress[character.id], met: true, route, relationshipStage: level } } };
        const rate = procurementRate(state, ingredient.id);
        const starter=['coffeeBeans','bread'].includes(ingredient.id);
        const early=['milk','chocolate'].includes(ingredient.id);
        const expected=starter&&level>=1?20000:early&&level>=1?Math.round(40000-10000*(level-1)/9):60000-3000*level;
        assert.equal(rate.perPackMs,expected);
        const ordered = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: ingredient.id, packs: 3, now: 1000 });
        assert.equal(ordered.deliveries[0].arrivesAt, 1000 + rate.perPackMs * 3);
        const other = ingredients.find(item => item.supplierId !== character.supplierId && !item.unlockEventId);
        assert.equal(procurementRate(state, other.id).perPackMs, 60000);
      }
    }
  }
  for(const ingredientId of ['milk','chocolate']){
    const character=characters.find(person=>person.supplierId===ingredients.find(item=>item.id===ingredientId).supplierId);
    const initial=isolated();
    const state={...initial,characterProgress:{...initial.characterProgress,[character.id]:{...initial.characterProgress[character.id],relationshipStage:1}}};
    assert.equal(procurementRate(state,ingredientId).perPackMs,40000);
  }
  let state = reducer(isolated(), { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', now: 1000 });
  state = { ...state, characterProgress: { ...state.characterProgress, ren: { ...state.characterProgress.ren, relationshipStage: 10 } } };
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 2000 });
  assert.deepEqual(state.deliveries.map(item => item.arrivesAt), [61000]);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 61000 });
  assert.deepEqual(state.deliveries.map(item => item.arrivesAt), [121000]);
  const restored = migrateSavedState(JSON.parse(JSON.stringify(state)), 120999);
  assert.equal(restored.ingredients.coffeeBeans, 14);
  assert.equal(restored.deliveries[0].arrivesAt, 121000);
  assert.equal(receiveSupplies(restored, 121000).ingredients.coffeeBeans, 26);
});

test('each supplier improvement changes only that suppliers packs from four servings to five',()=>{
  let state={...createInitialState(),currency:1000};
  assert.equal(supplyPackSize(state,'coffeeBeans'),4);
  assert.equal(supplyPackSize(state,'milk'),4);
  state={...state,viewedGrowthEvents:['ren-growth1']};
  assert.equal(supplyPackSize(state,'coffeeBeans'),5);
  assert.equal(supplyPackSize(state,'teaLeaves'),5);
  assert.equal(supplyPackSize(state,'milk'),4);
  state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans',now:1000});
  assert.equal(state.deliveries[0].servingsPerPack,5);
  state=receiveAll(state);
  assert.equal(state.ingredients.coffeeBeans,5);
});

test('every character unlocks three safe date destinations at level eight',()=>{
  assert.equal(dateEvents.length,characters.length*3);
  assert.deepEqual(dateLocations.map(location=>location.id),['amusement','walk','home']);
  for(const character of characters){
    const dates=dateEvents.filter(event=>event.characterId===character.id);
    assert.equal(dates.length,3);
    assert.ok(dates.every(event=>event.dialogue.length>=2));
  }
  const date=dateEvents.find(event=>event.id==='ren-date-home');
  let state=createInitialState();
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,met:true,relationshipStage:7,affection:200}}};
  assert.equal(reducer(state,{type:'COMPLETE_DATE',eventId:date.id}),state,'level seven cannot date');
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,relationshipStage:8,affection:245}}};
  const completed=reducer(state,{type:'COMPLETE_DATE',eventId:date.id});
  assert.ok(completed.viewedDateEvents.includes(date.id));
  assert.equal(completed.characterProgress.ren.affection,245+GAME_CONFIG.dateAffection);
  assert.equal(reducer(completed,{type:'COMPLETE_DATE',eventId:date.id}),completed,'replaying a date cannot farm affection');
});

test('procurement staff can be asked from an order and automate only missing order stock at stage 9',()=>{
  let state={...createInitialState(),currency:10000,spawnRemainingMs:1e12,viewedGrowthEvents:['ren-growth1'],ingredients:{coffeeBeans:0},orders:[order('auto')]};
  for(const [id,role] of [['ren','procurement'],['sota','cook'],['aki','server']])state={...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],met:true,relationshipStage:9}},staff:[...state.staff,{characterId:id,role,remainingMs:0}]};
  assert.ok(autoProcurementUnlocked(state));
  state=runAutoProcurement(state,1000);
  assert.equal(state.deliveries.length,1);
  assert.equal(state.deliveries[0].ingredientId,'coffeeBeans');
  assert.equal(state.deliveries[0].automatic,true);
  assert.equal(state.deliveries[0].servingsPerPack,5);
  assert.equal(state.deliveries[0].staffId,'ren');
  assert.match(state.notice.text,/蓮が「コーヒー豆」を仕入れに行きました/);
  const affection=state.characterProgress.ren.affection;
  state=receiveAll(state);
  assert.equal(state.lifetimeStats.automaticPacks,1);
  assert.equal(state.characterProgress.ren.affection,affection,'automatic purchases do not farm affection');
  state={...state,deliveries:[],orders:[order('auto-serve')],ingredients:{coffeeBeans:1}};
  state=tick(state,14000);
  assert.equal(state.lifetimeStats.automatedOrders,1);
  const manualBase={...state,orders:[order('manual-supply','coffee')],ingredients:{coffeeBeans:0},deliveries:[],characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,relationshipStage:8}}};
  const manual=requestStaffSupply(manualBase,'manual-supply','coffeeBeans','ren',2000,false);
  assert.equal(manual.deliveries[0].automatic,undefined);
  assert.match(manual.notice.text,/蓮が「コーヒー豆」を仕入れに行きました/);
});

test('the owner and three procurement workers can fetch four supplies in parallel',()=>{
  let state={...isolated(),orders:[order('coffee','coffee'),order('latte','latte',1),order('toast','toast',2)],ingredients:{coffeeBeans:0,milk:0,bread:0}};
  for(const id of ['ren','sota','haru'])state={...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],met:true,relationshipStage:9}},staff:[...state.staff,{characterId:id,role:'procurement',remainingMs:0}]};
  state=runAutoProcurement(state,1000);
  assert.equal(state.deliveries.length,3);
  assert.deepEqual(new Set(state.deliveries.map(delivery=>delivery.staffId)),new Set(['ren','sota','haru']));
  assert.deepEqual(new Set(state.deliveries.map(delivery=>delivery.ingredientId)),new Set(['coffeeBeans','milk','bread']));
  assert.equal(state.lifetimeStats.staffProcurementOrders,3);
  state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'flour',now:1001});
  assert.equal(state.deliveries.length,4,'the owner has a separate procurement lane');
  assert.equal(procurementQuote(state,'teaLeaves',1,1002).blocking.ingredientId,'flour');
  assert.equal(procurementQuote(state,'teaLeaves',1,1002,'ren').blocking.staffId,'ren');
});

test('previously paid parallel deliveries preserve their deadlines and settle exactly once', () => {
  const initial = isolated();
  const old = { ...initial, deliveries: [
    { id: 'old-coffee', ingredientId: 'coffeeBeans', packs: 3, orderedAt: 1000, arrivesAt: 181000 },
    { id: 'old-milk', ingredientId: 'milk', packs: 2, orderedAt: 2000, arrivesAt: 182000 },
  ] };
  const restored = migrateSavedState(JSON.parse(JSON.stringify(old)), 100000);
  assert.deepEqual(restored.deliveries, old.deliveries.map(item=>({...item,servingsPerPack:5})));
  assert.ok(procurementQuote(restored, 'coffeeBeans', 1, 100000).blocking);
  assert.ok(procurementQuote(restored, 'milk', 1, 100000).blocking);
  const arrived = receiveSupplies(restored, 182000);
  assert.equal(arrived.ingredients.coffeeBeans, 25);
  assert.equal(arrived.ingredients.milk, 10);
  assert.equal(arrived.currency, initial.currency);
  assert.equal(receiveSupplies(arrived, 999999), arrived);
  const queuedLegacy = { ...initial, deliveries: old.deliveries.map(item => ({ ...item, ingredientId: 'coffeeBeans' })) };
  const partial = receiveSupplies(migrateSavedState(JSON.parse(JSON.stringify(queuedLegacy)), 100000), 181000);
  assert.equal(partial.deliveries.length, 1);
  assert.ok(procurementQuote(partial, 'coffeeBeans', 1, 181000).blocking, 'last legacy batch must arrive before another purchase');
  assert.deepEqual(reducer(partial, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', now: 181000 }).deliveries, partial.deliveries);
});

const { orderRequirements } = require(join(output, 'game/orderRequirements.js'));
test('order requirements expose all blockers and preserve consumed ingredient satisfaction until serving', () => {
  const order = { id: 'conditions', recipeId: 'latte', customerSlot: 0, status: 'queued', remainingMs: 0, totalMs: 0 };
  let state = { ...isolated(), orders: [order] };
  let conditions = orderRequirements(state, order);
  assert.equal(conditions.find(item => item.id === 'recipe').met, false);
  assert.match(conditions.find(item => item.id === 'recipe').detail, /入荷時に解放/);
  assert.equal(conditions.find(item => item.id === 'ingredient-milk').met, false);
  assert.match(conditions.find(item => item.id === 'ingredient-milk').detail, /白樺牧場/);
  assert.equal(conditions.find(item => item.id === 'equipment-coffeeCounter').met, true);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 1000 });
  assert.match(orderRequirements(state, order).find(item => item.id === 'ingredient-milk').detail, /店長が仕入れ中・あと 1:00/);
  state = receiveSupplies(state, 61000);
  state = { ...state, ingredients: { ...state.ingredients, coffeeBeans: 1, milk: 1 } };
  state = reducer(state, { type: 'START_COOKING', orderId: order.id });
  conditions = orderRequirements(state, state.orders[0]);
  assert.equal(state.ingredients.milk, 0);
  assert.ok(conditions.filter(item => item.id.startsWith('ingredient-')).every(item => item.met && item.detail.includes('使用済み')));
  assert.equal(conditions.find(item => item.id === 'cooking').met, false);
  state = tick(state, 30000);
  assert.ok(orderRequirements(state, state.orders[0]).every(item => item.met));
  state = reducer(state, { type: 'COLLECT_ORDER', orderId: order.id });
  assert.equal(state.orders.length, 0);
  assert.equal(state.lifetimeStats.totalOrders, 1);
});

test('order requirements distinguish locked, uninstalled and busy equipment', () => {
  const order = { id: 'equipment-condition', recipeId: 'moonLatte', customerSlot: 0, status: 'queued', remainingMs: 0, totalMs: 0 };
  const state = isolated();
  const condition = value => orderRequirements(value, order).find(item => item.id === 'equipment-espressoMachine');
  assert.equal(condition(state).met, false);
  assert.match(condition(state).detail, /物語で解放/);
  assert.match(condition({ ...state, unlockedEquipment: [...state.unlockedEquipment, 'espressoMachine'] }).detail, /5200コイン/);
  const cooking = start(addOrder(state));
  assert.match(orderRequirements(cooking, order).find(item => item.id === 'cooking').detail, /別の設備なら同時に調理/);
});

test('Ren cafe-help story follows hiring at level four and cannot grant progression or duplicate rewards',()=>{
  const {staffStoryEvents}=require(join(output,'data/events.js'));
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const episode=staffStoryEvents.find(event=>event.id==='ren-help-cafe');
  let state={...createInitialState(),currency:2000};
  const act={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(availableStaffStory(state),undefined);
  assert.equal(reducer(state,act),state);
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,met:true,relationshipStage:3}}};
  assert.equal(availableStaffStory(state),undefined);
  state=reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'});
  assert.equal(state.staff.length,0,'hiring still requires level four');
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,relationshipStage:4}}};
  assert.equal(availableStaffStory(state),undefined,'level four alone does not mean hired');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  const finished=reducer(state,act);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(finished[key],state[key]);
  assert.equal(finished.characterProgress.ren.relationshipStage,4);
  assert.equal(finished.characterProgress.ren.affection,state.characterProgress.ren.affection);
  assert.equal(finished.characterProgress.ren.route,'undecided');
  assert.ok(finished.characterProgress.ren.viewedEvents.includes(episode.id));
  assert.equal(availableStaffStory(finished),undefined);
  assert.equal(reducer(finished,act),finished);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state,'staff episode cannot complete as a relationship level');
});

test('advanced Ren saves receive the added staff story once and keep both routes and all existing memories',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),currency:5678,staff:[{characterId:'ren',role:'rest',remainingMs:0}]};
    state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('ren').map(event=>event.id),eventChoices:{'ren-stage4':'choice-2','ren-stage7':'choice-1'}}}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'ren-help-cafe');
    const finished=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'ren-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(finished)));
    assert.equal(resumed.characterProgress.ren.relationshipStage,10);
    assert.equal(resumed.characterProgress.ren.affection,777);
    assert.equal(resumed.characterProgress.ren.route,route);
    assert.deepEqual(resumed.characterProgress.ren.eventChoices,state.characterProgress.ren.eventChoices);
    assert.deepEqual(resumed.characterProgress.ren.viewedEvents,[...state.characterProgress.ren.viewedEvents,'ren-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
    assert.equal(resumed.currency,5678);
  }
});

test('both revised Ren level-four responses remain playable without hiring automatically',()=>{
  const level=routeEvents('ren')[3];
  for(const choice of level.choices){
    const before=play('ren','romance',3);
    const state={...before,characterProgress:{...before.characterProgress,ren:{...before.characterProgress.ren,affection:level.requiredAffection}}};
    assert.equal(availableEvent(state,[level])?.id,level.id);
    const finished=reducer(state,{type:'COMPLETE_EVENT',eventId:level.id,choiceId:choice.id});
    assert.equal(finished.characterProgress.ren.relationshipStage,4);
    assert.equal(finished.characterProgress.ren.eventChoices[level.id],choice.id);
    assert.equal(finished.characterProgress.ren.route,'undecided');
    assert.equal(finished.staff.length,0);
    assert.equal(finished.currency,state.currency);
  }
});

test('Ren staff memories render with their own heading and the friendship replay uses its own script',()=>{
  const {staffStoryEvents,getStaffStoryEvent}=require(join(output,'data/events.js'));
  const {createElement}=require('react');
  const {renderToStaticMarkup}=require('react-dom/server');
  const state={...createInitialState()};
  state.characterProgress.ren={...state.characterProgress.ren,met:true,relationshipStage:10,route:'friendship',viewedEvents:[...routeEvents('ren').map(event=>event.id),'ren-help-cafe']};
  const load=(path,dependencies)=>{
    const exports={};
    const compiled=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    new Function('require','exports',compiled)(name=>{
      if(name.endsWith('.css'))return {};
      if(dependencies[name])return dependencies[name];
      if(name.startsWith('../data/'))return require(join(output,'data',name.split('/').at(-1)+'.js'));
      if(name.startsWith('../game/'))return require(join(output,'game',name.split('/').at(-1)+'.js'));
      return require(name);
    },exports);
    return exports;
  };
  const ui=load('../src/screens/PeopleScreen.tsx',{
    '../game/GameContext':{useGame:()=>({state,dispatch(){}})},
    '../components/GameUI':{Portrait:()=>null,Hearts:()=>null},
  });
  const detail=renderToStaticMarkup(createElement(ui.CharacterDetail,{characterId:'ren',onBack(){},onReplay(){}}));
  assert.match(detail,/カフェを手伝う物語/);
  assert.match(detail,/頼れる持ち場を読み返す/);
  assert.doesNotMatch(detail,/好感度4・雇用後/);
  const story=load('../src/components/StoryModal.tsx',{});
  const html=renderToStaticMarkup(createElement(story.StoryModal,{event:getStaffStoryEvent('ren-help-cafe'),progress:state.characterProgress.ren,readOnly:true,onClose(){}}));
  assert.match(html,/カフェを手伝う日/);
  assert.match(html,/頼れる持ち場/);
  assert.match(html,/いつもの置き場所を一つずつ尋ねた/);
  assert.doesNotMatch(html,/紐を結ぶ彼/);
  assert.ok(staffStoryEvents.filter(event=>event.characterId==='ren').every(event=>event.requiredRelationshipStage===4));
});

test('Ren everyday greetings respect relationship stage and route without changing saved progress',()=>{
  const {characterGreeting}=require(join(output,'game/conversation.js'));
  const {renGreetingsByStage,renRomanceGreetings,renFriendshipGreetings}=require(join(output,'data/renConversations.js'));
  const ren=characters.find(character=>character.id==='ren');
  const progress={...createInitialState().characterProgress.ren,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=8;stage++){
    const current={...progress,relationshipStage:stage};
    assert.ok(renGreetingsByStage[stage].includes(characterGreeting(ren,current)));
    assert.notEqual(characterGreeting(ren,current),characterGreeting(ren,{...current,visits:3}),'repeat visits have another greeting');
  }
  assert.equal(characterGreeting(ren,{...progress,visits:1,relationshipStage:1}),ren.greetings.first);
  assert.ok(renRomanceGreetings.includes(characterGreeting(ren,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(renFriendshipGreetings.includes(characterGreeting(ren,{...progress,relationshipStage:10,route:'friendship'})));
  assert.equal(JSON.stringify(progress),before);
  for(const other of [{...characters[0],id:'unrevised'}]){
    assert.equal(characterGreeting(other,{...progress,visits:1}),other.greetings.first);
    assert.equal(characterGreeting(other,{...progress,relationshipStage:5}),other.greetings.close);
    assert.equal(characterGreeting(other,{...progress,route:'friendship'}),other.greetings.friendship);
  }
});

test('Ren gifts have valid everyday replies across all gifts and both routes while other characters keep their responses',()=>{
  const {characterGiftResponse}=require(join(output,'game/conversation.js'));
  const {renGiftDetails}=require(join(output,'data/renConversations.js'));
  const ren=characters.find(character=>character.id==='ren');
  const progress={...createInitialState().characterProgress.ren,met:true,relationshipStage:4};
  const before=JSON.stringify(progress);
  for(const gift of gifts){
    const reaction=giftReaction(ren,gift);
    if(reaction==='like'||reaction==='love')assert.ok(renGiftDetails[gift.id],`${gift.id} needs an appropriate item-specific response`);
    for(const route of ['undecided','romance','friendship']){
      const response=characterGiftResponse(ren,{...progress,route},gift,reaction);
      assert.equal(typeof response,'string');
      assert.ok(response.length>10);
      assert.doesNotMatch(response,/undefined|\[object Object\]/);
    }
  }
  const book=gifts.find(gift=>gift.id==='book');
  assert.notEqual(characterGiftResponse(ren,progress,book,'like'),characterGiftResponse(ren,{...progress,giftsGiven:1},book,'like'));
  assert.notEqual(characterGiftResponse(ren,{...progress,route:'romance'},book,'like'),characterGiftResponse(ren,{...progress,route:'friendship'},book,'like'));
  assert.equal(JSON.stringify(progress),before);
  const other={...characters.find(character=>character.id==='cacao'),id:'unrevised'};
  for(const reaction of ['love','like','normal','dislike'])assert.equal(characterGiftResponse(other,progress,book,reaction),other.giftResponses[reaction]);
});

test('all four gift preference reactions open once per character, even across different gifts of the same preference',()=>{
  for(const character of characters){
    let state=createInitialState();
    state.characterProgress[character.id]={...state.characterProgress[character.id],met:true};
    for(const reaction of ['love','like','normal','dislike']){
      const matching=gifts.filter(gift=>giftReaction(character,gift)===reaction);
      assert.ok(matching.length>=1,`${character.id} has a gift for ${reaction}`);
      const first=matching[0],another=matching[1]||first;
      state={...state,inventory:{...state.inventory,[first.id]:2,[another.id]:another.id===first.id?3:1}};
      state=reducer(state,{type:'GIVE_GIFT',characterId:character.id,giftId:first.id,reaction:'normal'});
      assert.equal(state.pendingGiftReaction.characterId,character.id);
      assert.equal(state.pendingGiftReaction.reaction,reaction,'uses actual preference, not the caller supplied value');
      assert.equal(state.inventory[first.id],another.id===first.id?2:1);
      assert.ok(state.pendingGiftReaction.response);
      assert.equal(availableEvent(state,relationshipEvents),undefined,'gift reaction finishes before a newly unlocked episode');
      const open=state;
      assert.equal(reducer(state,{type:'GIVE_GIFT',characterId:character.id,giftId:first.id,reaction}),open,'rapid second submission cannot consume another gift');
      assert.equal(reducer(state,{type:'CLOSE_GIFT_REACTION',characterId:character.id,reaction:reaction==='love'?'like':'love'}),open);
      state=closeGiftPopup(state);
      assert.equal(state.pendingGiftReaction,undefined);
      assert.equal(state.characterProgress[character.id].viewedGiftReactions.filter(value=>value===reaction).length,1);
      state=reducer(state,{type:'GIVE_GIFT',characterId:character.id,giftId:first.id,reaction});
      assert.equal(state.pendingGiftReaction,undefined);
      state=reducer(state,{type:'GIVE_GIFT',characterId:character.id,giftId:another.id,reaction});
      assert.equal(state.pendingGiftReaction,undefined,'another gift with the same preference does not reopen the popup');
    }
    assert.deepEqual(state.characterProgress[character.id].viewedGiftReactions,['love','like','normal','dislike']);
    for(const other of characters.filter(other=>other.id!==character.id))assert.deepEqual(state.characterProgress[other.id].viewedGiftReactions,[]);
  }
});

test('pending gift reactions survive reload without consuming or rewarding twice, and older saves can see all new popups',()=>{
  let state=createInitialState();
  state.characterProgress.ren={...state.characterProgress.ren,met:true};
  state.inventory.book=1;
  state=reducer(state,{type:'GIVE_GIFT',characterId:'ren',giftId:'book',reaction:'like'});
  const resumed=migrateSavedState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(resumed.pendingGiftReaction,state.pendingGiftReaction);
  assert.equal(resumed.inventory.book,0);
  assert.equal(resumed.characterProgress.ren.affection,state.characterProgress.ren.affection);
  assert.equal(resumed.characterProgress.ren.giftsGiven,1);
  const closed=closeGiftPopup(resumed);
  const reloaded=migrateSavedState(JSON.parse(JSON.stringify(closed)));
  assert.equal(reloaded.pendingGiftReaction,undefined);
  assert.deepEqual(reloaded.characterProgress.ren.viewedGiftReactions,['like']);
  assert.equal(reloaded.characterProgress.ren.affection,state.characterProgress.ren.affection);
  const old=JSON.parse(JSON.stringify(closed));
  delete old.characterProgress.ren.viewedGiftReactions;
  delete old.pendingGiftReaction;
  const migrated=migrateSavedState(old);
  assert.deepEqual(migrated.characterProgress.ren.viewedGiftReactions,[]);
  assert.deepEqual(migrated.characterProgress.ren.giftReactions,{book:'like'});
  assert.equal(migrated.characterProgress.ren.giftsGiven,1);
  const invalid=migrateSavedState({...old,pendingGiftReaction:{characterId:'missing',giftId:'book',reaction:'love',response:'bad'}});
  assert.equal(invalid.pendingGiftReaction,undefined);
});

test('Maki cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('sota-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('sota'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.sota={...state.characterProgress.sota,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'sota',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,sota:{...state.characterProgress.sota,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'sota',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.sota,{...state.characterProgress.sota,viewedEvents:[...state.characterProgress.sota.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Maki saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'sota',role:'rest',remainingMs:0}]};
    state.characterProgress.sota={...state.characterProgress.sota,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('sota').map(event=>event.id),eventChoices:{'sota-stage4':'choice-2','sota-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'sota-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'sota-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.sota[key],state.characterProgress.sota[key]);
    assert.deepEqual(resumed.characterProgress.sota.viewedEvents,[...state.characterProgress.sota.viewedEvents,'sota-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Maki daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {makiGreetingsByStage,makiRomanceGreetings,makiRomanceDailyGreetings,makiFriendshipGreetings,makiGiftDetails,makiSupplyReplies}=require(join(output,'data/makiConversations.js'));
  const maki=characters.find(character=>character.id==='sota');
  const progress={...createInitialState().characterProgress.sota,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(makiGreetingsByStage[stage].includes(characterGreeting(maki,atStage)));
    assert.notEqual(characterGreeting(maki,atStage),characterGreeting(maki,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(maki,{...progress,visits:1,relationshipStage:1}),maki.greetings.first);
  assert.ok(makiRomanceGreetings.includes(characterGreeting(maki,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(makiRomanceDailyGreetings.includes(characterGreeting(maki,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(makiFriendshipGreetings.includes(characterGreeting(maki,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(maki,gift);
    if(['like','love'].includes(reaction))assert.ok(makiGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(maki,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.sota={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(maki,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(maki,state.characterProgress.sota,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'sota',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(maki,progress),makiSupplyReplies.early);
  assert.equal(characterSupplyResponse(maki,{...progress,relationshipStage:4}),makiSupplyReplies.close);
  assert.equal(characterSupplyResponse(maki,{...progress,route:'friendship'}),makiSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});

test('Aoi cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('aki-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('aki'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.aki={...state.characterProgress.aki,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'aki',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,aki:{...state.characterProgress.aki,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'aki',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.aki,{...state.characterProgress.aki,viewedEvents:[...state.characterProgress.aki.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Aoi saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'aki',role:'rest',remainingMs:0}]};
    state.characterProgress.aki={...state.characterProgress.aki,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('aki').map(event=>event.id),eventChoices:{'aki-stage4':'choice-2','aki-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'aki-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'aki-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.aki[key],state.characterProgress.aki[key]);
    assert.deepEqual(resumed.characterProgress.aki.viewedEvents,[...state.characterProgress.aki.viewedEvents,'aki-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Aoi daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {aoiGreetingsByStage,aoiRomanceGreetings,aoiRomanceDailyGreetings,aoiFriendshipGreetings,aoiGiftDetails,aoiSupplyReplies}=require(join(output,'data/aoiConversations.js'));
  const aoi=characters.find(character=>character.id==='aki');
  const progress={...createInitialState().characterProgress.aki,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(aoiGreetingsByStage[stage].includes(characterGreeting(aoi,atStage)));
    assert.notEqual(characterGreeting(aoi,atStage),characterGreeting(aoi,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(aoi,{...progress,visits:1,relationshipStage:1}),aoi.greetings.first);
  assert.ok(aoiRomanceGreetings.includes(characterGreeting(aoi,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(aoiRomanceDailyGreetings.includes(characterGreeting(aoi,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(aoiFriendshipGreetings.includes(characterGreeting(aoi,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(aoi,gift);
    if(['like','love'].includes(reaction))assert.ok(aoiGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(aoi,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.aki={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(aoi,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(aoi,state.characterProgress.aki,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'aki',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(aoi,progress),aoiSupplyReplies.early);
  assert.equal(characterSupplyResponse(aoi,{...progress,relationshipStage:4}),aoiSupplyReplies.close);
  assert.equal(characterSupplyResponse(aoi,{...progress,route:'friendship'}),aoiSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});

test('Earl cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('itsuki-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('itsuki'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.itsuki={...state.characterProgress.itsuki,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'itsuki',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,itsuki:{...state.characterProgress.itsuki,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'itsuki',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.itsuki,{...state.characterProgress.itsuki,viewedEvents:[...state.characterProgress.itsuki.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Earl saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'itsuki',role:'rest',remainingMs:0}]};
    state.characterProgress.itsuki={...state.characterProgress.itsuki,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('itsuki').map(event=>event.id),eventChoices:{'itsuki-stage4':'choice-2','itsuki-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'itsuki-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'itsuki-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.itsuki[key],state.characterProgress.itsuki[key]);
    assert.deepEqual(resumed.characterProgress.itsuki.viewedEvents,[...state.characterProgress.itsuki.viewedEvents,'itsuki-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Earl daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {earlGreetingsByStage,earlRomanceGreetings,earlRomanceDailyGreetings,earlFriendshipGreetings,earlGiftDetails,earlSupplyReplies}=require(join(output,'data/earlConversations.js'));
  const earl=characters.find(character=>character.id==='itsuki');
  const progress={...createInitialState().characterProgress.itsuki,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(earlGreetingsByStage[stage].includes(characterGreeting(earl,atStage)));
    assert.notEqual(characterGreeting(earl,atStage),characterGreeting(earl,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(earl,{...progress,visits:1,relationshipStage:1}),earl.greetings.first);
  assert.ok(earlRomanceGreetings.includes(characterGreeting(earl,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(earlRomanceDailyGreetings.includes(characterGreeting(earl,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(earlFriendshipGreetings.includes(characterGreeting(earl,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(earl,gift);
    if(['like','love'].includes(reaction))assert.ok(earlGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(earl,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.itsuki={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(earl,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(earl,state.characterProgress.itsuki,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'itsuki',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(earl,progress),earlSupplyReplies.early);
  assert.equal(characterSupplyResponse(earl,{...progress,relationshipStage:4}),earlSupplyReplies.close);
  assert.equal(characterSupplyResponse(earl,{...progress,route:'friendship'}),earlSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});

test('revised staff voices keep assigned, working and deferred changes distinct without exposing unmet characters',()=>{
  const {characterStaffReply}=require(join(output,'game/conversation.js'));
  for(const [id,name] of [['ren','ren'],['sota','maki'],['aki','aoi'],['itsuki','earl'],['haru','taiyo'],['nagisa','shizuka'],['sae','sae'],['cacao','cacao']]){
    const data=require(join(output,`data/${name}Conversations.js`));
    const progress={...createInitialState().characterProgress[id],met:true,relationshipStage:10};
    const replies=data[`${name}StaffReplies`];
    assert.equal(characterStaffReply(id,{...progress,met:false}),undefined);
    assert.equal(characterStaffReply(id,{...progress,relationshipStage:1}),data[`${name}StaffEarlyReply`]);
    assert.equal(characterStaffReply(id,progress),data[`${name}StaffOffer`]);
    for(const role of ['cook','server','procurement','rest']){
      assert.equal(characterStaffReply(id,progress,role),replies[role].assign);
      assert.equal(characterStaffReply(id,progress,role,true,role),replies[role].working||replies[role].busy);
      assert.equal(characterStaffReply(id,progress,role,true,role==='cook'?'server':'cook'),replies[role].busy);
    }
  }
  assert.equal(characterStaffReply('unrevised',{...createInitialState().characterProgress.cacao,met:true,relationshipStage:10},'cook'),undefined);
});

test('Taiyo cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('haru-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('haru'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.haru={...state.characterProgress.haru,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'haru',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,haru:{...state.characterProgress.haru,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'haru',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.haru,{...state.characterProgress.haru,viewedEvents:[...state.characterProgress.haru.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Taiyo saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'haru',role:'rest',remainingMs:0}]};
    state.characterProgress.haru={...state.characterProgress.haru,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('haru').map(event=>event.id),eventChoices:{'haru-stage4':'choice-2','haru-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'haru-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'haru-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.haru[key],state.characterProgress.haru[key]);
    assert.deepEqual(resumed.characterProgress.haru.viewedEvents,[...state.characterProgress.haru.viewedEvents,'haru-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Taiyo daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {taiyoGreetingsByStage,taiyoRomanceGreetings,taiyoRomanceDailyGreetings,taiyoFriendshipGreetings,taiyoGiftDetails,taiyoSupplyReplies}=require(join(output,'data/taiyoConversations.js'));
  const taiyo=characters.find(character=>character.id==='haru');
  const progress={...createInitialState().characterProgress.haru,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(taiyoGreetingsByStage[stage].includes(characterGreeting(taiyo,atStage)));
    assert.notEqual(characterGreeting(taiyo,atStage),characterGreeting(taiyo,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(taiyo,{...progress,visits:1,relationshipStage:1}),taiyo.greetings.first);
  assert.ok(taiyoRomanceGreetings.includes(characterGreeting(taiyo,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(taiyoRomanceDailyGreetings.includes(characterGreeting(taiyo,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(taiyoFriendshipGreetings.includes(characterGreeting(taiyo,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(taiyo,gift);
    if(['like','love'].includes(reaction))assert.ok(taiyoGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(taiyo,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.haru={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(taiyo,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(taiyo,state.characterProgress.haru,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'haru',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(taiyo,progress),taiyoSupplyReplies.early);
  assert.equal(characterSupplyResponse(taiyo,{...progress,relationshipStage:4}),taiyoSupplyReplies.close);
  assert.equal(characterSupplyResponse(taiyo,{...progress,route:'friendship'}),taiyoSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});


test('Shizuka cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('nagisa-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('nagisa'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.nagisa={...state.characterProgress.nagisa,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'nagisa',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,nagisa:{...state.characterProgress.nagisa,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'nagisa',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.nagisa,{...state.characterProgress.nagisa,viewedEvents:[...state.characterProgress.nagisa.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Shizuka saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'nagisa',role:'rest',remainingMs:0}]};
    state.characterProgress.nagisa={...state.characterProgress.nagisa,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('nagisa').map(event=>event.id),eventChoices:{'nagisa-stage4':'choice-2','nagisa-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'nagisa-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'nagisa-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.nagisa[key],state.characterProgress.nagisa[key]);
    assert.deepEqual(resumed.characterProgress.nagisa.viewedEvents,[...state.characterProgress.nagisa.viewedEvents,'nagisa-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Shizuka daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {shizukaGreetingsByStage,shizukaRomanceGreetings,shizukaRomanceDailyGreetings,shizukaFriendshipGreetings,shizukaGiftDetails,shizukaSupplyReplies}=require(join(output,'data/shizukaConversations.js'));
  const shizuka=characters.find(character=>character.id==='nagisa');
  const progress={...createInitialState().characterProgress.nagisa,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(shizukaGreetingsByStage[stage].includes(characterGreeting(shizuka,atStage)));
    assert.notEqual(characterGreeting(shizuka,atStage),characterGreeting(shizuka,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(shizuka,{...progress,visits:1,relationshipStage:1}),shizuka.greetings.first);
  assert.ok(shizukaRomanceGreetings.includes(characterGreeting(shizuka,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(shizukaRomanceDailyGreetings.includes(characterGreeting(shizuka,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(shizukaFriendshipGreetings.includes(characterGreeting(shizuka,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(shizuka,gift);
    if(['like','love'].includes(reaction))assert.ok(shizukaGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(shizuka,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.nagisa={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(shizuka,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(shizuka,state.characterProgress.nagisa,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'nagisa',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(shizuka,progress),shizukaSupplyReplies.early);
  assert.equal(characterSupplyResponse(shizuka,{...progress,relationshipStage:4}),shizukaSupplyReplies.close);
  assert.equal(characterSupplyResponse(shizuka,{...progress,route:'friendship'}),shizukaSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});


test('Sae cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('sae-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('sae'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.sae={...state.characterProgress.sae,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'sae',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,sae:{...state.characterProgress.sae,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'sae',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.sae,{...state.characterProgress.sae,viewedEvents:[...state.characterProgress.sae.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Sae saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'sae',role:'rest',remainingMs:0}]};
    state.characterProgress.sae={...state.characterProgress.sae,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('sae').map(event=>event.id),eventChoices:{'sae-stage4':'choice-2','sae-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'sae-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'sae-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.sae[key],state.characterProgress.sae[key]);
    assert.deepEqual(resumed.characterProgress.sae.viewedEvents,[...state.characterProgress.sae.viewedEvents,'sae-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Sae daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {saeGreetingsByStage,saeRomanceGreetings,saeRomanceDailyGreetings,saeFriendshipGreetings,saeGiftDetails,saeSupplyReplies}=require(join(output,'data/saeConversations.js'));
  const sae=characters.find(character=>character.id==='sae');
  const progress={...createInitialState().characterProgress.sae,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(saeGreetingsByStage[stage].includes(characterGreeting(sae,atStage)));
    assert.notEqual(characterGreeting(sae,atStage),characterGreeting(sae,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(sae,{...progress,visits:1,relationshipStage:1}),sae.greetings.first);
  assert.ok(saeRomanceGreetings.includes(characterGreeting(sae,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(saeRomanceDailyGreetings.includes(characterGreeting(sae,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(saeFriendshipGreetings.includes(characterGreeting(sae,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(sae,gift);
    if(['like','love'].includes(reaction))assert.ok(saeGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(sae,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.sae={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(sae,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(sae,state.characterProgress.sae,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'sae',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(sae,progress),saeSupplyReplies.early);
  assert.equal(characterSupplyResponse(sae,{...progress,relationshipStage:4}),saeSupplyReplies.close);
  assert.equal(characterSupplyResponse(sae,{...progress,route:'friendship'}),saeSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});

test('Cacao cafe-help story requires actual hiring at the configured level and records no extra rewards',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  const {staffHireStage}=require(join(output,'game/automation.js'));
  const {getStaffStoryEvent}=require(join(output,'data/events.js'));
  const episode=getStaffStoryEvent('cacao-help-cafe');
  assert.equal(episode.requiredRelationshipStage,staffHireStage('cacao'));
  let state={...createInitialState(),currency:3000};
  state.characterProgress.cacao={...state.characterProgress.cacao,met:true,relationshipStage:6};
  const action={type:'COMPLETE_STAFF_STORY',eventId:episode.id};
  assert.equal(reducer(state,action),state);
  assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'cacao',role:'server'}),state);
  state={...state,characterProgress:{...state.characterProgress,cacao:{...state.characterProgress.cacao,relationshipStage:7}}};
  assert.equal(availableStaffStory(state),undefined,'affection alone does not start the employment story');
  state=reducer(state,{type:'HIRE_STAFF',characterId:'cacao',role:'server'});
  assert.equal(availableStaffStory(state)?.id,episode.id);
  assert.equal(state.currency,3000-GAME_CONFIG.hirePrice);
  const completed=reducer(state,action);
  for(const key of ['currency','ingredients','unlockedRecipes','unlockedIngredients','ownedEquipment','staff','lifetimeStats'])assert.deepEqual(completed[key],state[key]);
  assert.deepEqual(completed.characterProgress.cacao,{...state.characterProgress.cacao,viewedEvents:[...state.characterProgress.cacao.viewedEvents,episode.id]});
  assert.equal(availableStaffStory(completed),undefined);
  assert.equal(reducer(completed,action),completed);
  assert.equal(reducer(state,{type:'COMPLETE_EVENT',eventId:episode.id}),state);
});

test('advanced Cacao saves keep stage, route and old choice IDs while the new staff memory can be read once',()=>{
  const {availableStaffStory}=require(join(output,'game/logic.js'));
  for(const route of ['romance','friendship']){
    let state={...createInitialState(),staff:[{characterId:'cacao',role:'rest',remainingMs:0}]};
    state.characterProgress.cacao={...state.characterProgress.cacao,met:true,relationshipStage:10,affection:777,route,viewedEvents:routeEvents('cacao').map(event=>event.id),eventChoices:{'cacao-stage4':'choice-2','cacao-stage7':'choice-1'}};
    const loaded=migrateSavedState(JSON.parse(JSON.stringify(state)));
    assert.equal(availableStaffStory(loaded)?.id,'cacao-help-cafe');
    const completed=reducer(loaded,{type:'COMPLETE_STAFF_STORY',eventId:'cacao-help-cafe'});
    const resumed=migrateSavedState(JSON.parse(JSON.stringify(completed)));
    for(const key of ['route','affection','relationshipStage','eventChoices'])assert.deepEqual(resumed.characterProgress.cacao[key],state.characterProgress.cacao[key]);
    assert.deepEqual(resumed.characterProgress.cacao.viewedEvents,[...state.characterProgress.cacao.viewedEvents,'cacao-help-cafe']);
    assert.equal(availableStaffStory(resumed),undefined);
  }
});

test('Cacao daily replies follow each relationship stage and both routes, and first gift popups capture that same reply',()=>{
  const {characterGreeting,characterGiftResponse,characterSupplyResponse}=require(join(output,'game/conversation.js'));
  const {cacaoGreetingsByStage,cacaoRomanceGreetings,cacaoRomanceDailyGreetings,cacaoFriendshipGreetings,cacaoGiftDetails,cacaoSupplyReplies}=require(join(output,'data/cacaoConversations.js'));
  const cacao=characters.find(character=>character.id==='cacao');
  const progress={...createInitialState().characterProgress.cacao,met:true,visits:2};
  const before=JSON.stringify(progress);
  for(let stage=1;stage<=10;stage++){
    const atStage={...progress,relationshipStage:stage};
    assert.ok(cacaoGreetingsByStage[stage].includes(characterGreeting(cacao,atStage)));
    assert.notEqual(characterGreeting(cacao,atStage),characterGreeting(cacao,{...atStage,visits:3}));
  }
  assert.equal(characterGreeting(cacao,{...progress,visits:1,relationshipStage:1}),cacao.greetings.first);
  assert.ok(cacaoRomanceGreetings.includes(characterGreeting(cacao,{...progress,relationshipStage:9,route:'romance'})));
  assert.ok(cacaoRomanceDailyGreetings.includes(characterGreeting(cacao,{...progress,relationshipStage:10,route:'romance'})));
  assert.ok(cacaoFriendshipGreetings.includes(characterGreeting(cacao,{...progress,route:'friendship'})));
  for(const gift of gifts){
    const reaction=giftReaction(cacao,gift);
    if(['like','love'].includes(reaction))assert.ok(cacaoGiftDetails[gift.id],`${gift.id} has an appropriate item detail`);
    for(const route of ['undecided','romance','friendship'])assert.doesNotMatch(characterGiftResponse(cacao,{...progress,route},gift,reaction),/undefined|\[object Object\]/);
  }
  for(const route of ['undecided','romance','friendship']){
    for(const reaction of ['love','like','normal','dislike']){
      let state=createInitialState();
      state.characterProgress.cacao={...progress,relationshipStage:7,route};
      const gift=gifts.find(gift=>giftReaction(cacao,gift)===reaction);
      state.inventory={[gift.id]:1};
      const expected=characterGiftResponse(cacao,state.characterProgress.cacao,gift,reaction);
      const gifted=reducer(state,{type:'GIVE_GIFT',characterId:'cacao',giftId:gift.id,reaction});
      assert.equal(gifted.pendingGiftReaction.response,expected);
      assert.equal(migrateSavedState(JSON.parse(JSON.stringify(gifted))).pendingGiftReaction.response,expected);
    }
  }
  assert.equal(characterSupplyResponse(cacao,progress),cacaoSupplyReplies.early);
  assert.equal(characterSupplyResponse(cacao,{...progress,relationshipStage:4}),cacaoSupplyReplies.close);
  assert.equal(characterSupplyResponse(cacao,{...progress,route:'friendship'}),cacaoSupplyReplies.friendship);
  assert.equal(JSON.stringify(progress),before);
});

const forestModel=require(join(output,'game/forest.js'));
const forestData=require(join(output,'data/forest.js'));
const forestReady=(seed=42,floor=1,meal)=>{
 const initial=createInitialState(1000);
 const s={...initial,lifetimeStats:{...initial.lifetimeStats,totalOrders:20},forest:{...forestModel.emptyForest(1000),returns:5,tutorialDone:true,nextId:2}};
 s.forest.expedition={id:1,seed,startFloor:floor,layer:forestModel.createForestLayer(s,floor,seed,meal),basket:[],coins:0,tickets:0,fragments:{},harvested:false,energySpent:0,tutorial:false,meal};
 return s;
};
const forestGather=(s,spot=0)=>reducer(s,{type:'FOREST_GATHER',floor:s.forest.expedition.layer.floor,spot,now:1000});
const revealPath=s=>{while(!s.forest.expedition.layer.pathFound){s=forestGather(s,s.forest.expedition.layer.spots.find(p=>!s.forest.expedition.layer.used.includes(p.id)).id);}return s;};
test('forest recovery keeps fractional minutes outside and never recovers during an outing',()=>{
 let f={...forestModel.emptyForest(1000),energy:60};f=forestModel.recoverForest(f,90500);assert.equal(f.energy,61);assert.equal(f.recoveredAt,61000);
 assert.equal(forestModel.recoverForest(f,500),f);f=forestModel.recoverForest(f,9999999);assert.equal(f.energy,70);
 let s=forestGather(forestReady());assert.equal(s.forest.energy,69);assert.equal(forestModel.recoverForest(s.forest,10000000),s.forest);
 s=reducer(s,{type:'FOREST_RETURN',now:10000000});assert.equal(forestModel.recoverForest(s.forest,10059999).energy,69);assert.equal(forestModel.recoverForest(s.forest,10060000).energy,70);
});
test('forest outcomes are automatic, stable on reload, and duplicate or stale taps cannot collect twice',()=>{
 for(let seed=1;seed<=100;seed++){
  const before=forestReady(seed);let s=forestGather(before),e=s.forest.expedition;
  assert.deepEqual(forestGather(before).forest.expedition,e);assert.equal(s.forest.energy,69);
  assert.equal(forestGather(s),s);assert.equal(reducer(s,{type:'FOREST_GATHER',floor:2,spot:1,now:1000}),s);
  assert.equal(e.pending,undefined);assert.deepEqual(e.basket,e.lastFind.food);
  const restored=migrateSavedState(JSON.parse(JSON.stringify(s)),9999999);assert.deepEqual(restored.forest.expedition,JSON.parse(JSON.stringify(e)));assert.equal(restored.forest.energy,69);
  const beforeMoney=s.currency;s=reducer(s,{type:'FOREST_RETURN',now:1000});assert.equal(s.currency,beforeMoney+e.coins);assert.equal(s.forest.tickets,e.tickets);
  assert.equal(reducer(s,{type:'FOREST_RETURN',now:1000}),s);assert.equal(reducer(s,{type:'FOREST_CLAIM'}),s);
  for(const id of e.basket)assert.ok(s.ingredients[id]>0);
 }
});
test('all 70 forest layers have unique target positions, bounded path discovery and arrival-only shortcuts',()=>{
 let s=forestReady();
 assert.equal(forestModel.canStartForest(s,11),false);
 for(let floor=1;floor<=70;floor++){
  const layer=s.forest.expedition.layer,band=forestData.forestBand(floor);
  assert.equal(layer.floor,floor);assert.ok(layer.spots.length>=band.spots[0]&&layer.spots.length<=band.spots[1]);assert.equal(new Set(layer.spots.map(p=>p.cell)).size,layer.spots.length);
  assert.equal(reducer(s,{type:'FOREST_MOVE',floor,now:1000}),s);
  if(floor===70){assert.equal(layer.pathSpot,-1);break;}
  s.forest={...s.forest,energy:70};s=revealPath(s);assert.ok(s.forest.expedition.layer.used.length<=layer.pathLimit);
  while(s.forest.expedition.layer.obstacleRemaining){const energy=s.forest.energy;s=reducer(s,{type:'FOREST_CLEAR',floor,now:1000});assert.equal(s.forest.energy,energy-1);}
  const energy=s.forest.energy;s=reducer(s,{type:'FOREST_MOVE',floor,now:1000});assert.equal(s.forest.energy,energy-1);
  if((floor+1)%10===0&&floor+1<70)assert.ok(s.forest.checkpoints.includes(floor+1));
 }
 assert.equal(s.forest.deepestFloor,70);for(const floor of [11,21,31,41,51,61])assert.equal(forestModel.canStartForest(s,floor),true);
 s=reducer(s,{type:'FOREST_RETURN',now:1000});assert.equal(s.forest.lastReturn.floor,70);assert.equal(s.forest.expedition,undefined);
 assert.equal(forestModel.canStartForest(s,2),false);assert.equal(forestModel.canStartForest(s,71),false);
});
test('free zero-energy return has no basket limit, while deep forest keeps its existing unlock rule',()=>{
 let s=forestReady();s.forest.energy=1;s.forest.expedition.basket=Array(40).fill('forestBerry');s=forestGather(s);
 assert.equal(s.forest.energy,0);assert.ok(s.forest.expedition.basket.length>=40);assert.equal(forestGather(s,1),s);
 s=reducer(s,{type:'FOREST_RETURN',now:1000});assert.equal(s.ingredients.forestBerry,s.forest.lastReturn.food.filter(id=>id==='forestBerry').length);
 let locked=revealPath(forestReady(42,50));locked.forest.returns=0;locked.forest.expedition.layer.obstacleRemaining=0;
 assert.equal(reducer(locked,{type:'FOREST_MOVE',floor:50,now:1000}),locked);assert.equal(forestModel.canStartForest({...locked,forest:{...locked.forest,checkpoints:[50]}},51),false);
});
test('rare shares of successful natural finds are 15 and 25 percent, meal bonus caps at 5, and empty outcomes remain',()=>{
 for(const [floor,bonus,expected] of [[51,0,.15],[61,0,.25],[61,.05,.30]]){
  let rare=0,total=0,empty=0;
  for(let seed=0;seed<2500;seed++){
   const s=forestReady(seed,floor),meal={recipeId:'forestSecretMilk',kind:'luck',rarity:'rare',level:10,pathReduction:2,rareBonus:bonus,obstacleSkip:0,emptyHints:0};
   const layer=forestModel.createForestLayer(s,floor,seed,meal);
   for(const p of layer.spots.filter(p=>p.kind!=='box')){total++;rare+=p.food.some(id=>['forestHoney','forestMoonBerry'].includes(id));empty+=!p.food.length;}
  }
  assert.ok(Math.abs(rare/total-forestData.FOREST_CONFIG.findChance*expected)<.009,`${floor}: ${rare/total}`);assert.ok(empty>0);
 }
 let s=forestReady();s.lifetimeStats.recipeSales.forestSecretMilk=160;assert.equal(forestModel.forestMeal('forestSecretMilk',s).rareBonus,.05);
 for(let seed=0;seed<100;seed++)assert.ok(forestReady(seed,21).forest.expedition.layer.spots.every(p=>!p.food.some(id=>['forestHoney','forestMoonBerry'].includes(id))));
});
test('foot meals help every obstructed path and never mark a path, reward or box as empty',()=>{
 let s=forestReady();s.lifetimeStats.recipeSales.toast=160;const meal=forestModel.forestMeal('toast',s);assert.equal(meal.obstacleSkip,2);assert.equal(meal.emptyHints,2);
 let obstacles=0,hints=0;
 for(let seed=0;seed<300;seed++){
  const plain=forestModel.createForestLayer(s,61,seed),boosted=forestModel.createForestLayer(s,61,seed,meal);
  assert.equal(plain.obstacleTotal,boosted.obstacleTotal);assert.equal(boosted.obstacleRemaining,Math.max(0,plain.obstacleTotal-2));obstacles+=boosted.obstacleSkipped;
  for(const p of boosted.spots.filter(p=>p.emptyHint)){hints++;assert.notEqual(p.id,boosted.pathSpot);assert.notEqual(p.kind,'box');assert.equal(p.food.length,0);assert.equal(p.fragment,undefined);assert.equal(p.coins+p.tickets,0);}
 }
 assert.ok(obstacles>100&&hints>100);
 assert.ok(forestModel.createForestLayer(s,1,42,meal).spots.some(p=>p.emptyHint));
});
test('eating is atomic at departure, respects queued materials, preserves sales and cannot stack',()=>{
 let s=createInitialState(1000);s.lifetimeStats.totalOrders=1;s.ingredients={coffeeBeans:3,bread:3};
 const sales={...s.lifetimeStats.recipeSales};s=reducer(s,{type:'FOREST_ENTER',mealId:'coffee',now:1000});assert.equal(s.ingredients.coffeeBeans,2);assert.equal(s.forest.expedition.meal.recipeId,'coffee');assert.deepEqual(s.lifetimeStats.recipeSales,sales);
 assert.equal(reducer(s,{type:'FOREST_ENTER',mealId:'coffee',now:1000}),s);assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(s)),100000).forest.expedition.meal,s.forest.expedition.meal);
 let blocked=createInitialState(1000);blocked.lifetimeStats.totalOrders=1;blocked.ingredients.coffeeBeans=1;blocked.orders=[{id:'waiting',recipeId:'coffee',status:'queued',customerSlot:0}];
 assert.equal(forestModel.canEatForestMeal('coffee',blocked),false);assert.equal(reducer(blocked,{type:'FOREST_ENTER',mealId:'coffee',now:1000}),blocked);
 assert.equal(reducer(blocked,{type:'FOREST_ENTER',startFloor:11,now:1000}),blocked);
});
test('recipe fragments are automatic, limited per recipe per outing and unlock after three',()=>{
 let s=forestReady(42,21);s.forest.fragments.forestSecretTea=2;
 let seed=0;while(!s.forest.expedition.layer.spots.some(p=>p.fragment)){s=forestReady(++seed,21);s.forest.fragments.forestSecretTea=2;}
 const spot=s.forest.expedition.layer.spots.find(p=>p.fragment);s=forestGather(s,spot.id);assert.equal(s.forest.expedition.fragments.forestSecretTea,1);
 const next=forestModel.createForestLayer(s,22,seed,undefined,s.forest.expedition.fragments);assert.ok(next.spots.every(p=>!p.fragment));
 s=reducer(s,{type:'FOREST_RETURN',now:1000});assert.equal(s.forest.fragments.forestSecretTea,3);assert.ok(s.unlockedRecipes.includes('forestSecretTea'));
});
test('v21 pending rewards settle exactly once, preserving coins, food, tickets, fragments and basket achievements',()=>{
 let s=forestReady();s.saveVersion=21;s.currency=500;s.forest.fragments.forestSecretTea=2;s.forest.expedition={id:1,seed:42,area:'pond',basket:['forestBerry'],pending:{food:['bread'],coins:1999,tickets:1},coins:1999,tickets:1,fragment:'forestSecretTea'};
 const migrated=migrateSavedState(JSON.parse(JSON.stringify(s)),1000);assert.equal(migrated.currency,2499);assert.equal(migrated.ingredients.bread,1);assert.equal(migrated.ingredients.forestBerry,1);assert.equal(migrated.forest.tickets,1);assert.equal(migrated.forest.fragments.forestSecretTea,3);assert.equal(migrated.forest.expedition,undefined);assert.equal(migrated.forest.legacyBasketLevel,12);
 const again=migrateSavedState(JSON.parse(JSON.stringify(migrated)),1000);assert.equal(again.currency,migrated.currency);assert.deepEqual(again.ingredients,migrated.ingredients);assert.deepEqual(again.forest,JSON.parse(JSON.stringify(migrated.forest)));
});
test('all forest dishes begin secret, unlock only at three fragments, and each band has one recipe',()=>{
 let s=forestReady();s.forest.expedition=undefined;s.unlockedRecipes=s.unlockedRecipes.filter(id=>!forestData.forestRecipes.some(r=>r.id===id));
 assert.equal(forestData.forestRecipes.length,7);assert.ok(forestData.forestRecipes.every(r=>r.hidden));assert.equal(new Set(forestData.forestAreas.map(a=>a.secret)).size,7);
 s.ingredients={forestBerry:9,forestMint:9,sugar:9};s=forestModel.syncForestRecipes(s);assert.ok(!s.unlockedRecipes.includes('forestBerrySoda'));
 s.forest.fragments.forestBerrySoda=2;s=forestModel.syncForestRecipes(s);assert.ok(!s.unlockedRecipes.includes('forestBerrySoda'));
 s.forest.fragments.forestBerrySoda=3;s=forestModel.syncForestRecipes(s);assert.ok(s.unlockedRecipes.includes('forestBerrySoda'));
});
test('v23 migration relocks forest dishes whose fragments are incomplete',()=>{
 let s=forestReady();s.saveVersion=23;s.forest.fragments={forestBerrySoda:2,forestPetalTea:3};s.unlockedRecipes=[...s.unlockedRecipes,'forestBerrySoda','forestPetalTea'];
 s=migrateSavedState(JSON.parse(JSON.stringify(s)),1000);assert.ok(!s.unlockedRecipes.includes('forestBerrySoda'));assert.ok(s.unlockedRecipes.includes('forestPetalTea'));assert.equal(s.saveVersion,24);
});
test('DEV forest recovery fills energy during and outside an expedition',()=>{
 let s=forestReady();s.forest.energy=0;s=reducer(s,{type:'DEV_FOREST_ENERGY'});assert.equal(s.forest.energy,70);assert.ok(s.forest.expedition);
 s.forest.expedition=undefined;s.forest.energy=9;s=reducer(s,{type:'DEV_FOREST_ENERGY'});assert.equal(s.forest.energy,70);
});
test('limited dishes are crafted into saved stock and customers receive ready plates without cooking twice',()=>{
 let s=forestReady();s.forest.expedition=undefined;s.forest.fragments={forestBerrySoda:3,forestPetalTea:3};s.ingredients={forestBerry:10,forestMint:10,sugar:10,forestPetal:10,forestHerb:10,teaLeaves:10,forestMushroom:10,bread:10};s=forestModel.syncForestRecipes(s);
 s=reducer(s,{type:'FOREST_COOK',recipeId:'forestBerrySoda',count:3});assert.equal(s.ingredients.forestBerry,7);assert.equal(s.forest.dishes.forestBerrySoda,3);assert.equal(s.lifetimeStats.recipeSales.forestBerrySoda,undefined);
 assert.equal(reducer(s,{type:'FOREST_COOK',recipeId:'forestBerrySoda',count:1}),s);
 s=reducer(s,{type:'FOREST_COOK',recipeId:'forestPetalTea',count:1});assert.equal(s.forest.dishes.forestPetalTea,1);
 s=migrateSavedState(JSON.parse(JSON.stringify(s)),1000);assert.equal(s.forest.dishes.forestBerrySoda,3);
 s={...s,spawnRemainingMs:0};s=reducer(s,{type:'TICK',deltaMs:100,now:1000});const order=s.orders.find(o=>o.forestPrepared);assert.equal(order.recipeId,'forestBerrySoda');assert.equal(order.status,'ready');assert.equal(s.forest.dishes.forestBerrySoda,2);
 const stock={...s.ingredients};assert.deepEqual(reducer(s,{type:'START_COOKING',orderId:order.id}).ingredients,stock);
 const money=s.currency;s=reducer(s,{type:'COLLECT_ORDER',orderId:order.id});assert.equal(s.currency,money+1100);assert.equal(s.lifetimeStats.recipeSales.forestBerrySoda,1);assert.deepEqual(s.ingredients,stock);
 s={...s,spawnRemainingMs:0,forest:{...s.forest,serveForestNext:true}};s=reducer(s,{type:'TICK',deltaMs:100,now:1000});const waiting=s.orders.find(o=>o.forestPrepared);s=reducer(s,{type:'DECLINE_ORDER',orderId:waiting.id});assert.equal(s.forest.dishes.forestBerrySoda,2);assert.deepEqual(s.ingredients,stock);
 assert.equal(reducer(s,{type:'FOREST_WITHDRAW',recipeId:'forestBerrySoda'}),s);
});
test('limited crafting rejects unavailable equipment, insufficient or promised materials and invalid quantities',()=>{
 let s=forestReady();s.forest.expedition=undefined;s.forest.fragments={forestBerrySoda:3};s.ingredients={forestBerry:1,forestMint:1,sugar:1};s=forestModel.syncForestRecipes(s);
 for(const count of [0,4,1.5,NaN])assert.equal(reducer(s,{type:'FOREST_COOK',recipeId:'forestBerrySoda',count}),s);
 s.orders=[{id:'promised',recipeId:'strawberryCake',status:'queued',customerSlot:0}];assert.equal(forestModel.canCookForestDish(s,'forestBerrySoda',1),false);
 s.orders=[];s.stations=[];assert.equal(reducer(s,{type:'FOREST_COOK',recipeId:'forestBerrySoda',count:1}),s);
});
test('v22 limited reservations migrate once to prepared stock while active cooking continues',()=>{
 let s=forestReady();s.saveVersion=22;delete s.forest.dishes;s.forest.sales={forestBerrySoda:2};s.orders=[{id:'old',recipeId:'forestBerrySoda',forestReserved:true,status:'cooking',stationId:'station-1',customerSlot:0,totalMs:10000,remainingMs:5000}];
 const before={...s.ingredients},migrated=migrateSavedState(JSON.parse(JSON.stringify(s)),1000);assert.equal(migrated.forest.dishes.forestBerrySoda,2);assert.equal(migrated.forest.sales,undefined);assert.equal(migrated.orders[0].status,'cooking');assert.deepEqual(migrated.ingredients,before);
 const again=migrateSavedState(JSON.parse(JSON.stringify(migrated)),1000);assert.equal(again.forest.dishes.forestBerrySoda,2);
});
test('ordinary forest ingredients are scarce even in early layers, while common food and empty spots remain',()=>{
 for(const [floor,expected] of [[1,.08],[11,.10],[21,.12],[31,.14],[41,.16],[51,.18],[61,.20]]){
  let total=0,forest=0,common=0,empty=0;
  for(let seed=0;seed<2500;seed++)for(const spot of forestModel.createForestLayer(forestReady(),floor,seed).spots.filter(p=>p.kind!=='box')){
   total++;forest+=spot.food.some(id=>id.startsWith('forest')&&!['forestHoney','forestMoonBerry'].includes(id));common+=spot.food.some(id=>!id.startsWith('forest'));empty+=!spot.food.length;
   if(spot.food.some(id=>id.startsWith('forest')))assert.equal(spot.food.length,1);
  }
  assert.ok(Math.abs(forest/total-forestData.FOREST_CONFIG.findChance*expected)<.007,`${floor}: ${forest/total}`);assert.ok(common>0&&empty>0);
 }
});
test('seventy gathers average about fifteen food items and one to two supply tickets',()=>{
 let food=0,tickets=0,gathers=0;
 for(let run=0;run<1200;run++){
  let remaining=70;
  for(let floor=1;remaining>0;floor++){
   const spots=forestModel.createForestLayer(forestReady(run),((floor-1)%70)+1,run*100+floor).spots.slice(0,remaining);
   for(const spot of spots){food+=spot.food.length;tickets+=spot.tickets;gathers++;}
   remaining-=spots.length;
  }
 }
 assert.equal(gathers,84000);assert.ok(food/1200>14&&food/1200<16,`${food/1200} food`);assert.ok(tickets/1200>1&&tickets/1200<2,`${tickets/1200} tickets`);
});
test('ticket settles exactly one entire delivery, never double consumes or affects unrelated supplies',()=>{
 let s=forestReady();s.forest.tickets=2;s.deliveries=[{id:'one',ingredientId:'bread',packs:20,servingsPerPack:5,orderedAt:1000,arrivesAt:10000},{id:'two',ingredientId:'milk',packs:1,servingsPerPack:5,orderedAt:1000,arrivesAt:10000}];
 s=reducer(s,{type:'USE_SUPPLY_TICKET',deliveryId:'one',now:2000});assert.equal(s.ingredients.bread,100);assert.equal(s.deliveries.length,1);assert.equal(s.forest.tickets,1);s=reducer(s,{type:'USE_SUPPLY_TICKET',deliveryId:'one',now:2000});assert.equal(s.forest.tickets,1);
 s=reducer(s,{type:'USE_SUPPLY_TICKET',deliveryId:'two',now:11000});assert.equal(s.ingredients.milk,5);assert.equal(s.forest.tickets,1);assert.equal(s.missions.receivedPacks.bread,20);
});
test('handmade gifts craft exact quantities and diminish third consecutive gift with one-time first bonus',()=>{
 let s=forestReady();s.currency=1000;s.ingredients={forestHerb:8,forestMint:4,teaLeaves:4};for(let i=0;i<3;i++)s=reducer(s,{type:'FOREST_CRAFT',giftId:'forestTeaGift'});assert.equal(s.currency,700);assert.equal(s.ingredients.forestHerb,2);
 const gains=[];for(let i=0;i<3;i++){const before=s.characterProgress.nagisa.affection;s=closeGiftPopup(reducer(s,{type:'GIVE_GIFT',giftId:'forestTeaGift',characterId:'nagisa',reaction:'normal'}));gains.push(s.characterProgress.nagisa.affection-before);}assert.deepEqual(gains,[10,8,4]);
 s=migrateSavedState(JSON.parse(JSON.stringify(s)),1000);assert.equal(s.characterProgress.nagisa.giftStreak,3);assert.deepEqual(s.characterProgress.nagisa.handmadeFirst,['forestTeaGift']);
});

test('sharing boxes stay rare, at most one per layer, and are the only source of coins and tickets',()=>{
 let boxes=0,coins=0,tickets=0,total=0;const bands=forestData.FOREST_COIN_BANDS;
 assert.equal(bands.reduce((sum,b)=>sum+b.weight,0),100);
 for(let seed=0;seed<5000;seed++){
  const spots=forestReady(seed,61).forest.expedition.layer.spots;
  assert.ok(spots.filter(p=>p.kind==='box').length<=1);
  for(const p of spots){total++;if(p.kind==='box'){boxes++;coins+=p.coins>0;tickets+=p.tickets;}else assert.equal(p.coins+p.tickets,0);}
 }
 assert.ok(boxes/total>.05&&boxes/total<.09);assert.ok(Math.abs(coins/boxes-.3)<.025);assert.ok(Math.abs(tickets/boxes-.3)<.025);
 assert.equal(forestModel.forestCoinAmount(0),50);assert.equal(forestModel.forestCoinAmount(1-Number.EPSILON),2000);
});

test('early forest missions require one real gather and receiving food, without rare loot or tickets',()=>{
 const prior=missionChapters.slice(0,3).flatMap(c=>c.missions.map(m=>m.id));
 let s=createInitialState();s.missions.claimed=[...prior];s.missions.completed=[...prior];s.lifetimeStats.totalOrders=1;
 assert.deepEqual(getMissions(s).map(m=>m.id),['forest-enter','forest-gather','forest-bring-home']);
 assert.ok(getMissions(s).every(m=>m.destination==='forest'));
 s=reducer(s,{type:'FOREST_ENTER',now:1000});assert.ok(s.missions.completed.includes('forest-enter'));assert.ok(!s.missions.completed.includes('forest-gather'));
 s=reducer(s,{type:'FOREST_GATHER',floor:1,spot:0,now:1000});
 assert.ok(s.missions.completed.includes('forest-gather'));assert.ok(!s.missions.completed.includes('forest-bring-home'));
 s=reducer(s,{type:'FOREST_RETURN',now:1000});assert.ok(s.missions.completed.includes('forest-bring-home'));assert.ok(s.forest.discovered.length>0);
 const before=s.currency;
 for(const m of [...getMissions(s)])s=reducer(s,{type:'CLAIM_MISSION',missionId:m.id});
 assert.equal(s.currency-before,30);assert.equal(currentMission(s).id,'toast-order');assert.equal(reducer(s,{type:'CLAIM_MISSION',missionId:'forest-enter'}),s);
});

test('new forest missions recognize saved exploration while preserving existing claims and money',()=>{
 let s=createInitialState();const previous=missions.filter(m=>!m.id.startsWith('forest-')).map(m=>m.id);
 s.missions.claimed=[...previous];s.missions.completed=[...previous];s.currency=1234;s.lifetimeStats.totalOrders=20;
 s.forest={...s.forest,nextId:3,returns:1,tutorialDone:true,discovered:['bread']};
 s=migrateSavedState(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(s.currency,1234);assert.deepEqual(s.missions.claimed,previous);
 assert.ok(['forest-enter','forest-gather','forest-bring-home'].every(id=>s.missions.completed.includes(id)));
 const again=migrateSavedState(JSON.parse(JSON.stringify(s)),Date.now());assert.equal(again.currency,1234);assert.deepEqual(again.missions,s.missions);
});
test('forest main missions use reached floors, completed recipes, cooked types and served types',()=>{
 const byId=id=>missions.find(mission=>mission.id===id);let s=createInitialState();
 s.forest.deepestFloor=60;s.forest.fragments={forestBerrySoda:3,forestPetalTea:3,forestSecretTea:3,forestMushroomToast:3};
 s.forest.cookedRecipes=['forestBerrySoda'];s.forest.dishes.forestPetalTea=1;
 s.lifetimeStats.recipeSales={forestBerrySoda:2,forestPetalTea:1,forestSecretTea:1,coffee:99};
 assert.equal(byId('forest-floor-60').value(s),60);assert.equal(byId('forest-recipes-4').value(s),4);
 assert.equal(byId('forest-cook-2').value(s),2);assert.equal(byId('forest-serve-4').value(s),3);
 assert.equal(byId('forest-floor-70').target,70);assert.equal(byId('forest-recipes-all').target,7);assert.equal(byId('forest-serve-all').target,7);
});


const {giftShopDay,giftShopAutoSlot,giftShopNextRefreshAt,updateGiftShopClock}=require(join(output,'game/giftShop.js'));
const giftTime=value=>Date.parse(value+'+09:00');

test('gift shop allows three manual updates per Japanese day and keeps the limit after reloading',()=>{
  const now=giftTime('2026-09-14T07:00:00');
  let state={...createInitialState(now),currency:10000,inventory:{book:2}};
  const deadline=giftShopNextRefreshAt(state);
  for(let i=1;i<=3;i++){
    state={...state,giftShopSoldOut:['book']};
    state=reducer(state,{type:'REFRESH_SHOP',items:state.giftShopItems,costAction:true,now:now+i});
    assert.equal(state.giftShopManualRefreshes,i);
    assert.deepEqual(state.giftShopSoldOut,[]);
    assert.equal(giftShopNextRefreshAt(state),deadline);
    assert.equal(state.currency,10000);assert.deepEqual(state.inventory,{book:2});
    state=migrateSavedState(JSON.parse(JSON.stringify(state)),now+i);
    assert.equal(state.giftShopManualRefreshes,i);
  }
  state={...state,giftShopSoldOut:['book']};
  const blocked=reducer(state,{type:'REFRESH_SHOP',items:['bouquet'],costAction:true,now:now+10});
  assert.deepEqual(blocked.giftShopItems,state.giftShopItems);
  assert.deepEqual(blocked.giftShopSoldOut,['book']);
  assert.equal(blocked.giftShopManualRefreshes,3);
  assert.match(blocked.notice.text,/3回まで/);
  assert.equal(reducer(blocked,{type:'NEXT_DAY'}),blocked);
  const beforeMidnight=migrateSavedState(blocked,giftTime('2026-09-14T23:59:59'));
  assert.equal(beforeMidnight.giftShopManualRefreshes,3);
  const nextDay=migrateSavedState(beforeMidnight,giftTime('2026-09-15T00:00:00'));
  assert.equal(nextDay.giftShopManualRefreshes,0);
  assert.equal(nextDay.giftShopRefreshDay,giftShopDay(giftTime('2026-09-15T00:00:00')));
  const refreshed=reducer(nextDay,{type:'REFRESH_SHOP',items:nextDay.giftShopItems,costAction:true,now:giftTime('2026-09-15T00:00:01')});
  assert.equal(refreshed.giftShopManualRefreshes,1);
  assert.equal(migrateSavedState(refreshed,giftTime('2026-09-14T23:00:00')).giftShopManualRefreshes,1);
});

test('gift shelves update exactly every three hours without consuming manual updates or accumulated offline stock',()=>{
  const now=giftTime('2026-09-14T02:59:59');
  const original={...createInitialState(now),giftShopSoldOut:['book'],giftShopManualRefreshes:2,inventory:{book:1},currency:777};
  let draws=0;const draw=()=>{draws++;return ['cookies','bouquet'];};
  assert.equal(updateGiftShopClock(original,now,draw),original);
  const three=giftTime('2026-09-14T03:00:00');
  const refreshed=updateGiftShopClock(original,three,draw);
  assert.equal(draws,1);assert.equal(refreshed.giftShopManualRefreshes,2);
  assert.deepEqual(refreshed.giftShopSoldOut,[]);assert.ok(refreshed.giftShopItems.includes('book'));
  assert.deepEqual(refreshed.inventory,{book:1});assert.equal(refreshed.currency,777);
  assert.equal(giftShopNextRefreshAt(refreshed),giftTime('2026-09-14T06:00:00'));
  assert.equal(updateGiftShopClock(refreshed,three+1,draw),refreshed);assert.equal(draws,1);
  assert.equal(updateGiftShopClock(refreshed,three-1000,draw),refreshed);
  const offline=updateGiftShopClock(refreshed,giftTime('2026-09-17T14:00:00'),draw);
  assert.equal(draws,2);assert.equal(offline.giftShopManualRefreshes,0);
  assert.equal(giftShopNextRefreshAt(offline),giftTime('2026-09-17T15:00:00'));
  assert.deepEqual(offline.inventory,{book:1});assert.equal(offline.currency,777);
  const live=reducer(original,{type:'TICK',deltaMs:100,now:three});
  assert.equal(live.giftShopAutoRefreshAt,giftShopAutoSlot(three));
  assert.deepEqual(live.giftShopSoldOut,[]);assert.equal(live.giftShopManualRefreshes,2);
  const twice=reducer(live,{type:'TICK',deltaMs:100,now:three+100});
  assert.deepEqual(twice.giftShopItems,live.giftShopItems);
});

test('legacy gift shelves migrate from their last update and receive at most the latest automatic shelf',()=>{
  const now=giftTime('2026-09-14T10:00:00');
  const legacy={...createInitialState(now),saveVersion:20,giftShopRefreshAt:now,giftShopSoldOut:['book'],inventory:{book:5},currency:1234};
  delete legacy.giftShopAutoRefreshAt;delete legacy.giftShopManualRefreshes;delete legacy.giftShopRefreshDay;
  const loaded=migrateSavedState(legacy,now+1000);
  assert.deepEqual(loaded.giftShopItems,legacy.giftShopItems);assert.deepEqual(loaded.giftShopSoldOut,['book']);
  assert.equal(loaded.giftShopManualRefreshes,0);assert.equal(giftShopNextRefreshAt(loaded),giftTime('2026-09-14T12:00:00'));
  const later=migrateSavedState(legacy,giftTime('2026-09-15T19:00:00'));
  assert.deepEqual(later.giftShopSoldOut,[]);assert.deepEqual(later.inventory,{book:5});assert.equal(later.currency,1234);
  assert.equal(giftShopNextRefreshAt(later),giftTime('2026-09-15T21:00:00'));
  assert.deepEqual(migrateSavedState(later,giftTime('2026-09-15T19:00:01')).giftShopItems,later.giftShopItems);
});


test('saved six-hour gift shelves adopt the three-hour schedule without losing purchased gifts or manual refreshes',()=>{
  const previousSlot=giftTime('2026-09-14T06:00:00');
  const saved={...createInitialState(previousSlot),giftShopAutoRefreshAt:previousSlot,giftShopSoldOut:['book'],giftShopManualRefreshes:2,inventory:{book:3},currency:777};
  const loaded=migrateSavedState(saved,giftTime('2026-09-14T07:00:00'));
  assert.equal(giftShopNextRefreshAt(loaded),giftTime('2026-09-14T09:00:00'));
  assert.deepEqual(loaded.giftShopItems,saved.giftShopItems);
  assert.deepEqual(loaded.giftShopSoldOut,['book']);
  assert.equal(loaded.giftShopManualRefreshes,2);
  const refreshed=migrateSavedState(loaded,giftTime('2026-09-14T09:00:00'));
  assert.equal(giftShopNextRefreshAt(refreshed),giftTime('2026-09-14T12:00:00'));
  assert.deepEqual(refreshed.giftShopSoldOut,[]);
  assert.deepEqual(refreshed.inventory,{book:3});
  assert.equal(refreshed.currency,777);
  assert.equal(refreshed.giftShopManualRefreshes,2);
});
