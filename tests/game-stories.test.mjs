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
const {ingredients}=require(join(output,'data/ingredients.js'));
const {equipment}=require(join(output,'data/equipment.js'));
const {decorations}=require(join(output,'data/decorations.js'));
const {createInitialState,reducer,migrateSavedState}=require(join(output,'game/state.js'));
const {availableEvent,isRecipeUsable}=require(join(output,'game/logic.js'));
const {relationshipLabel,GAME_CONFIG}=require(join(output,'game/config.js'));

const routeEvents=id=>relationshipEvents.filter(event=>event.characterId===id);
function complete(state,event,route='romance') {
  return reducer(state,{type:'COMPLETE_EVENT',eventId:event.id,choiceId:event.choices?.[0]?.id,route:event.toStage===9?route:undefined});
}
function play(id,route='romance',until=10) {
  let state=reducer(createInitialState(),{type:'VISIT',characterId:id});
  for(const event of routeEvents(id).filter(event=>event.toStage<=until)) {
    while(state.characterProgress[id].affection<event.requiredAffection) {
      state=reducer(state,{type:'NEXT_DAY'});
      state=reducer(state,{type:'VISIT',characterId:id});
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

for(const character of ['ren','sota','aki','itsuki','haru','nagisa'])test(`${character}: normal visits reach level 10 on both routes, with equal rewards and independent supplies`,()=>{
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

test('a v3 save keeps progress, possessions, existing growth unlocks and daily action limits',()=>{
  const old={...createInitialState(),saveVersion:3,currency:12345,ingredients:{milk:8},inventory:{book:2},day:12,actionsRemaining:2,unlockedRecipes:['coffee','moonLatte'],viewedGrowthEvents:['ren-growth1','ren-growth2'],unlockedEquipment:['espressoMachine'],ownedEquipment:['espressoMachine']};
  old.characterProgress={ren:{affection:60,relationshipStage:3,viewedEvents:['ren-stage2','ren-stage3'],met:true,visits:5},haru:{affection:0,relationshipStage:1,viewedEvents:[],met:false,visits:0}};
  const next=migrateSavedState(old);
  assert.equal(next.saveVersion,GAME_CONFIG.saveVersion);
  assert.equal(next.currency,12345);assert.deepEqual(next.ingredients,{milk:8});assert.deepEqual(next.inventory,{book:2});
  assert.equal(next.day,12);assert.equal(next.actionsRemaining,2);
  assert.deepEqual(next.viewedGrowthEvents,old.viewedGrowthEvents);assert.deepEqual(next.ownedEquipment,old.ownedEquipment);
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
  assert.equal(reducer(purchased,{type:'BUY_EQUIPMENT',equipmentId:'espressoMachine'}),purchased);
  const stocked=reducer(purchased,{type:'BUY_INGREDIENT',ingredientId:'espressoBlend'});
  assert.equal(stocked.ingredients.espressoBlend,1);assert.equal(stocked.currency,4560);
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
