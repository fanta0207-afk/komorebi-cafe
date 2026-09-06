import { GAME_CONFIG } from "./config";
import { characters } from "../data/characters";
import { gifts } from "../data/gifts";
import { ingredients } from "../data/ingredients";
import { recipes, recipeEquipmentId } from "../data/recipes";
import { growthEvents } from "../data/growthEvents";
import { hiddenUnlocks } from "../data/hiddenUnlocks";
import { tutorialRecipe } from "./missions";
import type { Character, Gift, GiftReaction, GameState, GrowthEvent, GrowthStatRequirement, RelationshipEvent, Order } from "../types/game";

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
    return progress?.met && progress.relationshipStage===event.fromStage && progress.affection>=event.requiredAffection && relationshipRequirements(event,state).every(item=>item.met) && !progress.viewedEvents.includes(event.id);
  });
}

export function relationshipRequirements(event:RelationshipEvent,state:GameState) {
  const orderTargets=[0,0,0,5,10,15,25,40,60,80,100];
  const supplierId=characters.find(item=>item.id===event.characterId)?.supplierId;
  const purchases=ingredients.filter(item=>item.supplierId===supplierId).reduce((sum,item)=>sum+(state.lifetimeStats.ingredientPurchases[item.id]||0),0);
  const orderTarget=orderTargets[event.toStage],purchaseTarget=event.toStage<3?0:event.toStage-2;
  return [{label:"お店の累計提供",current:state.lifetimeStats.totalOrders,target:orderTarget,met:state.lifetimeStats.totalOrders>=orderTarget},
    {label:"このお店での累計仕入れ",current:purchases,target:purchaseTarget,met:purchases>=purchaseTarget}].filter(item=>item.target>0);
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
  return Object.fromEntries(characters.map(character => [character.id,{ affection:0,relationshipStage:0,viewedEvents:[],met:false,visits:0,route:"undecided" as const,eventChoices:{},talkedStages:[] }]));
}

export function bestSeller(recipeSales:Record<string,number>) {
  return Object.entries(recipeSales).sort((a,b)=>b[1]-a[1])[0]?.[0];
}

export function salePrice(recipeId:string) {
  const recipe=recipes.find(item=>item.id===recipeId);
  if(!recipe)return 0;
  const cost=ingredientCost(recipeId);
  return cost+Math.max(1,Math.round((recipe.price-cost)*GAME_CONFIG.profitMultiplier));
}

export function ingredientCost(recipeId:string) {
  return (recipes.find(item=>item.id===recipeId)?.requiredIngredients||[]).reduce((sum,id)=>sum+(ingredients.find(item=>item.id===id)?.price||0)/GAME_CONFIG.ingredientPackSize,0);
}

export function isRecipeUsable(recipeId:string,state:GameState) {
  const recipe=recipes.find(item=>item.id===recipeId);
  return !!recipe&&state.unlockedRecipes.includes(recipe.id)&&state.stations.some(station=>station.equipmentId===recipeEquipmentId(recipe))&&(recipe.requiredEquipmentIds || []).every(id=>state.ownedEquipment.includes(id));
}

export function pickWeightedRecipe(state:GameState) {
  // Prefer unreserved stock, but guests can wait for supplies when everything is out.
  const remaining={...state.ingredients};
  for(const order of state.orders.filter(item=>item.status==="queued"))for(const id of recipes.find(item=>item.id===order.recipeId)?.requiredIngredients||[])remaining[id]=(remaining[id]||0)-1;
  const usable=recipes.filter(recipe=>isRecipeUsable(recipe.id,state));
  const stocked=usable.filter(recipe=>recipe.requiredIngredients.every(id=>(remaining[id]||0)>0));
  const options=stocked.length?stocked:usable;
  return options[Math.floor(Math.random()*options.length)]?.id;
}

export function orderSalePrice(order: Order) {
  return Math.round(salePrice(order.recipeId) * (order.request ? GAME_CONFIG.requestOrderBonus : 1));
}

/** Occasional attainable requests: one at a time, no unrevealed story/secret recipes. */
export function pickIncomingOrder(state: GameState): { recipeId: string; request?: boolean } | undefined {
  const guided=tutorialRecipe(state);
  if(guided&&isRecipeUsable(guided,state)) {
    const remaining={...state.ingredients};
    for(const order of state.orders.filter(o=>o.status==="queued"))for(const id of recipes.find(r=>r.id===order.recipeId)?.requiredIngredients||[])remaining[id]=(remaining[id]||0)-1;
    const ready=recipes.find(recipe=>recipe.id===guided)!.requiredIngredients.every(id=>(remaining[id]||0)>0);
    // Keep earning on simple coffee until all ingredients for the tutorial's new dish arrive.
    if(ready||guided==="coffee")return {recipeId:guided};
    if(isRecipeUsable("coffee",state))return {recipeId:"coffee"};
  }
  const introFinished=state.missions.claimed.includes("serve-mocha")||(state.lifetimeStats.recipeSales.cafeMocha||0)>0;
  if (introFinished && state.lifetimeStats.totalOrders >= 3 && !state.orders.some(order => order.request)
    && Math.random() < GAME_CONFIG.requestOrderChance) {
    const available = { ...state.ingredients };
    for (const order of state.orders.filter(item => item.status === "queued")) {
      for (const id of recipes.find(item => item.id === order.recipeId)?.requiredIngredients || []) available[id] = (available[id] || 0) - 1;
    }
    const options = recipes.filter(recipe => {
      const unlocked = state.unlockedRecipes.includes(recipe.id);
      if (!unlocked && (recipe.unlockEventId || recipe.hidden || recipe.limited)) return false;
      if (!state.stations.some(station=>station.equipmentId===recipeEquipmentId(recipe))) return false;
      if (!(recipe.requiredEquipmentIds || []).every(id => state.ownedEquipment.includes(id))) return false;
      if (unlocked && recipe.requiredIngredients.every(id => (available[id] || 0) > 0)) return false;
      let cost = 0;
      for (const id of recipe.requiredIngredients) {
        const ingredient = ingredients.find(item => item.id === id);
        if (!ingredient || (ingredient.unlockEventId && !state.unlockedIngredients.includes(id))) return false;
        const incoming = state.deliveries.filter(item => item.ingredientId === id).reduce((sum, item) => sum + item.packs * GAME_CONFIG.ingredientPackSize, 0);
        if ((available[id] || 0) + incoming <= 0) cost += ingredient.price;
      }
      // A legacy save may hold all ingredients without having discovered this basic recipe.
      // Reserve enough budget for one delivery that will run recipe discovery.
      if (!unlocked && cost === 0 && !state.deliveries.length) {
        cost = Math.min(...recipe.requiredIngredients.map(id => ingredients.find(item => item.id === id)!.price));
      }
      return cost <= state.currency;
    });
    const recipe = options[Math.floor(Math.random() * options.length)];
    if (recipe) return { recipeId: recipe.id, request: true };
  }
  const recipeId = pickWeightedRecipe(state);
  return recipeId ? { recipeId } : undefined;
}
