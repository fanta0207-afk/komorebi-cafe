import { characters } from "../data/characters";
import { gifts } from "../data/gifts";
import { recipes } from "../data/recipes";
import type { Character, Gift, GiftReaction, GameState, RelationshipEvent } from "../types/game";

export const initialRecipeIds = recipes.filter(item => item.initiallyUnlocked).map(item => item.id);

export function findNewRecipes(owned:Record<string,number>, unlocked:string[]) {
  return recipes.filter(recipe => !unlocked.includes(recipe.id) && recipe.requiredIngredients.every(id => (owned[id] || 0) > 0)).map(recipe => recipe.id);
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

export function createCharacterProgress() {
  return Object.fromEntries(characters.map(character => [character.id,{ affection:0,relationshipStage:1,viewedEvents:[],met:false,visits:0 }]));
}

export function bestSeller(recipeSales:Record<string,number>) {
  return Object.entries(recipeSales).sort((a,b)=>b[1]-a[1])[0]?.[0];
}
