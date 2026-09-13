import { GAME_CONFIG, giftRequirementTargets } from "./config";
import { characters } from "../data/characters";
import { gifts, sortGiftIdsByRarity } from "../data/gifts";
import { ingredients } from "../data/ingredients";
import { recipes, recipeEquipmentId } from "../data/recipes";
import { growthEvents } from "../data/growthEvents";
import { staffStoryEvents } from "../data/events";
import { hiddenUnlocks } from "../data/hiddenUnlocks";
import { tutorialRecipe } from "./missions";
import { menuMastery } from "./menuMastery";
import type { Character, Gift, GiftReaction, GameState, GrowthEvent, GrowthStatRequirement, RelationshipEvent, Order } from "../types/game";

export const initialRecipeIds = recipes.filter(item => item.initiallyUnlocked).map(item => item.id);

export function findNewRecipes(owned:Record<string,number>, unlocked:string[]) {
  return recipes.filter(recipe => !recipe.unlockEventId && !unlocked.includes(recipe.id) && recipe.requiredIngredients.every(id => (owned[id] || 0) > 0)).map(recipe => recipe.id);
}

export function randomShopItems(count=GAME_CONFIG.giftShopSize,random=Math.random) {
  const pool=[...gifts],selected:string[]=[];
  while(pool.length&&selected.length<count){
    const total=pool.reduce((sum,gift)=>sum+GAME_CONFIG.giftRarityWeight[gift.rarity],0);
    let roll=random()*total,index=pool.length-1;
    for(let i=0;i<pool.length;i++){
      roll-=GAME_CONFIG.giftRarityWeight[pool[i].rarity];
      if(roll<0){index=i;break;}
    }
    selected.push(pool.splice(index,1)[0].id);
  }
  return sortGiftIdsByRarity(selected);
}

export function giftReaction(character:Character, gift:Gift):GiftReaction {
  if (gift.tags.some(tag => character.dislikedGiftTags.includes(tag))) return "dislike";
  const favoriteCount = gift.tags.filter(tag => character.favoriteGiftTags.includes(tag)).length;
  if (favoriteCount >= 2) return "love";
  if (favoriteCount === 1) return "like";
  return "normal";
}

export function giftAffectionAmount(gift:Gift,reaction:GiftReaction) {
  const base=GAME_CONFIG.giftAffection[reaction];
  return base>0?Math.round(base*GAME_CONFIG.giftRarityMultiplier[gift.rarity]):base;
}

export function availableEvent(state:GameState, events:RelationshipEvent[]) {
  return events.find(event => {
    const progress=state.characterProgress[event.characterId];
    return progress?.met && progress.relationshipStage===event.fromStage && progress.affection>=event.requiredAffection && relationshipRequirements(event,state).every(item=>item.met) && !progress.viewedEvents.includes(event.id);
  });
}

export function availableStaffStory(state:GameState, events=staffStoryEvents) {
  return events.find(event=>{
    const progress=state.characterProgress[event.characterId];
    return progress?.met && progress.relationshipStage>=event.requiredRelationshipStage
      && state.staff.some(person=>person.characterId===event.characterId)
      && !progress.viewedEvents.includes(event.id);
  });
}

export function relationshipRequirementTargets(stage:number) {
  const orderTargets=[0,0,0,5,10,15,25,40,60,80,100];
  const bounded=Math.max(0,Math.min(10,stage));
  return {orderTarget:orderTargets[bounded],purchaseTarget:stage<3?0:Math.min(8,stage-2),giftTarget:giftRequirementTargets[bounded]};
}

export function relationshipRequirements(event:RelationshipEvent,state:GameState) {
  const supplierId=characters.find(item=>item.id===event.characterId)?.supplierId;
  const purchases=ingredients.filter(item=>item.supplierId===supplierId).reduce((sum,item)=>sum+(state.lifetimeStats.ingredientPurchases[item.id]||0),0);
  const {orderTarget,purchaseTarget,giftTarget}=relationshipRequirementTargets(event.toStage);
  return [{label:"お店の累計提供",current:state.lifetimeStats.totalOrders,target:orderTarget,met:state.lifetimeStats.totalOrders>=orderTarget},
    {label:"このお店での累計仕入れ",current:purchases,target:purchaseTarget,met:purchases>=purchaseTarget},
    {label:"この人へ渡したギフト",current:state.characterProgress[event.characterId].giftsGiven,target:giftTarget,met:state.characterProgress[event.characterId].giftsGiven>=giftTarget}].filter(item=>item.target>0);
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
    ...(event.requiredPreviousEvents.length?[{label:"前の物語",current:event.requiredPreviousEvents.filter(id=>state.viewedGrowthEvents.includes(id)).length,target:event.requiredPreviousEvents.length,met:event.requiredPreviousEvents.every(id=>state.viewedGrowthEvents.includes(id))}]:[]),
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
  return Object.fromEntries(characters.map(character => [character.id,{ affection:0,relationshipStage:0,viewedEvents:[],met:false,visits:0,giftsGiven:0,route:"undecided" as const,eventChoices:{},talkedStages:[],giftReactions:{} }]));
}

export function bestSeller(recipeSales:Record<string,number>) {
  return Object.entries(recipeSales).sort((a,b)=>b[1]-a[1])[0]?.[0];
}

export function salePrice(recipeId:string,state?:GameState) {
  const recipe=recipes.find(item=>item.id===recipeId);
  if(!recipe)return 0;
  const bonus=state?menuMastery(recipeId,state).current.bonus:0;
  return Math.max(1,Math.round(recipe.price*GAME_CONFIG.saleMultiplier*(1+bonus)));
}

export function ingredientCost(recipeId:string) {
  void recipeId;
  return 0;
}

export function isRecipeUsable(recipeId:string,state:GameState) {
  const recipe=recipes.find(item=>item.id===recipeId);
  return !!recipe&&state.unlockedRecipes.includes(recipe.id)&&state.stations.some(station=>station.equipmentId===recipeEquipmentId(recipe))&&(recipe.requiredEquipmentIds || []).every(id=>state.ownedEquipment.includes(id));
}

export function pickWeightedRecipe(state:GameState) {
  // Orders represent the unlocked menu, not only today's stock. Prefer dishes
  // that are not already waiting and have been sold less often to keep variety.
  const usable=recipes.filter(recipe=>isRecipeUsable(recipe.id,state)&&recipe.requiredIngredients.every(id=>{
    const ingredient=ingredients.find(item=>item.id===id);
    return !!ingredient&&(!ingredient.unlockEventId||state.unlockedIngredients.includes(id));
  }));
  if(!usable.length)return;
  const activeCount=(recipeId:string)=>state.orders.filter(order=>order.recipeId===recipeId).length;
  const leastActive=Math.min(...usable.map(recipe=>activeCount(recipe.id)));
  let options=usable.filter(recipe=>activeCount(recipe.id)===leastActive);
  const leastSold=Math.min(...options.map(recipe=>state.lifetimeStats.recipeSales[recipe.id]||0));
  options=options.filter(recipe=>(state.lifetimeStats.recipeSales[recipe.id]||0)===leastSold);
  return options[Math.floor(Math.random()*options.length)]?.id;
}

export function orderSalePrice(order: Order,state?:GameState) {
  return Math.round(salePrice(order.recipeId,state) * (order.request ? GAME_CONFIG.requestOrderBonus : 1));
}

/** Occasional attainable requests: one at a time, no unrevealed story/secret recipes. */
export function pickIncomingOrder(state: GameState): { recipeId: string; request?: boolean } | undefined {
  const guided=tutorialRecipe(state);
  // A mission dish arrives before its supplies or equipment are ready, so the
  // player can see the short path to fulfilling it. Keep only one such order.
  if(guided&&!state.orders.some(order=>order.recipeId===guided)&&recipes.some(recipe=>recipe.id===guided))return {recipeId:guided};
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
      for (const id of recipe.requiredIngredients) {
        const ingredient = ingredients.find(item => item.id === id);
        if (!ingredient || (ingredient.unlockEventId && !state.unlockedIngredients.includes(id))) return false;
      }
      return true;
    });
    const recipe = options[Math.floor(Math.random() * options.length)];
    if (recipe) return { recipeId: recipe.id, request: true };
  }
  const recipeId = pickWeightedRecipe(state);
  return recipeId ? { recipeId } : undefined;
}
