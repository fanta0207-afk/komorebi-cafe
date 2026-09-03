import { characters } from "../data/characters";
import { gifts } from "../data/gifts";
import { recipes } from "../data/recipes";
import { getCustomerGroup, getTownDailyEvent, getWeather } from "../data/dailyConditions";
import { growthEvents } from "../data/growthEvents";
import { hiddenUnlocks } from "../data/hiddenUnlocks";
import type { Character, Gift, GiftReaction, GameState, GrowthEvent, GrowthStatRequirement, RelationshipEvent } from "../types/game";

export const initialRecipeIds = recipes.filter(item => item.initiallyUnlocked).map(item => item.id);

export function findNewRecipes(owned:Record<string,number>, unlocked:string[]) {
  return recipes.filter(recipe => !recipe.unlockEventId && !unlocked.includes(recipe.id) && recipe.requiredIngredients.every(id => (owned[id] || 0) > 0)).map(recipe => recipe.id);
}

export function randomShopItems(count=10) {
  const pool = [...gifts];
  for (let i=pool.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool.slice(0,count).map(gift => gift.id);
}

export function giftReaction(character:Character, gift:Gift):GiftReaction {
  if (gift.tags.some(tag => character.dislikedGiftTags.includes(tag))) return "dislike";
  const favoriteCount = gift.tags.filter(tag => character.favoriteGiftTags.includes(tag)).length;
  if (favoriteCount >= 2) return "love";
  if (favoriteCount === 1) return "like";
  return "normal";
}

export function availableEvent(state:GameState, events:RelationshipEvent[]) {
  return events.find(event => {
    const progress=state.characterProgress[event.characterId];
    return progress?.met && progress.relationshipStage===event.fromStage && progress.affection>=event.requiredAffection && !progress.viewedEvents.includes(event.id);
  });
}

export function growthStatValue(requirement:GrowthStatRequirement,state:GameState) {
  if(requirement.type==="recipeSales")return state.lifetimeStats.recipeSales[requirement.id || ""] || 0;
  if(requirement.type==="ingredientPurchases")return state.lifetimeStats.ingredientPurchases[requirement.id || ""] || 0;
  if(requirement.type==="tagSales")return state.lifetimeStats.tagSales[requirement.id || ""] || 0;
  if(requirement.type==="totalRevenue")return state.lifetimeStats.totalRevenue;
  return state.lifetimeStats.totalOrders;
}

export function growthRequirements(event:GrowthEvent,state:GameState) {
  const character=state.characterProgress[event.characterId];
  return [
    {label:`関係：段階${event.requiredRelationshipStage}以上`,current:character?.relationshipStage || 0,target:event.requiredRelationshipStage,met:(character?.relationshipStage || 0)>=event.requiredRelationshipStage},
    ...event.requiredStats.map(requirement=>{const current=growthStatValue(requirement,state);return {label:requirement.label,current,target:requirement.target,met:current>=requirement.target};}),
    ...(event.requiredPreviousEvents.length?[{label:"前の共同イベント",current:event.requiredPreviousEvents.filter(id=>state.viewedGrowthEvents.includes(id)).length,target:event.requiredPreviousEvents.length,met:event.requiredPreviousEvents.every(id=>state.viewedGrowthEvents.includes(id))}]:[]),
    ...((event.requiredEquipmentIds || []).map(id=>({label:"必要な設備を設置",current:state.ownedEquipment.includes(id)?1:0,target:1,met:state.ownedEquipment.includes(id)}))),
  ];
}

export function nextGrowthEvent(characterId:string,state:GameState) {
  return growthEvents.find(event=>event.characterId===characterId&&!state.viewedGrowthEvents.includes(event.eventId));
}

export function availableGrowthEvent(state:GameState) {
  return growthEvents.find(event=>state.characterProgress[event.characterId]?.met&&!state.viewedGrowthEvents.includes(event.eventId)&&growthRequirements(event,state).every(item=>item.met));
}

export function hiddenRecipeRewards(viewedEvents:string[],unlockedRecipes:string[]) {
  return hiddenUnlocks.filter(item=>!unlockedRecipes.includes(item.recipeId)&&item.requiredEvents.every(id=>viewedEvents.includes(id)));
}

export function createCharacterProgress() {
  return Object.fromEntries(characters.map(character => [character.id,{ affection:0,relationshipStage:0,viewedEvents:[],met:false,visits:0,route:"undecided" as const,eventChoices:{} }]));
}

export function bestSeller(recipeSales:Record<string,number>) {
  return Object.entries(recipeSales).sort((a,b)=>b[1]-a[1])[0]?.[0];
}

export function salePrice(recipeId:string,state:GameState) {
  const recipe=recipes.find(item=>item.id===recipeId);
  if(!recipe)return 0;
  return Math.round(recipe.price*getTownDailyEvent(state.dailyEventId).saleMultiplier);
}

export function isRecipeUsable(recipeId:string,state:GameState) {
  const recipe=recipes.find(item=>item.id===recipeId);
  return !!recipe&&state.unlockedRecipes.includes(recipe.id)&&(recipe.requiredEquipmentIds || []).every(id=>state.ownedEquipment.includes(id));
}

export function pickWeightedRecipe(state:GameState) {
  const weather=getWeather(state.dailyWeatherId);
  const crowd=getCustomerGroup(state.dailyCustomerGroupId);
  const event=getTownDailyEvent(state.dailyEventId);
  const options=recipes.filter(recipe=>isRecipeUsable(recipe.id,state)).map(recipe=>{
    const matches=[...weather.favoredTags,...crowd.favoredTags,...event.favoredTags].filter(tag=>recipe.tags.includes(tag)).length;
    return {recipe,weight:1+matches*2};
  });
  const total=options.reduce((sum,item)=>sum+item.weight,0);
  let roll=Math.random()*total;
  for(const option of options){roll-=option.weight;if(roll<=0)return option.recipe.id;}
  return options[0]?.recipe.id;
}
