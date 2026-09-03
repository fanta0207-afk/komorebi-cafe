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

const routeEvents=id=>relationshipEvents.filter(event=>event.characterId===id);
function complete(state,event,route='romance') {
  return reducer(state,{type:'COMPLETE_EVENT',eventId:event.id,choiceId:event.choices?.[0]?.id,route:event.toStage===9?route:undefined});
}
function tick(state,ms){while(ms>0){const deltaMs=Math.min(1000,ms);state=reducer(state,{type:'TICK',deltaMs});ms-=deltaMs;}return state;}
function order(id='manual',recipeId='coffee',customerSlot=0){return {id,recipeId,customerSlot,status:'queued',remainingMs:0,totalMs:0};}
function trade(state,count){
  for(let i=0;i<count;i++){
    if(!(state.ingredients.coffeeBeans>0))state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});
    state=reducer(state,{type:'SPAWN_ORDER',order:order()});
    state=reducer(state,{type:'START_COOKING',orderId:'manual'});
    state=tick(state,10000);state=reducer(state,{type:'COLLECT_ORDER',orderId:'manual'});
  }return state;
}
function play(id,route='romance',until=10) {
  let state={...createInitialState(),spawnRemainingMs:1e12};
  state=trade(state,100);
  state=reducer(state,{type:'VISIT',characterId:id});
  const character=characters.find(c=>c.id===id);
  const supply=ingredients.find(item=>item.supplierId===character.supplierId&&!item.unlockEventId);
  for(let i=0;i<8;i++)state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:supply.id});
  const gift=gifts.filter(item=>state.giftShopItems.includes(item.id)).sort((a,b)=>a.price/GAME_CONFIG.giftAffection[giftReaction(character,a)]-b.price/GAME_CONFIG.giftAffection[giftReaction(character,b)]).find(item=>GAME_CONFIG.giftAffection[giftReaction(character,item)]>0);
  for(const event of routeEvents(id).filter(event=>event.toStage<=until)) {
    let attempts=0;
    while(state.characterProgress[id].affection<event.requiredAffection) {
      assert.ok(attempts++<100,'relationship progression must terminate');
      if(state.currency<gift.price)state=trade(state,10);
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
  const stocked=reducer(purchased,{type:'BUY_INGREDIENT',ingredientId:'espressoBlend'});
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
const isolated=()=>({...createInitialState(),spawnRemainingMs:1e12});
const addOrder=(state,id='manual',recipe='coffee',slot=0)=>reducer(state,{type:'SPAWN_ORDER',order:order(id,recipe,slot)});
const start=(state,id='manual')=>reducer(state,{type:'START_COOKING',orderId:id});
const collect=(state,id='manual')=>reducer(state,{type:'COLLECT_ORDER',orderId:id});
function hired(state,id,role,stage=3){state={...state,characterProgress:{...state.characterProgress,[id]:{...state.characterProgress[id],met:true,relationshipStage:stage}}};return reducer(state,{type:'HIRE_STAFF',characterId:id,role});}

test('coffee uses ingredients once, takes exactly 10 seconds, and earns only when served once',()=>{
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

test('a machine handles one dish; different machines and added machines cook in parallel',()=>{
  let state=addOrder(addOrder(addOrder(isolated(),'first'),'second','coffee',1),'toast','toast',2);
  state=start(state,'first');assert.match(startProblem(state,recipes[0]),/空き/);
  assert.equal(start(state,'second'),state);state=start(state,'toast');assert.equal(state.orders.filter(item=>item.status==='cooking').length,2);
  const price=equipmentPrice(state,'coffeeCounter');state=reducer(state,{type:'BUY_EQUIPMENT',equipmentId:'coffeeCounter'});assert.equal(state.currency,3000-price);
  state=start(state,'second');assert.equal(state.orders.filter(item=>item.status==='cooking').length,3);
  assert.equal(new Set(state.orders.map(item=>item.stationId)).size,3);
  state=tick(state,10000);assert.equal(state.orders.filter(item=>item.status==='ready').length,3);
  state=addOrder(state,'next','coffee',3);assert.equal(start(state,'next').orders.find(item=>item.id==='next').status,'cooking','ready dishes release their machines');
});

test('insufficient food, locked recipes and missing equipment cannot consume stock or cook',()=>{
  let state=addOrder({...isolated(),ingredients:{coffeeBeans:0,bread:1}});assert.equal(start(state),state);
  state=addOrder({...isolated(),unlockedRecipes:['coffee']},'toast','toast');assert.equal(start(state,'toast'),state);
  state=addOrder({...isolated(),unlockedRecipes:['espresso'],ingredients:{espressoBlend:5}},'espresso','espresso');assert.equal(start(state,'espresso'),state);
  const purchased=reducer(isolated(),{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});assert.equal(purchased.ingredients.coffeeBeans,15);assert.equal(purchased.currency,2900);
});

test('all 51 recipes have real ingredients, a valid station, finite cooking time and positive ingredient margin',()=>{
  assert.equal(recipes.length,51);
  for(const recipe of recipes){
    assert.ok(recipe.requiredIngredients.length>0,recipe.id);
    assert.equal(new Set(recipe.requiredIngredients).size,recipe.requiredIngredients.length);
    const prep=preparation(recipe);assert.ok(equipment.some(item=>item.id===prep.equipmentId),recipe.id);assert.ok(prep.seconds>=8&&prep.seconds<=20);
    const cost=recipe.requiredIngredients.reduce((sum,id)=>sum+ingredients.find(item=>item.id===id).price/5,0);assert.ok(recipe.price>cost,recipe.id);
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

test('hiring is gated at stage 3, charged once, and works on friendship routes',()=>{
  let state=isolated();assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'cook'}),state);
  state=hired(state,'ren','cook');assert.equal(state.currency,1800);assert.equal(state.staff.length,1);assert.equal(reducer(state,{type:'HIRE_STAFF',characterId:'ren',role:'server'}),state);
  state.characterProgress.haru={...state.characterProgress.haru,met:true,relationshipStage:9,route:'friendship'};
  state=reducer(state,{type:'HIRE_STAFF',characterId:'haru',role:'server'});assert.equal(state.staff.length,2);assert.equal(state.currency,600);
});

test('a cook and a server run the whole loop; manual serving during delivery never pays twice',()=>{
  let state=hired(hired(isolated(),'ren','cook'),'haru','server');state=addOrder(state);
  state=tick(state,9999);assert.equal(state.orders[0].status,'cooking');assert.equal(state.currency,600);
  state=tick(state,1);assert.equal(state.orders[0].status,'ready');assert.equal(state.staff[1].servingOrderId,'manual');
  const manual=collect(state);const afterDelivery=tick(manual,2000);assert.equal(afterDelivery.lifetimeStats.totalOrders,1);
  state=tick(state,1999);assert.equal(state.lifetimeStats.totalOrders,0);state=tick(state,1);assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.ingredients.coffeeBeans,9);assert.equal(state.currency,798);
});

test('multiple cooks and servers cannot reserve one machine, ingredient or finished dish twice',()=>{
  let state={...isolated(),currency:20000,ingredients:{coffeeBeans:1,bread:0}};
  for(const id of ['ren','sota'])state=hired(state,id,'cook');
  for(const id of ['haru','aki'])state=hired(state,id,'server');
  state=addOrder(addOrder(state,'a'),'b','coffee',1);state=tick(state,12000);
  assert.equal(state.lifetimeStats.totalOrders,1);assert.equal(state.ingredients.coffeeBeans,0);assert.equal(state.orders.length,1);assert.equal(state.orders[0].status,'queued');
  const coins=state.currency;state=tick(state,60000);assert.equal(state.currency,coins);assert.equal(state.lifetimeStats.ingredientPurchases.coffeeBeans,undefined,'no automatic procurement');
});

test('role changes finish current work before starting a new job, including resting',()=>{
  let state=hired(isolated(),'ren','cook');state=addOrder(addOrder(state,'a'),'b','coffee',1);state=tick(state,1000);
  state=reducer(state,{type:'ASSIGN_STAFF',characterId:'ren',role:'server'});assert.equal(state.staff[0].role,'server');
  state=tick(state,9000);assert.equal(state.orders.find(item=>item.id==='a').status,'ready');assert.equal(state.orders.find(item=>item.id==='b').status,'queued');
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
  const resumed=migrateSavedState(saved,Date.now()+86400000);assert.equal(resumed.currency,state.currency);assert.equal(resumed.orders[0].remainingMs,7000);assert.equal(resumed.offlineOffer,0);assert.equal(collect(resumed),resumed);
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
  let state=hired(hired(createInitialState(),'ren','cook'),'haru','server');state=tick(state,600000);
  assert.ok(state.lifetimeStats.totalOrders>=19);assert.ok(state.orders.length<=4);assert.ok(Object.values(state.ingredients).every(count=>count>=0));
  const coins=state.currency;state=tick(state,60000);assert.equal(state.currency,coins);
  state=reducer(state,{type:'BUY_INGREDIENT',ingredientId:'coffeeBeans'});state=tick(state,120000);assert.ok(state.currency>coins);
});

test('incoming orders account for waiting orders so an exhausted menu cannot block other dishes',()=>{
  let state={...isolated(),ingredients:{coffeeBeans:1,bread:1}};
  state=addOrder(state);for(let i=0;i<20;i++)assert.equal(pickWeightedRecipe(state),'toast');
  state=addOrder(state,'toast','toast',1);assert.equal(pickWeightedRecipe(state),undefined);
  assert.equal(state.ingredients.coffeeBeans,1,'admission does not consume ingredients');
});
