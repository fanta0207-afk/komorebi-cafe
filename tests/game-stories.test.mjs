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
const {recipes}=require(join(output,'data/recipes.js'));
const {gifts}=require(join(output,'data/gifts.js'));
const {ingredients}=require(join(output,'data/ingredients.js'));
const {equipment}=require(join(output,'data/equipment.js'));
const {decorations}=require(join(output,'data/decorations.js'));
const {createInitialState,reducer,migrateSavedState}=require(join(output,'game/state.js'));
const {availableEvent,isRecipeUsable,giftReaction,pickWeightedRecipe}=require(join(output,'game/logic.js'));
const {relationshipLabel,GAME_CONFIG}=require(join(output,'game/config.js'));
const {missions,currentMission,updateMissions}=require(join(output,'game/missions.js'));
const {salePrice,ingredientCost,pickIncomingOrder,availableGrowthEvent}=require(join(output,'game/logic.js'));

const {receiveSupplies,procurementRate,procurementQuote}=require(join(output,'game/procurement.js'));
const receiveAll=state=>state.deliveries.length?receiveSupplies(state,Math.max(...state.deliveries.map(item=>item.arrivesAt))):state;
const routeEvents=id=>relationshipEvents.filter(event=>event.characterId===id);
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
  const gift=gifts.filter(item=>state.giftShopItems.includes(item.id)).sort((a,b)=>a.price/GAME_CONFIG.giftAffection[giftReaction(character,a)]-b.price/GAME_CONFIG.giftAffection[giftReaction(character,b)]).find(item=>GAME_CONFIG.giftAffection[giftReaction(character,item)]>0);
  for(const event of routeEvents(id).filter(event=>event.toStage<=until)) {
    let attempts=0;
    while(state.characterProgress[id].affection<event.requiredAffection) {
      assert.ok(attempts++<100,'relationship progression must terminate');
      while(state.currency<gift.price+100)state=trade(state,10);
      state=reducer(state,{type:'BUY_GIFT',giftId:gift.id});
      state=reducer(state,{type:'GIVE_GIFT',characterId:id,giftId:gift.id,reaction:giftReaction(character,gift)});
    }
    assert.equal(availableEvent(state,relationshipEvents)?.id,event.id);
    state=complete(state,event,route);
    assert.equal(state.characterProgress[id].relationshipStage,event.toStage);
  }
  return state;
}

test('the six requested characters have 10 unique stories, consistent rewards and no dangling references',()=>{
  assert.deepEqual(characters.map(c=>[c.name,c.age]),[['黒豆 蓮',26],['白川 牧',24],['三ツ葉 葵',22],['アール・グレイ',28],['空木 海斗',25],['灰島 静',27]]);
  assert.equal(relationshipEvents.length,60);
  for(const catalog of [characters,relationshipEvents,recipes,ingredients,equipment,decorations])assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
  const catalogs={recipeIds:recipes,ingredientIds:ingredients,equipmentIds:equipment,decorationIds:decorations};
  for(const character of characters){
    assert.deepEqual(routeEvents(character.id).map(event=>event.toStage),[1,2,3,4,5,6,7,8,9,10]);
    for(const key of ['profile','voice','backstory','concern','attraction'])assert.ok(character[key].length>10);
  }
  for(const event of relationshipEvents){
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

for(const character of ['ren','sota','aki','itsuki','haru','nagisa'])test(`${character}: normal trade and gifts reach level 10 on both routes, with equal rewards and independent supplies`,()=>{
  const romance=play(character,'romance');const friendship=play(character,'friendship');
  assert.equal(romance.characterProgress[character].route,'romance');
  assert.equal(friendship.characterProgress[character].route,'friendship');
  assert.equal(romance.characterProgress[character].viewedEvents.length,10);
  assert.equal(relationshipLabel(10,'romance'),'ふたりの未来');
  assert.equal(relationshipLabel(10,'friendship'),'これからも仕事仲間');
  for(const key of ['unlockedRecipes','unlockedIngredients','unlockedEquipment','unlockedDecorations'])assert.deepEqual(romance[key],friendship[key]);
  assert.equal(availableEvent(romance,relationshipEvents),undefined);
  // No other relationship or growth route is needed for any story recipe's ingredients or equipment.
  for(const id of romance.unlockedRecipes){
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
  beforeConfession={...beforeConfession,characterProgress:{...beforeConfession.characterProgress,ren:{...beforeConfession.characterProgress.ren,affection:300}}};
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
  assert.equal(Object.keys(next.characterProgress).length,6);
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
  assert.equal(stocked.ingredients.espressoBlend,5);assert.equal(stocked.currency,4560);
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
  assert.equal(state.viewedGrowthEvents.length,30);
  assert.ok(state.unlockedRecipes.includes('richChocolatePudding'));assert.ok(state.unlockedRecipes.includes('gardenBerryTea'));
});

const {preparation,cookingMs,startProblem,equipmentPrice,upgradePrice}=require(join(output,'game/operations.js'));
// These mechanics fixtures are pre-funded and past the guided order phase.
// The new-player economy is exercised separately below without injected funds.
const isolated=()=>{const state=createInitialState();return {...state,currency:3000,missions:{...state.missions,claimed:['serve-mocha']},spawnRemainingMs:1e12};};
const addOrder=(state,id='manual',recipe='coffee',slot=0)=>reducer(state,{type:'SPAWN_ORDER',order:order(id,recipe,slot)});
const start=(state,id='manual')=>reducer(state,{type:'START_COOKING',orderId:id});
const collect=(state,id='manual')=>reducer(state,{type:'COLLECT_ORDER',orderId:id});
function hired(state,id,role,stage=3){state={...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],met:true,relationshipStage:stage}}};return reducer(state,{type:'HIRE_STAFF',characterId:id,role});}

test('coffee uses ingredients once, takes exactly 30 seconds, and earns only when served once',()=>{
  const fresh=addOrder(isolated());
  assert.equal(collect(fresh),fresh);
  let state=start(fresh);assert.equal(state.ingredients.coffeeBeans,9);assert.equal(state.currency,3000);
  assert.equal(start(state),state);assert.equal(collect(state),state);
  state=tick(state,29999);assert.equal(state.orders[0].status,'cooking');assert.equal(state.orders[0].remainingMs,1);
  assert.equal(collect(state),state);
  state=tick(state,1);assert.equal(state.orders[0].status,'ready');assert.equal(state.currency,3000);
  state=tick(state,300000);assert.equal(state.orders[0].status,'ready','no customer timeout');
  const served=collect(state);assert.ok(served.currency>state.currency);assert.equal(served.lifetimeStats.totalOrders,1);assert.equal(served.lifetimeStats.tagSales.coffee,1);
  assert.equal(collect(served),served);assert.equal(served.ingredients.coffeeBeans,9);
});

test('the whole cafe cooks one dish at a time even with different or additional machines',()=>{
  let state=addOrder(addOrder(addOrder(isolated(),'first'),'second','coffee',1),'toast','toast',2);
  state=start(state,'first');assert.match(startProblem(state,recipes[0]),/1品ずつ/);
  assert.equal(start(state,'second'),state);assert.equal(start(state,'toast'),state);
  const price=equipmentPrice(state,'coffeeCounter');state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'});assert.equal(state.currency,3000-price);
  assert.equal(start(state,'second'),state);
  assert.equal(state.orders.filter(item=>item.status==='cooking').length,1);
  state=tick(state,30000);state=start(state,'second');
  assert.equal(state.orders.filter(item=>item.status==='cooking').length,1);
  assert.notEqual(state.orders[0].stationId,state.orders[1].stationId,'ready dishes hold their own station until served');
  state=tick(state,30000);state=start(state,'toast');state=tick(state,30000);
  assert.equal(state.orders.filter(item=>item.status==='ready').length,3);
  state=addOrder(state,'next','coffee',3);assert.equal(start(state,'next'),state);
  state=collect(state,'first');state=start(state,'next');assert.equal(state.orders.find(item=>item.id==='next').status,'cooking');
});

test('insufficient food, locked recipes and missing equipment cannot consume stock or cook',()=>{
  let state=addOrder({...isolated(),ingredients:{coffeeBeans:0,bread:1}});assert.equal(start(state),state);
  state=addOrder({...isolated(),unlockedRecipes:['coffee']},'toast','toast');assert.equal(start(state,'toast'),state);
  state=addOrder({...isolated(),unlockedRecipes:['espresso'],ingredients:{espressoBlend:5}},'espresso','espresso');assert.equal(start(state,'espresso'),state);
  const purchased=reducer(isolated(),{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});assert.equal(purchased.ingredients.coffeeBeans,10);assert.equal(purchased.deliveries[0].packs,1);assert.equal(purchased.currency,2900);
});

test('all 51 recipes have real ingredients, a valid station, finite cooking time and positive ingredient margin',()=>{
  assert.equal(recipes.length,51);
  for(const recipe of recipes){
    assert.ok(recipe.requiredIngredients.length>0,recipe.id);
    assert.equal(new Set(recipe.requiredIngredients).size,recipe.requiredIngredients.length);
    const prep=preparation(recipe);assert.ok(equipment.some(item=>item.id===prep.equipmentId),recipe.id);assert.equal(prep.seconds,30);
    const cost=recipe.requiredIngredients.reduce((sum,id)=>sum+ingredients.find(item=>item.id===id).price/5,0);assert.ok(recipe.price>cost,recipe.id);
    let state={...isolated(),unlockedRecipes:[recipe.id],ownedEquipment:equipment.map(item=>item.id),stations:equipment.map(item=>({id:item.id,equipmentId:item.id,level:1})),ingredients:Object.fromEntries(recipe.requiredIngredients.map(id=>[id,1]))};
    state=start(addOrder(state,'manual',recipe.id));assert.equal(state.orders[0].status,'cooking',recipe.id);
    state=collect(tick(state,prep.seconds*1000));assert.equal(state.lifetimeStats.recipeSales[recipe.id],1,recipe.id);
    assert.ok(Object.values(state.ingredients).every(count=>count===0));
  }
});

test('upgrades shorten preparation and enforce costs, busy state, levels and machine cap',()=>{
  let state={...isolated(),currency:100000};const first=state.stations[0];const cost=upgradePrice(first);
  state=reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id});assert.equal(state.currency,100000-cost);assert.equal(cookingMs(state,recipes[0],state.stations[0]),25500);
  const cooking=start(addOrder(state));assert.equal(reducer(cooking,{type:'UPGRADE_EQUIPMENT',stationId:first.id}),cooking);
  for(let i=0;i<3;i++)state=reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id});assert.equal(state.stations[0].level,5);assert.equal(reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:first.id}),state);
  for(let i=0;i<2;i++)state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'});assert.equal(state.stations.filter(item=>item.equipmentId==='coffeeCounter').length,3);assert.equal(reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'}),state);
});

test('hiring is gated at stage 3, charged once, and works on friendship routes',()=>{
  let state=isolated();assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'}),state);
  state=hired(state,'ren','cook');assert.equal(state.currency,1800);assert.equal(state.staff.length,1);assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'server'}),state);
  state.characterProgress.haru={...state.characterProgress.haru,met:true,relationshipStage:9,route:'friendship'};
  state=reducer(state,{type:'HIRE_STAFF',characterId:'haru',role:'server'});assert.equal(state.staff.length,2);assert.equal(state.currency,600);
});

test('a cook and a server run the whole loop; manual serving during delivery never pays twice',()=>{
  let state=hired(hired(isolated(),'ren','cook'),'haru','server');state=addOrder(state);
  state=tick(state,29999);assert.equal(state.orders[0].status,'cooking');assert.equal(state.currency,600);
  state=tick(state,1);assert.equal(state.orders[0].status,'ready');assert.equal(state.staff[1].servingOrderId,'manual');
  const manual=collect(state);const afterDelivery=tick(manual,2000);assert.equal(afterDelivery.lifetimeStats.totalOrders,1);
  state=tick(state,1999);assert.equal(state.lifetimeStats.totalOrders,0);state=tick(state,1);assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.ingredients.coffeeBeans,9);assert.equal(state.currency,636);
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
  state=tick(state,29000);assert.equal(state.orders.find(item=>item.id==='a').status,'ready');assert.equal(state.orders.find(item=>item.id==='b').status,'queued');
  state=reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'rest'});state=tick(state,2000);assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.staff[0].role,'rest');
  state=tick(state,10000);assert.equal(state.orders[0].status,'queued');
});

test('each character gains the specified specialty at level 6 only',()=>{
  const recipeIds={ren:'coffee',sota:'latte',aki:'fruitPlatter',itsuki:'strawberryCake',haru:'toast',nagisa:'tea'};
  for(const [id,recipeId] of Object.entries(recipeIds)){
    let state={...isolated(),currency:20000};state=hired(state,id,'cook',5);
    const recipe=recipes.find(item=>item.id===recipeId);const station={id:'station',equipmentId:preparation(recipe).equipmentId,level:1};
    const base=cookingMs(state,recipe,station,id);state.characterProgress[id].relationshipStage=6;
    assert.equal(cookingMs(state,recipe,station,id),Math.round(base*0.8),id);
  }
});

test('reload and suspended time never yield offline coins or progress; v4 migration is idempotent',()=>{
  let state=tick(start(addOrder(isolated())),3000);const saved=JSON.parse(JSON.stringify(state));
  for(const deltaMs of [0,-1,1001,86400000,Infinity,NaN])assert.equal(reducer(state,{type:'TICK',deltaMs}),state);
  const resumed=migrateSavedState(saved,Date.now()+86400000);assert.equal(resumed.currency,state.currency);assert.equal(resumed.orders[0].remainingMs,27000);assert.equal(resumed.offlineOffer,0);assert.equal(collect(resumed),resumed);
  const old={...saved,saveVersion:4,ingredients:{coffeeBeans:3},ownedEquipment:['espressoMachine'],unlockedEquipment:['espressoMachine'],orders:[{id:'old',recipeId:'coffee',customerSlot:0}],offlineOffer:480};
  const migrated=migrateSavedState(old);assert.equal(migrated.ingredients.coffeeBeans,25);assert.equal(migrated.stations.length,4);assert.equal(migrated.orders[0].status,'queued');assert.equal(migrated.currency,old.currency);assert.equal(migrated.offlineOffer,0);
  assert.deepEqual(migrateSavedState(migrated).ingredients,migrated.ingredients);
  assert.equal(reducer(migrated,{type:'CLAIM_OFFLINE'}),migrated);
});

test('visiting and gifting have no daily limit, repeated dialogue is not farmable, and trade gates stories',()=>{
  let state=reducer(isolated(),{type:'VISIT',characterId:'ren'});const aff=state.characterProgress.ren.affection;
  for(let i=0;i<20;i++)state=reducer(state,{type:'VISIT',characterId:'ren'});assert.equal(state.characterProgress.ren.affection,aff);
  state={...state,inventory:{mug:2}};for(let i=0;i<2;i++)state=reducer(state,{type:'GIVE_GIFT',characterId:'ren',giftId:'mug',reaction:'love'});assert.equal(state.inventory.mug,0);assert.ok(state.characterProgress.ren.affection>aff);
  state={...state,characterProgress:{...state.characterProgress,ren:{...state.characterProgress.ren,relationshipStage:2,affection:100,viewedEvents:['ren-stage1','ren-stage2']}}};assert.equal(availableEvent(state,relationshipEvents),undefined);
  state=trade(state,5);state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});assert.equal(availableEvent(state,relationshipEvents)?.id,'ren-stage3');
});

test('automatic order generation respects stock, slots and capacity during sustained play',()=>{
  let state=hired(hired({...isolated(),spawnRemainingMs:1000},'ren','cook'),'haru','server');state=tick(state,700000);
  assert.ok(state.lifetimeStats.totalOrders>=19);assert.ok(state.orders.length<=4);assert.ok(Object.values(state.ingredients).every(count=>count>=0));
  const coins=state.currency;state=tick(state,60000);assert.equal(state.currency,coins);
  state=receiveAll(reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'}));state=tick(state,120000);assert.ok(state.currency>coins);
});

test('all 51 recipes retain ingredient cost but reduce the normal profit to one tenth',()=>{
  assert.equal(createInitialState().currency,200);
  assert.equal(salePrice('coffee'),36);
  assert.equal(salePrice('toast'),31);
  assert.equal(salePrice('cafeMocha'),115);
  for(const recipe of recipes){
    const cost=ingredientCost(recipe.id),margin=salePrice(recipe.id)-cost;
    assert.equal(margin,Math.round((recipe.price-cost)/10));
    assert.ok(margin>0);
  }
  assert.equal(upgradePrice(createInitialState().stations[0]),450);
  const state=createInitialState();
  assert.equal(reducer(state,{type:'UPGRADE_EQUIPMENT',stationId:state.stations[0].id}),state);
  assert.equal(missions.length,37);
  assert.equal(new Set(missions.map(m=>m.id)).size,37);
  assert.ok(missions.every(m=>m.reward>0&&m.hint.length>20));
  assert.ok(missions.reduce((sum,m)=>sum+m.reward,0)<=500,'intro rewards must not buy special equipment outright');
});

test('mission rewards are sequential, exactly once, latched, and separate from cafe sales',()=>{
  let state=createInitialState();
  assert.equal(reducer(state,{type:'CLAIM_MISSION',missionId:'first-order'}),state);
  assert.equal(reducer(state,{type:'CLAIM_MISSION',missionId:'not-real'}),state);
  state=addOrder(state);
  const coins=state.currency;
  assert.ok(state.missions.completed.includes('first-order'));
  state=reducer(state,{type:'DECLINE_ORDER',orderId:'manual'});
  assert.ok(state.missions.completed.includes('first-order'),'removing the order cannot undo completion');
  state=reducer(state,{type:'CLAIM_MISSION',missionId:'first-order'});
  assert.equal(state.currency,coins+5);
  assert.equal(state.lifetimeStats.totalRevenue,0);
  assert.equal(state.lifetimeStats.totalOrders,0);
  assert.equal(reducer(state,{type:'CLAIM_MISSION',missionId:'first-order'}),state);
  state=reducer(state,{type:'MISSION_VIEW',place:'gifts'});
  assert.ok(state.missions.completed.includes('visit-gifts'),'out-of-order achievements are retained');
  assert.equal(reducer(state,{type:'CLAIM_MISSION',missionId:'visit-gifts'}),state,'cannot skip earlier rewards');
  const restored=migrateSavedState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.currency,state.currency);
  assert.deepEqual(restored.missions,state.missions);
  assert.equal(reducer(restored,{type:'CLAIM_MISSION',missionId:'first-order'}),restored);
  const reset=reducer(restored,{type:'RESET'});
  assert.equal(reset.currency,200);assert.equal(reset.missions.claimed.length,0);assert.equal(reset.missions.completed.length,0);
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

test('guided orders do not depend on luck, reserve stock and return to normal requests after the intro',()=>{
  let state=createInitialState();
  const random=Math.random;
  try{
    Math.random=()=>.99;
    assert.deepEqual(pickIncomingOrder(state),{recipeId:'coffee'});
    state={...state,ingredients:{coffeeBeans:1,bread:0},orders:[order()]};
    assert.equal(pickIncomingOrder(state),undefined,'reserved food is not double promised');
    state={...state,orders:[],unlockedRecipes:[...state.unlockedRecipes,'cafeMocha'],ingredients:{coffeeBeans:1,milk:1,chocolate:1}};
    assert.deepEqual(pickIncomingOrder(state),{recipeId:'cafeMocha'});
    const missing={...state,ingredients:{coffeeBeans:1}};
    assert.notEqual(pickIncomingOrder(missing)?.recipeId,'cafeMocha');
    state={...state,missions:{...state.missions,claimed:['serve-mocha']},lifetimeStats:{...state.lifetimeStats,totalOrders:3},ingredients:{coffeeBeans:10,bread:10}};
    Math.random=()=>0;assert.deepEqual(pickIncomingOrder(state),{recipeId:'latte',request:true});
  }finally{Math.random=random;}
});

test('a fresh player finishes every mission, develops and serves mocha, then saves for an upgrade without cheats',t=>{
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
    for(let i=0;i<3000&&currentMission(state);i++){
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
        case 'inventory':view('inventory');break;
        case 'visit-gifts':view('gifts');break;
        case 'buy-book':act({type:'BUY_GIFT',giftId:'book'});break;
        case 'ren-profile':view('ren');break;
        case 'give-book':act({type:'GIVE_GIFT',characterId:'ren',giftId:'book',reaction:'like'});break;
        case 'mocha-recipe':view('recipes');break;
        case 'meet-ranch':act({type:'VISIT',characterId:'sota'});break;
        case 'buy-milk':buy('milk');break;
        case 'buy-chocolate':act({type:'VISIT',characterId:'itsuki'});buy('chocolate');break;
        case 'view-investment':view('equipment');break;
        case 'first-investment':{
          for(const o of state.orders.filter(o=>o.status==='ready'))act({type:'COLLECT_ORDER',orderId:o.id});
          const station=state.stations.find(s=>s.equipmentId==='coffeeCounter');
          act({type:'UPGRADE_EQUIPMENT',stationId:station.id});
          now+=1000;elapsed+=1000;act({type:'TICK',deltaMs:1000,now});break;
        }
        default:{
          // Replenish when the available beans are all consumed or reserved, using earned money only.
          const reserved=state.orders.filter(o=>o.status==='queued').filter(o=>recipes.find(r=>r.id===o.recipeId)?.requiredIngredients.includes('coffeeBeans')).length;
          if((state.ingredients.coffeeBeans||0)<=reserved&&!state.deliveries.length&&state.currency>=100)buy('coffeeBeans');
          else serveWhileWaiting();
        }
      }
    }
    assert.equal(currentMission(state),undefined,`stuck on ${currentMission(state)?.id}, coins=${state.currency}, elapsed=${elapsed/1000}s`);
    assert.equal(state.missions.claimed.length,37);
    assert.ok(firstDevelopmentAt>0&&firstDevelopmentAt<=15*60000,`development took ${firstDevelopmentAt/1000}s`);
    assert.ok(state.lifetimeStats.recipeSales.cafeMocha>=1);
    assert.equal(state.stations.find(s=>s.equipmentId==='coffeeCounter').level,2);
    assert.ok(state.currency>=100,'investment leaves money for a pack of beans');
    const expected=GAME_CONFIG.initialCurrency+state.lifetimeStats.totalRevenue+missions.reduce((sum,m)=>sum+m.reward,0)
      -Object.entries(state.lifetimeStats.ingredientPurchases).reduce((sum,[id,n])=>sum+ingredients.find(i=>i.id===id).price*n,0)-360-450;
    assert.equal(state.currency,expected,'no hidden subsidies, repeat rewards, or free supplies');
    t.diagnostic(`guided play: first development ${firstDevelopmentAt/1000}s, all missions ${elapsed/1000}s, ${state.lifetimeStats.totalOrders} dishes, ${state.currency} coins remaining`);
  }finally{Math.random=random;}
});

test('incoming orders account for waiting orders so an exhausted menu cannot block other dishes',()=>{
  let state={...isolated(),ingredients:{coffeeBeans:1,bread:1}};
  state=addOrder(state);for(let i=0;i<20;i++)assert.equal(pickWeightedRecipe(state),'toast');
  state=addOrder(state,'toast','toast',1);assert.equal(pickWeightedRecipe(state),undefined);
  assert.equal(state.ingredients.coffeeBeans,1,'admission does not consume ingredients');
});

test('legacy simultaneous cooking resumes serially without losing time, stock or save compatibility', () => {
  const initial = createInitialState();
  const coffeeStation = initial.stations.find(item => item.equipmentId === 'coffeeCounter');
  const toastStation = initial.stations.find(item => item.equipmentId === 'toastGrill');
  let state = migrateSavedState({ ...initial, spawnRemainingMs: 1e12, orders: [
    { ...order('old-coffee'), status: 'cooking', totalMs: 10000, remainingMs: 2000, stationId: coffeeStation.id },
    { ...order('old-toast', 'toast', 1), status: 'cooking', totalMs: 8000, remainingMs: 4000, stationId: toastStation.id },
  ] });
  const stock = { ...state.ingredients };
  state = tick(state, 1000);
  assert.deepEqual(state.orders.map(item => item.remainingMs), [1000, 4000]);
  state = tick(state, 1000);
  assert.deepEqual(state.orders.map(item => [item.status, item.remainingMs]), [['ready', 0], ['cooking', 4000]]);
  state = migrateSavedState(JSON.parse(JSON.stringify(state)));
  state = tick(state, 4000);
  assert.ok(state.orders.every(item => item.status === 'ready'));
  assert.deepEqual(state.ingredients, stock);
  assert.equal(state.lifetimeStats.totalOrders, 0);
});

test('staff and manual orders share the single kitchen even when different machines are free', () => {
  let state = { ...createInitialState(), spawnRemainingMs: 1e12,
    staff: [{ characterId: 'ren', role: 'cook', remainingMs: 0 }, { characterId: 'haru', role: 'cook', remainingMs: 0 }],
    orders: [order('manual'), order('staff-toast', 'toast', 1), order('next-coffee', 'coffee', 2)] };
  state = reducer(state, { type: 'START_COOKING', orderId: 'manual' });
  state = tick(state, 1000);
  assert.equal(state.orders.filter(item => item.status === 'cooking').length, 1);
  assert.equal(state.orders[1].status, 'queued');
  state = tick(state, 29000);
  assert.equal(state.orders[0].status, 'ready');
  assert.equal(state.orders[1].status, 'cooking');
  assert.equal(state.orders[2].status, 'queued');
  const before = state.ingredients;
  state = reducer(state, { type: 'START_COOKING', orderId: 'next-coffee' });
  assert.equal(state.orders.filter(item => item.status === 'cooking').length, 1);
  assert.deepEqual(state.ingredients, before);
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
        assert.equal(salePrice('coffee', changed), 36);
      }
    }
  } finally { Math.random = originalRandom; }
  const later = tick(state, 301000);
  for (const key of ["dailyWeatherId", "dailyCustomerGroupId", "dailyEventId"]) assert.equal(later[key], state[key]);
});

test('bulk procurement scales with quantity and rejects further purchases until the complete batch arrives', () => {
  let state = reducer(isolated(), { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 1000 });
  assert.equal(state.currency, 2700);
  assert.equal(state.ingredients.coffeeBeans, 10);
  assert.equal(state.deliveries[0].arrivesAt, 541000);
  for (const now of [1000, 31000, 540999]) {
    const rejected = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 2, now });
    for (const key of ['currency', 'ingredients', 'deliveries', 'characterProgress', 'lifetimeStats']) assert.deepEqual(rejected[key], state[key]);
    assert.match(rejected.notice.text, /追加発注できません/);
  }
  state = migrateSavedState(JSON.parse(JSON.stringify(state)), 31000);
  assert.equal(procurementQuote(state, 'coffeeBeans', 2, 31000).blocking.id, state.deliveries[0].id);
  assert.equal(receiveSupplies(state, 540999), state);
  state = receiveSupplies(state, 541000);
  assert.equal(state.ingredients.coffeeBeans, 25);
  assert.equal(state.deliveries.length, 0);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 2, now: 541000 });
  assert.equal(state.deliveries.length, 1);
  assert.equal(state.deliveries[0].arrivesAt, 901000);
  const restored = migrateSavedState(JSON.parse(JSON.stringify(state)), 901000);
  assert.equal(restored.ingredients.coffeeBeans, 35);
  assert.equal(restored.currency, 2500);
  assert.equal(restored.deliveries.length, 0);
  assert.equal(restored.lifetimeStats.ingredientPurchases.coffeeBeans, 5);
  assert.deepEqual(migrateSavedState(JSON.parse(JSON.stringify(restored)), 901000).ingredients, restored.ingredients);
  assert.equal(restored.lifetimeStats.totalRevenue, 0);
});

test('invalid or unaffordable procurement cannot create deliveries, and new recipes unlock on arrival', () => {
  const state = isolated();
  for (const packs of [0, -1, 1.5, 21, NaN, Infinity]) assert.equal(reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', packs }), state);
  assert.equal(reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'espressoBlend', packs: 2 }), state);
  const broke = { ...state, currency: 0 };
  const rejected = reducer(broke, { type: 'BUY_INGREDIENT', ingredientId: 'milk' });
  assert.equal(rejected.currency, 0);
  assert.equal(rejected.deliveries.length, 0);
  const ordered = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 1000 });
  assert.equal(ordered.unlockedRecipes.includes('latte'), false);
  const arrived = receiveSupplies(ordered, 181000);
  assert.equal(arrived.unlockedRecipes.includes('latte'), true);
  assert.equal(arrived.ingredients.milk, 5);
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
    assert.equal(pickIncomingOrder({ ...state, currency: 0, ingredients: {} }), undefined, 'do not ask for supplies the player cannot afford');
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
  state = reducer(state, { type: 'TICK', deltaMs: 100, now: 181000 });
  state = start(state, 'request');
  assert.equal(state.orders[0].status, 'cooking');
  assert.equal(reducer(state, { type: 'DECLINE_ORDER', orderId: 'request' }), state);
  state = tick(state, 30000);
  const coins = state.currency;
  const served = reducer(state, { type: 'COLLECT_ORDER', orderId: 'request' });
  assert.equal(served.currency - coins, 84);
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
  const next = reducer(restored, { type: 'BUY_INGREDIENT', ingredientId: 'milk', now: 361000 });
  assert.equal(next.ingredients.bread, state.ingredients.bread + 10, 'overdue batch settles before next purchase');
  assert.equal(next.deliveries.length, 1);
  assert.equal(next.deliveries[0].ingredientId, 'milk');
  assert.equal(next.deliveries[0].arrivesAt, 541000);
});

test('each supplier speeds up from 180 to 30 seconds per pack on both routes, without changing existing deadlines', () => {
  for (const character of characters) {
    const ingredient = ingredients.find(item => item.supplierId === character.supplierId && !item.unlockEventId);
    for (const route of ['romance', 'friendship']) {
      for (let level = 0; level <= 10; level++) {
        const initial = isolated();
        const state = { ...initial, characterProgress: { ...initial.characterProgress, [character.id]: { ...initial.characterProgress[character.id], met: true, route, relationshipStage: level } } };
        const rate = procurementRate(state, ingredient.id);
        assert.equal(rate.perPackMs, 180000 - 15000 * level);
        const ordered = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: ingredient.id, packs: 3, now: 1000 });
        assert.equal(ordered.deliveries[0].arrivesAt, 1000 + rate.perPackMs * 3);
        const other = ingredients.find(item => item.supplierId !== character.supplierId && !item.unlockEventId);
        assert.equal(procurementRate(state, other.id).perPackMs, 180000);
      }
    }
  }
  let state = reducer(isolated(), { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', now: 1000 });
  state = { ...state, characterProgress: { ...state.characterProgress, ren: { ...state.characterProgress.ren, relationshipStage: 10 } } };
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 2000 });
  assert.deepEqual(state.deliveries.map(item => item.arrivesAt), [181000]);
  state = reducer(state, { type: 'BUY_INGREDIENT', ingredientId: 'coffeeBeans', packs: 3, now: 181000 });
  assert.deepEqual(state.deliveries.map(item => item.arrivesAt), [271000]);
  const restored = migrateSavedState(JSON.parse(JSON.stringify(state)), 270999);
  assert.equal(restored.ingredients.coffeeBeans, 15);
  assert.equal(restored.deliveries[0].arrivesAt, 271000);
  assert.equal(receiveSupplies(restored, 271000).ingredients.coffeeBeans, 30);
});

test('previously paid parallel deliveries preserve their deadlines and settle exactly once', () => {
  const initial = isolated();
  const old = { ...initial, deliveries: [
    { id: 'old-coffee', ingredientId: 'coffeeBeans', packs: 3, orderedAt: 1000, arrivesAt: 181000 },
    { id: 'old-milk', ingredientId: 'milk', packs: 2, orderedAt: 2000, arrivesAt: 182000 },
  ] };
  const restored = migrateSavedState(JSON.parse(JSON.stringify(old)), 100000);
  assert.deepEqual(restored.deliveries, old.deliveries);
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
  assert.match(orderRequirements(state, order).find(item => item.id === 'ingredient-milk').detail, /入荷まで 3:00/);
  state = receiveSupplies(state, 181000);
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
  assert.match(orderRequirements(cooking, order).find(item => item.id === 'cooking').detail, /ほかの料理を調理中/);
});
